import { Ionicons } from "@expo/vector-icons";
import { TipoRelatorio } from "@/types/relatorio";

export const ICONE_TIPO: Record<TipoRelatorio, keyof typeof Ionicons.glyphMap> = {
    orientacao_medica: 'medkit',
    laudo: 'clipboard',
    avaliacao_escolar: 'school',
    relato_familia: 'home',
};

// Só o dia ("8 de outubro de 2026"), para as listas: a hora fica no detalhe
export function formatarDia(ms: number): string {
    return new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Por extenso ("8 de outubro de 2026 às 14:05"): o leitor de tela lê melhor
export function formatarData(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
