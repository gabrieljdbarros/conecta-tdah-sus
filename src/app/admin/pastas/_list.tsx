"use client";
import { useEffect, useState } from "react";
import PastaServices from "@/services/pasta";
import { AppButton, AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData } from "@/helpers/router";
import { Pasta, SERIE_LABELS } from "@/types/pasta";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';

export default function PastaList() {
    const { user, loading: carregandoSessao } = useAuth();
    const [pastas, setPastas] = useState<Pasta[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    const [sucesso, setSucesso] = useState<string | null>(null);

    // ======================================================================
    useEffect(() => {
        // Mensagem deixada pela tela de criação ("Pasta criada")
        const flash = getFlashData();
        if (flash) setSucesso(flash);
    }, []);

    useEffect(() => {
        if (carregandoSessao) return;
        // Admin não acessa pastas (as regras também bloqueiam)
        if (!user || user.role === 'admin') {
            setCarregando(false);
            return;
        }
        (async () => {
            const { success, pastas } = await PastaServices.minhas(user.uid);
            setPastas(pastas);
            setErro(!success);
            setCarregando(false);
        })();
    }, [carregandoSessao, user]);
    // ======================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando as pastas...</p>
            </div>
        );

    if (user?.role === 'admin')
        return <p className="ff-default text-[16px]">Administradores não acessam as pastas dos alunos, para proteger os dados de saúde das crianças.</p>;

    const ehMae = user?.role === 'mae';

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                <h1 className="font-bold text-[20px]">
                    {ehMae ? 'Pastas dos seus filhos' : 'Pastas em que você foi incluído(a)'}
                </h1>
                {ehMae && <AppButton title="Nova pasta" icon="plus" href="/admin/pastas/nova" form="round" />}
            </div>

            <p role="status" className={`${COR_SUCESSO} ff-default text-[16px] mb-3`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>

            {erro && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] mb-3`}>Erro: não foi possível carregar as pastas. Tente novamente mais tarde</p>}

            {!erro && pastas.length === 0 && (
                <p className="ff-default text-[16px]">
                    {ehMae
                        ? 'Você ainda não criou nenhuma pasta. Toque em "Nova pasta" para começar.'
                        : 'Você ainda não foi incluído(a) em nenhuma pasta. Peça à família o link de convite.'}
                </p>
            )}

            {pastas.length > 0 && <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Aluno</th>
                            <th className="py-2 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Série</th>
                        </tr>
                    </thead>

                    <tbody>
                        {pastas.map(pasta => (
                            <tr key={pasta.id}>
                                <td className="py-2 px-4 border-b border-gray-200 text-[16px]">{pasta.nomeAluno}</td>
                                <td className="py-2 px-4 border-b border-gray-200 text-[16px]">{SERIE_LABELS[pasta.serie] ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>}
        </>
    )
}
