import { Metadata } from "next";
import AceitarConvite from "./_aceitar";

// ===============================================
export const metadata: Metadata = {
  title: 'Convite para acompanhar um aluno',
};
// ===============================================
// Fica fora de /admin: quem recebe o link pode ainda não ter conta.
// No Next 15, `params` de rota dinâmica chega como Promise
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    return (
        <main className="flex min-h-screen justify-center items-center bg-(--background-primary) px-4 py-10">
            <AceitarConvite token={token} />
        </main>
    );
}
