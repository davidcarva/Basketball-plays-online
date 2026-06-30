# Plano de evolução — Jogadas de Basquete 3D

Avaliação do app e plano extenso de melhoria (usabilidade, criação de jogadas, estética/clareza, compartilhamento e plataforma).

## Progresso (atualizado)
- ✅ **Sprint 1 — UX:** desfazer/refazer, atalhos, autosave, legenda, onboarding, PWA, deploy (Vercel).
- ✅ **Sprint 2 — Clareza:** modo 2D prancheta, notação (drible/corte/passe), exportar imagem PNG + vídeo WebM, link compartilhável.
- ✅ **Sprint 3 — Estética:** trilha da bola, jogador inclina no movimento, bola com gomos, auto-câmera, **textura de madeira** no piso, **identidade de time** (cores ataque/defesa + nome + preset daltônico), **intro de câmera** ao abrir jogada. (Bloom foi testado e **removido** — ficou forte/feio.) ⏳ opcional: piso reflexivo, tema claro/escuro.
- ⏳ **Sprint 4 — Criação:** ramificação condicional, modo gravação, blocos de fundamentos, notação extra (bloqueio/handoff/arremesso), defesa 2.0, coaching points, playbooks.
- ⏳ **Sprint 5 — Plataforma:** nuvem/login/comunidade, biblioteca com capas/favoritos/tags, testes, LOD, i18n.

## Avaliação do estado atual

### Pontos fortes
- **3D de verdade + mobile** — diferencial real (concorrentes são quase todos 2D top-down).
- Núcleo sólido: **quadros (keyframes)** com reprodução suave, **posse de bola** (a bola segue o dono; passe = trocar dono), **defesa reativa** (reage quadro a quadro), **meia/inteira/3v3**.
- Clareza: **onion skin** (só o próximo movimento), **glow neon** na seleção, **badges "funciona contra"**.
- Acervo categorizado por defesa + **modelos FIBA** + biblioteca (localStorage, export/import).
- Escala realista FIBA; estética inicial (ACES, luz 3 pontos, fundo gradiente, logo central).

### Lacunas (honesto)
- **Edição:** sem desfazer/refazer, sem onboarding, gestão de quadros limitada (sem reordenar/duplicar/duração por trecho), alvos pequenos no toque.
- **Criação:** sem notação tática (bloqueio, drible≠passe, handoff, arremesso), sem **ramificação condicional** (pedido antigo), sem modo gravação, sem papéis (PG..C).
- **Clareza/estética:** sem bloom/reflexo, sem **modo 2D prancheta**, sem export imagem/GIF, sem legenda de símbolos.
- **Plataforma:** só localStorage (sem nuvem/links de compartilhar), sem PWA/offline, sem testes.

## Pilares de melhoria

### Pilar 1 — Usabilidade & fluxo de edição
1. **Onboarding interativo** (1º uso): tour de 4 passos + dicas contextuais.
2. **Desfazer/Refazer** (Ctrl+Z / Ctrl+Y) com histórico de estados.
3. **Gestão de quadros pro:** reordenar (arrastar), duplicar, renomear, **duração por trecho** (hoje só velocidade global).
4. **Seleção avançada:** multi-seleção, mover grupo, **espelhar formação** (lado da quadra), **snap** a marcas (cantos, cotovelos, slots).
5. **Toque mobile:** halo de toque maior, "lupa" ao arrastar, **long-press** abre menu do jogador (atribuir bola, papel, número).
6. **Atalhos de teclado** (espaço = play, setas = quadros, +/- quadro).
7. **Autosave + renomear inline** (tirar os `prompt`).
8. **Painel do jogador** ao selecionar (atribuir bola, número, papel, cor).

### Pilar 2 — Criação de jogadas (o coração)
1. **Notação tática rica:** bloqueio (T), corte (linha), **drible (zigue-zague) ≠ passe (tracejado)**, handoff, arremesso (★ no aro). Diretamente "fácil de compreender".
2. **Ramificação condicional** — "se X, então Y ou Z": árvore de leituras por quadro. Pedido antigo e grande diferencial.
3. **Modo gravação:** arrastar em tempo real e gravar o caminho (curvas suaves) em vez de só keyframes.
4. **Defesa inteligente 2.0:** reações configuráveis (passar por cima/baixo do bloqueio, trocar, hedge, trap, close-out) + "stress test" mostrando onde a jogada falha.
5. **Pontos de coaching:** nota de texto por quadro/jogada (gatilho, leitura).
6. **Blocos de fundamentos:** arrastar "pick & roll", "dá-e-vai", "pin-down" e encaixar.
7. **Variações/contra-jogadas** vinculadas ("se a defesa fizer X…").
8. **Playbooks/sets:** agrupar jogadas em conjunto ordenado (treino/scout).

### Pilar 3 — Estética & clareza visual
1. **Pós-processamento:** bloom (aro/glow/seleção), leve vinheta — o "foda".
2. **Modo 2D Prancheta:** alternar 3D ↔ vista tática 2D limpa (clareza máxima; coaches adoram).
3. **Acabamento 3D:** piso reflexivo + texturas (madeira, logo do time), **bola com gomos**, jogador **vira na direção do movimento** + passada, **trilhas de movimento**.
4. **Legenda/Key de símbolos** sempre acessível.
5. **Identidade:** cores/nome de time, temas (claro/escuro/alto contraste), tipografia esportiva.
6. **Câmera cinematográfica:** auto-cam que segue a bola na reprodução; intro suave ao abrir jogada.
7. **Acessibilidade:** daltonismo (padrões além de cor), contraste, alvos de toque.

### Pilar 4 — Compartilhamento & biblioteca
1. **Exportar como imagem (PNG dos quadros) e GIF/MP4** da animação — viraliza no grupo.
2. **Link compartilhável** (codificar a jogada na URL; sem backend).
3. **Nuvem (login) + sincronizar + comunidade** de jogadas (precisa backend).
4. **Biblioteca melhor:** capas (thumbnail automático), tags múltiplas, busca, favoritos, ordenação.

### Pilar 5 — Plataforma & qualidade
1. **PWA:** instalável, offline, ícone no celular — grande p/ mobile.
2. **Deploy Vercel** + domínio.
3. **Testes** (modelo de jogada + fluxo e2e).
4. **Performance:** LOD da torcida, dispose, throttle ocioso.
5. **i18n** (pt/en) p/ alcance.

## Roadmap sugerido (sequência)
- ✅ **Sprint 1 — Quick wins de UX:** onboarding, desfazer/refazer, atalhos, autosave, legenda, PWA, deploy.
- ✅ **Sprint 2 — Clareza:** modo 2D prancheta + notação tática + export imagem/vídeo + link compartilhável.
- ✅ **Sprint 3 — Estética:** trilhas + lean + gomos + auto-cam + madeira + identidade de time + intro de câmera (bloom removido); reflexo/tema claro-escuro ⏳ opcional.
- ⏳ **Sprint 4 — Big bet de criação:** ramificação condicional + modo gravação + blocos de fundamentos.
- ⏳ **Sprint 5 — Plataforma:** nuvem/login/comunidade + defesa inteligente 2.0.

## Métricas-norte (qualidade)
- Criar a 1ª jogada em **< 2 min**.
- Entender uma jogada **sem explicação** (teste com outra pessoa).
- **60 fps** em celular mediano.
- **Compartilhar em 1 toque.**
