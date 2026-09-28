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
                <h1 className="font-bold text-[20px]">Lista de usuários</h1>
            </div>

            <p className="text-[13px] text-[grey] mt-1 mb-3">
                Novos usuários se cadastram pela tela pública de cadastro (mãe/responsável, escola ou médico).
            </p>

            <UserList />
        </AppMainContainer>
    )
}
