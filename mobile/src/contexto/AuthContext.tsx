import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "~/servicos/firebase";
import { buscarPerfil } from "~/servicos/usuario";
import { AppUser } from "@/types/user";

interface AuthValor {
    user: AppUser | null;
    carregando: boolean;
    /** Admin entrou no app: ele usa só o painel no computador */
    ehAdminNoApp: boolean;
    sair: () => Promise<void>;
    recarregarUsuario: () => Promise<void>;
}

const AuthContexto = createContext<AuthValor>({
    user: null, carregando: true, ehAdminNoApp: false,
    sair: async () => {}, recarregarUsuario: async () => {},
});

/**
 * Quem está logado (Firebase Auth + perfil em `users/{uid}`). Igual ao
 * AuthContext da web, sem o cookie (no app não existe middleware).
 * Esconder telas é só experiência de uso: quem protege os dados são as regras
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [ehAdminNoApp, setEhAdminNoApp] = useState(false);

    useEffect(() => {
        return onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setUser(null);
                setCarregando(false);
                return;
            }
            try {
                const perfil = await buscarPerfil(firebaseUser.uid);
                // O app é para mãe, escola e médico; o admin gerencia pelo computador
                if (perfil?.role === 'admin') {
                    setEhAdminNoApp(true);
                    await signOut(auth);
                    setUser(null);
                    return;
                }
                setEhAdminNoApp(false);
                setUser(perfil);
            } catch {
                setUser(null);
            } finally {
                setCarregando(false);
            }
        });
    }, []);

    const sair = async () => {
        await signOut(auth);
        setUser(null);
    };

    const recarregarUsuario = async () => {
        if (!auth.currentUser) return;
        const perfil = await buscarPerfil(auth.currentUser.uid);
        if (perfil) setUser(perfil);
    };

    return (
        <AuthContexto.Provider value={{ user, carregando, ehAdminNoApp, sair, recarregarUsuario }}>
            {children}
        </AuthContexto.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContexto);
}
