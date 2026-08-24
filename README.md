# Rodeio 8-bit

Jogo arcade de **laço comprido** com estética 8/16-bit, feito em JavaScript puro + Vite. Você é o laçador montado: o boi cruza a arena, gire a corda no tempo certo e feche a laçada — armada após armada, somando no campeonato.

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento (Vite)
npm run build    # build de produção em dist/
npm run preview  # serve o build localmente
npm run test     # testes com node --test (sem dependências extras)
npm run pages:dev # simula o Cloudflare Pages localmente
```

## Deploy no Cloudflare Pages

O repositório está configurado para publicar o build Vite de `dist/` no projeto
Pages `rode-io`. O caminho recomendado é conectar o GitHub para receber deploys
automáticos a cada push na branch `master`:

1. Faça commit destes arquivos e envie a branch `master` para o GitHub.
2. No painel da Cloudflare, abra **Workers & Pages > Create application > Pages > Import an existing Git repository**.
3. Autorize o GitHub, selecione o repositório `NandoKupka/Rode-IO` e use `rode-io` como nome do projeto.
4. Em **Production branch**, selecione `master`.
5. Em **Build settings**, use `npm run build` como comando e `dist` como diretório de saída. Deixe o diretório raiz vazio.
6. Se o painel mostrar a opção de versão do sistema de build, escolha **v3**. A versão do Node já está fixada pelo arquivo `.node-version` e não precisa ser cadastrada no painel.
7. Não é necessário cadastrar variáveis de ambiente para a versão atual.
8. Clique em **Save and Deploy**. Depois disso, cada push em `master` publica produção; outras branches e pull requests recebem URLs de preview.

## Controles

| Tecla | Ação |
| --- | --- |
| `←` / `→` | Frear / acelerar o cavalo (muda só a sua posição na pista) |
| `↑` / `↓` | Trocar de faixa |
| `A` | Apertar repetidamente para bolear; o peso do laço define a quantidade |
| `Espaço` | Arremessar quando o boleio estiver liberado |
| `Ctrl` | Segurar para recolher o laço após uma tentativa errada |
| `Esc` | Voltar ao menu |

No menu: `↑`/`↓` navegam, `Enter` confirma. Há botões na tela para frear/acelerar em dispositivos touch.

## Regras da armada

- O boi entra pela esquerda e acelera até sua velocidade de cruzeiro reduzida; a câmera e o cenário mantêm o ritmo original.
- A laçada só é elegível se o boi estiver à frente e a distância diagonal até ele couber no alcance do laço. A diferença de faixa já entra nesse cálculo, sem um corte vertical separado.
- A mira elíptica varre principalmente de um lado para o outro e pulsa durante o boleio. A elipse mantém seus eixos fixos; apenas o pequeno nó percorre o contorno na mesma velocidade de giro do laço do cowboy, simulando o movimento da corda sem girar a área de acerto. O contorno externo tem o dobro das dimensões da área útil, indicada pela elipse central; somente essa região interna garante a captura. A cor acompanha continuamente a chance real: **vermelho** indica 0%, tons intermediários passam por laranja e amarelo, e **verde** indica 100%. O nível do laço aumenta a área útil. Essa região garantida recebeu uma redução adicional de 20% e sua altura foi reduzida em mais 20%, deixando a mira menor e mais deitada. A tela Configurações oferece cinco níveis de tolerância persistentes, de difícil a fácil. Cavalos mais estáveis movem a mira mais devagar e por uma área menor.
- Depois de uma captura, o cowboy acompanha automaticamente a velocidade do gado e mantém a distância até o fim da tela; acelerar e frear não alteram esse ritmo pós-acerto.
- Ao errar, inclusive por falta de alcance do laço equipado, o aro cai na pista e pode ser recolhido com `Ctrl`. Se o gado chegar ao fim da tela, o recolhimento começa automaticamente na mesma velocidade normal antes da modal.
- A armada e a modal de resultado só terminam quando o boi sai da tela, inclusive depois de uma captura. Tentativas e acertos da armada alimentam o placar total do campeonato, que persiste entre armadas.

## Equipamentos

Escolha cavalo e laço na tela **Equipamentos** (a escolha fica salva no navegador):

| Laço | Nível da mira | Corda | Peso | Alcance | Preço |
| --- | --- | --- | --- | --- | --- |
| Campestre | 1 | 12 m | 4,8 kg | 96 px | Inicial |
| Brasa | 2 | 10 m | 4,0 kg | 80 px | R$ 450 |
| Raizeiro | 3 | 14 m | 3,2 kg | 112 px | R$ 900 |
| Sereno | 4 | 15 m | 2,4 kg | 120 px | R$ 1.500 |
| Horizonte | 5 | 17 m | 2,0 kg | 136 px | R$ 2.400 |
| Ouro Velho | 6 | 18 m | 1,6 kg | 144 px | R$ 3.600 |

A stamina agora pertence ao cowboy e é calculada pelo nível dele, mantido fixo em **NV.1** nesta versão. O peso do laço define o esforço de boleio, mas a quantidade de apertos fica oculta. Cada `A` acelera o giro, amplia a mira e preenche a barra pixelada sobre o cowboy; quando ela fica completa, `Espaço` lança. A loja já registra compras e equipamentos no navegador; nesta versão, o saldo é infinito.

Os seis cavalos têm notas de 1 a 5 estrelas. **Velocidade** melhora igualmente a resposta ao acelerar e ao frear; **estabilidade** reduz a oscilação aleatória da mira ao redor dos chifres. Durante a aceleração, a estabilidade efetiva cai suavemente em dois níveis sem alterar as estrelas exibidas; os níveis ocultos 0 e −1 atendem aos cavalos que já estão no mínimo. O Imperial é o melhor animal, com 5 estrelas nos dois atributos.

## Documentação

- [`docs/arquitetura.md`](docs/arquitetura.md) — módulos, game loop, renderização e testes
- [`docs/analise.md`](docs/analise.md) — análise do projeto, limitações conhecidas e roadmap

## Stack

Vite · ES modules sem framework · Canvas 2D (`320×180`, upscale pixelado) · fonte Silkscreen · `node --test`
