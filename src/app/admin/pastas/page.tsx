import { AppMainContainer } from "@/themes/components";
import PastaList from "./_list";

export const metadata = {
    title: 'Pastas dos alunos'
}
// ==========================================================
export default function PastasPage() {

    // ==========================================================
    return (
        <AppMainContainer title="Pastas dos alunos">
            <PastaList />
        </AppMainContainer>
    )
}
