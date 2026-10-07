import { TipoRelatorio, TIPO_LABELS } from "@/types/relatorio";

export const ICONE_TIPO: Record<TipoRelatorio, string> = {
    orientacao_medica: 'ion-medkit',
    laudo: 'ion-clipboard',
    avaliacao_escolar: 'ion-university',
    relato_familia: 'ion-home',
};

// Por extenso ("30 de setembro de 2026 às 14:05"): o leitor de tela lê
// melhor do que "30/09/2026"
export function formatarData(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

/** `?tipo=` do endereço, aceito só se for um tipo que existe */
export function tipoDoEndereco(valor: string | string[] | undefined): TipoRelatorio | undefined {
    return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(TIPO_LABELS, valor) ? valor as TipoRelatorio : undefined;
}
