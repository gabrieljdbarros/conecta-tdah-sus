/**
 * MODELO DE USUÁRIO — CONECTA TDAH SUS
 *
 * Decisão travada com o time (ver documento de requisitos):
 *  - Um único documento por usuário em `users/{uid}`
 *  - Campos específicos de cada perfil ficam agrupados em `dadosPerfil`
 *  - `role` fica no Firestore (não em custom claims do Firebase Auth),
 *    para sustentar a lógica condicional de telas e as Security Rules
 *  - Senha nunca é guardada no Firestore — fica só no Firebase Authentication
 */

export type UserRole = 'admin' | 'mae' | 'escola' | 'medico';

// O nome da criança não fica no perfil (o admin lê perfis): ele existe só
// na pasta do aluno, que o admin não lê
export interface DadosPerfilMae {
    grauParentesco: string;
}

export interface DadosPerfilEscola {
    nomeEscola: string;
    cargo: string;
    disciplina: string;
}

export interface DadosPerfilMedico {
    crm: string;
    especialidade: string;
    unidadeSUS: string;
}

export type DadosPerfil = Partial<DadosPerfilMae & DadosPerfilEscola & DadosPerfilMedico>;

/**
 * Formato salvo em `users/{uid}` no Firestore
 */
export interface UserDocument {
    nome: string;
    email: string;
    role: UserRole;
    dadosPerfil: DadosPerfil;
    criadoEm: number;
}

/**
 * Usuário autenticado disponível na aplicação (Auth + Firestore combinados)
 */
export interface AppUser {
    uid: string;
    nome: string;
    email: string;
    role: UserRole;
    dadosPerfil: DadosPerfil;
}

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Administrador',
    mae: 'Mãe/Responsável',
    escola: 'Escola',
    medico: 'Médico (SUS)',
};
