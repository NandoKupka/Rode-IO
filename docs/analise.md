# Análise do projeto

Auditoria do código e do estado do repositório, feita em 24/08/2026, antes da primeira documentação. Escopo combinado: **só documentar** — nenhum código foi alterado nesta sessão.

## Pontos fortes

- **Simulação pura e testável**: `state.js` não toca DOM/canvas, RNG injetado, regras centralizadas em `ROUND_RULES` congelado.
- **Testes de verdade**: 27 testes com `node --test` (zero dependências extras), incluindo asserções de *geometria visual* via contexto fake que grava chamadas — raridade em jogos pequenos.
- **Comentários de intenção**, não de repetição (ex.: por que storage bloqueado não pode travar o jogo).
- **HUD eficiente**: escritas no DOM só quando o valor muda; loop com delta clampado.
- **Resiliência de persistência**: localStorage corrompido ou bloqueado cai no loadout padrão sem quebrar nada.
- **Tema coeso**: paleta única congelada consumida por todos os módulos visuais; UI estilo SNES consistente.

## Limitações conhecidas

### Jogabilidade / conteúdo

1. **Touch incompleto** — os botões na tela cobrem só `←`/`→` (`index.html`); não há como laçar (Espaço) nem trocar de faixa (`↑`/`↓`) no celular. O jogo não é terminável em touch.
2. **Sem progressão de dificuldade** — todas as armadas são idênticas: o número da rodada aparece no HUD mas nada em `ROUND_RULES` escala com ele.
3. **Sem som** — nenhum áudio (galope, laço, plateia).
4. **Recorde não persiste** — só o equipamento vai para o `localStorage`; placar total some ao recarregar.
5. **Tela de Configurações é stub** — "EM BREVE" (`index.html`).

### Código

6. **Mecânica cortada pela metade** — os modos `dragging`/`reeling` do laço têm desenho completo em `pixel-art.js`, campos `dragDistance`/`dragTime` no estado e teste próprio no renderer, mas `state.js` nunca transiciona para eles. Decidir: ativar a mecânica ou remover o caminho morto.
7. **`hash()` morta** — exportada em `math.js` e importada por `scene-renderer.js`, porém nunca chamada: o posicionamento do cenário usa `mod`, não hash. A importação é sobrante.
8. **Acessibilidade parcial** — HUD usa `aria-live="polite"` (bom), mas valores mudam a cada frame; modal de resultado não tem focus trap; canvas tem label mas o jogo é puramente visual.

### Infraestrutura

9. **Sem lint/formatação/CI** — não há ESLint/Prettier nem pipeline rodando os 27 testes existentes.
10. **Sem remote vinculado** — o repositório GitHub existe, mas `git remote` está vazio localmente; o commit ainda não tem backup remoto.

## Roadmap sugerido

Prioridade derivada dos itens acima (impacto ÷ esforço):

| # | Item | Resolve |
| --- | --- | --- |
| 1 | Completar controles touch: botões de Espaço e `↑`/`↓` reaproveitando `setControl()` | Gap 1 |
| 2 | Progressão por armada: touro mais rápido/janela menor escalando `ROUND_RULES` pelo número da rodada | Gap 2 |
| 3 | Recordes persistentes (melhor `%` de acerto e sequência) no `localStorage` | Gap 4 |
| 4 | Áudio com WebAudio API (sem assets externos: sintetizar galope/chicote/plateia) | Gap 3 |
| 5 | Decidir destino de `dragging`/`reeling`: implementar arrasto do boi laçado ou apagar código+teste | Gap 6 |
| 6 | Remover `hash()` e sua importação | Gap 7 |
| 7 | Configurações reais: dificuldade, som on/off | Gap 5 |
| 8 | ESLint + Prettier + CI (GitHub Actions) rodando `npm run test` | Gap 9 |
| 9 | Vincular remote e publicar (`git remote add origin … && git push -u origin master`) | Gap 10 |

## Registro desta sessão

- Excluídos `cowboy_laco_galope.gif` (referência visual gerada por IA, não usada pelo app) e `make_cowboy_gif.py` (script utilitário com caminhos pessoais hardcoded), conforme decisão do autor.
- Criados este documento, [`../README.md`](../README.md) e [`arquitetura.md`](arquitetura.md).
- Nenhum arquivo de código foi modificado.
