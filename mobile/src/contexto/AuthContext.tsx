import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "~/servicos/supabase";
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

/** De quem é a sessão. `vez` muda a cada novo login, mesmo com o mesmo usuário */
interface Sessao { uid: string; vez: number }

/**
 * Quem está logado (Supabase Auth + perfil em `perfis`). Igual ao
 * AuthContext da web, sem o cookie (no app não existe middleware).
 * Esconder telas é só experiência de uso: quem protege os dados é o RLS
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [ehAdminNoApp, setEhAdminNoApp] = useState(false);
    const [sessao, setSessao] = useState<Sessao | null>(null);
    const uidAtual = useRef<string | null | undefined>(undefined);

    // O aviso do Supabase só guarda QUEM está logado. Buscar o perfil dentro
    // dele travaria a biblioteca, por isso a busca fica no efeito abaixo
    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange((evento, s) => {
            const id = s?.user.id ?? null;
            // A sessão é renovada de tempos em tempos com o MESMO usuário: isso
            // não recarrega o perfil. Um login novo (SIGNED_IN) sempre recarrega
            if (id === uidAtual.current && evento !== "SIGNED_IN") return;
            const trocouDeUsuario = id !== uidAtual.current;
            uidAtual.current = id;
            if (!id) {
                setSessao(null);
                setUser(null);
                setCarregando(false);
                return;
            }
            // Outra pessoa entrou: os dados da anterior somem na hora
            if (trocouDeUsuario) setUser(null);
            setCarregando(true);
            setSessao((anterior) => ({ uid: id, vez: (anterior?.vez ?? 0) + 1 }));
        });
        return () => data.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!sessao) return;
        const { uid } = sessao;
        let cancelado = false;
        (async () => {
            try {
                const perfil = await buscarPerfil(uid);
                if (cancelado) return;
                // O app é para mãe, escola e médico; o admin gerencia pelo computador
                if (perfil?.role === 'admin') {
                    setEhAdminNoApp(true);
                    setUser(null);
                    await supabase.auth.signOut();
                    return;
                }
                setEhAdminNoApp(false);
                if (perfil) setUser(perfil);
                // Sem perfil ainda (cadastro em andamento): se o cadastro já
                // recarregou o usuário, esta leitura (que começou antes) não o apaga
                else setUser((atual) => (atual?.uid === uid ? atual : null));
            } catch {
                // Sem rede: volta para a tela de entrar. Entrar de novo é um
                // login novo (SIGNED_IN), que tenta ler o perfil outra vez
                if (!cancelado) setUser(null);
            } finally {
                if (!cancelado) setCarregando(false);
            }
        })();
        return () => { cancelado = true; };
    }, [sessao]);

    const sair = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    // Depois de editar o perfil e logo depois do cadastro (o perfil acabou de ser criado)
    const recarregarUsuario = useCallback(async () => {
        try {
            const { data } = await supabase.auth.getSession();
            const id = data.session?.user.id;
            if (!id) return;
            const perfil = await buscarPerfil(id);
            if (perfil) setUser(perfil);
        } catch {
            // Sem rede: mantém o que já estava na tela
        }
    }, []);

    return (
        <AuthContexto.Provider value={{ user, carregando, ehAdminNoApp, sair, recarregarUsuario }}>
            {children}
        </AuthContexto.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContexto);
}
