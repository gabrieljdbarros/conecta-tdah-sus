"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CategoriaServices from "@/services/categoria";
import { AppButton, AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData } from "@/helpers/router";
import { Categoria, CATEGORIAS_SUGERIDAS } from "@/types/categoria";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';

const CLASSE_TH = "py-2 px-4 border-b border-gray-200 text-left text-[16px] font-semibold text-gray-700";
const CLASSE_TD = "py-2 px-4 border-b border-gray-200 text-[16px]";
const CLASSE_ACAO = "min-h-[48px] px-4 inline-flex items-center rounded-full border-2 ff-default text-[16px] cursor-pointer";

export default function CategoriaList() {
    const { user, loading: carregandoSessao } = useAuth();
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const [salvando, setSalvando] = useState<string | null>(null); // id em alteração, ou 'sugestoes'
    const sucessoRef = useRef<HTMLParagraphElement>(null);

    const ehAdmin = user?.role === 'admin';

    // ======================================================================
    useEffect(() => {
        // Mensagem deixada pelo formulário ("Categoria criada" etc.)
        const flash = getFlashData();
        if (flash) setSucesso(flash);
    }, []);

    const carregar = useCallback(async () => {
        const { success, categorias } = await CategoriaServices.listar();
        setCategorias(categorias);
        if (!success) setErro('Não deu para carregar as categorias. Tente novamente mais tarde');
        setCarregando(false);
    }, []);

    useEffect(() => {
        if (carregandoSessao) return;
        if (!ehAdmin) { setCarregando(false); return; }
        carregar();
    }, [carregandoSessao, ehAdmin, carregar]);

    useEffect(() => { if (sucesso && !carregando) sucessoRef.current?.focus(); }, [sucesso, carregando]);
    // ======================================================================
    const adicionarSugeridas = async () => {
        setErro(null);
        setSucesso(null);
        setSalvando('sugestoes');
        const { success, message } = await CategoriaServices.criar(CATEGORIAS_SUGERIDAS);
        setSalvando(null);
        if (success) {
            setSucesso(`${CATEGORIAS_SUGERIDAS.length} categorias sugeridas adicionadas`);
            await carregar();
        } else
            setErro(message ?? 'Não foi possível adicionar as categorias');
    };

    // Desativar pode ser desfeito (Reativar), então não pede confirmação
    const alternarAtiva = async (categoria: Categoria) => {
        setErro(null);
        setSucesso(null);
        setSalvando(categoria.id);
        const { success } = await CategoriaServices.definirAtiva(categoria.id, !categoria.ativa);
        setSalvando(null);
        if (success) {
            setSucesso(`"${categoria.nome}" foi ${categoria.ativa ? 'desativada' : 'reativada'}`);
            await carregar();
        } else
            setErro('Não foi possível salvar. Tente novamente');
    };
    // ======================================================================
    if (carregandoSessao || carregando)
        return (
            <div role="status" className="flex flex-col items-center gap-3">
                <AppLoader size={50} className="self-center" />
                <p className="ff-default text-[16px]">Carregando as categorias...</p>
            </div>
        );

    // Checagem de UX — as Security Rules também só deixam o admin alterar
    if (!ehAdmin)
        return <p className="ff-default text-[16px]">Só administradores gerenciam as categorias de acompanhamento.</p>;

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                <h2 className="font-bold text-[20px]">Categorias</h2>
                <AppButton title="Nova categoria" icon="plus" href="/admin/categorias/nova" form="round" />
            </div>

            <p className="ff-default text-[16px] mb-3">
                As categorias ajudam a organizar os relatórios (por exemplo, &quot;Sono&quot; ou &quot;Atenção&quot;).
                Elas não mudam quem pode ler cada relatório. Categorias desativadas deixam de aparecer para
                relatórios novos, mas continuam nos relatórios antigos.
            </p>

            <p ref={sucessoRef} tabIndex={-1} role="status" className={`${COR_SUCESSO} ff-default text-[16px] mb-3 empty:hidden`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>
            {erro && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] mb-3`}>Erro: {erro}</p>}

            {/* LISTA VAZIA: oferece as sugestões como ponto de partida */}
            {categorias.length === 0 && !erro && (
                <div className="flex flex-col items-start gap-3">
                    <p className="ff-default text-[16px]">Ainda não há categorias. Você pode começar pelas sugestões:</p>
                    <ul className="ff-default text-[16px] list-disc pl-6">
                        {CATEGORIAS_SUGERIDAS.map((nome) => <li key={nome}>{nome}</li>)}
                    </ul>
                    <AppButton title={salvando === 'sugestoes' ? 'Adicionando...' : 'Adicionar categorias sugeridas'} icon="checkmark"
                        onClick={adicionarSugeridas} disabled={salvando === 'sugestoes'} form="round" />
                </div>
            )}

            {categorias.length > 0 && <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <caption className="sr-only">Lista das categorias de acompanhamento</caption>
                    <thead>
                        <tr>
                            <th scope="col" className={CLASSE_TH}>Nome</th>
                            <th scope="col" className={CLASSE_TH}>Situação</th>
                            <th scope="col" className={CLASSE_TH}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categorias.map((c) => (
                            <tr key={c.id}>
                                <th scope="row" className={`${CLASSE_TD} text-left font-normal`}>{c.nome}</th>
                                <td className={CLASSE_TD}>
                                    {c.ativa ? 'Ativa' : <span className="text-gray-700">Desativada</span>}
                                </td>
                                <td className={`${CLASSE_TD} flex flex-wrap gap-2`}>
                                    <Link href={`/admin/categorias/editar/${c.id}`} aria-label={`Editar ${c.nome}`}
                                        className={`${CLASSE_ACAO} border-(--primary-color) text-(--primary-color)`}>
                                        Editar
                                    </Link>
                                    <button type="button" onClick={() => alternarAtiva(c)} disabled={salvando === c.id}
                                        aria-label={`${c.ativa ? 'Desativar' : 'Reativar'} ${c.nome}`}
                                        className={`${CLASSE_ACAO} ${c.ativa ? 'border-[#B91C1C] text-[#B91C1C]' : 'border-[#166534] text-[#166534]'} disabled:opacity-50`}>
                                        {salvando === c.id ? 'Salvando...' : c.ativa ? 'Desativar' : 'Reativar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>}
        </>
    );
}
