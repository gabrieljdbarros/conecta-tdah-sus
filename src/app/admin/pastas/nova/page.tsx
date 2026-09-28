import { AppMainContainer } from "@/themes/components";
import NovaPastaForm from "./_form";

export const metadata = {
    title: 'Nova pasta'
}
// ==========================================================
export default function NovaPastaPage() {

    // ==========================================================
    return (
        <AppMainContainer title="Nova pasta">
            <NovaPastaForm />
        </AppMainContainer>
    )
}
