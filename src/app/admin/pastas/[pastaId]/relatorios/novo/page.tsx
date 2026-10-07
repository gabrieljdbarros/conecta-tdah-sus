import { AppMainContainer } from "@/themes/components";
import NovoRelatorioForm from "./_form";

export const metadata = {
    title: 'Escrever relatório'
}
// ==========================================================
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function NovoRelatorioPage({ params }: { params: Promise<{ pastaId: string }> }) {
    const { pastaId } = await params;

    // ==========================================================
    return (
        <AppMainContainer title="Escrever relatório" voltar={`/admin/pastas/${pastaId}`} voltarRotulo="Voltar para a pasta">
            <NovoRelatorioForm pastaId={pastaId} />
        </AppMainContainer>
    )
}
