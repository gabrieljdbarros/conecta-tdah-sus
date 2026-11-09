import Image from "next/image";
import { AppMainContainer, AppOuvir } from "@/themes/components";
import { instrucoesSobre, SOBRE } from "@/helpers/sobre";

export const metadata = {
    title: 'Sobre o aplicativo'
}

const CARTAO = "bg-white rounded-2xl border border-gray-300 shadow-sm p-4";

/**
 * Sobre o aplicativo (RF15): quem fez o app, em cartões. O texto vem de
 * src/helpers/sobre.ts (o mesmo do app). Aberta pelo menu lateral
 * (computador) ou pelo Perfil (celular), fora da barra de abas.
 * A função de cada pessoa vai escrita embaixo do nome, em letra normal
 */
export default function SobrePage() {
    return (
        <AppMainContainer title="Sobre o aplicativo">
            <div className="flex flex-col gap-4 max-w-[640px] ff-default text-(--cor-texto)">
                <AppOuvir rotulo="Ouvir instruções" className="self-start" texto={instrucoesSobre(false)} />

                {/* Abertura: girassol, nome, frase e o que o app faz */}
                <section aria-labelledby="sobre-nome" className={`${CARTAO} flex flex-col items-center gap-2 text-center`}>
                    <Image src="/assets/img/girassol.png" alt="" width={72} height={80} className="h-auto" />
                    <h2 id="sobre-nome" className="text-[24px] font-extrabold">{SOBRE.nome}</h2>
                    <p className="text-[18px] font-bold text-(--cor-link)">{SOBRE.subtitulo}</p>
                    <p className="text-[17px] leading-relaxed">{SOBRE.descricao}</p>
                </section>

                <section aria-labelledby="sobre-instituicao" className="flex flex-col gap-3 mt-2">
                    <h2 id="sobre-instituicao" className="text-[24px] font-extrabold">Desenvolvido por</h2>
                    <div className={CARTAO}>
                        {/* Logos lado a lado; em tela estreita, um embaixo do outro */}
                        <div className="flex flex-wrap items-center justify-center gap-6 mb-3">
                            <Image src="/assets/img/cesmac-citec.png" alt="Logo do CESMAC CITEC" width={88} height={80} />
                            <Image src="/assets/img/cesmac.png" alt="Logo do Centro Universitário CESMAC" width={140} height={40} />
                        </div>
                        <p className="text-[18px] font-bold">{SOBRE.instituicao}</p>
                        <p className="text-[17px]">{SOBRE.sobreInstituicao}</p>
                    </div>
                </section>

                {SOBRE.secoes.map((secao, s) => (
                    <section key={secao.titulo} aria-labelledby={`sobre-secao-${s}`} className="flex flex-col gap-3 mt-2">
                        <h2 id={`sobre-secao-${s}`} className="text-[24px] font-extrabold">{secao.titulo}</h2>
                        <ul className={`${CARTAO} py-1`}>
                            {secao.pessoas.map((p) => (
                                <li key={p.nome} className="py-3 border-b border-[#EEF0F3] last:border-b-0">
                                    <p className="text-[18px] font-bold">{p.nome}</p>
                                    <p className="text-[17px] font-bold text-(--cor-link)">{p.papel}</p>
                                    <p className="text-[16px] text-(--cor-texto-suave)">{p.funcao}</p>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}

                {/* Aviso: trabalho de faculdade (o do questionário fica só no app, que é onde ele existe) */}
                <p className="mt-2 flex gap-3 rounded-2xl bg-[#EEF2FF] p-4 text-[17px]">
                    <i className="ion-information-circled text-[24px] leading-none text-(--cor-link)" aria-hidden="true" />
                    <span>{SOBRE.aviso}</span>
                </p>

                <p className="text-center text-[16px] text-(--cor-texto-suave)">{SOBRE.rodape}</p>
            </div>
        </AppMainContainer>
    )
}
