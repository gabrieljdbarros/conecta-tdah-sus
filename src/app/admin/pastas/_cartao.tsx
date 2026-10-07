import Link from "next/link";
import { Pasta, SERIE_LABELS } from "@/types/pasta";

/**
 * Cartão de uma pasta (aluno), no estilo do design. O cartão inteiro é o
 * link (alvo grande), e o nome do aluno é o nome do link
 */
export function CartaoPasta({ pasta }: { pasta: Pasta }) {
    return (
        <Link href={`/admin/pastas/${pasta.id}`}
            className="flex items-center gap-4 min-h-[80px] p-4 bg-white rounded-xl border border-gray-200 shadow-sm ff-default">
            <span aria-hidden="true" className="flex items-center justify-center w-[48px] h-[48px] shrink-0 rounded-full bg-(--background-secondary) text-(--cor-link) text-[24px]">
                <i className="ion-folder" />
            </span>
            <span className="flex flex-col flex-1 min-w-0">
                <span className="text-[18px] font-bold text-(--cor-texto) break-words">{pasta.nomeAluno}</span>
                <span className="text-[16px] text-(--cor-texto-suave)">{SERIE_LABELS[pasta.serie] ?? ''}</span>
            </span>
            <i className="ion-chevron-right text-[20px] text-(--cor-texto-suave)" aria-hidden="true" />
        </Link>
    );
}

/** Lista de cartões de pastas */
export function ListaPastas({ pastas }: { pastas: Pasta[] }) {
    return (
        <ul className="flex flex-col gap-3">
            {pastas.map((pasta) => <li key={pasta.id}><CartaoPasta pasta={pasta} /></li>)}
        </ul>
    );
}

/**
 * Convite para a mãe criar a primeira pasta (cartão "Cadastre o estudante"
 * do design). Rótulo pequeno em verde-petróleo (5,8:1 no fundo do cartão), não em laranja
 */
export function CartaoCriarPasta() {
    return (
        <div className="flex flex-col gap-2 p-5 rounded-xl border border-gray-200 bg-linear-to-br from-white to-[#FFF1E0]">
            <p className="ff-default text-[16px] font-bold tracking-wide uppercase text-(--cor-secundaria)">Pasta do aluno</p>
            <h2 className="ff-default text-[26px] font-extrabold text-(--cor-texto) leading-tight">Cadastre o aluno</h2>
            <p className="ff-default text-[16px] text-(--cor-texto)">
                Com poucas informações você já pode começar a conectar a escola e os médicos. Sem burocracia.
            </p>
            <Link href="/admin/pastas/nova"
                className="mt-2 min-h-[48px] px-6 flex items-center justify-center gap-2 rounded-full bg-(--cor-destaque) text-white ff-default text-[19px] font-bold">
                <i className="ion-plus" aria-hidden="true" />Criar pasta do aluno
            </Link>
        </div>
    );
}
