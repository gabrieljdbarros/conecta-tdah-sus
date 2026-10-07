"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CategoriaServices from "@/services/categoria";
import { AppButton, AppLoader } from "@/themes/components";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashData } from "@/helpers/router";
import { Categoria, CATEGORIAS_SUGERIDAS } from "@/types/categoria";

// Cores com contraste mínimo de 4,5:1 sobre fundo claro (WCAG AA)
const COR_ERRO = 'text-[#B91C1C]';
const COR_SUCESSO = 'text-[#166534]';

const CLASSE_TH = "py-2 px-4 border-b border-gray-300 text-left text-[16px] font-semibold text-gray-700";
const CLASSE_TD = "py-2 px-4 border-b border-gray-300 text-[16px]";
const CLASSE_ACAO = "min-h-[48px] px-4 inline-flex items-center rounded-full border-2 ff-default text-[16px] cursor-pointer";

export default function CategoriaList() {
    const { user, loading: carregandoSessao } = useAuth();
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const [salvando, setSalvando] = useState<string | null>(null); // id em alteração, ou 'sugestoes'

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
        setErro(success ? null : 'Não deu para carregar as categorias. Toque em "Tentar de novo".');
        setCarregando(false);
    }, []);

    useEffect(() => {
        if (carregandoSessao) return;
        if (!ehAdmin) { setCarregando(false); return; }
        carregar();
    }, [carregandoSessao, ehAdmin, carregar]);

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

    // Desativar pode ser desfeito (Reativar), então não pede confirmação.
    // O botão não é desabilitado durante o salvamento (só ignora cliques):
    // desabilitar tiraria o foco dele, e quem usa teclado perderia o lugar
    const alternarAtiva = async (categoria: Categoria) => {
        if (salvando) return;
        setErro(null);
        setSucesso(null);
        setSalvando(categoria.id);
        const { success } = await CategoriaServices.definirAtiva(categoria.id, !categoria.ativa);
        setSalvando(null);
        if (success) {
            setSucesso(categoria.ativa
                ? `"${categoria.nome}" foi desativada. Você pode reativar depois`
                : `"${categoria.nome}" foi reativada`);
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
                <h2 className="ff-default text-[24px] font-extrabold leading-tight text-(--cor-texto)">Categorias cadastradas</h2>
                <AppButton title="Nova categoria" icon="plus" href="/admin/categorias/nova" form="round" />
            </div>

            <div className="ff-default text-[16px] mb-3 flex flex-col gap-1">
                <p>As categorias ajudam a organizar os relatórios (por exemplo, &quot;Sono&quot;). Elas não mudam quem pode ler cada relatório.</p>
                <p><strong>Desativar não apaga a categoria.</strong> Ela só deixa de aparecer em relatórios novos. Os relatórios antigos continuam com ela, e você pode reativar quando quiser.</p>
            </div>

            {/* Anunciado pelo leitor de tela (role="status"); o foco fica onde a pessoa está */}
            <p role="status" className={`${COR_SUCESSO} ff-default text-[16px] mb-3 empty:hidden`}>
                {sucesso && `Pronto: ${sucesso}`}
            </p>
            {erro && <p role="alert" className={`${COR_ERRO} ff-default text-[16px] mb-3`}>Erro: {erro}</p>}
            {erro && categorias.length === 0 && (
                <AppButton title="Tentar de novo" icon="refresh" onClick={() => { setCarregando(true); carregar(); }} form="round" />
            )}

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

            {categorias.length > 0 && <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-300">
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
                                {/* O nome da categoria vai em texto oculto: o leitor de tela diz
                                    "Editar Sono", e o nome acessível começa pelo texto visível */}
                                <td className={CLASSE_TD}>
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={`/admin/categorias/editar/${c.id}`}
                                            className={`${CLASSE_ACAO} border-(--cor-link) text-(--cor-link)`}>
                                            Editar<span className="sr-only"> {c.nome}</span>
                                        </Link>
                                        {/* Cor neutra: desativar não é destrutivo (dá para reativar) */}
                                        <button type="button" onClick={() => alternarAtiva(c)} aria-disabled={salvando === c.id}
                                            className={`${CLASSE_ACAO} border-(--cor-link) text-(--cor-link) aria-disabled:cursor-not-allowed`}>
                                            {salvando === c.id ? 'Salvando...' : c.ativa ? 'Desativar' : 'Reativar'}
                                            <span className="sr-only"> {c.nome}</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>}
        </>
    );
}
