import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { auth, db } from "~/servicos/firebase";
import { AppUser, DadosPerfil, UserRole } from "@/types/user";

/**
 * SERVIÇOS DE USUÁRIO (app). Mesma lógica de src/services/user.ts da web:
 * cada função devolve { success, ... } e nunca lança erro para a tela.
 * As Security Rules conferem o formato do perfil no servidor
 */

function mensagemErro(error: unknown): string {
    const codigo = error instanceof FirebaseError ? error.code : '';
    switch (codigo) {
        case "auth/invalid-email":
            return "E-mail inválido";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "E-mail ou senha incorretos";
        case "auth/email-already-in-use":
            return "Já existe uma conta com este e-mail";
        case "auth/weak-password":
            return "A senha precisa ter pelo menos 6 caracteres";
        case "auth/too-many-requests":
            return "Muitas tentativas. Tente novamente em alguns minutos";
        case "auth/network-request-failed":
            return "Sem conexão. Confira a internet e tente de novo";
        default:
            return "Não foi possível concluir. Tente novamente";
    }
}

/** Lê `users/{uid}` (o próprio perfil; as regras não deixam ler o de outros) */
export async function buscarPerfil(uid: string): Promise<AppUser | null> {
    const snapshot = await getDoc(doc(db, "users", uid));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return { uid, nome: data.nome, email: data.email, role: data.role, dadosPerfil: data.dadosPerfil ?? {} };
}

const UsuarioServicos = {
    entrar: async (email: string, senha: string): Promise<{ success: boolean; message?: string }> => {
        try {
            await signInWithEmailAndPassword(auth, email.trim(), senha);
            return { success: true };
        } catch (error) {
            return { success: false, message: mensagemErro(error) };
        }
    },

    /** Cria a conta no Auth e o perfil em `users/{uid}` (mesmo formato da web) */
    cadastrar: async (dados: {
        nome: string; email: string; senha: string; role: UserRole; dadosPerfil: DadosPerfil;
    }): Promise<{ success: boolean; message?: string }> => {
        try {
            const credencial = await createUserWithEmailAndPassword(auth, dados.email.trim(), dados.senha);
            await setDoc(doc(db, "users", credencial.user.uid), {
                nome: dados.nome,
                email: dados.email.trim(),
                role: dados.role,
                dadosPerfil: dados.dadosPerfil,
                criadoEm: Date.now(),
            });
            return { success: true };
        } catch (error) {
            return { success: false, message: mensagemErro(error) };
        }
    },

    /** Só `nome` e `dadosPerfil` (as regras recusam mudar perfil ou e-mail) */
    atualizarPerfil: async (uid: string, dados: { nome: string; dadosPerfil: DadosPerfil }): Promise<{ success: boolean }> => {
        try {
            await updateDoc(doc(db, "users", uid), { nome: dados.nome, dadosPerfil: dados.dadosPerfil });
            return { success: true };
        } catch {
            return { success: false };
        }
    },

    redefinirSenha: async (email: string): Promise<{ success: boolean; message?: string }> => {
        try {
            await sendPasswordResetEmail(auth, email.trim());
            return { success: true };
        } catch (error) {
            return { success: false, message: mensagemErro(error) };
        }
    },

    sair: async () => {
        await signOut(auth);
    },
};

export default UsuarioServicos;
