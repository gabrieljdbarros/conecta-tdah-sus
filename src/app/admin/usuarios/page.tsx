import { AppMainContainer } from "@/themes/components";
import UserList from "./_list";

export const metadata = {
    title: 'Lista de usuários'
}
// ==========================================================
export default function UsuariosPage() {

    // ==========================================================
    return (
        <AppMainContainer title="Usuários">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-[20px]">Lista de usuários</h2>
            </div>

            <p className="text-[16px] text-gray-700 mt-1 mb-3">
                Novos usuários se cadastram pela tela pública de cadastro (mãe/responsável, escola ou médico).
            </p>

            <UserList />
        </AppMainContainer>
    )
}
