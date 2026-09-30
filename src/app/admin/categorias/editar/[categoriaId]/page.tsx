import { AppMainContainer } from "@/themes/components";
import CategoriaForm from "../../_form";

export const metadata = {
    title: 'Editar categoria'
}
// ==========================================================
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function EditarCategoriaPage({ params }: { params: Promise<{ categoriaId: string }> }) {
    const { categoriaId } = await params;

    // ==========================================================
    return (
        <AppMainContainer title="Editar categoria">
            <CategoriaForm categoriaId={categoriaId} />
        </AppMainContainer>
    )
}
