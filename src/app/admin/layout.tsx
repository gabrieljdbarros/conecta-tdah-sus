import { Metadata } from "next";
import React from "react";
import { AppBarraInferior, AppMenu } from "@/themes/components";

// ===============================================
export const metadata: Metadata = {
  title: 'Gerenciador Web',
};
// ===============================================

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-(--background-secondary) flex h-screen">
        {/* Primeiro item do Tab: pula o menu e vai direto ao conteúdo */}
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3 focus:rounded-xl focus:border-2 focus:border-(--cor-link)">
          Pular para o conteúdo
        </a>
        {/* MENU lateral (computador) */}
        <AppMenu />

        {/* MAIN */}
        <div className="flex flex-1 min-w-0 md:ml-[30px]">
            {children}
        </div>

        {/* Barra de abas (celular): depois do conteúdo, para o Tab e o leitor
            de tela chegarem nela no fim, onde ela aparece na tela */}
        <AppBarraInferior />
    </div>
  );
}
