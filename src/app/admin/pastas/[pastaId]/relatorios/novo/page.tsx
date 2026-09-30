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
        <AppMainContainer title="Escrever relatório">
            <NovoRelatorioForm pastaId={pastaId} />
        </AppMainContainer>
    )
}
