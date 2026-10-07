/**
 * Semana da "Síntese da semana" do Início: de segunda a domingo, no fuso
 * do aparelho de quem usa
 */

/** Segunda-feira 00:00 da semana atual (no fuso do aparelho) e a segunda seguinte */
export function semanaAtual(agora = new Date()): { inicio: Date; fim: Date } {
    const diasDesdeSegunda = (agora.getDay() + 6) % 7;
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - diasDesdeSegunda);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7);
    return { inicio, fim };
}

/** "6 a 12 de outubro" ou "29 de setembro a 5 de outubro" */
export function rotuloSemana({ inicio, fim }: { inicio: Date; fim: Date }): string {
    const domingo = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate() - 1);
    const mes = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' });
    return inicio.getMonth() === domingo.getMonth()
        ? `${inicio.getDate()} a ${domingo.getDate()} de ${mes(domingo)}`
        : `${inicio.getDate()} de ${mes(inicio)} a ${domingo.getDate()} de ${mes(domingo)}`;
}
