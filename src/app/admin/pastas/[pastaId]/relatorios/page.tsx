import { AppMainContainer } from "@/themes/components";
import ListaRelatorios from "./_lista";
import { tipoDoEndereco } from "./_comum";

export const metadata = {
    title: 'Relatórios'
}
// ==========================================================
// No Next 15, `params` e `searchParams` chegam como Promise
export default async function RelatoriosPage({ params, searchParams }: {
    params: Promise<{ pastaId: string }>,
    searchParams: Promise<{ [chave: string]: string | string[] | undefined }>,
}) {
    const { pastaId } = await params;
    const tipo = tipoDoEndereco((await searchParams).tipo);

    // ==========================================================
    // "Orientações" (atalho da pasta) é esta tela filtrada pelo tipo
    return (
        <AppMainContainer title={tipo === 'orientacao_medica' ? 'Orientações' : 'Relatórios'}
            voltar={`/admin/pastas/${pastaId}`} voltarRotulo="Voltar para a pasta">
            <ListaRelatorios pastaId={pastaId} tipo={tipo} />
        </AppMainContainer>
    )
}
