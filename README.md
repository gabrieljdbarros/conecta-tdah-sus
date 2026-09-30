# Conecta TDAH SUS

> 🚧 **Projeto em desenvolvimento.** Trabalho de Conclusão de Curso (TCC) em andamento. Funcionalidades, modelo de dados e telas ainda podem mudar.

Plataforma que organiza a comunicação estruturada entre **escola**, **família** (mães/responsáveis) e **profissionais de psiquiatria do SUS** no acompanhamento de estudantes com TDAH.

**Fluxo central:** a escola avalia o aluno → o médico envia orientações práticas → a família acompanha tudo de forma integrada, sem reenviar o histórico a cada consulta.

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
| Categorias de acompanhamento gerenciadas pelo admin (RF14) | ✅ Pronto |
| Relatórios dentro da pasta do aluno, com acesso por tipo (RN06) | ✅ Pronto |
| Chat em grupo por aluno (RN05) | ⏳ Planejado |
| Leitura em voz alta (acessibilidade) | ⏳ Planejado |
| App mobile (Android/iOS) | ⏳ Depois do painel web |

## Perfis e acesso aos relatórios

Cada aluno tem uma **pasta**. Só quem foi vinculado à pasta consegue ver o conteúdo, e cada perfil vê apenas o que precisa:

| Tipo de relatório | Quem escreve | Mãe/responsável | Escola | Médico |
|---|---|:-:|:-:|:-:|
| Orientação médica | médico | ✅ | ✅ | ✅ |
| Laudo diagnóstico | médico | ✅ | ❌ | ✅ |
| Avaliação escolar | escola | ✅ | ✅ | ✅ |
| Relato da família | mãe/responsável | ✅ | ❌ | ✅ |

A escola vê o que é pedagógico. O que é clínico ou íntimo da família fica só entre a família e o médico. O **administrador** gerencia o sistema, mas **não acessa as pastas dos alunos**.

## Segurança e LGPD

O sistema lida com **dados de saúde de crianças e adolescentes**, que a LGPD classifica como dados pessoais sensíveis. Por isso:

- **As permissões ficam nas Firestore Security Rules** (`firestore.rules`), com base no perfil do usuário e no vínculo com a pasta. As checagens nas telas servem só para a experiência de uso.
- **As regras têm testes automatizados** no Firebase Emulator, e toda mudança nelas é testada antes de ir para produção.
- **A senha fica só no Firebase Authentication**, nunca no banco de dados.
- **Só guardamos o necessário (minimização).** A pasta guarda apenas o nome e a série do aluno, e o nome da criança não fica no perfil da família.
- **O convite é um link que vale 48 horas e só funciona uma vez.** O banco guarda só o *hash* do link, então nem quem acessa o banco consegue montar um link válido. O vínculo é feito por uma Cloud Function, numa transação, que confere se a conta é do perfil certo (escola ou médico).

## Tecnologias

- **Painel web:** [Next.js 15](https://nextjs.org/), TypeScript, Tailwind CSS, Formik e Yup
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
| `npm run test:rules` | Testes das Security Rules no Firestore Emulator |
| `npm run test:functions` | Testes das Cloud Functions do convite nos emuladores |

> Os testes usam emuladores próprios, em outras portas (`firebase.test.json`). Por isso, rodam mesmo com os emuladores do modo protótipo abertos, sem misturar os dados.
| `npm run lint` | Verificação de código |
| `npm run build` | Build de produção |

## Estrutura principal

```
src/
  app/            Telas (login, cadastro, convite e área /admin)
  contexts/       Sessão do usuário (AuthContext)
  services/       Acesso ao Firebase (usuários, pastas, convites)
  themes/         Componentes visuais do template
  types/          Modelos de dados
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
