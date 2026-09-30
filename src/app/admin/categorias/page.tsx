import { AppMainContainer } from "@/themes/components";
import CategoriaList from "./_list";

export const metadata = {
    title: 'Categorias de acompanhamento'
}
// ==========================================================
export default function CategoriasPage() {

    // ==========================================================
    return (
        <AppMainContainer title="Categorias de acompanhamento">
            <CategoriaList />
        </AppMainContainer>
    )
}
