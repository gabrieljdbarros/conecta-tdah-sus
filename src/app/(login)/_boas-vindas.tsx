"use client";
import Image from "next/image";
import { AppButton, AppOuvir } from "@/themes/components";
import { marcarIntroducaoVista } from "@/helpers/introducao";

const TEXTO = 'O Conecta TDAH SUS reúne informações do acompanhamento escolar e de saúde em um só lugar, aproximando família, escola e profissionais de saúde.';

/**
 * "Primeira vez no aplicativo?" — aparece só para quem nunca passou dela
 * neste aparelho. Qualquer opção (pular, criar conta, já tenho conta)
 * marca como vista; `aoSair` mostra o login
 */
export default function BoasVindas({ aoSair }: { aoSair: () => void }) {
    return (
        <div className="w-full max-w-[400px] flex flex-col items-center text-center">
            <button type="button" onClick={aoSair}
                className="self-end min-h-[48px] px-2 ff-default text-[16px] font-bold text-(--cor-link) underline cursor-pointer">
                Pular introdução
            </button>

            {/* No computador, a ilustração já aparece na metade esquerda */}
            <Image src="/assets/img/boas-vindas.png" alt="" width={300} height={234} priority className="my-4 lg:hidden" />

            {/* Título laranja: só em tamanho grande, negrito e sobre branco (texto grande, 3,1:1) */}
            <h1 className="ff-default text-[32px] leading-tight font-extrabold text-(--cor-destaque)">Primeira vez no aplicativo?</h1>
            <p className="ff-default text-[18px] leading-relaxed text-(--cor-texto) mt-4">{TEXTO}</p>

            {/* Espaço reservado: o botão "Ouvir" aparece depois de verificar as vozes
                e não pode empurrar os botões abaixo na hora do toque */}
            <div className="min-h-[48px] mt-4">
                <AppOuvir rotulo="Ouvir instruções"
                    texto={`${TEXTO} Para criar a sua conta, toque em Criar minha conta. Se você já tem conta, toque em Já possuo uma conta.`} />
            </div>

            {/* Marca como vista antes de ir para o cadastro */}
            <div className="w-full flex flex-col mt-6" onClickCapture={marcarIntroducaoVista}>
                {/* No design: "Acessar Conecta TDAH SUS". O texto diz o que o botão faz */}
                <AppButton title="Criar minha conta" href="/cadastro" className="w-full" />
            </div>
            <button type="button" onClick={aoSair}
                className="min-h-[48px] mt-3 px-4 ff-default text-[18px] text-(--cor-link) underline cursor-pointer">
                Já possuo uma conta
            </button>
        </div>
    );
}
