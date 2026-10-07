import Image from "next/image";
import { AppLogo } from "@/themes/components";

/**
 * Moldura das telas de entrada (boas-vindas, login, cadastro). No celular,
 * só o conteúdo, como no design. No computador (lg), a ilustração do design
 * ocupa a metade esquerda
 */
export default function MolduraEntrada({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-(--background-primary)">
            {/* ESQUERDA (computador): decorativa */}
            <div className="flex-1 flex-col gap-8 justify-center items-center bg-(--background-secondary) hidden lg:flex">
                <AppLogo />
                {/* Sem "priority": no celular (escondida) o navegador não a baixa */}
                <Image src="/assets/img/boas-vindas.png" alt="" width={456} height={356} />
            </div>

            {/* DIREITA */}
            <main className="flex flex-1 justify-center items-center flex-col px-4 py-10">
                {children}
            </main>
        </div>
    );
}
