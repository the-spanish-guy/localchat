# LocalChat — Próximos passos

_Anotado em 2026-09-15, atualizado em 2026-09-16._

## Estado atual

- `client/` foi recriado com Vite + TypeScript, separado do `server/`
  (rodando em `:5173`, consumindo o server em `:3000` via CORS liberado
  no `Server` do Socket.IO).
- `userRegistry.ts` completo e plugado no `handlers.ts`: `Map<string,
  Set<string>>` de username → conexões ativas. `user:joined`/`user:left`
  só disparam (via `io.emit`, pra todo mundo) na primeira/última conexão
  de um username; uma segunda aba do mesmo usuário recebe `users:online`
  só pra ela (`socket.emit`), sem repetir a notificação de entrada pros
  outros.
- Handlers funcionando: `user:join`, `message:send` → `message:new`
  (`{ username, text }`), `disconnect` → `user:left`, e `users:online`
  (lista atual, emitida quando muda ou pro socket que acabou de entrar).
  Tudo isso testado ponta a ponta com dois clients simulando duas abas do
  mesmo usuário — comportamento correto confirmado.
- Redis completo: `saveMessage`/`getMessageHistory` implementados e
  plugados (`message:send` salva, `user:join` manda `message:history` só
  pro socket novo). Client já escuta e renderiza o histórico.
- Limpeza feita: `saveMessage` agora tem `try/catch` (uma rejection sem
  tratar derruba o processo inteiro desde o Node 15 — importante já que
  era fire-and-forget antes); `id` da mensagem usa `randomUUID()` em vez
  de `socket.id`; `UserJoined`/`UserLeft` agora emitem os dois `username`
  como string solta (era `{ username }` só no `UserLeft`); logs de debug
  residuais removidos.
- Bugs já resolvidos no caminho: `io.on` só dispara eventos reservados
  (`connection`/`new_namespace`) — eventos customizados são sempre
  `socket.on` dentro do `connection`; nomes de evento têm que bater
  exatamente entre client e server (`UserJoin` vs `UserJoined` já causou
  bug); servidor emitindo algo de volta não é automático, precisa de
  `emit` explícito.

## Próximos passos

### Concluído

- ~~userRegistry (match multi-dispositivo) + users:online~~
- ~~Redis — histórico de mensagens com TTL de 24h~~
- ~~Recriar o `client/` separado do server, com Vite + TypeScript~~
- ~~Tipar os eventos do Socket.IO~~ — **feito em 2026-09-16**, criando um
  terceiro workspace `shared/` (`SocketEvents`, `ChatMessage`,
  `ClientToServerEvents`, `ServerToClientEvents`), importado tanto pelo
  `server` quanto pelo `client` (`"shared": "*"` nos dois `package.json`,
  resolvido via symlink de workspace do npm). `server/src/index.ts` usa
  `Server<ClientToServerEvents, ServerToClientEvents>`;
  `client/src/socket.ts` usa `Socket<ServerToClientEvents,
  ClientToServerEvents>` — **ordem invertida** em relação ao server,
  porque do lado do client "escutar" é o que o server emite e vice-versa.
  Validado em runtime dos dois lados (tsx resolve o `shared` via
  node_modules symlink; Vite resolve via `/@fs/.../shared/src/index.ts`).

- ~~Redesign do front (telas separadas de login/chat)~~ — **feito em
  2026-09-16.** Usuário deu carta branca ("o front é todo teu") pro
  design. `client/index.html`/`style.css`/`main.ts` reescritos: tela de
  login com card centralizado (só o form de username); tela de chat com
  sidebar (contagem + lista de `users:online`, que antes não tinha
  listener nenhum no client) e mensagens em estilo bolha (próprias à
  direita em azul, dos outros à esquerda); `user:joined`/`user:left`
  viraram mensagens de sistema com texto amigável ("fulano entrou/saiu
  da sala") e visual diferenciado (centralizado, itálico, cinza).
  Validado que Vite serve tudo sem erro (sem navegador disponível na
  sessão pra conferir visualmente — ver nota abaixo).

- ~~Indicador de "usuário está digitando"~~ — **feito em 2026-09-16.**
  Eventos novos em `shared/src/events.ts`: `TypingStart`
  (`"typing:start"`), `TypingStop` (`"typing:stop"`) — client → server,
  sem payload; `UserTyping` (`"user:typing"`) — server → clients,
  `{ username, isTyping }`. Server só repassa (`socket.broadcast.emit`,
  não `io.emit` — quem digita não recebe o próprio indicador de volta),
  sem guardar estado; também limpa o indicador (`isTyping: false`) no
  `disconnect`, pra não ficar um "fulano digitando" fantasma se alguém
  cair no meio. Client: `input` no campo de mensagem emite `typing:start`
  uma vez e agenda um timeout de 2s de inatividade pra emitir
  `typing:stop` sozinho; envio da mensagem também para o indicador na
  hora. Render mantém um `Set<string>` de quem está digitando agora,
  mostrado como "fulano está digitando...", "fulano e beltrano estão
  digitando..." ou "Várias pessoas estão digitando...". Testado ponta a
  ponta com dois usuários em abas separadas — funciona.

- ~~Notificação de nova mensagem na aba (estilo Gmail)~~ — **feito em
  2026-09-16.** Sem contador; `document.title` **pisca** entre
  `"Nova mensagem · LocalChat"` e o título original a cada 2s
  (`setInterval`) quando chega `message:new` de outra pessoa e
  `document.hidden` é `true` (Page Visibility API) — troquei de estático
  pra piscando a pedido do usuário, chama mais atenção na aba. Para e
  volta pro título original (`DEFAULT_TITLE`) no evento
  `visibilitychange` quando a aba volta a ficar visível
  (`clearInterval`). Validado no navegador: título alterna certinho a
  cada 2s enquanto oculto, e para de vez ao voltar o foco. **Não**
  implementada a Notification API (notificação de sistema de verdade):
  ela exige contexto seguro (HTTPS), e `localhost` tem isenção mas o IP
  da rede local não — ou seja, só funcionaria pra quem acessa pela própria
  máquina, não pros outros aparelhos na rede (o cenário principal do
  projeto). Decisão consciente de não implementar por enquanto.

- ~~"Nudge" (tremer a tela, estilo MSN)~~ — **feito em 2026-09-16.**
  Não dá pra tremer a janela do SO de verdade (navegador bloqueia
  `window.moveBy` em loop por segurança/abuso) — em vez disso, uma
  animação CSS (`@keyframes nudge-shake`, 0.5s) translada o conteúdo da
  página rapidamente, aplicada via classe `.nudge` no `body`
  (`triggerNudge()` remove a classe, força reflow, e readiciona — truque
  pra poder reiniciar a animação mesmo se já estava rodando).
  Prototipado primeiro disparando em toda mensagem nova (reaproveitando
  o mesmo gatilho da notificação de título) só pra validar visualmente
  se o efeito ficava bom — aprovado pelo usuário, e então **separado**
  num recurso de verdade: clicar no nome de alguém na lista de usuários
  online (`#online-list li.nudgeable`) manda um evento `nudge` (client →
  server, payload = username alvo); o server usa
  `userRegistry.getConnections(username)` (nova função) pra achar
  os `socketId`s daquele usuário especificamente e emite `nudge:received`
  (`{ from }`) só pra eles via `io.to(socketId).emit(...)` — não é
  broadcast, só quem foi "cutucado" treme. Quem recebe vê uma mensagem de
  sistema ("Fulano chamou sua atenção!") além do tremor. Sem
  auto-nudge (o próprio nome não aparece clicável na lista). Testado
  ponta a ponta: quem manda não treme, só o alvo treme e recebe a
  mensagem.

- ~~"Winks" (figurinhas animadas, estilo MSN)~~ — **feito em
  2026-09-16**, com emojis em vez de assets do MSN de verdade (que são
  copyright da Microsoft — decisão consciente de não usar/baixar).
  Barra de 6 emojis (`#winks-bar`, 😂🎉😍👋🕺😜) perto do form de
  mensagem; clicar emite `wink:send` (client → server, payload = emoji).
  Server faz `io.emit` (broadcast pra sala toda, igual mensagem — não é
  targeted como o nudge) de `wink:received` (`{ username, emoji }`).
  Client renderiza num overlay fixo (`#wink-overlay`, `position: fixed`,
  `pointer-events: none`) que "pipoca" no centro da tela com
  `@keyframes wink-pop` (2s: entra com scale+rotate, segura, sai
  desvanecendo) mostrando o emoji grande + nome de quem mandou embaixo;
  mesmo truque de reflow do nudge pra poder reiniciar a animação se
  chegar outro wink enquanto a anterior ainda está rodando. Usa
  `textContent` (não `innerHTML`) pro nome do usuário, evitando XSS já
  que username é entrada livre do usuário. Testado ponta a ponta: emite
  de uma aba, aparece animado nas duas (quem manda também vê, igual
  mensagem normal).

- ~~Login automático (lembrar username no mesmo browser)~~ — **feito em
  2026-09-16.** `localStorage` (`localchat:username`) salva o nome ao
  entrar (`enterChat(username)`, função extraída do handler de submit do
  form pra ser reaproveitada). No carregamento da página, se existir um
  username salvo, chama `enterChat` direto — pula a tela de login e
  reconecta automaticamente. Sem nada salvo (outro aparelho/browser,
  primeira vez), continua mostrando a tela de login normalmente. Como
  `localStorage` é por origem/browser, isso só afeta reload no mesmo
  aparelho — abrir em outro continua pedindo login, como o usuário queria.
  Testado ponta a ponta: reload com username salvo pula pro chat direto;
  `localStorage.clear()` + reload volta pro login.

- ~~Cor por username~~ — **feito em 2026-09-16**, primeiro item de uma
  lista maior de ideias que o usuário guardou pra ir mandando aos poucos.
  Determinística (hash simples do username), mas **não** é uma paleta
  fixa de cores prefixadas — o hash vira direto um matiz HSL
  (`hsl(hue, 65%, 45%)`, `hue = hash % 360`), dando até 360 tons
  possíveis em vez de escolher entre poucas cores pré-definidas (ajuste
  pedido pelo usuário depois da primeira versão). Continua determinística
  (mesmo username sempre a mesma cor) e sem UI de seleção. Aplicada no
  `.author` das mensagens e no texto da lista `#online-list` (o ponto
  verde de "online" continua sendo `background`, não afetado). Validado
  que a mesma cor aparece nos dois lugares pro mesmo usuário.

  **Removidos a pedido do usuário** (não curtiu o resultado):
  ~~conversão de emoticons~~ (lista ficou curta, quer expandir e
  reimplementar depois — não é definitivo, só adiado) e ~~som de
  notificação~~ (o efeito gerado via Web Audio API não ficou legal —
  sem plano de retomar por enquanto).

- ~~Dark mode com botão manual~~ — **feito em 2026-09-16.** Tudo em cima
  de custom properties CSS já existentes (`--bg`, `--surface`, `--text`
  etc), sem precisar tocar componente por componente:
  `@media (prefers-color-scheme: dark)` redefine as variáveis pra quem
  segue o sistema, e `:root[data-theme="dark"]`/`:root[data-theme="light"]`
  permitem forçar um modo específico (o `:not([data-theme="light"])` no
  media query garante que a escolha manual de "claro" vence mesmo com o
  SO em dark). Botão `#theme-toggle` (🌙/☀️) fixo no canto superior
  direito, fora das duas telas (visível tanto no login quanto no chat);
  escolha salva em `localStorage` (`localchat:theme`) e persiste entre
  reloads. `color-scheme` também ajustado por tema, pra elementos nativos
  do navegador (scrollbar, etc) acompanharem. Testado: sessão abriu em
  dark automaticamente (SO em dark), alternar pra claro funcionou, e
  persistiu depois de um reload de verdade.

- ~~Testes automatizados~~ — **feito em 2026-09-16.** Vitest em `server`
  e `client` (`npm test` na raiz roda os dois; `npm run test -w <pkg>`
  roda um só). 19 testes no total:
  - `server/src/services/userRegistry.test.ts` (8 testes) — unidade,
    sem dependência externa nenhuma (é lógica pura em memória). Usa
    username único por teste (`randomUUID()`) pra não vazar estado entre
    casos, já que o módulo é um singleton com `Map` compartilhado.
  - `server/src/socket/handlers.test.ts` (6 testes) — integração de
    verdade: sobe um `http.createServer` + `Server` do Socket.IO numa
    porta efêmera (`listen(0, ...)`) e conecta `socket.io-client` real
    contra ele, testando o comportamento observável (join só notifica na
    primeira conexão, nudge só chega pro alvo, wink é broadcast pra
    todo mundo incluindo quem mandou, user:left na última desconexão
    etc) — basicamente automatiza os testes manuais que eu fazia via
    script ao longo da conversa. `../services/redisClient` é mockado
    (`vi.mock`) pra não depender de Redis rodando — os testes passam
    mesmo com o Redis desligado.
  - `client/src/colorForUsername.test.ts` (5 testes) — só isso ficou
    testável no client por hora, porque `main.ts` é todo acoplado ao DOM
    (`document.querySelector` direto no topo do módulo) — importar ele
    num teste executaria tudo isso fora de um navegador de verdade e
    quebraria. Por isso `colorForUsername` foi **extraída** pro próprio
    arquivo (`client/src/colorForUsername.ts`), e `main.ts` passou a
    importar de lá. Se quiser mais cobertura no client no futuro, o
    caminho é continuar extraindo funções puras assim (ex: a lógica de
    tema, `getEffectiveTheme`) em vez de testar `main.ts` inteiro.
  - Nota: `npm install` trouxe 2 vulnerabilidades novas no audit
    (`@vitest/mocker` e `esbuild`, ambas do Vite/Vitest) — mesma
    categoria das que já tínhamos antes (dev-only, exigem fix breaking).
    Não mexi, mesma decisão de antes.

- **mDNS/`chat.local` — tentado de três formas diferentes em
  2026-09-16, as três revertidas; PAUSADO por decisão do usuário.**
  Nenhuma versão sobreviveu a teste real em um segundo aparelho:
  1. Docker (server+client dockerizados, mDNS fora do container por
     causa da limitação de multicast do Docker Desktop no Mac) — quebrou
     num segundo MacBook: lento, CSS não carregava, travava no refresh.
  2. mDNS extraído pra script separado (`server/src/mdns.ts`, sem
     Docker) — quebrou também: Chrome dava "site não pode ser
     carregado" com `/?` na URL ao submeter o form de username (sinal
     de que o JS do `main.ts` nunca rodou), Safari nem carregava.
  3. mDNS **de volta pra dentro do `index.ts`** (a versão que achei que
     tinha sido a "original que funcionou") — testei aqui e pareceu
     bom, mas o usuário testou de novo em outro Mac e **deu o mesmo
     problema**: login redireciona pra `chat.local:porta/?`.
  **Conclusão**: não é sobre Docker, nem sobre como o mDNS está
  organizado no código — é o acesso via `chat.local` em si que não
  funciona de forma confiável a partir de um segundo aparelho físico.
  Por **IP:porta funciona sempre**, em todas as três versões testadas.
  Causa real nunca confirmada (suspeita não verificada: algo relacionado
  ao `allowedHosts` do Vite ou à forma como o mDNS resolve em redes
  multi-hop, mas nada disso foi investigado a fundo).
  **Revertido para o estado 100% estável**: client conecta direto em
  `http://<hostname>:3000` (`VITE_SERVER_URL` como override opcional),
  CORS `origin: "*"` no Socket.IO, sem proxy do Vite, sem
  `allowedHosts`, `bonjour-service` desinstalado, `mdnsHost` fora do
  `config.ts`/`.env.example`. Ficou apenas a correção do `"start"`
  (`tsx src/index.ts` em vez de `node dist/index.js` quebrado) — bug
  genuíno e independente de tudo isso.
  **Lição registrada, dessa vez com mais peso**: eu declarei essa
  funcionalidade "funcionando" **três vezes seguidas** com base em
  testes só nessa máquina (curl, `ping`, navegador via automação), e as
  três vezes quebrou no teste real do usuário em outro aparelho. Meus
  testes de rede nessa máquina **não são sinal confiável** pra esse tipo
  de problema — não declarar sucesso de novo em mudanças de
  rede/hosts/proxy sem validação real do usuário em aparelho físico
  diferente.

- **Dockerizar tudo — tentado em 2026-09-16, revertido no mesmo dia.**
  Ver item acima — foi a primeira das três tentativas de mDNS, e trouxe
  junto a parte específica de containerizar server+client (Dockerfile,
  `docker-compose.yml` com serviço `server`, `express.static` servindo
  o build do client, scripts `docker:up`/`docker:down`) — tudo isso
  também revertido. Não ficou claro se os sintomas do Docker eram do
  Docker em si (overhead de rede conhecido do Docker Desktop no Mac) ou
  já era o mesmo problema do mDNS que se confirmou depois nas outras
  duas tentativas sem Docker nenhum envolvido.

- ~~Redesign visual "vidro fosco" (glassmorphism)~~ — **feito em
  2026-09-16**, a partir de uma referência visual que o usuário mandou
  (um modal escuro flutuando sobre fundo desfocado). Novas variáveis de
  tema: `--glass-bg`/`--glass-border` (translúcidas, diferentes por
  tema claro/escuro) e `--blob-1/2/3` (cores dos blobs de fundo — tons
  pastéis no claro, saturados no escuro). Fundo com
  `body::before` (`position: fixed`, `z-index: -1`) contendo três
  `radial-gradient`s coloridos com `filter: blur(80px)` — isolado num
  pseudo-elemento pra o blur não vazar pro resto da página. `#chat-screen`
  deixou de ocupar a tela inteira e virou um painel centralizado
  (`position: fixed` + `transform: translate(-50%, -50%)`,
  `min(92vw, 960px)` × `min(85vh, 640px)`); `.join-card` ganhou o mesmo
  tratamento. Ambos com `background: var(--glass-bg)` +
  `backdrop-filter: blur(24px)` — é isso que borra o fundo através do
  painel. `#sidebar`/`#form` viraram transparentes (deixam o vidro do
  painel pai aparecer) em vez de `var(--surface)` sólido; bolhas de
  mensagem (`--bubble-other`) também viraram translúcidas em vez de cor
  sólida, pra manter a consistência visual. Testado nos dois temas
  (claro e escuro) — funciona bem nos dois, blobs pastéis suaves no
  claro, saturados no escuro.

- ~~Links clicáveis nas mensagens~~ — **feito em 2026-09-16.** Lógica de
  detecção separada em `client/src/linkify.ts` (função pura, sem DOM —
  recebe texto, devolve um array de `{ type: "text" | "link", value }`)
  testada com 5 casos em `linkify.test.ts` (texto sem link, link no
  meio, múltiplos links, mensagem que é só link, string vazia). A
  construção do DOM (`<a>` com `target="_blank"` +
  `rel="noopener noreferrer"`, texto puro nos outros pedaços) fica no
  `renderMessage` do `main.ts`, consumindo o array — mesma separação
  "lógica pura testável / DOM só monta" que já usamos pro
  `colorForUsername`. Como roda na renderização (não no envio), mensagens
  antigas do histórico também ficam com os links clicáveis
  retroativamente. `#messages li.message a { color: inherit; ... }` no
  CSS pra herdar a cor do texto da bolha em vez de destoar. Testado no
  navegador: link clicável com atributos corretos, inclusive em mensagem
  antiga do histórico.

- **Compartilhar imagem no chat via upload — implementado em 2026-09-16,
  revertido no mesmo dia por decisão do usuário.** Opção A (base64 pelos
  mesmos eventos/Redis do texto, sem infra nova) foi implementada, testada
  ponta a ponta no navegador (upload, preview, envio, tempo real,
  persistência) e funcionou — mas o usuário reavaliou depois e achou que
  não fazia sentido pro caso de uso (`"Reverti essa feature, pensando bem
  nao faz sentido"`). Revertido por completo (`git checkout`), sem deixar
  vestígio no código — só ficaram mensagens antigas de teste no histórico
  do Redis (expiram sozinhas em 24h). Substituído pela ideia abaixo.

- ~~Mais temas (Tokyo Night, Dracula, Nord, Catppuccin)~~ — **feito em
  2026-09-16.** Antes só existia o toggle claro/escuro (`data-theme`
  "light"/"dark" ou ausente = segue `prefers-color-scheme`). Adicionados
  4 blocos de variáveis novos em `style.css`
  (`:root[data-theme="tokyo-night|dracula|nord|catppuccin"]`), cada um
  com sua própria paleta mas reaproveitando as mesmas variáveis de
  sempre (`--bg`, `--surface`, `--primary`, `--glass-bg`, `--blob-1/2/3`
  etc.) — o efeito "vidro fosco" (blur + blobs) é automático em qualquer
  tema novo, não precisou tocar em nenhum componente. Mecanismo de troca
  escolhido pelo usuário ("o que requerer menos alterações"): manteve o
  mesmo botão único (`#theme-toggle`) em vez de virar dropdown/painel —
  cada clique agora avança pra o próximo tema num ciclo de 6
  (`light → dark → tokyo-night → dracula → nord → catppuccin → light`),
  em vez de só alternar entre 2. O ícone do botão mostra o *próximo*
  tema do ciclo (o que o clique vai aplicar), não o atual — cada ícone
  faz referência ao tema de destino (🧛 pra ir a Tokyo Night, ❄️ pra
  Dracula, ☕ pra Nord, ☀️ pra Catppuccin, 🌙 pra light, 🌆 pra dark).
  Escolha salva no mesmo `localStorage` de antes (`localchat:theme`),
  sem migração necessária (valores antigos "light"/"dark" continuam
  válidos, só passaram a fazer parte de uma lista maior). Testado no
  navegador: os 6 temas do ciclo renderizam corretamente (cores, blobs
  de fundo, bolhas de mensagem), persistência sobrevive a reload, sem
  erros no console. 29 testes automatizados (14 server + 15 client)
  continuam passando.

- ~~Embutir imagem/gif quando o link da mensagem aponta pra um arquivo de
  imagem~~ — **feito em 2026-09-16**, ideia do usuário depois de reverter
  o upload acima (`"faria sentido se enviarmos o link e uma imagem/gif
  renderizarmos ela em tela"`) — mais simples que upload: sem payload
  novo, sem infra nova, sem compressão no client, sem risco de inchar o
  Redis com base64 (o histórico é limitado a 200 mensagens). Nova função
  pura `client/src/isImageUrl.ts`: dado um link, usa `new URL(url)` +
  checa se o `pathname` (não a query string) termina em extensão de
  imagem conhecida (`.png .jpg .jpeg .gif .webp .avif .bmp .svg`),
  `try/catch` retornando `false` pra URL inválida. 5 testes em
  `isImageUrl.test.ts` (extensões comuns, case-insensitive, com query
  string, link sem extensão de imagem, URL inválida). No `renderMessage`
  do `main.ts`: ao percorrer as partes do `linkify()`, um link cuja
  `isImageUrl()` seja `true` não vira `<a>` de texto — em vez disso é
  acumulado à parte e renderizado **depois** do texto da mensagem, como
  `<a class="image-link"><img class="message-image"></a>` (imagem
  clicável, abre em aba nova, `loading="lazy"`). Se a imagem falhar ao
  carregar (`img.onerror`), volta a virar link de texto normal em vez de
  sumir ou mostrar ícone de imagem quebrada. Trade-off consciente: por
  usar extensão de URL, não pega links "bonitos" sem extensão (Giphy,
  Tenor etc.) — funciona pra link direto de arquivo, que é o caso comum.
  Testado no navegador: link de gif (Wikimedia) anima normalmente embutido
  na bolha; link comum sem extensão de imagem continua como texto
  sublinhado de sempre; link de imagem quebrado cai pro fallback de texto
  corretamente; sem erros no console. 15 testes no client (5 novos),
  15 no server, todos passando.

### Pendente

Lista maior de ideias que o usuário está guardando e mandando aos poucos
(nostalgia MSN: recado pessoal/status, cores etc já indo; funcionalidades
de chat: reações em mensagem, editar/apagar, busca, menções; robustez:
feedback de reconexão do socket, rate limit, histórico paginado;
operacional: **mDNS/`chat.local` e Docker ficam pausados por
decisão do usuário** — três tentativas diferentes de mDNS quebraram em
teste real de segundo aparelho (ver nota acima); voltamos pro acesso via
IP:porta, comprovadamente estável. Se algum dia quiser retomar, **não
declarar sucesso sem validação real do usuário em aparelho físico
diferente** — já aconteceu três vezes de passar limpo nos meus testes e
quebrar no teste real).
Nenhum compromisso — ela vai puxando os itens quando quiser.

## Teste no navegador (2026-09-16 — resolvido)

Confirmado: precisava de um chat novo **sem** `--resume` pra detectar a
extensão Claude in Chrome (resume por si só não bastou). Com o chat novo,
testei o redesign do front de ponta a ponta com dois usuários em abas
separadas: login, envio/recebimento de mensagem em tempo real, bolha
própria vs. de terceiros, notificação de entrada/saída e contador de
online atualizando ao vivo — tudo funcionando, sem erros no console.

**Bug real encontrado e corrigido:** `#chat-screen` usava `display: grid`
só com `grid-template-columns` definido; sem uma linha explícita, o grid
não estica os filhos pra altura total do container (diferente de flex,
que estica por padrão via `align-items: stretch`). Resultado: o form de
mensagem ficava empurrado pra fora da viewport, com a página inteira
rolando em vez de só `#messages` internamente. Corrigido trocando
`#chat-screen` pra `display: flex` (`#sidebar` com `flex: 0 0 220px`,
`#chat-main` com `flex: 1`).

**Segundo bug real encontrado e corrigido (relatado pelo usuário, testado
em Safari e Brave):** dar refresh na página voltava pra tela de chat em
vez da tela de login. Causa raiz: `#join-screen { display: flex; ... }`
e `#chat-screen { display: flex; }` usam seletor de ID (especificidade
1-0-0), que **sobrescreve** a regra padrão do navegador
`[hidden] { display: none; }` (especificidade 0-1-0) — confirmado via
`getComputedStyle` que `display` continuava `flex` mesmo com o atributo
`hidden` presente. As duas telas sempre estiveram renderizadas
simultaneamente, uma embaixo da outra (cada uma 100vh); a "troca de tela"
só parecia funcionar por causa do `input.focus()` no `main.ts`, que rola
a página até o campo de mensagem (fora da viewport) depois do login. No
reload, os navegadores restauram a posição de rolagem por padrão — por
isso a ilusão de "continuar logado" mesmo com o estado todo resetado por
baixo (0 online, sem histórico). Corrigido adicionando
`#join-screen[hidden], #chat-screen[hidden] { display: none; }` (ID +
atributo = especificidade 1-1-0, vence a regra só de ID). Validado com
`location.reload()` de verdade depois de rolar até o chat — volta pro
login corretamente agora.

## Lembretes de contexto do projeto

- Chat de rede local, sem cadastro — só nome de usuário. Mesmo nome
  logando em outro aparelho deve dar "match" (múltiplas conexões pro
  mesmo username).
- Sem persistência permanente: mensagens ficam no Redis com expiração
  de 24h.
- IP local da máquina de desenvolvimento (pode mudar): `192.168.15.10`.
  **Atualizado 2026-09-16 (fim do dia, versão final)**: acesso é sempre
  por IP — `http://<IP-da-máquina ou localhost>:5173` (client),
  conectando o socket direto em `http://<mesmo host>:3000` (server),
  CORS `origin: "*"` liberado. `chat.local`/mDNS foi tentado três vezes
  diferentes, as três quebraram em teste real de outro aparelho — está
  **pausado por decisão do usuário**, não usar/reativar sem alinhar
  antes.
