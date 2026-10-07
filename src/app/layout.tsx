import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import RegistrarServiceWorker from "./_pwa/registrar-service-worker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonte das telas (.ff-default). O next/font baixa a fonte no build e a
// serve junto com o site: nenhuma requisição externa quando a página abre
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Cada página define o próprio título; ele aparece como "Página | Conecta TDAH SUS"
export const metadata: Metadata = {
  title: {
    default: "Conecta TDAH SUS",
    template: "%s | Conecta TDAH SUS",
  },
  description: "Comunicação entre escola, família e médicos do SUS no acompanhamento de estudantes com TDAH (projeto acadêmico).",
  applicationName: "Conecta TDAH SUS",
  // iPhone: nome e modo tela cheia ao "Adicionar à Tela de Início"
  appleWebApp: { capable: true, title: "Conecta TDAH", statusBarStyle: "default" },
};

// Cor da barra do navegador/aplicativo instalado: o cinza-claro do cabeçalho
// do design (a barra de status do celular fica da mesma cor, com ícones escuros)
export const viewport: Viewport = {
  themeColor: "#f5f5f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // lang="pt-BR": o leitor de tela (e a futura leitura em voz alta) usa a
  // pronúncia do português. Os ícones vêm da fonte local (styles/ionicons.css),
  // sem scripts externos
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
