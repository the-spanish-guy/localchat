# ---- deps: instala tudo uma vez, compartilhado entre os estágios ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm install

# ---- build-client: builda o Vite em arquivos estáticos ----
FROM deps AS build-client
COPY shared shared
COPY client client
RUN npm run build -w client

# ---- runtime: só o necessário pra rodar o server + servir o client ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY shared shared
COPY server server
COPY client/package.json client/package.json
COPY --from=build-client /app/client/dist client/dist

EXPOSE 3000
CMD ["npx", "tsx", "server/src/index.ts"]
