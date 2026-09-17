# LocalChat

Chat em tempo real para rede local, sem cadastro — apenas nome de usuário. Mensagens ficam em Redis com expiração de 24h.

## Funcionalidades

- Login só com nome de usuário, sem senha — mesmo nome em outro dispositivo "casa" com a sessão existente
- Histórico de mensagens (Redis, expira em 24h de inatividade) e login automático no mesmo navegador
- Lista de usuários online, indicador de "digitando...", cor fixa por usuário
- Nudge (chama atenção de alguém) e Winks (emojis animados), estilo MSN
- Links clicáveis nas mensagens, com imagens/gifs renderizados direto na conversa
- Dark mode com botão manual, visual "vidro fosco" (glassmorphism)

## Requisitos

- Node.js 18+
- Docker (para subir o Redis local) ou um Redis já rodando

## Setup

```bash
npm install
cp server/.env.example server/.env
npm run redis:up   # sobe o Redis via docker compose
npm run dev         # sobe server (porta 3000) e client (porta 5173) juntos
```

Acesse `http://localhost:5173` na máquina, ou `http://SEU_IP_LOCAL:5173` em outro dispositivo na mesma rede.
