import { AppMainContainer } from "@/themes/components";
import Conversas from "./_conversas";

export const metadata = {
    title: 'Conversas da pasta'
}
// ==========================================================
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function ConversasPage({ params }: { params: Promise<{ pastaId: string }> }) {
    const { pastaId } = await params;

    // ==========================================================
    return (
        <AppMainContainer title="Conversas">
            <Conversas pastaId={pastaId} />
        </AppMainContainer>
    )
}
