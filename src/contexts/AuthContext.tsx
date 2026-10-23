"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from "js-cookie";
import { supabase } from "@/services/supabase";
import { paraAppUser } from "@/services/user";
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
 * Lê a linha do usuário em `perfis` e monta o AppUser (null se não existir)
 */
async function buscarPerfil(uid: string): Promise<AppUser | null> {
    const { data, error } = await supabase.from("perfis")
        .select("id, nome, email, role, dados_perfil").eq("id", uid).maybeSingle();
    if (error) throw error;
    return data ? paraAppUser(data) : null;
}

/**
 * PROVEDOR DE AUTENTICAÇÃO
 *
 * Observa a sessão do Supabase Auth e busca a linha em `perfis` para saber
 * o `role` e os dados de perfil. Mantém um cookie `session` só como
 * sinalizador para o middleware (checagem de UX no roteamento) — a
 * proteção de dados de verdade acontece nas políticas RLS do banco.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    // undefined = ainda não sabemos; null = sem login
    const [uid, setUid] = useState<string | null | undefined>(undefined);

    // O aviso do Supabase só guarda QUEM está logado. Buscar o perfil dentro
    // dele travaria a biblioteca (ela espera o aviso terminar), por isso a
    // busca fica no efeito abaixo
    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
            setUid(sessao?.user.id ?? null);
        });
        return () => data.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (uid === undefined) return;
        if (uid === null) {
            setUser(null);
            Cookies.remove("session");
            setLoading(false);
            return;
        }

        let cancelado = false;
        setLoading(true);
        (async () => {
            try {
                const perfil = await buscarPerfil(uid);
                if (cancelado) return;
                if (perfil) {
                    setUser(perfil);
                    Cookies.set("session", "1");
                } else
                    // Conta existe no Auth mas ainda sem perfil (cadastro em
                    // andamento). Se o cadastro já recarregou o usuário, esta
                    // leitura (que começou antes) não pode apagá-lo
                    setUser((atual) => (atual?.uid === uid ? atual : null));
            } catch {
                // Sem detalhes no log: pode haver dado pessoal no erro
                if (!cancelado) setUser(null);
            } finally {
                if (!cancelado) setLoading(false);
            }
        })();
        return () => { cancelado = true; };
    }, [uid]);

    const logout = async () => {
        await supabase.auth.signOut();
        Cookies.remove("session");
        setUser(null);
    };

    // Chamado depois de editar o perfil, para o menu refletir o nome novo
    // sem precisar sair e entrar de novo. Também usado logo depois do
    // cadastro, quando a linha em `perfis` acabou de ser criada
    const recarregarUsuario = useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        const id = data.session?.user.id;
        if (!id) return;
        const perfil = await buscarPerfil(id);
        if (perfil) {
            setUser(perfil);
            Cookies.set("session", "1");
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, logout, recarregarUsuario }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
