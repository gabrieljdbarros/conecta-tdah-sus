# Conecta TDAH SUS

> 🚧 **Projeto em desenvolvimento.** Trabalho de Conclusão de Curso (TCC) em andamento. Funcionalidades, modelo de dados e telas ainda podem mudar.

**Ponte de comunicação** entre **família** (mães/responsáveis), **escola** e **profissionais de psiquiatria do SUS** no acompanhamento de estudantes com TDAH.

**Fluxo central:** a família cria a pasta do aluno e convida a escola e o médico → todos conversam no **chat em grupo da pasta**, sem a família precisar repetir o histórico a cada consulta.

> **Mudança de escopo (20/10/2026):** a pedido da equipe da cliente, o sistema passou a ter só o chat em grupo. Os relatórios, as categorias e o canal privado mãe–médico saíram. A versão apresentada na pré-banca, com eles, está na tag [`v2.0-pre-banca`](../../tree/v2.0-pre-banca). Próximos passos: pasta só com o nome da criança, migração para o Supabase e mensagens de voz.

> **Escopo acadêmico:** este é um produto acadêmico. **Não há integração real com sistemas do SUS**, e todos os dados usados em desenvolvimento e testes são **fictícios**.

---

## Status

| Funcionalidade | Situação |
|---|---|
| Cadastro multiperfil (mãe/responsável, escola, médico) e login | ✅ Pronto |
| Edição do próprio perfil | ✅ Pronto |
| Pasta do aluno, criada pela mãe/responsável (RF03) | ✅ Pronto |
| Ajustes de privacidade do perfil (nome da criança só na pasta; admin sem troca de perfil) | ✅ Pronto |
| Convite por link para vincular escola e médico, com expiração e uso único (RN01, RN02) | ✅ Pronto (no modo emulador) |
| Lista de quem acompanha o aluno e cancelamento de convite | ✅ Pronto (no modo emulador) |
| Remover participante e sair da pasta | ✅ Pronto (no modo emulador) |
| Chat em grupo por aluno, em tempo real (RN05, RF08) | ✅ Pronto |
| Mensagens de voz no chat (RF16) | ⏳ Depois da migração para o Supabase |
| Aplicativo instalável no celular (PWA) | ✅ Pronto |
| Leitura em voz alta: instruções das telas e mensagens | ✅ Pronto |
| App nativo em React Native (Expo) para mãe, escola e médico | ✅ Pronto (testado no Android, sem publicação nas lojas) |

## Perfis e acesso

Cada aluno tem uma **pasta**, criada pela mãe/responsável. A escola e o médico entram por convite. Cada pasta tem **um chat em grupo**: todos os membros da pasta leem e escrevem, e as mensagens não podem ser editadas nem apagadas. O **administrador** gerencia os usuários, mas **não acessa as pastas nem as conversas**.

## Segurança e LGPD

O sistema lida com **dados de saúde de crianças e adolescentes**, que a LGPD classifica como dados pessoais sensíveis. Por isso:

- **As permissões ficam nas Firestore Security Rules** (`firestore.rules`), com base no perfil do usuário e no vínculo com a pasta. As checagens nas telas servem só para a experiência de uso.
- **As regras têm testes automatizados** no Firebase Emulator, e toda mudança nelas é testada antes de ir para produção.
- **A senha fica só no Firebase Authentication**, nunca no banco de dados.
- **Só guardamos o necessário (minimização).** A pasta guarda apenas o nome e a série do aluno, e o nome da criança não fica no perfil da família.
- **A leitura em voz alta não envia dados de saúde para fora.** As instruções das telas podem usar qualquer voz em português. Já as mensagens só são lidas com uma voz que roda no próprio aparelho, porque algumas vozes do navegador mandam o texto para servidores externos gerarem o áudio. Se o aparelho não tiver uma voz local em português, o botão de ouvir o conteúdo não aparece.
  - **Limite (para a defesa):** quem informa se a voz roda no aparelho é o próprio navegador (`localService`), e o app não consegue conferir isso. Alguns motores de voz de fabricantes no Android podem se declarar locais e ainda usar a internet.
  - **Para ouvir as mensagens no computador,** é preciso ter uma voz em português instalada no sistema. No Windows: Configurações → Hora e idioma → Fala → Adicionar vozes → Português (Brasil), voz "Microsoft Maria". Depois, reinicie o navegador. Sem ela, o botão de ouvir o conteúdo não aparece, e as instruções continuam podendo ser ouvidas.
  - **Ditado pelo microfone do teclado:** a dica na tela sugere usar o microfone do teclado para falar em vez de digitar. Esse ditado é um recurso do teclado do celular (Google, Apple etc.), escolhido pela pessoa no aparelho dela, e pode enviar o áudio para os servidores desse teclado. O app não recebe nem guarda áudio.
- **O convite é um link que vale 48 horas e só funciona uma vez.** O banco guarda só o *hash* do link, então nem quem acessa o banco consegue montar um link válido. O vínculo é feito por uma Cloud Function, numa transação, que confere se a conta é do perfil certo (escola ou médico).

## Tecnologias

- **Painel web:** [Next.js 15](https://nextjs.org/), TypeScript, Tailwind CSS, Formik e Yup
- **App nativo:** [Expo](https://expo.dev/) (React Native) com expo-router, na pasta `mobile/`
- **Backend:** Firebase (Authentication, Firestore e Cloud Functions)
- **Testes:** Firebase Emulator, `@firebase/rules-unit-testing` e o executor de testes nativo do Node.js

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 22 ou superior
- [JDK 21](https://adoptium.net/): para os emuladores do Firebase e os testes
- Um projeto no [Firebase](https://console.firebase.google.com/) com **Authentication (e-mail/senha)** e **Firestore** ativados. Só é necessário fora do modo protótipo.

```bash
git clone https://github.com/gabrieljdbarros/conecta-tdah-sus.git
cd conecta-tdah-sus
npm install
npm --prefix functions install
```

### Modo protótipo (emuladores, recomendado)

Tudo roda no seu computador, com dados fictícios, sem precisar de um projeto Firebase. As Cloud Functions do convite, por enquanto, funcionam **só** nesse modo, porque publicá-las exige o plano pago Blaze.

1. Copie `.env.local.example` para `.env.local` e coloque `NEXT_PUBLIC_USE_EMULATORS=true`.
2. Em um terminal, suba os emuladores e deixe-os abertos:
   ```bash
   npm run emulators
   ```
   Os dados são salvos em `.emulator-data/` quando você fecha o terminal com Ctrl+C, e são recarregados na próxima vez.
3. Em outro terminal, inicie o site:
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000 e crie as contas de teste (mãe, escola e médico) pelo cadastro.
4. A interface dos emuladores fica em http://localhost:4000. Ela mostra os dados em tempo real e permite transformar uma conta de teste em **administrador**: em *Firestore*, abra `users` → documento da conta e troque `role` para `admin`. Isso vale **só para o emulador**. A interface ignora as regras de segurança e roda apenas no seu computador (127.0.0.1).

### Com um projeto Firebase real

1. Copie `.env.local.example` para `.env.local`, preencha com as chaves do app web do seu projeto Firebase e deixe `NEXT_PUBLIC_USE_EMULATORS=false`. O `.env.local` **não** é versionado.
2. Vincule o repositório ao seu projeto e publique as regras de segurança:
   ```bash
   npx firebase login
   npx firebase use --add
   npx firebase deploy --only firestore:rules
   ```
3. Inicie o servidor local:
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000.

> Para ter uma conta de **administrador**, cadastre-se normalmente e troque o campo `role` do seu documento para `admin` no Console do Firestore. O cadastro pela tela não permite criar administradores, e isso é proposital.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local de desenvolvimento |
| `npm run emulators` | Emuladores de Auth, Firestore e Functions para o modo protótipo |
| `npm run emulators:rede` | Os mesmos emuladores, abertos para a rede local (para o app no celular; use só em rede confiável) |
| `npm run test:rules` | Testes das Security Rules no Firestore Emulator |
| `npm run test:functions` | Testes das Cloud Functions do convite nos emuladores |
| `npm run test:unit` | Testes de lógica sem emulador (ex.: escolha da voz da leitura em voz alta) |
| `npm run lint` | Verificação de código |
| `npm run build` | Build de produção |
| `npm run preview` | Build e abre a versão de produção, para testar o PWA (pare o `npm run dev` antes) |

> Os testes usam emuladores próprios, em outras portas (`firebase.test.json`). Por isso, rodam mesmo com os emuladores do modo protótipo abertos, sem misturar os dados.

## Instalar no celular (PWA)

O painel pode ser instalado como um aplicativo, com ícone na tela inicial, sem loja de aplicativos:

- **Android (Chrome):** abra o site, toque nos **três pontinhos** no canto de cima e depois em **"Instalar aplicativo"**. Em alguns celulares o nome é **"Adicionar à tela inicial"**.
- **iPhone:** abra o site no **Safari**, porque o Chrome do iPhone não instala. Toque no botão **Compartilhar**, o quadrado com uma seta na barra de baixo, e depois em **"Adicionar à Tela de Início"**.

> TODO: levar essas instruções para dentro do app, numa tela "Como instalar" com passos e imagens, em linguagem simples.

Professores e médicos não precisam instalar nada: o mesmo endereço funciona no navegador.

> **Privacidade:** o aplicativo **não guarda dados no aparelho**, nem pastas, nem conversas. Ele guarda só os arquivos fixos do site, para abrir mais rápido. Sem internet, mostra a tela "Você está sem internet". Muitas famílias dividem o celular, e dados de saúde de crianças não devem ficar salvos nele.

Para testar no computador, com o `npm run dev` **parado**: rode `npm run preview` e abra http://localhost:3000. O Chrome mostra o botão de instalar na barra de endereço. A versão de produção não roda no modo emulador, então use `NEXT_PUBLIC_USE_EMULATORS=false`. No celular, a instalação exige o site publicado num endereço com HTTPS.

## Aplicativo nativo (React Native)

Na pasta `mobile/` fica um app **Expo** para **mãe, escola e médico**. O administrador continua usando só o painel web. O app usa **o mesmo Firebase, as mesmas Security Rules e as mesmas Cloud Functions** da web, e importa os tipos e a lógica pura de `src/types` e `src/helpers`. Assim, as regras de acesso existem num lugar só.

O app tem as mesmas funcionalidades da web para esses perfis: cadastro e login, pastas, convites e vínculos, chat e leitura em voz alta.

> O app **não é publicado nas lojas**: ele roda pelo **Expo Go**, ligado aos emuladores do computador pela rede Wi-Fi. No convite, a escola e o médico **colam o link** recebido. Abrir o app direto pelo link (deep link) exige o site publicado e fica para depois.

### Como rodar no celular

1. No celular (Android ou iPhone), instale o app **Expo Go** pela loja.
2. Ligue o computador e o celular na **mesma rede Wi-Fi**. Use uma rede confiável, como a de casa: a rede pública da faculdade pode bloquear a conexão entre os aparelhos.
3. Descubra o endereço do computador na rede. No Windows, rode `ipconfig` e procure a linha **"Endereço IPv4"** (ex.: `192.168.1.4`).
4. Na pasta `mobile/`, copie `.env.local.example` para `.env.local` e coloque esse endereço em `EXPO_PUBLIC_EMULADOR_HOST`. O `.env.local` **não** é versionado.
5. Na raiz do projeto, suba os emuladores abertos para a rede e deixe o terminal aberto:
   ```bash
   npm run emulators:rede
   ```
6. Em outro terminal, inicie o app:
   ```bash
   cd mobile
   npm install
   npx expo start --clear
   ```
7. Abra o Expo Go e leia o QR code que aparece no terminal.

**Se der erro de conexão:**
- *"Could not reach Cloud Firestore backend"* ou *"network-request-failed"*: o endereço do computador mudou, porque o roteador às vezes troca. Rode `ipconfig` de novo, corrija `EXPO_PUBLIC_EMULADOR_HOST` e reinicie com `npx expo start --clear`. Para não acontecer mais, reserve um endereço fixo para o computador no roteador ("reserva de DHCP").
- *"failed to download remote update"* no Expo Go: no Windows, a rede precisa estar como **Privada**, e o firewall precisa liberar as portas 8081 (Expo), 9099 (Auth), 8080 (Firestore) e 5001 (Functions).

### Comandos do app (dentro de `mobile/`)

| Comando | O que faz |
|---|---|
| `npx expo start --clear` | Inicia o app (o `--clear` relê o `.env.local`) |
| `npx expo install <pacote>` | Instala uma dependência na versão compatível com o Expo |
| `npx expo lint` | Verificação de código |
| `npx tsc --noEmit` | Verificação de tipos |

### Leitura em voz alta no app

Os botões "Ouvir instruções" usam qualquer voz em português. Já as mensagens só são lidas com uma voz que **comprovadamente roda no aparelho**, para que dado de saúde não vá a servidores externos. No Android, isso é a voz do Google marcada como do aparelho. Na dúvida, o app não lê. Se o botão "Ouvir" das mensagens não aparecer:

1. Abra Configurações do celular → **Saída de texto para voz** (em Acessibilidade ou em Gerenciamento geral).
2. Escolha **"Serviços de fala do Google"** como mecanismo preferido.
3. Em Instalar dados de voz → **Português (Brasil)**, baixe a voz.

> **Limitação conhecida:** a biblioteca de voz (`expo-speech`) não informa se uma voz do Google ainda não baixada usa a internet. Por isso, o passo 3 é importante.

## Estrutura principal

```
src/
  app/            Telas (login, cadastro, convite e área /admin)
  contexts/       Sessão do usuário (AuthContext)
  services/       Acesso ao Firebase (usuários, pastas, convites)
  themes/         Componentes visuais do template
  types/          Modelos de dados
mobile/           App nativo Expo (mãe, escola e médico)
  src/app/        Telas (expo-router)
  src/servicos/   Acesso ao Firebase e leitura em voz alta
functions/        Cloud Functions (gerar e aceitar convite)
tests/            Testes das Security Rules
tests/functions/  Testes das Cloud Functions
scripts/          Script que sobe os emuladores
firestore.rules   Regras de segurança do Firestore
```

## Autoria

- **Autor(es):** Gabriel José Dias Barros
- **Orientador(a):** Wagner Palmeira
- **Curso:** Sistemas de Informação, CESMAC

## Créditos

A base do painel web foi criada a partir do template [admin-template](https://github.com/CarlosWGama/admin-template), de **Carlos W. Gama**, distribuído sob a licença MIT.
