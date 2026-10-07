import { AppMainContainer } from "@/themes/components";
import DetalheRelatorio from "./_detalhe";

export const metadata = {
    title: 'Relatório'
}
// ==========================================================
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function RelatorioPage({ params }: { params: Promise<{ pastaId: string, relatorioId: string }> }) {
    const { pastaId, relatorioId } = await params;

    // ==========================================================
    return (
        <AppMainContainer title="Relatório" voltar={`/admin/pastas/${pastaId}/relatorios`} voltarRotulo="Voltar para os relatórios">
            <DetalheRelatorio pastaId={pastaId} relatorioId={relatorioId} />
        </AppMainContainer>
    )
}
