import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

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
      </body>
    </html>
  );
}
