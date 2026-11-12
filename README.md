# Conecta TDAH SUS

Trabalho de Conclusão de Curso (TCC) de Sistemas de Informação do Centro Universitário CESMAC. Versão apresentada à banca em 17/11/2026: tag [`v3.0-banca`](../../tree/v3.0-banca).

**Ponte de comunicação** entre **família** (mães/responsáveis), **escola** e **profissionais de psiquiatria do SUS** no acompanhamento de estudantes com TDAH.

**Fluxo central:** a família cria a pasta do aluno e convida a escola e o médico → todos conversam no **chat em grupo da pasta**, por texto e por voz, sem a família precisar repetir o histórico a cada consulta.

> **Escopo acadêmico:** este é um produto acadêmico. **Não há integração real com sistemas do SUS**, e todos os dados usados em desenvolvimento e testes são **fictícios**.

---

## Funcionalidades

O sistema tem duas interfaces sobre o mesmo banco: o **painel web**, que também pode ser instalado como aplicativo (PWA), e o **app nativo** para Android e iPhone. Professores e médicos não precisam instalar nada, porque tudo funciona no navegador.

- **Cadastro por perfil** (mãe/responsável, escola, médico), login, "Esqueci minha senha" e edição do próprio perfil.
- **Pasta do aluno** criada pela mãe/responsável, só com o nome da criança (RF03).
- **Convite** para a escola e o médico entrarem na pasta, por link (no app, também por QR code). O convite vale 48 horas e só funciona uma vez (RN01, RN02, RF04). A mãe vê quem participa da pasta e pode cancelar convites ou remover pessoas.
- **Chat em grupo** de cada aluno, em tempo real, com histórico (RN05, RF08, RF12). As mensagens não podem ser editadas nem apagadas (RN08). Cada mensagem mostra quem escreveu, com ícone, cor e nome do papel.
- **Mensagens de voz** de até 2 minutos (RF16), gravadas no app. Elas podem ser ouvidas no app e na web, e o arquivo é apagado automaticamente após 90 dias.
- **Leitura em voz alta** (TTS): um botão "Ouvir instruções" em cada tela e um botão "Ouvir" em cada mensagem de texto.
- **Questionário SNAP-IV** no app: a mãe responde, e os membros da pasta veem a contagem de sintomas por grupo, comparando as datas. É uma triagem, não um diagnóstico: quem interpreta é o médico.
- **Início pensada para quem acompanha muitos alunos:** busca pelo nome do aluno, da mãe ou da escola, conversas recentes e um ponto discreto de "mensagem nova". **Não há notificações**, a pedido da equipe da cliente.
- **Sobre o aplicativo:** equipe do projeto, instituição e o aviso de que este é um trabalho acadêmico, sem ligação com o sistema do SUS.
- **Administrador:** gerencia os usuários, mas **não acessa as pastas nem as conversas** (RF13).

**Acessibilidade.** O público inclui pessoas com baixa alfabetização. Por isso o sistema usa:
- letras grandes, alvos de toque de pelo menos 48 px e ícones com o nome escrito embaixo;
- cores com contraste WCAG AA;
- leitura em voz alta e rótulos para leitores de tela.

## Perfis e acesso

Cada aluno tem uma **pasta**, criada pela mãe/responsável. A escola e o médico entram por convite. Cada pasta tem **um chat em grupo**: todos os membros da pasta leem e escrevem, e as mensagens não podem ser editadas nem apagadas. No **questionário SNAP-IV**, só a mãe dona da pasta responde, e todos os membros veem o resultado. O **administrador** gerencia os usuários, mas **não acessa as pastas, as conversas nem os questionários**.

## Segurança e LGPD

O sistema lida com **dados de saúde de crianças e adolescentes**, que a LGPD classifica como dados pessoais sensíveis. Por isso:

- **As permissões ficam no banco, em políticas RLS** (`supabase/migrations/`), com base no perfil do usuário e no vínculo com a pasta. Toda tabela tem RLS, e o banco libera para cada perfil só as colunas que ele pode gravar. As checagens nas telas servem só para a experiência de uso.
- **As regras têm testes automatizados** no Supabase local, e toda mudança nelas é testada antes de ir para produção. O chat em tempo real também é testado: quem não é da pasta não recebe as mensagens.
- **A senha fica só no serviço de login (Supabase Auth)**, nunca nas tabelas.
- **Só guardamos o necessário (minimização).** A pasta guarda apenas o nome do aluno (sem série, data de nascimento ou cartão SUS), e o nome da criança não fica no perfil da família.
- **A leitura em voz alta não envia dados de saúde para fora.** As instruções das telas podem usar qualquer voz em português. Já as mensagens só são lidas com uma voz que roda no próprio aparelho, porque algumas vozes do navegador mandam o texto para servidores externos gerarem o áudio. Se o aparelho não tiver uma voz local em português, o botão de ouvir o conteúdo não aparece.
  - **Limite (para a defesa):** quem informa se a voz roda no aparelho é o próprio navegador (`localService`), e o app não consegue conferir isso. Alguns motores de voz de fabricantes no Android podem se declarar locais e ainda usar a internet.
  - **Para ouvir as mensagens no computador,** é preciso ter uma voz em português instalada no sistema. No Windows: Configurações → Hora e idioma → Fala → Adicionar vozes → Português (Brasil), voz "Microsoft Maria". Depois, reinicie o navegador. Sem ela, o botão de ouvir o conteúdo não aparece, e as instruções continuam podendo ser ouvidas.
  - **Ditado pelo microfone do teclado:** a dica na tela sugere usar o microfone do teclado para falar em vez de digitar. Esse ditado é um recurso do teclado do celular (Google, Apple etc.), escolhido pela pessoa no aparelho dela, e pode enviar o áudio para os servidores desse teclado. O app não recebe nem guarda áudio.
- **As mensagens de voz são tratadas como dado de saúde.** Ficam num armazenamento de arquivos **privado**, com no máximo 2 minutos e 1 MB cada. Só os membros da pasta enviam e ouvem, e o nome do arquivo não tem o nome da criança. Para ouvir, o sistema primeiro **registra no log quem ouviu e quando** (RN09) e só então libera um link que vale 5 minutos. O log também registra quem enviou cada áudio. Ninguém troca nem apaga um áudio. O prazo de guarda é de **90 dias**. Todo dia, uma tarefa agendada no banco (`pg_cron`) apaga os arquivos vencidos, e a mensagem fica no chat com o aviso de áudio apagado. Os detalhes estão em [`docs/retencao-audios.md`](docs/retencao-audios.md).
- **As respostas do SNAP-IV são dado de saúde.** O banco guarda só as respostas e a versão do questionário, e a pontuação é calculada no aparelho. A resposta concluída não pode ser editada nem apagada, e nada é salvo antes de concluir.
- **"Mensagem nova" sem rastrear leitura.** A marca de até onde a pessoa leu fica **só no aparelho**, e o servidor nunca sabe quem leu o quê. A limitação aceita é que ler na web não apaga o ponto no app. A busca de alunos também roda no aparelho, sem enviar o que foi digitado.
- **O convite é um link que vale 48 horas e só funciona uma vez.** O banco guarda só o *hash* do link, então nem quem acessa o banco consegue montar um link válido. O vínculo é feito por uma função no banco, numa transação, que confere se a conta é do perfil certo (escola ou médico).

## Tecnologias

- **Painel web:** [Next.js 15](https://nextjs.org/), TypeScript, Tailwind CSS, Formik e Yup
- **App nativo:** [Expo](https://expo.dev/) (React Native) com expo-router, na pasta `mobile/`
- **Backend:** [Supabase](https://supabase.com/) (Auth, Postgres com RLS, Realtime, Storage, Edge Functions e `pg_cron`), o mesmo para o painel e o app
- **Testes:** Supabase local e o executor de testes nativo do Node.js

### Por que o Supabase (e não mais o Firebase)

Até outubro de 2026 o backend era o Firebase. As mensagens de voz (RF16) precisam guardar arquivos de áudio, e o plano atual do Firebase não oferece isso. O Supabase reúne login, banco e arquivos no mesmo lugar. As regras de acesso viraram **políticas RLS** no Postgres, e as Cloud Functions viraram **funções no próprio banco**.

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 22 ou superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/): roda o Supabase local

```bash
git clone https://github.com/gabrieljdbarros/conecta-tdah-sus.git
cd conecta-tdah-sus
npm install
```

### Painel web (Supabase local, recomendado)

Tudo roda no seu computador, com dados fictícios.

1. Abra o Docker Desktop e suba o Supabase local (na primeira vez, ele baixa as imagens):
   ```bash
   npx supabase start
   ```
2. Copie `.env.local.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores de `npx supabase status` (API_URL e ANON_KEY). O `.env.local` **não** é versionado.
3. Inicie o site:
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000 e crie as contas de teste (mãe, escola e médico) pelo cadastro.
4. O painel do Supabase local fica em http://127.0.0.1:54323. Para transformar uma conta de teste em **administrador**: em *Table Editor*, abra a tabela `perfis`, troque o `role` da conta para `admin` e limpe o `dados_perfil` (deixe `{}`). O cadastro pela tela não permite criar administradores, e isso é proposital.
5. Os e-mails (como o de "Esqueci minha senha") não saem do computador: aparecem no Mailpit, em http://127.0.0.1:54324.

Os dados ficam guardados no Docker entre uma execução e outra. Para desligar, use `npx supabase stop`. Para começar do zero, use `npx supabase db reset`. Depois de mudar o `supabase/config.toml`, rode `npx supabase stop` e `npx supabase start` para a mudança valer.

### Banco no Supabase

- `supabase/migrations/`: tabelas, regras de acesso (**RLS** ativado em todas), as funções do convite e da pasta, e o armazenamento dos áudios com as suas políticas.
- `tests/supabase/`: os testes do banco. Cada um tenta o acesso permitido e os proibidos, com usuários fictícios, inclusive no chat em tempo real e nos áudios.

As chaves que o `supabase start` mostra são as de demonstração do ambiente local. As chaves de um projeto real, principalmente a `service_role`, **nunca** vão para o repositório.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local de desenvolvimento |
| `npx supabase start` / `npx supabase stop` | Liga e desliga o Supabase local |
| `npx supabase db reset` | Recria o banco local a partir das migrações (apaga os dados) |
| `npm run test:db` | Testes do banco: RLS, funções e tempo real (**apagam os dados do banco local**) |
| `npm run test:unit` | Testes de lógica sem banco (ex.: escolha da voz da leitura em voz alta) |
| `npm run lint` | Verificação de código |
| `npm run build` | Build de produção |
| `npm run preview` | Build e abre a versão de produção, para testar o PWA (pare o `npm run dev` antes) |

## Instalar no celular (PWA)

O painel pode ser instalado como um aplicativo, com ícone na tela inicial, sem loja de aplicativos:

- **Android (Chrome):** abra o site, toque nos **três pontinhos** no canto de cima e depois em **"Instalar aplicativo"**. Em alguns celulares o nome é **"Adicionar à tela inicial"**.
- **iPhone:** abra o site no **Safari**, porque o Chrome do iPhone não instala. Toque no botão **Compartilhar**, o quadrado com uma seta na barra de baixo, e depois em **"Adicionar à Tela de Início"**.

Professores e médicos não precisam instalar nada: o mesmo endereço funciona no navegador.

> **Privacidade:** o aplicativo **não guarda dados no aparelho**, nem pastas, nem conversas. Ele guarda só os arquivos fixos do site, para abrir mais rápido. Sem internet, mostra a tela "Você está sem internet". Muitas famílias dividem o celular, e dados de saúde de crianças não devem ficar salvos nele.

Para testar no computador, com o `npm run dev` **parado**: rode `npm run preview` e abra http://localhost:3000. O Chrome mostra o botão de instalar na barra de endereço. No celular, a instalação exige o site publicado num endereço com HTTPS.

## Aplicativo nativo (React Native)

Na pasta `mobile/` fica um app **Expo** para **mãe, escola e médico**. O administrador continua usando só o painel web. O app usa **o mesmo Supabase, as mesmas políticas RLS e as mesmas funções do banco** da web, e importa os tipos e a lógica pura de `src/types` e `src/helpers`. Assim, as regras de acesso existem num lugar só.

O app tem as funcionalidades da web para esses perfis (cadastro e login, pastas, convites e vínculos, chat e leitura em voz alta). Só no app ficam a **gravação de mensagens de voz** e o **questionário SNAP-IV**.

> O app **não é publicado nas lojas**: ele roda pelo **Expo Go**, ligado ao Supabase local do computador pela rede Wi-Fi. No convite, a escola e o médico **colam o link** recebido. Abrir o app direto pelo link (deep link) exige o site publicado e fica para depois.

### Como rodar no celular

1. No celular (Android ou iPhone), instale o app **Expo Go** pela loja.
2. Ligue o computador e o celular na **mesma rede Wi-Fi**. Use uma rede confiável, como a de casa: a rede pública da faculdade pode bloquear a conexão entre os aparelhos.
3. Descubra o endereço do computador na rede. No Windows, rode `ipconfig` e procure a linha **"Endereço IPv4"** (ex.: `192.168.1.4`).
4. Na raiz do projeto, com o Docker Desktop aberto, suba o Supabase local (se ainda não estiver ligado):
   ```bash
   npx supabase start
   ```
5. Na pasta `mobile/`, copie `.env.local.example` para `.env.local` e preencha:
   - `EXPO_PUBLIC_SUPABASE_URL` com `http://<endereço do passo 3>:54321` (o celular não enxerga "localhost");
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` com a ANON_KEY de `npx supabase status`.

   O `.env.local` **não** é versionado.
6. Em outro terminal, inicie o app **dentro da pasta `mobile/`**:
   ```bash
   cd mobile
   npm install
   npx expo start --clear
   ```
   Se o comando for rodado na raiz do projeto, o `npx` oferece baixar outra versão do Expo: cancele e rode dentro de `mobile/`.
7. Abra o Expo Go e leia o QR code que aparece no terminal.

> **Versão do Expo Go:** o app usa o **SDK 57** do Expo. Se o Expo Go do celular se atualizar para uma versão mais nova, ele recusa o projeto. Nesse caso, instale o Expo Go do SDK 57 pela página [expo.dev/go](https://expo.dev/go).

**Se der erro de conexão:**
- *"Sem conexão"* ou o login fica parado em "Entrando...": o endereço do computador mudou, porque o roteador às vezes troca. Rode `ipconfig` de novo, corrija o endereço em `EXPO_PUBLIC_SUPABASE_URL` e reinicie com `npx expo start --clear`. Para não acontecer mais, reserve um endereço fixo para o computador no roteador ("reserva de DHCP").
- *"failed to download remote update"* no Expo Go: no Windows, a rede precisa estar como **Privada**, e o firewall precisa liberar as portas 8081 (Expo) e 54321 (Supabase). Na primeira vez, o Windows pode perguntar se libera o acesso: aceite só para redes privadas.

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
  app/              Telas (login, cadastro, convite e área /admin)
  contexts/         Sessão do usuário (AuthContext)
  helpers/          Lógica pura, usada pela web e pelo app (busca, SNAP-IV, textos da tela Sobre)
  services/         Acesso ao Supabase (usuários, pastas, convites, chat)
  themes/           Componentes visuais do template
  types/            Modelos de dados, usados pela web e pelo app
mobile/             App nativo Expo (mãe, escola e médico)
  src/app/          Telas (expo-router)
  src/componentes/  Componentes visuais do app
  src/servicos/     Acesso ao Supabase, gravação de áudio e leitura em voz alta
supabase/
  migrations/       Tabelas, RLS, funções, armazenamento dos áudios e retenção
  functions/        Edge Function que apaga os áudios vencidos
docs/               Paleta de cores e retenção dos áudios
tests/supabase/     Testes do banco (RLS, funções, tempo real, áudios e retenção)
tests/unit/         Testes de lógica (sem banco)
```

## Limitações e trabalhos futuros

- **Consentimento no cadastro (RN07):** o consentimento já foi desenhado como granular: uma caixa obrigatória para os termos e os dados sensíveis, e outra opcional para gravar mensagens de voz. Ele depende do texto dos termos, que cabe à equipe responsável pelo projeto (controladora dos dados). Até lá, a gravação de voz fica liberada.
- **Prazos de guarda** das mensagens de texto e do log de áudios: a definir com a orientação e a cliente.
- **Exclusão da pasta a pedido da família** (LGPD): hoje ninguém apaga uma pasta.
- **Publicação:** gerar o APK e usar um projeto do Supabase na nuvem, na região de São Paulo. Abrir o app direto pelo link do convite (deep link) depende disso.
- **Login com Google:** dispensaria a senha, mas exige uma etapa para completar o cadastro (perfil e campos de cada perfil).
- **SNAP-IV:** o texto oficial dos itens ainda será confirmado com a idealizadora do projeto (o texto atual é resumido).

## Histórico de versões

| Tag | Marco |
|---|---|
| [`v1.0-web`](../../tree/v1.0-web) | Painel web concluído, com PWA e design integrado, antes do app nativo |
| [`v2.0-pre-banca`](../../tree/v2.0-pre-banca) | Versão da pré-banca (15/10/2026): web, PWA e app nativo, com relatórios, chat e voz, no Firebase |
| [`v2.1-escopo-chat`](../../tree/v2.1-escopo-chat) | Escopo novo, definido com a equipe da cliente em 20/10/2026: só o chat em grupo, e a pasta só com o nome do aluno |
| [`v2.2-supabase`](../../tree/v2.2-supabase) | Fim da migração do Firebase para o Supabase |
| [`v2.3-voz`](../../tree/v2.3-voz) | Mensagens de voz e retenção de 90 dias |
| [`v2.4-snap-iv`](../../tree/v2.4-snap-iv) | Questionário SNAP-IV no app |
| [`v2.5-telas-novas`](../../tree/v2.5-telas-novas) | Telas novas, ajustes visuais e a tela Sobre o aplicativo |
| [`v3.0-banca`](../../tree/v3.0-banca) | Versão apresentada à banca (17/11/2026) |

## Equipe

- **Gabriel José Dias Barros:** desenvolvedor e autor do sistema (Sistemas de Informação, CESMAC)
- **Prof. Me. Wagner Palmeira:** orientador
- **Jordana Farias:** idealizadora do projeto (mestranda)
- **Profa. Dra. Evanisa Brum:** gerente de projeto
- **Profa. Dra. Sonia Maria Soares Ferreira:** colaboradora
- **Karina Jucá:** colaboradora (Psicologia, CESMAC)

Projeto do Centro Universitário CESMAC, com o CITEC.

## Créditos

A base do painel web foi criada a partir do template [admin-template](https://github.com/CarlosWGama/admin-template), de **Carlos W. Gama**, distribuído sob a licença MIT.
