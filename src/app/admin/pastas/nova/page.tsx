import { AppMainContainer } from "@/themes/components";
import NovaPastaForm from "./_form";

export const metadata = {
    title: 'Criar pasta'
}
// ==========================================================
export default function NovaPastaPage() {

    // ==========================================================
    return (
        <AppMainContainer title="Criar pasta" voltar="/admin/pastas" voltarRotulo="Voltar para as pastas">
            <NovaPastaForm />
        </AppMainContainer>
    )
}
