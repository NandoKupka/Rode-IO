# Arquitetura

Visão técnica do Rodeio 8-bit. Projeto em ES modules puros, sem framework: **Canvas 2D** para a cena (resolução interna `320×180` ampliada com `image-rendering: pixelated`) e **DOM sobreposto** para menus, HUD e modais.

## Fluxo por frame

O game loop vive em `src/main.js` (`frame()`), dirigido por `requestAnimationFrame`:

```
input.getState() ──► updateGame(state, input, delta) ──► renderer.render(state) ──► updateHud()
        (filas de toque)      (muta o estado)            (redesenho imediato)       (escrita DOM com diff)
```

- `delta` vem em segundos e é limitado a `0,05 s` para evitar saltos após abas inativas.
- O loop roda sempre; `updateGame` só simula quando a tela ativa é `game`.
- `updateHud` só escreve no DOM quando o valor mudou (comparação com cache local).

## Módulos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/main.js` | Entry point: fiação de DOM, troca de telas, HUD, persistência de equipamento e game loop |
| `src/game/state.js` | Simulação pura: criação/reset de estado e `updateGame()`; regras congeladas em `ROUND_RULES` |
| `src/game/input.js` | Fábrica de listener de teclado headless com filas de edge-detection (`lassoPressed`, `leftPressed`…), consumidas uma vez por frame |
| `src/game/equipment.js` | Catálogo congelado de 4 cavalos e 4 laços + `resolveLoadout()` com fallback para IDs inválidos |
| `src/game/theme.js` | Constantes congeladas: canvas, geometria do mundo (`WORLD`), escalas de arte, paleta de 22 cores |
| `src/game/scene-renderer.js` | `createSceneRenderer(ctx).render(state)`: céu/nuvens/montanhas em parallax, pista, cercas, plateia procedural e sprites em ordem de pintura |
| `src/game/pixel-art.js` | Desenho dos sprites: cavaleiro com galope de 4 quadros, braço articulado, física do laço (giro/lançamento/queda/arrasto), boi e plateia — tudo com `rect()` arredondados e curvas de Bézier |
| `src/game/math.js` | `mod`, `hash`, `clamp` |
| `src/game/draw-utils.js` | Helper `rect()` que arredonda coordenadas para pixels nítidos |

### Dependências entre camadas

`state.js` não conhece DOM nem canvas: recebe um objeto de input simples e um `random` injetado. O renderer lê o estado e desenha. Essa fronteira é o que permite testar as regras sem navegador.

## Simulação (`state.js`)

- **Estado**: câmera, placar total, armada atual (número, tentativas, acertos, status), cowboy (posição, velocidade, faixa, animação, laço) e boi.
- **Regras tunáveis**: todas em `ROUND_RULES` (velocidades, acelerações, tolerância de faixa, distância mínima de laçada, delays). Congelado em tempo de módulo.
- **Máquina de estados do laço**:
  ```
  ready ─espaço─► spinning ─espaço─► throwing ──► caught (50% dentro do alcance)
                                        └──────► falling ──► ready
  ```
  A elegibilidade é avaliada no lançamento: distância horizontal ≥ 34 px, distância euclidiana ≤ alcance do laço e diferença de faixa ≤ 20 px. Fora do alcance, o dado nem é rolado.
- **Fim da armada**: boi sai da tela à direita ou `0,85 s` após captura; `resetRound()` avança o número e preserva o placar do campeonato por padrão.

> Nota: os modos `dragging`/`reeling` existem no renderer e nos campos `dragDistance`/`dragTime`, mas a lógica nunca entra neles — mecânica cortada/reservada. Detalhes em [`analise.md`](analise.md).

## Renderização

Redesenho imediato a cada frame, em ordem de pintura: céu → nuvens → montanhas → pista → cerca do fundo → plateia de trás → sprites (boi, cavaleiro, laço) → plateia da frente → cerca da frente. Cercas, marcas da pista e plateia são posicionados por repetição com `mod(cameraX, espaçamento)`, então o cenário rola sem acumular estado.

Os sprites são **procedurais**, não bitmaps: cada personagem é composto por retângulos arredondados e Béziers, desenhados em escala maior e reduzidos por `ART_SCALE`. Variantes de cavalo (estrela, lista, meias, pinto) e nós de laço são condicionais no desenho.

## Input

`createInput(window)` devolve um objeto isolado de DOM real: mantém teclas pressionadas e filas de "toque" (borda de descida), ignorando auto-repeat. `setControl()` permite que os botões touch da UI injetem os mesmos sinais. Blur da janela limpa o estado das teclas.

## Mundo e tema

`theme.js` concentra a geometria (horizonte, pista, cercas, faixas de ±18 px em torno de `y = 104`, velocidade da câmera) e a paleta terrosa de 22 cores usada por todos os módulos visuais.

## Testes

Runner nativo do Node: `npm run test` → `node --test src/game/*.test.js` (27 testes).

| Suite | Cobre |
| --- | --- |
| `state.test.js` | Regras: liberação do boi, cruzamento ~5 s, acelerar/frear mexe só o cowboy, fluxo bolear→lançar, captura→pontuação→fim de armada, alcance por laço, chance de exatamente 50% (zero rolagens fora do alcance), reset preservando placar |
| `scene-renderer.test.js` | Geometria visual com contexto fake que grava chamadas: ordem de camadas, arco balístico do laço, abertura da corda no ápice, arrasto da errada, alcance curto parando antes do boi |
| `input.test.js` | Um toque = um frame na fila, auto-repeat ignorado, blur limpa teclas, botões programáticos |
| `equipment.test.js` | Catálogo único, alcance = metros × 8, fallback de IDs inválidos |

Padrões úteis ao escrever novos testes: passo fixo de `0,02 s` para avançar a simulação e RNG injetado determinístico.

## Persistência

Apenas a escolha de equipamento persiste: chave `rodeio-8bit-loadout` no `localStorage`, leitura/escrita defensivas (JSON inválido ou storage bloqueado caem no padrão sem quebrar o jogo).
