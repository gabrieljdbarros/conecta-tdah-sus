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
| Ajustes de privacidade do perfil (nome da criança só na pasta; admin sem troca de perfil) | 🔄 Em revisão |
| Convite por link para vincular escola e médico, com expiração e uso único (RN01, RN02) | ⏳ Planejado |
| Categorias de acompanhamento gerenciadas pelo admin (RF14) | ⏳ Planejado |
| Relatórios dentro da pasta do aluno | ⏳ Planejado |
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

## Tecnologias

- **Painel web:** [Next.js 15](https://nextjs.org/), TypeScript, Tailwind CSS, Formik e Yup
- **Backend:** Firebase (Authentication, Firestore e, em breve, Cloud Functions)
- **Testes das regras:** Firebase Emulator e `@firebase/rules-unit-testing`

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- Um projeto no [Firebase](https://console.firebase.google.com/) com **Authentication (e-mail/senha)** e **Firestore** ativados
- [JDK 21](https://adoptium.net/): só para rodar os testes das regras no emulador

### Passo a passo

```bash
git clone https://github.com/gabrieljdbarros/conecta-tdah-sus.git
cd conecta-tdah-sus
npm install
```

1. Copie `.env.local.example` para `.env.local` e preencha com as chaves do app web do seu projeto Firebase. O `.env.local` **não** é versionado.
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
| `npm run test:rules` | Testes das Security Rules no Firestore Emulator (precisa de JDK 21) |
| `npm run lint` | Verificação de código |
| `npm run build` | Build de produção |

## Estrutura principal

```
src/
  app/            Telas (login, cadastro e área /admin)
  contexts/       Sessão do usuário (AuthContext)
  services/       Acesso ao Firebase (usuários, pastas)
  themes/         Componentes visuais do template
  types/          Modelos de dados
tests/            Testes das Security Rules
firestore.rules   Regras de segurança do Firestore
```

## Autoria

- **Autor(es):** Gabriel José Dias Barros
- **Orientador(a):** Wagner Palmeira
- **Curso:** Sistemas de Informação, CESMAC

## Créditos

A base do painel web foi criada a partir do template [admin-template](https://github.com/CarlosWGama/admin-template), de **Carlos W. Gama**, distribuído sob a licença MIT.
