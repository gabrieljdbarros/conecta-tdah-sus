import { AppMainContainer } from "@/themes/components";
import DetalhePasta from "./_detalhe";

export const metadata = {
    title: 'Pasta do aluno'
}
// ==========================================================
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function PastaPage({ params }: { params: Promise<{ pastaId: string }> }) {
    const { pastaId } = await params;

    // ==========================================================
    return (
        <AppMainContainer title="Pasta do aluno">
            <DetalhePasta pastaId={pastaId} />
        </AppMainContainer>
    )
}
