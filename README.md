# Rodeio 8-bit

Jogo arcade de **laço comprido** com estética 8/16-bit, feito em JavaScript puro + Vite. Você é o laçador montado: o boi cruza a arena, gire a corda no tempo certo e feche a laçada — armada após armada, somando no campeonato.

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento (Vite)
npm run build    # build de produção em dist/
npm run preview  # serve o build localmente
npm run test     # testes com node --test (sem dependências extras)
```

## Controles

| Tecla | Ação |
| --- | --- |
| `←` / `→` | Frear / acelerar o cavalo (muda só a sua posição na pista) |
| `↑` / `↓` | Trocar de faixa |
| `Espaço` | 1º toque: bolear · 2º toque: lançar o laço |
| `Esc` | Voltar ao menu |

No menu: `↑`/`↓` navegam, `Enter` confirma. Há botões na tela para frear/acelerar em dispositivos touch.

## Regras da armada

- O boi entra pela esquerda e acelera até velocidade de cruzeiro; a câmera acompanha o cavalo.
- A laçada só é elegível se: distância horizontal mínima de 34 px, dentro do alcance do laço e diferença de faixa de até 20 px.
- Dentro do alcance, cada laçada tem **50% de chance** de captura; fora dele, erra sempre.
- A armada termina quando o boi sai da tela ou logo após uma captura. Tentativas e acertos da armada alimentam o placar total do campeonato, que persiste entre armadas.

## Equipamentos

Escolha cavalo e laço na tela **Equipamentos** (a escolha fica salva no navegador):

| Laço | Corda | Alcance |
| --- | --- | --- |
| Brasa | 10 m | 80 px |
| Campestre | 12 m | 96 px |
| Sereno | 15 m | 120 px |
| Ouro Velho | 18 m | 144 px |

Os cavalos (Faísca, Trovão, Areia e Lua Clara) diferem apenas na aparência.

## Documentação

- [`docs/arquitetura.md`](docs/arquitetura.md) — módulos, game loop, renderização e testes
- [`docs/analise.md`](docs/analise.md) — análise do projeto, limitações conhecidas e roadmap

## Stack

Vite · ES modules sem framework · Canvas 2D (`320×180`, upscale pixelado) · fonte Silkscreen · `node --test`
