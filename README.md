# <a href="https://srdcrmapp.lovable.app">SDR CRM — Plataforma Inteligente de Gestão Comercial com IA</a>

## Visão Geral

O SDR CRM é uma plataforma moderna de gestão comercial desenvolvida para auxiliar equipes de prospecção, SDRs (Sales Development Representatives) e operações comerciais na organização de leads, campanhas e automação de mensagens utilizando Inteligência Artificial.

O sistema foi projetado com foco em:

* Gestão visual de pipeline comercial
* Organização de leads e campanhas
* Colaboração entre membros do workspace
* Automação de mensagens com IA
* Experiência moderna e responsiva
* Arquitetura escalável utilizando Supabase

Além das funcionalidades tradicionais de um CRM, o projeto integra geração contextual de mensagens comerciais utilizando OpenAI, permitindo criar abordagens personalizadas automaticamente com base nos dados do lead.

---

# Demonstração

## Funcionalidades principais

### Gestão de Leads

* Criação de leads
* Edição de leads
* Pipeline visual estilo Kanban
* Organização por estágios
* Associação de responsáveis
* Campos personalizados
* Histórico de atividades

### Gestão de Campanhas

* Criação de campanhas comerciais
* Organização de ações de prospecção
* Estrutura preparada para expansão futura

### Inteligência Artificial

* Geração automática de mensagens
* Integração com OpenAI
* Sugestões contextualizadas
* Variações automáticas de abordagem
* Estrutura preparada para múltiplos modelos LLM

### Segurança

* Autenticação de usuários
* Controle por workspace
* Políticas RLS (Row Level Security)
* Isolamento de dados por organização

---

# Tecnologias Utilizadas

## Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* Shadcn/UI
* Radix UI
* Lucide React

## Backend

* Supabase
* PostgreSQL
* Supabase Edge Functions

## Inteligência Artificial

* OpenAI API
* GPT-4.1-mini

## Infraestrutura

* Lovable
* GitHub

---

# Arquitetura do Projeto

O sistema foi desenvolvido utilizando arquitetura fullstack moderna baseada em serviços serverless.

```text
Frontend React
      ↓
Supabase Client
      ↓
Supabase Backend
 ├── PostgreSQL
 ├── Authentication
 ├── RLS Policies
 └── Edge Functions
             ↓
         OpenAI API
```

---

# Estrutura Funcional

## Workspaces

Cada organização opera dentro de um workspace isolado.

Isso garante:

* Segurança
* Multi-tenant
* Separação de dados
* Controle de acesso

---

## Pipeline Comercial

O pipeline foi construído em formato Kanban.

Exemplo de estágios:

* Base
* Lead Mapeado
* Tentando Contato
* Conexão Iniciada

A estrutura é totalmente expansível.

---

## Leads

Cada lead pode conter:

* Nome
* Email
* Telefone
* Empresa
* Cargo
* Origem
* Observações
* Responsável
* Campos personalizados

---

# Integração com Inteligência Artificial

Uma das principais funcionalidades do projeto é a integração com OpenAI para geração de mensagens comerciais automatizadas.

## Funcionamento

O sistema:

1. Coleta os dados do lead
2. Envia o contexto para uma Edge Function
3. A Edge Function processa a requisição
4. A OpenAI gera múltiplas variações
5. O frontend renderiza as sugestões

---

## Fluxo da IA

```text
Usuário clica em “Gerar”
        ↓
Frontend envia prompt
        ↓
Supabase Edge Function
        ↓
OpenAI API
        ↓
Mensagens geradas
        ↓
Renderização no CRM
```

---

# Segurança e Controle de Acesso

O projeto utiliza Row Level Security (RLS) no Supabase.

Isso garante que:

* Usuários acessem apenas seus workspaces
* Leads sejam isolados por organização
* Operações indevidas sejam bloqueadas
* O backend permaneça seguro mesmo com chamadas diretas

---

# Problemas Técnicos Resolvidos Durante o Desenvolvimento

Durante o desenvolvimento, diversos desafios técnicos reais foram resolvidos.

## Correção de Políticas RLS

Foram corrigidas políticas que impediam:

* Inserção de registros
* Leitura de memberships
* Criação de workspaces

---

## Correções de Componentes Select

Foi identificado um problema relacionado ao Radix UI:

```text
<Select.Item /> must have a value prop that is not an empty string
```

A lógica foi ajustada para tratar corretamente estados vazios e valores opcionais.

---

## Integração Frontend + Backend

A aplicação originalmente utilizava:

```ts
fetch('/api/ai/generate')
```

A arquitetura foi refatorada para utilizar:

* Supabase Edge Functions
* invoke()
* processamento serverless

---

## Tratamento de Erros

Foram resolvidos problemas como:

* 403 Forbidden
* 400 Bad Request
* JSON inválido
* Erros de renderização
* Problemas de autenticação
* Problemas de estado no React

---

# Experiência do Usuário

O sistema foi desenvolvido priorizando:

* Interface limpa
* Responsividade
* Navegação intuitiva
* Feedback visual
* Performance
* Fluxo comercial simplificado

---

# Deploy

O deploy do projeto foi realizado utilizando:

* Lovable
* Supabase
* GitHub

A arquitetura permite:

* Escalabilidade
* Atualizações contínuas
* Integração simplificada
* Deploy automatizado

---

# Diferenciais do Projeto

## Integração Real com IA

O projeto não utiliza mocks.

A geração de mensagens é feita em tempo real utilizando OpenAI.

---

## Arquitetura Moderna

Utilização de:

* React moderno
* Serverless
* PostgreSQL
* Edge Functions
* RLS
* Componentização reutilizável

---

## Projeto Fullstack Completo

O sistema contempla:

* Frontend
* Backend
* Banco de dados
* Autenticação
* Segurança
* IA
* Deploy

---

# Melhorias Futuras

Possíveis evoluções futuras:

* Integração com WhatsApp
* Dashboard analítico
* Métricas de conversão
* Automação de follow-up
* Integração com email
* Notificações em tempo real
* Sistema de tarefas
* Multi-campanhas avançadas

---

# Como Executar Localmente

## Clonar o projeto

```bash
git clone <repo-url>
```

---

## Instalar dependências

```bash
npm install
```

---

## Executar ambiente local

```bash
npm run dev
```

---

# Variáveis de Ambiente

Exemplo:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

---

# Considerações Finais

O SDR CRM foi desenvolvido com foco em arquitetura moderna, experiência do usuário e integração inteligente utilizando IA.

O projeto demonstra:

* Capacidade de desenvolvimento fullstack
* Integração entre múltiplos serviços
* Resolução de problemas reais
* Organização arquitetural
* Conhecimento em segurança
* Utilização prática de LLMs
* Construção de aplicações modernas escaláveis

Além do desenvolvimento funcional, o projeto também envolveu debugging avançado, correções de políticas de segurança, integração serverless e comunicação entre frontend e backend em ambiente real de produção.

---

# Autor

Erick Nathan

Desenvolvedor Fullstack
