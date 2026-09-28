import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import Cookies from "js-cookie";
import { auth, db } from "@/services/firebase";
import { AppUser, DadosPerfil, UserRole } from "@/types/user";

/**
 * Traduz os códigos de erro do Firebase Auth para mensagens em português,
 * legíveis para quem está preenchendo o formulário.
 */
function mensagemErroFirebase(error: unknown): string {
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
        default:
            return "Não foi possível concluir a operação. Tente novamente";
    }
}

/**
 * SERVICES DE GERENCIAMENTO DE USUÁRIOS (Firebase Authentication + Firestore)
 */
const UserServices = {
    /**
     * Autenticação de usuário
     */
    login: async (
        email: string,
        password: string
    ): Promise<{ success: boolean; message?: string }> => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // O AuthContext assume a partir daqui (onAuthStateChanged carrega o
            // perfil no Firestore e seta o cookie de sessão)
            return { success: true };
        } catch (error: unknown) {
            return { success: false, message: mensagemErroFirebase(error) };
        }
    },

    /**
     * Cadastro multiperfil: cria o usuário no Firebase Authentication e o
     * documento correspondente em `users/{uid}` no Firestore, já com o
     * `role` e os campos específicos do perfil em `dadosPerfil`.
     */
    cadastrar: async (dados: {
        nome: string;
        email: string;
        password: string;
        role: UserRole;
        dadosPerfil: DadosPerfil;
    }): Promise<{ success: boolean; message?: string }> => {
        try {
            const credential = await createUserWithEmailAndPassword(
                auth,
                dados.email,
                dados.password
            );

            await setDoc(doc(db, "users", credential.user.uid), {
                nome: dados.nome,
                email: dados.email,
                role: dados.role,
                dadosPerfil: dados.dadosPerfil,
                criadoEm: Date.now(),
            });

            return { success: true };
        } catch (error: unknown) {
            return { success: false, message: mensagemErroFirebase(error) };
        }
    },

    /**
     * Retorna o usuário autenticado (síncrono, a partir do cookie de sessão).
     * Para os dados completos (role, dadosPerfil) use o hook `useAuth()`.
     */
    getCurrentUser: () => {
        return auth.currentUser;
    },

    /**
     * Lista todos os usuários cadastrados (uso do painel admin).
     * Sem paginação por ora — volume esperado é baixo neste estágio do TCC.
     */
    getAll: async (): Promise<{ success: boolean; users: AppUser[] }> => {
        const snapshot = await getDocs(query(collection(db, "users"), orderBy("nome")));
        const users: AppUser[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
                uid: docSnap.id,
                nome: data.nome,
                email: data.email,
                role: data.role,
                dadosPerfil: data.dadosPerfil ?? {},
            };
        });
        return { success: true, users };
    },

    /**
     * Busca o documento completo (`role` + `dadosPerfil`) de um usuário
     */
    getById: async (uid: string): Promise<{ success: boolean; user?: AppUser }> => {
        const snapshot = await getDoc(doc(db, "users", uid));
        if (!snapshot.exists()) return { success: false };

        const data = snapshot.data();
        return {
            success: true,
            user: {
                uid,
                nome: data.nome,
                email: data.email,
                role: data.role,
                dadosPerfil: data.dadosPerfil ?? {},
            },
        };
    },

    /**
     * Edição do próprio perfil: envia SOMENTE `nome` e `dadosPerfil`.
     * `role`, `email` e `criadoEm` nunca saem daqui — e as Security Rules
     * recusam qualquer update do próprio usuário que tente mexer neles.
     */
    atualizarPerfil: async (
        uid: string,
        dados: { nome: string; dadosPerfil: DadosPerfil }
    ): Promise<{ success: boolean; message?: string }> => {
        try {
            await updateDoc(doc(db, "users", uid), {
                nome: dados.nome,
                dadosPerfil: dados.dadosPerfil,
            });
            return { success: true };
        } catch {
            return { success: false, message: "Não foi possível salvar as alterações. Tente novamente" };
        }
    },

    /**
     * Solicita ao Firebase o envio de e-mail de redefinição de senha
     */
    resetPassword: async (email: string): Promise<{ success: boolean; message?: string }> => {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error: unknown) {
            return { success: false, message: mensagemErroFirebase(error) };
        }
    },

    /**
     * Encerra a sessão do usuário
     */
    logout: async (): Promise<{ success: boolean }> => {
        await signOut(auth);
        Cookies.remove("session");
        return { success: true };
    },
};

export default UserServices;
