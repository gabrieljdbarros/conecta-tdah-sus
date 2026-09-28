import { AppMainContainer } from "@/themes/components";
import EditarPerfilForm from "./_form";

export const metadata = {
    title: 'Editar perfil'
}
// ==========================================================
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function EditarPerfilPage({ params }: { params: Promise<{ userID: string }> }) {
    const { userID } = await params;

    // ==========================================================
    return (
        <AppMainContainer title="Editar perfil">
            <EditarPerfilForm userID={userID} />
        </AppMainContainer>
    )
}
