import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * ATÉ ONDE A PESSOA VIU CADA CONVERSA, SÓ NESTE APARELHO (decidido em
 * 04/11/2026, opção A). Serve para marcar, de forma discreta, as pastas com
 * mensagem nova. O servidor nunca sabe quem leu o quê: a leitura de
 * mensagens de texto continua sem registro (RN09) e nenhum dado a mais é
 * coletado (LGPD: minimização).
 *
 * Guarda só o id da pasta e a data (do SERVIDOR) da última mensagem vista,
 * separado por usuário (celular compartilhado). Nada de nomes nem de texto.
 * Limite conhecido: o que foi lido na web ou em outro celular não conta aqui.
 * Ao sair da conta, tudo é apagado (celular compartilhado: não fica rastro
 * de quais pastas a pessoa abriu)
 */
type Vistas = Record<string, number>;
const chave = (uid: string) => `vistas:${uid}`;

const VistasServicos = {
    ler: async (uid: string): Promise<Vistas> => {
        try {
            const texto = await AsyncStorage.getItem(chave(uid));
            return texto ? (JSON.parse(texto) as Vistas) : {};
        } catch {
            return {};
        }
    },

    /** Marca a conversa como vista até `criadoEm` (nunca volta para trás) */
    marcar: async (uid: string, pastaId: string, criadoEm: number): Promise<void> => {
        try {
            const vistas = await VistasServicos.ler(uid);
            if ((vistas[pastaId] ?? 0) >= criadoEm) return;
            vistas[pastaId] = criadoEm;
            await AsyncStorage.setItem(chave(uid), JSON.stringify(vistas));
        } catch {
            // Sem conseguir guardar, a pasta só continua marcada como nova
        }
    },

    /** Esquece as pastas de que a pessoa não participa mais (a lista não cresce sem fim) */
    podar: async (uid: string, pastasAtuais: string[]): Promise<void> => {
        try {
            const vistas = await VistasServicos.ler(uid);
            const atuais = new Set(pastasAtuais);
            const sobram = Object.fromEntries(Object.entries(vistas).filter(([id]) => atuais.has(id)));
            if (Object.keys(sobram).length !== Object.keys(vistas).length)
                await AsyncStorage.setItem(chave(uid), JSON.stringify(sobram));
        } catch {
            // Fica para a próxima vez
        }
    },

    /** Ao sair da conta */
    apagar: async (uid: string): Promise<void> => {
        try { await AsyncStorage.removeItem(chave(uid)); } catch { /* nada a fazer */ }
    },
};

export default VistasServicos;
