import { AppUser } from "@/types/user";
import { PapelNaPasta } from "@/types/pasta";

/**
 * Papel da pessoa NA PASTA, igual ao do banco (função papel_na_pasta,
 * em supabase/migrations): a mãe é a dona; escola e médico são membros com esse perfil.
 * Usado pela web e pelo app (mobile/), sem duplicar a regra.
 * Só monta a tela: quem protege de verdade é o RLS
 */
export function papelNaPasta(user: AppUser, donoUid: string): PapelNaPasta | null {
    if (user.uid === donoUid) return 'mae';
    if (user.role === 'escola' || user.role === 'medico') return user.role;
    return null;
}
