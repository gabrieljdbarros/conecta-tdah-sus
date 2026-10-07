import { AppMainContainer } from "@/themes/components";
import Vinculos from "./_vinculos";

export const metadata = {
    title: 'Vínculos'
}
// ==========================================================
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function VinculosPage({ params }: { params: Promise<{ pastaId: string }> }) {
    const { pastaId } = await params;

    // ==========================================================
    return (
        <AppMainContainer title="Vínculos" voltar={`/admin/pastas/${pastaId}`} voltarRotulo="Voltar para a pasta">
            <Vinculos pastaId={pastaId} />
        </AppMainContainer>
    )
}
