import { Metadata } from "next";
import React from "react";
import { AppMenu } from "@/themes/components";

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
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3 focus:rounded-xl focus:border-2 focus:border-(--primary-color)">
          Pular para o conteúdo
        </a>
        {/* MENU */}
        <AppMenu />


        {/* MAIN */}
        <div className="flex flex-1 ml-[30px]">
            {children}
        </div>
    </div>
  );
}
