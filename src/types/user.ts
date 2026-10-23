/**
 * MODELO DE USUÁRIO — CONECTA TDAH SUS
 *
 * Decisão travada com o time (ver documento de requisitos):
 *  - Um único registro por usuário: tabela `perfis`
 *  - Campos específicos de cada perfil ficam agrupados em `dadosPerfil`
 *    (coluna `dados_perfil` no Supabase)
 *  - `role` fica no banco (nunca em dados que o próprio usuário edita no
 *    login), para sustentar a lógica das telas e as regras de acesso
 *  - Senha nunca é guardada no banco — fica só no serviço de login
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
 * Usuário autenticado disponível na aplicação (login + perfil combinados)
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
