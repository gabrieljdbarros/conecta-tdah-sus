import { AppMainContainer } from "@/themes/components";
import ConversasList from "./_list";

export const metadata = {
    title: 'Conversas'
}
// ==========================================================
export default function ConversasPage() {

    // ==========================================================
    return (
        <AppMainContainer title="Conversas">
            <ConversasList />
        </AppMainContainer>
    )
}
