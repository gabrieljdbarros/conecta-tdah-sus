"use client";
import { useEffect, useState } from "react"
import UserServices from "@/services/user";
import { AppLoader } from "@/themes/components";
import { AppUser, ROLE_LABELS } from "@/types/user";

function detalhesPerfil(user: AppUser): string {
    switch (user.role) {
        case 'mae':
            return `Parentesco: ${user.dadosPerfil.grauParentesco ?? '-'}`;
        case 'escola':
            return `${user.dadosPerfil.nomeEscola ?? '-'} · ${user.dadosPerfil.cargo ?? '-'}`;
        case 'medico':
            return `CRM ${user.dadosPerfil.crm ?? '-'} · ${user.dadosPerfil.especialidade ?? '-'}`;
        default:
            return '-';
    }
}

export default function UserList() {

    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

    // ======================================================================
    useEffect(() => {
        (async () => {
            const { users } = await UserServices.getAll();
            setUsers(users);
            setLoading(false);
        })();
    }, []);
    // ======================================================================
    return (
        <>
            {loading && <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando os usuários...</p>
            </div>}

            {!loading && <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-300">
                <table className="min-w-full bg-white">
                    <caption className="sr-only">Lista de usuários cadastrados</caption>
                    <thead>
                        <tr>
                            <th scope="col" className="py-2 px-4 border-b border-gray-300 text-left text-[16px] font-semibold text-gray-700">Nome</th>
                            <th scope="col" className="py-2 px-4 border-b border-gray-300 text-left text-[16px] font-semibold text-gray-700">Email</th>
                            <th scope="col" className="py-2 px-4 border-b border-gray-300 text-left text-[16px] font-semibold text-gray-700">Perfil</th>
                            <th scope="col" className="py-2 px-4 border-b border-gray-300 text-left text-[16px] font-semibold text-gray-700">Detalhes</th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.map(user => (
                            <tr key={user.uid}>
                                <td className="py-2 px-4 border-b border-gray-300 text-[16px]">{user.nome}</td>
                                <td className="py-2 px-4 border-b border-gray-300 text-[16px]">{user.email}</td>
                                <td className="py-2 px-4 border-b border-gray-300 text-[16px]">{ROLE_LABELS[user.role]}</td>
                                <td className="py-2 px-4 border-b border-gray-300 text-[16px]">{detalhesPerfil(user)}</td>
                            </tr>
                        ))}

                        {users.length === 0 && (
                            <tr><td colSpan={4} className="py-4 text-center text-[16px] text-gray-700">Nenhum usuário cadastrado ainda</td></tr>
                        )}
                    </tbody>
                </table>
            </div>}
        </>
    )
}
