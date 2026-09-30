import { AppMainContainer } from "@/themes/components";
import CategoriaForm from "../_form";

export const metadata = {
    title: 'Nova categoria'
}
// ==========================================================
export default function NovaCategoriaPage() {

    // ==========================================================
    return (
        <AppMainContainer title="Nova categoria">
            <CategoriaForm />
        </AppMainContainer>
    )
}
