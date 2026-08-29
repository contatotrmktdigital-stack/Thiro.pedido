# Thiro.pedido — contexto do projeto

Este arquivo é lido automaticamente pelo Claude Code quando você abre uma sessão nesta pasta.
Ele resume tudo que já foi decidido e feito até agora numa conversa anterior (no Cowork), para
que a continuação aqui não perca contexto.

## O que é o projeto

Sistema de comandas para hamburgueria, rodando na internet, acessível de qualquer dispositivo
(celular, tablet, computador) com os mesmos dados sincronizados em tempo real. Não é só para uma
hamburgueria: é pensado como uma **plataforma multi-restaurante** — outros restaurantes (negócios
de terceiros) também poderão usar, cada um com dados 100% isolados dos demais.

## Decisões já fechadas (não precisam ser discutidas de novo)

- Nome do sistema: **Thiro.pedido**
- Identidade visual: cores **azul e vermelho** (já aplicadas no tema CSS)
- Modelo de atendimento: mesas no salão + balcão/retirada + delivery
- Dentro do atendimento em mesa: a **mesa é só um número digitado pelo garçom** na hora de abrir a
  comanda (não é um cadastro fixo, não tem tela de administração, "some" quando a comanda fecha).
  Já a **comanda física** (a ficha/cartão numerado que o garçom entrega ao cliente) É um cadastro
  fixo feito pela gestão (ex: fichas 1 a 30), reaproveitado assim que a comanda anterior fecha —
  uma mesma ficha não pode estar em duas comandas abertas ao mesmo tempo
- Perfis de usuário: garçom/atendente, cozinha, caixa, gestão/dono, e um "super admin" (dono da
  plataforma) que cadastra novos restaurantes
- Cadastro de novos restaurantes na plataforma: manual, feito só pelo super admin (sem cadastro
  público self-service)
- Dentro de cada restaurante, a área de administração exige uma **segunda senha (PIN)**, além do
  login normal, cadastrada pelo próprio gestor
- Porte da hamburgueria do dono: médio, ~10-25 mesas; pode abrir mais unidades no futuro, mas o
  banco de dados já foi desenhado pensando nisso
- Estoque de insumos com baixa automática por venda: **implementado na Fase 7**
- **Todos os pagamentos são feitos na mesa, não existe uma pessoa fixa no caixa.** O garçom fecha a
  conta pelo próprio celular, direto na mesa — liga/desliga a taxa de serviço (10%) vendo o total
  mudar na hora, e escolhe a forma de pagamento depois de cobrar na maquininha
  **InfinityPay** (sem integração automática/TEF — o sistema só registra qual forma foi usada)
- **Impressão física (Epson TM-T20X) fica pra depois, de propósito** — a plataforma é
  multi-restaurante e cada um teria uma impressora diferente pra configurar, não vale a pena
  complicar isso agora. No lugar, existe uma **notinha virtual** na tela (bonita, estilo cupom):
  o garçom fecha a conta na mesa pelo celular e mostra essa tela pro cliente, ou lê os itens em
  voz alta. Se um restaurante específico precisar de impressão física no futuro, isso é um
  trabalho novo a ser retomado (já existe experiência prévia com QZ Tray, documentada no
  histórico deste arquivo, caso sirva de ponto de partida)
- Stack técnica: **React (Vite)** no frontend, **Supabase** (Postgres + Auth + Realtime + Row
  Level Security) como backend, hospedagem em **Vercel ou Netlify**

## Projeto Supabase já criado

- Nome do projeto no Supabase: "Thiro.pedidos"
- Project ref: `gawkilcguovapcuevnsy`
- Project URL: `https://gawkilcguovapcuevnsy.supabase.co`
- O `.env` deste projeto já está preenchido com a URL e a chave **anon clássica (formato JWT,
  começa com `eyJ...`)** — **não usar a chave "publishable" nova (`sb_publishable_...`)**, ver o
  motivo na entrada sobre o deploy em produção logo abaixo em "Status atual"
- **Authentication → URL Configuration** no Supabase: Site URL e Redirect URLs apontando pra
  `https://thiro-pedido.vercel.app` (precisa disso pra e-mails de recuperação de senha
  funcionarem em produção)

## Produção (site no ar)

- **Site**: https://thiro-pedido.vercel.app
- **Repositório**: https://github.com/contatotrmktdigital-stack/Thiro.pedido (público — sem
  segredos no código, chaves só em variável de ambiente)
- **Hospedagem**: Vercel, time "Thiro" (conta `contato.trmktdigital-stack`), projeto
  `thiro-pedido`, deploy automático a cada push na branch `main`. Variáveis de ambiente
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) configuradas direto no painel da Vercel —
  **lembrar que mudar uma env var na Vercel não atualiza o site sozinho, precisa rodar
  "Redeploy"** (o Vite grava essas variáveis dentro dos arquivos na hora do build, não lê elas
  em tempo real)
- `vercel.json` na raiz faz o rewrite de todas as rotas pro `index.html` — necessário pras rotas
  client-side (React Router) como `/garcom` não darem 404 em produção

## Status atual (o que já foi feito)

- [x] Estrutura do projeto React + Vite criada, com tema azul/vermelho
- [x] Schema SQL da Fase 1 (`supabase/sql/001_fase1_fundacao.sql`) já foi rodado com sucesso no
      Supabase: tabelas `restaurants` e `profiles`, RLS de isolamento entre restaurantes, funções
      auxiliares (`my_role`, `my_restaurant_id`, `is_super_admin`), e as funções de PIN
      (`set_admin_pin`, `verify_admin_pin`)
- [x] Tabelas antigas de uma tentativa anterior (abandonada) de projeto que estavam no mesmo
      projeto Supabase (`companies`, `branches`, `roles`, `permissions`, `profile_roles`,
      `role_permissions`, `profiles` antigo) foram removidas antes de rodar o schema novo
- [x] "Enable email provider" está ligado no Supabase (Authentication > Providers > Email) — sem
      isso, ninguém consegue logar
- [x] Usuário de super admin criado: nome "Thiago", `auth.users.id` = `22f21f8b-29fe-4b57-ab01-9857abceb9af`,
      já vinculado em `public.profiles` com `role = 'super_admin'`
- [x] Projeto movido para `C:\Users\thiag\Downloads\thiro-pedido` (pasta própria, separada do
      site institucional), `npm install` rodado sem erros
- [x] Edge Function `create-user` publicada com sucesso via `npx supabase functions deploy
      create-user` (confirmado pelo Supabase: "Deployed Functions")
- [x] Login testado localmente com sucesso com o usuário de super admin. Havia um bug no
      `src/pages/Login.jsx` (faltava redirecionar após login bem-sucedido, ficava travado na
      tela de login mesmo com credenciais corretas) — corrigido adicionando `navigate("/")`
      após `signIn` sem erro
- [x] Fluxo completo da Fase 1 testado e validado: super admin criou o restaurante "restaurante
      teste" pelo painel (`/superadmin`) → deslogou → logou como gestão desse restaurante → entrou
      na área de administração → criou o PIN (segunda senha) com sucesso → tela "Área de
      administração desbloqueada" confirmada
- [x] Bug encontrado e corrigido durante o teste: `gen_salt()`/`crypt()` (funções do pgcrypto)
      ficam no schema `extensions` no Supabase, não em `public`. As funções `set_admin_pin` e
      `verify_admin_pin` davam erro `function gen_salt(unknown) does not exist` porque seu
      `search_path` só incluía `public`. Corrigido em `supabase/sql/001_fase1_fundacao.sql` (agora
      já nasce certo pra quem rodar do zero) e aplicado no banco já existente via
      `supabase/sql/002_fix_pgcrypto_search_path.sql` (rodado com sucesso no SQL Editor)
- [x] **Fase 2 (Cardápio) implementada e testada de ponta a ponta.** Tabelas `categorias` e
      `produtos` (`supabase/sql/003_fase2_cardapio.sql`, rodado com sucesso), isoladas por
      restaurante com o mesmo padrão de RLS da Fase 1 (gestão do próprio restaurante faz CRUD,
      qualquer papel do restaurante pode ler — os outros papéis vão precisar disso pra montar
      comandas nas próximas fases). Tela em `src/pages/gestao/CardapioAdmin.jsx`, acessível pelo
      hub em "Área de administração" → "Gerenciar cardápio" (`src/pages/gestao/
      AdministracaoHome.jsx` virou um hub de seções). Testado ao vivo: criar categoria, criar
      produto, editar produto, ativar/desativar — tudo funcionando
- [x] **Fase 3 (mesas e comandas — fluxo do garçom) implementada e testada de ponta a ponta,**
      depois de duas rodadas de ajuste com o usuário sobre como o modelo real funciona (ver
      decisão "mesa digitada vs. comanda física fixa" acima). Migrações
      `supabase/sql/004_fase3_mesas_comandas.sql` (tabelas `comandas` e `comanda_itens`; a
      tabela `mesas` criada aqui foi removida na migração seguinte) e
      `supabase/sql/005_comandas_fisicas.sql` (tabela `comandas_fisicas`, coluna
      `comandas.comanda_fisica_id` com índice único parcial garantindo que uma ficha não seja
      usada em duas comandas abertas ao mesmo tempo, coluna `comandas.mesa_numero` digitada
      pelo garçom, remoção da tabela `mesas`), ambas rodadas com sucesso. Telas: gestão cadastra
      as fichas de comanda física em "Área de administração" → "Comandas físicas"
      (`src/pages/gestao/ComandasFisicasAdmin.jsx`); garçom abre comanda em `/garcom`
      digitando o número da mesa e escolhendo uma ficha livre (`src/pages/garcom/GarcomHome.jsx`),
      lança itens do cardápio numa tela por comanda com ajuste de quantidade e total ao vivo
      (`src/pages/garcom/ComandaGarcom.jsx`, rota `/garcom/comanda/:comandaId`). Testado ao vivo:
      cadastrar comandas físicas, abrir comanda com mesa+ficha, ficha some da lista de livres
      enquanto em uso, adicionar item (incrementa em vez de duplicar linha ao clicar de novo no
      produto), aumentar/diminuir quantidade pelos botões +/- — tudo funcionando
- [x] **Tela de "Usuários" adicionada** (não estava nas fases originais, mas era um pré-requisito
      pra Fase 4: sem ela só dava pra testar o garçom usando o próprio login de gestão). Gestão
      cria logins de garçom/cozinha/caixa/gestão em "Área de administração" → "Usuários"
      (`src/pages/gestao/UsuariosAdmin.jsx`, rota `/gestao/administracao/usuarios`), reusando a
      Edge Function `create-user` já publicada na Fase 1 (não precisou de SQL novo — as políticas
      de RLS de `profiles` da Fase 1 já permitiam gestão listar/atualizar usuários do próprio
      restaurante). Também dá pra desativar/reativar usuários (botão de desativar a própria conta
      fica bloqueado, pra gestão não se trancar fora sem querer). Testado ao vivo: criar login de
      garçom, desativar, reativar — tudo funcionando. **Importante:** essa senha de login é
      diferente da senha de administração (PIN) — o garçom nunca precisa do PIN pra lançar pedidos
- [x] **Fase 4 (cozinha em tempo real / KDS) implementada e testada de ponta a ponta**, com
      Supabase Realtime de verdade (não é polling). Migração
      `supabase/sql/006_fase4_cozinha_realtime.sql`: cozinha entrou no grupo que pode atualizar
      `comanda_itens` (antes só garçom/gestão podiam avançar status), e a tabela `comanda_itens`
      foi adicionada à publicação `supabase_realtime`. Tela em `src/pages/cozinha/CozinhaHome.jsx`
      mostra os itens pendentes/em preparo (ordenados por horário do pedido), com botão pra avançar
      pendente → preparo → pronto; assina mudanças via `supabase.channel(...).on("postgres_changes"
      , ...)` e recarrega sozinha, sem precisar de F5. A tela do garçom
      (`src/pages/garcom/ComandaGarcom.jsx`) também passou a mostrar o status de cada item ao vivo
      (mesma assinatura Realtime, filtrada por comanda) e trava os botões +/- depois que a cozinha
      começa o preparo (evita editar item que já está sendo feito); quando o item fica "pronto",
      aparece um botão "Marcar entregue" pro garçom fechar o ciclo (status vira "entregue"). Testado
      ao vivo com duas abas abertas ao mesmo tempo (cozinha + garçom): pedido lançado aparece na
      cozinha sem reload, avanço de status na cozinha aparece no garçom sem reload, ciclo completo
      pendente → preparo → pronto → entregue confirmado
- [x] **Observação por item + itens iguais não se misturam** (ajuste pedido pelo usuário logo após
      a Fase 4). A coluna `comanda_itens.observacao` já existia desde a Fase 3 mas não tinha campo
      nenhum na interface. Adicionado um campo "Observação" acima do cardápio em
      `src/pages/garcom/ComandaGarcom.jsx`: o garçom escreve ali (ex: "sem salada") antes de clicar
      no produto, e essa observação vai só pro próximo item clicado (o campo limpa sozinho depois).
      Duas unidades do mesmo produto só somam na mesma linha (contador de quantidade) se **nenhuma
      das duas tiver observação** — assim que uma tem observação diferente, vira linha própria, pra
      não se perder no meio de um pedido maior. A observação aparece em destaque (caixa vermelha)
      tanto na tela do garçom quanto — o pedido principal do ajuste — na tela da cozinha
      (`src/pages/cozinha/CozinhaHome.jsx`). **Nota técnica:** a primeira tentativa usou
      `window.prompt()` pra pedir a observação, mas foi trocada por um campo de texto normal porque
      `prompt()` não funciona em todo navegador/contexto (não é só um detalhe do ambiente de teste
      — evitar usar `window.prompt`/`window.alert` neste projeto daqui pra frente). Não precisou de
      SQL novo. Testado ao vivo: item com observação vira linha separada, item sem observação some
      normal na linha existente, observação aparece destacada na cozinha
- [x] **Fase 5 (Caixa — fechamento de conta, pagamento) implementada e testada de ponta a ponta.**
      Migração `supabase/sql/007_fase5_caixa.sql`: novo tipo `forma_pagamento` (dinheiro/débito/
      crédito/pix) e colunas `comandas.forma_pagamento`/`comandas.valor_total`; caixa entrou no
      grupo que pode atualizar `comandas` (fechar); e — importante — depois que uma comanda é
      fechada (`status = 'fechada'`), ninguém mais consegue inserir/editar/excluir os itens dela
      (política de RLS de `comanda_itens` agora exige `comandas.status = 'aberta'`), pra não mexer
      numa conta já paga. Telas: `src/pages/caixa/CaixaHome.jsx` lista comandas abertas;
      `src/pages/caixa/FechamentoCaixa.jsx` (rota `/caixa/comanda/:comandaId`) mostra os itens,
      deixa o caixa ligar/desligar a taxa de serviço (10%, decisão já fechada — o cálculo soma na
      hora), escolher a forma de pagamento (só registra, a cobrança em si é na maquininha
      InfinityPay, fora do sistema — outra decisão já fechada) e fechar a comanda; depois de
      fechada, a mesma tela vira um recibo somente leitura (subtotal, taxa, forma de pagamento,
      total, horário do fechamento). Testado ao vivo: cálculo do subtotal/total com e sem taxa,
      validação obrigando escolher forma de pagamento antes de fechar, fechamento com sucesso,
      recibo exibido corretamente, comanda física liberada de volta pro pool assim que fecha
- [x] **Fase 6 (Balcão/retirada e delivery) implementada e testada de ponta a ponta**, depois de
      confirmar com o usuário como cada tipo funciona (balcão: só nome do cliente, sem ficha
      numerada; delivery: nome, telefone, endereço e taxa de entrega). Migração
      `supabase/sql/008_fase6_balcao_delivery.sql`: novo tipo `tipo_atendimento` ('mesa'/'balcao'/
      'delivery') e coluna `comandas.tipo`; `mesa_numero` deixou de ser obrigatório (só mesa usa);
      colunas novas `cliente_nome`/`cliente_telefone`/`endereco_entrega`/`taxa_entrega`; constraint
      `comandas_dados_por_tipo` garante que cada tipo tem os campos certos preenchidos (não dá pra
      salvar uma comanda "mesa" sem mesa_numero, nem uma "delivery" sem endereço, etc.). A migração
      também limpou a comanda de teste órfã (mesa sem comanda física) que tinha ficado de um teste
      anterior à Fase 3 ter fechado o modelo. `src/pages/garcom/GarcomHome.jsx` ganhou um seletor de
      tipo de atendimento com campos condicionais; `ComandaGarcom.jsx`, `CozinhaHome.jsx`,
      `CaixaHome.jsx` e `FechamentoCaixa.jsx` mostram o cabeçalho certo pra cada tipo (mesa+ficha,
      ou nome do cliente); o fechamento no caixa soma a taxa de entrega ao total (fora da taxa de
      serviço de 10%, que incide só sobre os itens). **Bug real encontrado e corrigido durante o
      teste** (não é só da Fase 6): fechar uma comanda no caixa nunca atualizava o status dos itens
      dela — itens que ficaram "pendente"/"em preparo" continuavam aparecendo pra sempre na fila da
      cozinha mesmo depois da comanda fechada e paga. Corrigido em `CozinhaHome.jsx` trocando o
      `comandas(...)` do select por `comandas!inner(...)` e filtrando `.eq("comandas.status",
      "aberta")`. Testado ao vivo: abrir comanda de balcão e de delivery, lançar item, ver aparecer
      certo na cozinha, fechar no caixa com taxa de entrega somada corretamente ao total, e
      confirmar que a comanda fechada não fica mais "presa" na fila da cozinha
- [x] **Fase 7 (Estoque de insumos) implementada e testada de ponta a ponta**, depois de confirmar
      com o usuário o modelo (por insumo com receita por produto, baixa no momento em que o garçom
      lança o pedido — não quando a cozinha prepara). Migração
      `supabase/sql/009_fase7_estoque.sql`: tabelas `insumos` (nome, unidade **livre** — aceita
      "un", "kg", "g", "L" etc., `quantidade_estoque` e `estoque_minimo` como `numeric(10,3)`,
      então aceita casas decimais) e `produto_insumos` (a receita: quanto de cada insumo um
      produto consome por unidade vendida). A baixa é automática via **trigger no banco**
      (`aplicar_baixa_estoque`, `security definer`) disparado em qualquer INSERT/UPDATE
      (quantidade ou status)/DELETE em `comanda_itens` — cobre lançar item, aumentar/diminuir
      quantidade, excluir item e **cancelar item** (tratado como quantidade efetiva zero). Telas:
      `src/pages/gestao/InsumosAdmin.jsx` (CRUD de insumos + ajuste manual de estoque, com aviso
      visual quando abaixo do mínimo ou negativo) e `src/pages/gestao/ReceitasAdmin.jsx` +
      `ReceitaProdutoEditor.jsx` (monta a receita de cada produto). **Limitação conhecida e
      aceita:** a baixa sempre usa a receita *atual* do produto, não uma foto de como a receita
      estava no momento do pedido — então cancelar um item lançado antes de a receita existir (ou
      antes dela mudar) pode "devolver" estoque que nunca foi baixado. Isso não trava nada, só
      pode deixar o número levemente errado num caso raro de editar a receita com pedidos antigos
      ainda em aberto; não valia a pena adicionar a complexidade de guardar snapshot da receita por
      pedido pra um caso tão raro.
- [x] **Botão "Cancelar item" adicionado à comanda do garçom** (pedido do usuário, motivado por
      "tem como tirar um produto se for necessário"): antes só dava pra remover item enquanto
      "pendente"; agora dá pra cancelar em pendente/preparo/pronto (não depois de entregue), o que
      também devolve os insumos via o mesmo trigger de estoque.
- [x] **Todos os `window.confirm()` do projeto foram substituídos por um componente próprio**
      (`src/components/ConfirmButton.jsx`, dois cliques dentro da própria tela: "Excluir" →
      "Confirmar" + "Voltar"). Motivo: descobrimos durante o teste da Fase 7 que o navegador deste
      ambiente **não suporta diálogos nativos do JS** (`confirm`/`prompt` — o `prompt()` já tinha
      dado erro "not supported" lá na Fase 3; o `confirm()` falha silenciosamente, sem erro nenhum,
      só nunca aparece e a ação nunca é confirmada) — isso travava toda ação destrutiva do sistema
      (excluir categoria/produto/comanda física/insumo, cancelar item) tanto pra mim quanto pro
      usuário. **Regra geral pra daqui pra frente: nunca usar `window.confirm`/`window.prompt`
      neste projeto — sempre usar `ConfirmButton` ou um campo de formulário normal.**
- [x] **Fase 9 (Relatórios) implementada e testada de ponta a ponta**, com gráficos (a pedido do
      usuário — usei o skill de dataviz interno pra escolher forma/cor: barras em vez de
      pizza/rosca porque comparar comprimento é mais fácil que comparar ângulo, e a paleta
      categórica usada — azul/laranja/água/amarelo — é a ordem padrão validada do skill pra
      contraste e daltonismo, não cores escolhidas de olho). Não precisou de tabela nova nem
      migração — é tudo consulta em cima de `comandas` (`status = 'fechada'`) e `comanda_itens`
      (excluindo `cancelado`), agregado no próprio navegador (volume de dados de uma hamburgueria
      não justifica view/RPC no banco). Tela em `src/pages/gestao/RelatoriosAdmin.jsx`, rota
      `/gestao/administracao/relatorios`: filtro de período com atalhos (Hoje/7 dias/30 dias/Este
      mês) + datas customizadas; cards de resumo (faturamento, comandas fechadas, ticket médio);
      gráfico de barras verticais de faturamento por dia (`src/components/charts/VerticalBars.jsx`);
      gráficos de barras horizontais por forma de pagamento, por tipo de atendimento e ranking de
      produtos mais vendidos (`src/components/charts/BarList.jsx`, reutilizável). Testado ao vivo
      com dados reais de comandas fechadas nos testes anteriores — todos os totais (faturamento,
      por forma de pagamento, por tipo, ticket médio) conferidos batendo com a soma manual, e o
      atalho "Últimos 7 dias" preenchendo os dias vazios corretamente no gráfico
- [x] **Fase 8 (Impressão física) implementada com QZ Tray, testada até onde dava sem impressora
      real — e depois desfeita a pedido do usuário.** Antes de mexer, o usuário esclareceu que não
      existe uma pessoa fixa no caixa — todo pagamento é feito na mesa, pelo próprio garçom, no
      celular — o que já tinha exigido redesenhar a Fase 5 (ver abaixo). Depois de eu montar a
      integração com QZ Tray (biblioteca `qz-tray`, `src/lib/qzPrint.js`, recibo em ESC/POS,
      confirmado funcionando até o ponto de tentar conectar nas portas certas do QZ Tray e falhar
      graciosamente sem o programa instalado), o usuário decidiu **não imprimir por enquanto**: a
      plataforma é multi-restaurante e cada um teria uma impressora diferente pra configurar, o
      que não vale a pena resolver agora. **Removido**: pacote `qz-tray` (`npm uninstall qz-tray`)
      e o módulo `src/lib/qzPrint.js`. **No lugar, criei uma "notinha virtual"** —
      `src/components/Notinha.jsx`, um componente visual bonito (cabeçalho com gradiente
      azul/vermelho da marca, borda picotada imitando papel de cupom, itens com observação em
      destaque, total grande, forma de pagamento, data/hora) que o garçom mostra na tela do
      celular pro cliente ou lê os itens em voz alta. Esse componente é usado em dois lugares:
      direto na tela do garçom (`ComandaGarcom.jsx`) assim que a comanda é fechada, e na tela de
      consulta (`FechamentoCaixa.jsx`, acessível por `/caixa`, agora chamada de "Notinhas de hoje"
      em vez de "Imprimir notinhas" no link do topo — `AppLayout.jsx`). O texto "Excluir"/"Imprimir"
      em `CaixaHome.jsx` virou "Ver notinha". **Continua tudo em vigor da mudança anterior**: o
      fechamento (taxa de serviço + forma de pagamento) acontece na tela do garçom, na mesa; o
      papel **garçom** continua com acesso a `/caixa` (útil agora pra *ver* notinhas antigas, não
      mais pra imprimir — e como não depende de programa nenhum no computador, funciona de
      qualquer aparelho, celular incluso). Se algum dia for necessário reativar impressão física
      pra um restaurante específico, isso vira um trabalho novo — o código do QZ Tray não ficou
      guardado como feature flag, foi removido de verdade para não deixar código morto.

- [x] **Deploy em produção (site no ar).** Fluxo: `git init` neste projeto (era pasta solta,
      nunca tinha sido versionada), criei `.gitignore` (baseado no projeto irmão db-agencia, mais
      a entrada extra `supabase/.temp/` — esse cache do Supabase CLI guarda a connection string do
      pooler do banco, então **nunca pode ir pro git**; cheguei a dar `git add -A` sem querer e ela
      ficou staged, percebi antes de commitar e tirei com `git rm -r --cached`). Commit inicial,
      push pro GitHub (`contatotrmktdigital-stack/Thiro.pedido`), import no Vercel (time "Thiro",
      projeto `thiro-pedido`) com as env vars `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Criei
      `vercel.json` com rewrite `"/(.*)" → "/index.html"` — sem isso as rotas do React Router (tipo
      `/garcom`, `/cozinha`) dão 404 ao recarregar a página ou acessar direto pela URL, porque o
      Vercel por padrão só serve arquivos estáticos existentes.
      **Bug sério pós-deploy: login em produção falhava** com "E-mail ou senha incorretos" mesmo
      com credenciais corretas (confirmado testando a API direto). Causa real: a chave salva em
      `VITE_SUPABASE_ANON_KEY` estava no formato novo "publishable key" (`sb_publishable_...`), que
      nesse projeto Supabase específico retornava 401 "Invalid API key" nas requisições feitas pelo
      bundle de produção (visto no Network tab do navegador). **Fix**: trocar pela chave clássica
      formato JWT (`eyJ...`, em Project Settings → API → o campo "anon public" legado, não o
      "publishable" novo) — atualizado tanto no `.env` local quanto na env var do Vercel, com
      **redeploy manual** depois (Vite grava as `VITE_*` dentro do bundle na hora do build, então só
      trocar a env var no painel não basta — precisa rodar o build de novo). Regra gravada:
      **sempre usar a anon key no formato JWT antigo, nunca a `sb_publishable_...`, neste projeto.**
      Durante essa investigação apareceu também outro problema separado: o link de recuperação de
      senha do Supabase abria em `localhost` (ERR_CONNECTION_REFUSED) em vez do domínio de produção
      — causa: **Authentication → URL Configuration → Site URL/Redirect URLs** ainda apontava pra
      `localhost`; corrigido apontando para `https://thiro-pedido.vercel.app`.
      **Pendência de limpeza**: durante o troubleshooting o usuário criou vários usuários
      super_admin de teste extras tentando contornar o que na real era o bug da API key — só
      `600e5580-5d98-4f7d-8ba6-83a00970d428` (`thiagor.oliveira.profissional@gmail.com`) está em
      uso; os outros (`22f21f8b-29fe-4b57-ab01-9857abceb9af`, `87ddcbc5-27aa-41b1-849b-a26c15a1a1a1`,
      `b2c1f019-93e5-4851-ac92-de72e4f2197f`, `7e00c6dd-96f8-4fa8-a65c-aa63df2799dd`) ficaram órfãos
      no banco (tabela `profiles` + Auth) e podem ser apagados quando sobrar tempo.
      **Site no ar, confirmado funcionando**: https://thiro-pedido.vercel.app — o usuário logou com
      sucesso e eu confirmei de forma independente vendo o Dashboard do Super Admin.

- [x] **Limpeza dos dados de teste (reinício do sistema).** O usuário pediu pra "reiniciar o
      sistema e tirar os testes" antes de começar a usar de verdade. Consultamos
      `public.restaurants` e havia só um registro, o "restaurante teste"
      (`ea8c14dc-8969-46d2-b806-6be63857a74b`, criado em 2026-08-17). Apagado via SQL Editor:
      `delete from public.restaurants where id = 'ea8c14dc-8969-46d2-b806-6be63857a74b';` — como
      toda tabela do sistema tem `restaurant_id ... on delete cascade`, isso já apagou sozinho tudo
      que pertencia a esse restaurante (cardápio, comandas físicas, comandas, itens, insumos/
      receitas, notinhas e os logins de equipe daquele restaurante). Confirmado no site em produção:
      a tela do super admin mostra "Nenhum restaurante cadastrado ainda." Sistema pronto, limpo, pra
      o usuário cadastrar o restaurante real da hamburgueria quando quiser.
      **Nota**: isso não apagou os logins de super_admin órfãos (ver pendência de limpeza acima) —
      são contas do `auth.users`/`profiles` sem `restaurant_id`, não afetadas pelo cascade.
      **Atualização**: esses órfãos (e mais um que sobrou dessa própria limpeza) foram apagados
      depois, junto com a Identidade Visual — ver item abaixo. Pendência encerrada.

- [x] **Identidade visual por restaurante (diferencial pós-lançamento).** Pedido do usuário: cada
      restaurante poder personalizar a aparência do app (logo, cor principal, imagem de fundo,
      nome/ícone na aba do navegador), configurável tanto por ele mesmo (gestão) quanto pelo super
      admin. Campos novos e opcionais em `restaurants` — `logo_url`, `cor_primaria`,
      `background_url` (migração `supabase/sql/010_identidade_visual.sql`, já aplicada em
      produção); restaurante sem nada preenchido continua com a aparência padrão da Thiro, então
      nada quebrou pros restaurantes existentes.
      **Como funciona**: bucket público `restaurant-assets` no Supabase Storage, um arquivo fixo
      por tipo (`{restaurant_id}/logo` e `{restaurant_id}/background`, sem extensão no nome —
      o `contentType` é gravado na hora do upload, então não precisa) com upload em cima do
      anterior (`upsert`) — assim não sobra arquivo órfão quando o restaurante troca a imagem.
      RLS do Storage: leitura pública (é só imagem de marca, não é dado sensível), escrita restrita
      à pasta do próprio restaurante (gestão) ou ao super_admin.
      **Aplicação do tema**: `src/lib/theme.js` converte a cor escolhida (um hex só) em HSL e gera
      as 4 variações que o CSS já usa (`--color-blue-900/700/600/100`), sempre travando a
      luminosidade num teto escuro (L 22–48%) e um piso de saturação — assim qualquer cor que o
      restaurante escolher continua com contraste seguro pro texto branco do cabeçalho, sem
      precisar validar cor por cor. `AppLayout.jsx` aplica essas variáveis como inline style no
      `.app-shell` (cascata automática pro app inteiro), troca o ícone "TP" pela logo quando
      existe, aplica a imagem de fundo com um overlay claro por cima (pra não atrapalhar a
      leitura dos cards) e atualiza `document.title` + o favicon (`<link rel="icon">`) pelo nome/
      logo do restaurante.
      **Onde configurar**: gestão em Área de administração → "Identidade visual"
      (`/gestao/administracao/identidade-visual`); super admin em "Personalizar" na lista de
      restaurantes do painel (`/superadmin/restaurantes/:id/visual`) — os dois usam o mesmo
      componente reaproveitado, `src/components/IdentidadeVisualForm.jsx`.
      **Testado de ponta a ponta** com um restaurante de teste temporário (criado, testado cor +
      logo + fundo + favicon/aba, confirmado tudo salvando certo no banco e no Storage, depois
      apagado — incluindo os arquivos do Storage, que precisam ser removidos pela API de Storage,
      não por SQL direto: o Supabase bloqueia `delete` direto em `storage.objects` de propósito).
      Nessa limpeza final também apagamos os logins órfãos que tinham sobrado do troubleshooting de
      login em produção (ver item acima) — banco 100% limpo de novo.
      **Publicado em produção** — commit `4bea442`, enviado com autorização do usuário.
      Depois disso o usuário testou sozinho em produção (criou dois restaurantes de teste,
      "Teste" e "Thiro") e pediu pra zerar de novo — realizado por SQL manual como das vezes
      anteriores.

- [x] **Super admin ver o e-mail do restaurante e apagar de vez (não só desativar).** Pedido
      direto do usuário, pra não precisar me chamar toda vez que quiser zerar um teste. Primeira
      versão que tentei usava uma Edge Function (`delete-restaurant`) pra também apagar os logins
      da equipe — mas isso exige deploy manual pelo Supabase Dashboard (Edge Functions → Via
      Editor → colar código → Deploy), e o usuário achou complicado demais e pediu pra simplificar.
      **Solução final, só com SQL** (`supabase/sql/011_restaurante_email_e_delete.sql`, já aplicada
      em produção e publicada no commit `3dfd225`):
      - Campo novo `restaurants.owner_email`, preenchido na hora de criar o restaurante
        (`SuperAdminDashboard.jsx`), mostrado como coluna na listagem.
      - Função `public.delete_restaurant(p_restaurant_id uuid)`, `security definer`, que só roda
        se `is_super_admin()` for verdadeiro: apaga primeiro os logins (`auth.users`) de toda a
        equipe daquele restaurante (a cascata do banco não alcança `auth.users`, só as tabelas
        `public`), depois apaga o restaurante (cascata cuida do resto — cardápio, comandas,
        estoque, identidade visual etc.). Chamada do frontend via `supabase.rpc("delete_restaurant",
        ...)`, sem precisar de Edge Function nem de chave de serviço no navegador.
      - Botão "Apagar" ao lado de "Desativar" na listagem do super admin, com confirmação em duas
        etapas (`ConfirmButton`).
      **Limitação aceita conscientemente**: essa função não apaga os arquivos de logo/fundo no
      Storage (bucket `restaurant-assets`) — ficam órfãos lá se o restaurante tinha identidade
      visual configurada. Apagar do Storage por SQL é bloqueado pelo Supabase de propósito
      (`storage.protect_delete()`), só dá pela API de Storage — o que voltaria a exigir código
      rodando com mais permissão. Decisão: aceitar esse resíduo pequeno (só arquivos de imagem,
      não aparecem em lugar nenhum do app) em troca de manter a solução simples de aplicar.
      **Publicado em produção**, commit `3dfd225`.

- [x] **Abrir comanda escaneando QR code (opcional, além da forma manual).** Ideia do usuário:
      colar um QR fixo em cada ficha de comanda física, gerado no momento em que a gestão cadastra
      a comanda no sistema, pra abrir na hora sem precisar escolher numa lista.
      **Decisão de design**: perguntei se o scan seria pela câmera comum do celular (o QR aponta
      pra um link do site) ou por um botão de escanear dentro do app (exigiria pedir permissão de
      câmera e uma lib de leitura, com mais risco de não funcionar direito no iPhone) — o usuário
      escolheu a câmera comum, que é a solução mais simples e funciona igual em qualquer celular
      sem exigir nenhuma biblioteca de leitura de QR.
      **Como funciona**: o QR (gerado com a lib `qrcode`, 100% no navegador, sem serviço externo)
      aponta pra `/garcom/abrir/{comanda_fisica_id}`. Essa tela nova
      (`src/pages/garcom/AbrirComandaPorQR.jsx`) verifica se já existe uma comanda aberta pra
      aquela ficha — se sim, pula direto pra ela; se não, pede só o número da mesa (o resto já é
      fixo: a comanda física escaneada) e cria a comanda, igual ao fluxo manual. Gerar/imprimir o
      QR fica em Área de administração → "Comandas físicas" → "Ver QR" em cada comanda (rótulo
      pra colar na ficha física, com botão de imprimir usando CSS de impressão puro, sem nenhuma
      biblioteca).
      **Importante**: isso não substitui nada — o fluxo manual de abrir comanda em `/garcom`
      (escolher tipo de atendimento + comanda física numa lista) continua exatamente como estava,
      porque o usuário avisou que ainda não vai usar QR code por enquanto. `GarcomHome.jsx` não foi
      tocado nessa mudança; o QR é só um atalho novo por cima, pra usar quando quiserem.
      Não precisou de nenhum SQL novo — só reaproveita `comandas_fisicas`/`comandas` e as RLS que
      já existiam.

- [x] **Cadastro de funcionário só com nome, sem inventar e-mail.** Pedido do usuário: "na hora de
      cadastrar garçons e outros funcionários tem como ser apenas o nome em vez de um email".
      O Supabase Auth exige um e-mail por baixo dos panos (não tem como tirar isso), então a
      solução foi gerar esse e-mail automaticamente, sem a gestão nunca precisar ver ou pensar
      nele: `src/lib/staffLogin.js` monta um nome de usuário sugerido a partir do nome digitado
      (`joao` → `joao.{slug-do-restaurante}`, com o slug do restaurante embutido porque o e-mail
      técnico por trás precisa ser único em toda a plataforma, não só dentro de um restaurante) e
      usa isso como e-mail interno (`{usuario}@equipe.thiropedido.app`, um domínio que nunca
      recebe e-mail de verdade, só existe pro Supabase aceitar o formato). O campo "Nome de
      usuário" em `UsuariosAdmin.jsx` vem pré-preenchido com essa sugestão mas pode ser editado
      livremente antes de criar o login.
      **Login continua funcionando dos dois jeitos**: `Login.jsx` aceita tanto um e-mail de
      verdade (o que a gestão/super admin já usavam antes dessa mudança, sem precisar recriar
      nada) quanto um nome de usuário de funcionário — se o texto digitado tem "@", trata como
      e-mail; senão, completa com o domínio interno (`toLoginEmail()` em `staffLogin.js`). Essa
      mudança só vale pro que gestão cadastra em Área de administração → Usuários (garçom,
      cozinha, caixa, ou outro login de gestão); o e-mail do PRIMEIRO login de gestão de cada
      restaurante (criado pelo super admin ao cadastrar o restaurante) continua pedindo e-mail de
      verdade — é o "dono" da conta, faz sentido continuar com e-mail real.
      **Não testado ao vivo por mim** (não tenho como logar sem senha pra validar o fluxo de
      ponta a ponta) — build passou e as funções puras (`slugifyUsername`, `toLoginEmail`) foram
      testadas isoladamente, mas pedir pro usuário criar um funcionário de teste e logar com o
      usuário gerado depois do deploy é importante antes de considerar 100% validado.
      **Atualização — bug real encontrado no teste em produção**: o usuário testou no cliente de
      verdade ("Dil's Burguer", já cadastrado e funcionando) e tentou criar um funcionário
      ("carlos", Cozinha) com senha "0000" (4 dígitos) — deu erro genérico "Edge Function returned
      a non-2xx status code". Causa real: senha menor que 6 caracteres (exigido pelo
      `create-user`), mas a mensagem de erro de verdade nunca chegava na tela porque o
      `supabase-js` só expõe um texto genérico em `fnError.message` quando uma Edge Function
      retorna erro — a mensagem real fica dentro do corpo da resposta HTTP
      (`fnError.context.json()`). Corrigido em duas frentes: `src/lib/functionError.js` (novo,
      função `readFunctionErrorMessage` que lê a mensagem de verdade) usado tanto em
      `UsuariosAdmin.jsx` quanto em `SuperAdminDashboard.jsx`; e validação da senha (mínimo 6
      caracteres) no cliente ANTES de chamar a função, pra nem deixar tentar com senha curta.
      Aproveitei pra corrigir de brinde um bug latente relacionado em
      `SuperAdminDashboard.jsx`: se o login de gestão falhasse ao criar um restaurante novo, o
      restaurante já tinha sido inserido e ficava órfão (sem login nenhum) — agora desfaz
      automaticamente chamando `delete_restaurant` nesse caso.

## Próximos passos imediatos (nesta ordem)

1. **Todas as 9 fases planejadas do sistema estão implementadas e testadas de ponta a ponta**,
   incluindo a Fase 8 — só que com notinha virtual na tela em vez de impressão física, por decisão
   do usuário (ver acima). Não há mais nenhuma fase grande pendente do roteiro original.
2. **Site já está no ar em produção** (https://thiro-pedido.vercel.app, ver detalhes acima) e **os
   dados de teste já foram apagados** — o sistema está zerado, pronto pro cadastro real.
3. **Identidade visual por restaurante e "apagar restaurante de vez" já estão publicados em
   produção** (ver acima). Banco zerado de novo depois dos testes do usuário.
4. **Lição aprendida**: o usuário prefere soluções só com SQL Editor a coisas que exigem deploy
   manual (Edge Functions pelo Dashboard) — ver `[[feedback_sql_sobre_edge_function]]` se essa
   memória existir, ou considerar esse padrão ao propor novas funcionalidades administrativas.
5. **O restaurante real já está cadastrado e em uso**: "Dil's Burguer" (não é mais teste), gestão
   é o Adilson. Cardápio completo já cadastrado via SQL (ver item abaixo). Cuidado redobrado a
   partir de agora com qualquer SQL de `delete`/limpeza — não é mais ambiente de teste.
6. Depois disso, resta só polimento/ajustes e novos diferenciais conforme o usuário for pedindo —
   não há mais fases grandes no roteiro original

- [x] **Cardápio do Dil's Burguer cadastrado via SQL** (`supabase/sql/012_cardapio_dils_burguer.sql`)
      — 8 categorias, 65 produtos, extraídos de uma imagem do cardápio que o usuário mandou. O
      script busca o restaurante pelo nome (`ilike '%Dil%Burg%'`) em vez de precisar do ID.
      **Armadilha que aconteceu na prática**: rodei o script, confirmei 8/65, mas depois o usuário
      testou e "não aparecia" no site — o restaurante tinha sido apagado/recriado em algum momento
      entre uma coisa e outra (mesmo nome, só que ID novo por trás), e como tudo é ligado por
      `restaurant_id` com cascade, o cardápio antigo sumiu junto com o restaurante antigo. Resolvido
      rodando o mesmo script de novo (idempotente o suficiente pra isso, já que busca pelo nome
      atual). **Lição**: depois de qualquer carga de dados por SQL, se o usuário disser "não
      apareceu", a explicação mais provável não é cache — é verificar se o `restaurant_id` que
      recebeu os dados ainda é o mesmo que o usuário está usando agora (`select restaurant_id from
      profiles where full_name = '...'` compara com o que o SQL de carga usou).

- [ ] **Abrir comanda aproximando um cartão NFC — cogitado e descartado.** Ideia do usuário:
      reaproveitar cartões de crédito/hotel antigos como "chave" pra abrir a comanda. Expliquei
      antes de implementar que isso só funciona em Android no Chrome (Web NFC não existe no
      iPhone/Safari — limitação da Apple, sem solução) e que cartão de crédito de verdade pode nem
      reagir (chip fechado pra pagamento). O usuário topou mesmo assim (coexistindo com QR/manual,
      sem substituir nada) e cheguei a implementar por completo (`src/lib/webNfc.js`, botão em
      `ComandasFisicasAdmin.jsx`/`GarcomHome.jsx`, migração com `comandas_fisicas.nfc_uid`) — mas
      antes de rodar o SQL ou publicar, o usuário decidiu não seguir ("deixa quieto essa ideia
      melhor só o qr code mesmo"). **Revertido por completo**: os dois arquivos `.jsx` voltaram ao
      estado anterior (`git checkout`), `src/lib/webNfc.js` e a migração `013_nfc_comandas.sql`
      foram apagados antes de qualquer commit — nada disso chegou a ir pro banco de produção nem
      pro GitHub. Só fica este registro pra não propor de novo sem necessidade.

- [x] **Separar a taxa de serviço (10%) do faturamento — "Caixinha da equipe".** Pedido do
      usuário, já com o Dil's Burguer em uso real: hoje a taxa de serviço cobrada na mesa entra
      misturada no `valor_total` da comanda, e por isso contava como faturamento normal do
      estabelecimento nos Relatórios — mas esse dinheiro é dos garçons, não da casa. Expliquei o
      comportamento atual antes de mexer (pedido explícito do usuário) e perguntei se ele queria
      só o total geral da caixinha por período ou também o detalhe por garçom — escolheu só o
      total geral por enquanto.
      **O que mudou**: campo novo `comandas.valor_taxa_servico` (migração
      `supabase/sql/014_caixinha_garcons.sql`), calculado e gravado no momento do fechamento em
      `ComandaGarcom.jsx` (`subtotal * 0.1` quando a taxa está ligada, `0` quando não está) — sem
      mexer no `valor_total` em si (continua sendo o total real cobrado do cliente, usado pro
      caixa/notinha). Em `RelatoriosAdmin.jsx`, todo "Faturamento" (total, por dia, por forma de
      pagamento, por tipo de atendimento) agora é `valor_total - valor_taxa_servico`, com uma nota
      visível na tela avisando disso. Nova tela **"Caixinha da equipe"**
      (`src/pages/gestao/CaixinhaAdmin.jsx`, rota `/gestao/administracao/caixinha`, card próprio em
      Área de administração) mostra só o total acumulado da taxa no período escolhido (mesmo
      seletor de período hoje/7 dias/30 dias/mês/personalizado) — sem quebrar por garçom por
      decisão do usuário. Extraí os helpers de período (`hojeString`/`diasAtras`/`inicioDoMes`) pra
      `src/lib/dateRanges.js`, reaproveitados pelas duas telas.
      **Dados antigos**: como o histórico de comandas do Dil's Burguer tinha acabado de ser zerado
      (pedido anterior do usuário, restaurante saindo de fase de teste), não havia nada pra
      corrigir retroativamente — a separação vale a partir de agora, pra frente.

- [x] **Gestão também lança pedidos + pode remover item já entregue.** Dois pedidos do usuário:
      1) a gestão poder fazer pedidos igual o garçom — já era **tecnicamente permitido** desde
      sempre (as rotas `/garcom`, `/garcom/comanda/:id` e as RLS de `comanda_itens` já incluíam
      `gestao` no papel liberado), só faltava um **link visível** pra chegar lá — adicionado em
      `GestaoHome.jsx` ("Fazer pedido (como garçom)"). 2) poder cancelar/remover um item da
      comanda mesmo depois de já marcado "Entregue" — hoje isso também já era permitido pelo
      banco (RLS de `comanda_itens_update`/`delete` não olha o status do ITEM, só que a comanda
      esteja `aberta`), só a **tela** que escondia o botão de cancelar assim que o item virava
      "Entregue". Deixei esse botão extra ("Remover da conta") aparecer **só pra gestão**
      (`profile.role === 'gestao'`) quando o item está entregue — garçom continua sem essa opção
      de propósito, pra não poder apagar um item já servido por conta própria; só a gestão tem
      essa autoridade. Nenhum SQL novo, nenhuma RLS nova — as duas coisas já existiam no banco,
      só faltava a tela deixar usar.

## Como trabalhar neste projeto

- O usuário (Thiago) não é técnico — explique passos em português simples, sem jargão
  desnecessário, e confirme antes de rodar comandos que ele não pediu
- Sempre que uma fase for concluída, resuma o que foi feito e o que falta, do jeito que está
  documentado aqui, para manter esse arquivo atualizado como fonte de verdade do projeto
- Já existe um cardápio de exemplo (enviado separadamente ao usuário) com hambúrgueres,
  acompanhamentos, bebidas e sobremesas — pode ser usado como base pra Fase 2, mas o cardápio real
  da hamburgueria ainda não foi fornecido
