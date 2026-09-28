"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Cookies from "js-cookie";
import { auth, db } from "@/services/firebase";
import { AppUser } from "@/types/user";

interface AuthContextValue {
    user: AppUser | null;
    loading: boolean;
    logout: () => Promise<void>;
    recarregarUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    logout: async () => {},
    recarregarUsuario: async () => {},
});

/**
 * Lê `users/{uid}` no Firestore e monta o AppUser (null se não existir)
 */
async function buscarPerfil(uid: string): Promise<AppUser | null> {
    const snapshot = await getDoc(doc(db, "users", uid));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    return {
        uid,
        nome: data.nome,
        email: data.email,
        role: data.role,
        dadosPerfil: data.dadosPerfil ?? {},
    };
}

/**
 * PROVEDOR DE AUTENTICAÇÃO
 *
 * Observa o estado do Firebase Auth e busca o documento `users/{uid}` no
 * Firestore para saber o `role` e os dados de perfil. Mantém um cookie
 * `session` só como sinalizador para o middleware (checagem de UX no
 * roteamento) — a proteção de dados de verdade acontece nas Firestore
 * Security Rules, não aqui.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setUser(null);
                Cookies.remove("session");
                setLoading(false);
                return;
            }

            try {
                const perfil = await buscarPerfil(firebaseUser.uid);

                if (!perfil) {
                    // Usuário existe no Auth mas não tem perfil no Firestore ainda
                    setUser(null);
                    Cookies.remove("session");
                    setLoading(false);
                    return;
                }

                setUser(perfil);
                Cookies.set("session", "1");
            } catch (error) {
                console.error("Erro ao carregar dados do usuário:", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
        Cookies.remove("session");
        setUser(null);
    };

    // Chamado depois de editar o perfil, para o menu refletir o nome novo
    // sem precisar sair e entrar de novo
    const recarregarUsuario = async () => {
        if (!auth.currentUser) return;
        const perfil = await buscarPerfil(auth.currentUser.uid);
        if (perfil) setUser(perfil);
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, recarregarUsuario }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
