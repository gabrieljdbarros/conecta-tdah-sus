import { AppMainContainer, AppSair } from "@/themes/components";
import EditarPerfilForm from "./_form";

export const metadata = {
    title: 'Meu perfil'
}
// ==========================================================
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function EditarPerfilPage({ params }: { params: Promise<{ userID: string }> }) {
    const { userID } = await params;

    // ==========================================================
    return (
        <AppMainContainer title="Meu perfil">
            <EditarPerfilForm userID={userID} />
            {/* No celular não há menu lateral: o "Sair" fica aqui, na aba Perfil */}
            <AppSair semMenuLateral className="md:hidden mt-8 mx-auto" />
        </AppMainContainer>
    )
}
