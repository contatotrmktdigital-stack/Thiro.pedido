# Thiro.pedido — todas as 9 fases implementadas

Sistema de comandas multi-restaurante. **Todas as 9 fases planejadas estão implementadas e
testadas de ponta a ponta**: estrutura multi-restaurante, painel de super admin, login por
papel (garçom, cozinha, caixa, gestão), a segunda senha da área de administração, o
cadastro de cardápio (categorias e produtos), a abertura/lançamento de comandas pelo garçom
(mesa, balcão/retirada ou delivery), a tela da cozinha em tempo real (KDS), o fechamento de
conta **direto na mesa pelo garçom** (não existe uma pessoa fixa no caixa), o controle de
estoque de insumos com baixa automática, os relatórios de faturamento, e uma **notinha
virtual** na tela no lugar da impressão física (decisão do usuário — a plataforma atende
vários restaurantes, cada um com impressoras diferentes, então imprimir de verdade fica pra
quando fizer sentido pra um restaurante específico).

## O que já funciona

- Cadastro de restaurantes pelo super admin (você)
- Criação automática do primeiro login de gestão de cada restaurante
- Login por e-mail/senha, com cada pessoa vendo só a área do seu papel
- Isolamento total entre restaurantes diferentes (garantido no próprio banco de dados)
- Segunda senha (PIN) para entrar na área de administração de cada restaurante
- Cardápio: gestão cadastra categorias e produtos (nome, descrição, preço, ativo/inativo)
  do próprio restaurante, em "Área de administração" → "Gerenciar cardápio"
- Comandas: gestão cadastra os números das comandas físicas (fichas entregues ao cliente)
  em "Área de administração" → "Comandas físicas"; o garçom, em `/garcom`, digita o número
  da mesa e escolhe uma ficha livre pra abrir a comanda, depois lança os itens do cardápio
  com controle de quantidade e total ao vivo
- Usuários: gestão cria os logins da equipe (garçom, cozinha, caixa, outra gestão) em
  "Área de administração" → "Usuários", e pode desativar/reativar acesso. Essa senha de
  login é diferente da senha de administração (PIN) — a equipe não precisa do PIN pro
  dia a dia
- Cozinha em tempo real: a cozinha vê os itens pendentes/em preparo em `/cozinha` e avança
  o status (pendente → preparo → pronto) com um clique; a tela atualiza sozinha (Supabase
  Realtime) assim que o garçom lança um item novo, sem precisar recarregar a página. O
  garçom também vê o status de cada item ao vivo na comanda e marca como entregue quando
  a cozinha finaliza
- Observação por item: o garçom pode escrever uma observação (ex: "sem salada", "bem
  passado") antes de lançar um item — ela aparece em destaque tanto na comanda quanto na
  tela da cozinha, e itens com observação nunca se misturam com itens iguais sem observação
- Fechamento na mesa: o garçom fecha a conta direto na comanda pelo próprio celular — liga/
  desliga a taxa de serviço (10%) vendo o total mudar na hora, escolhe a forma de pagamento
  (dinheiro, débito, crédito ou Pix — a cobrança em si acontece na maquininha, fora do
  sistema) e fecha. Depois de fechada, a comanda física volta a ficar disponível pro
  próximo cliente, e a tela vira um resumo (some a possibilidade de mexer nos itens)
- Balcão/retirada e delivery: ao abrir uma comanda em `/garcom`, o garçom escolhe o tipo de
  atendimento — mesa (como já era), balcão (só o nome do cliente) ou delivery (nome,
  telefone, endereço e taxa de entrega). Cada tela (garçom, cozinha, caixa) mostra a
  identificação certa pra cada tipo, e o fechamento no caixa soma a taxa de entrega ao
  total da conta
- Estoque: em "Área de administração" → "Estoque", a gestão cadastra os insumos
  (ingredientes) com a quantidade em estoque e a unidade (un, kg, g, o que precisar) e
  monta a receita de cada produto do cardápio (quais insumos e quanto de cada um). Quando o
  garçom lança um pedido, o estoque desses insumos baixa sozinho; se o item for reduzido,
  excluído ou cancelado antes da comanda fechar, o estoque volta automaticamente
- Cancelar item: na comanda, o garçom pode cancelar um item em qualquer estágio (antes de
  ser entregue) — ele fica marcado "Cancelado" e riscado na lista, sai do total da conta, e
  devolve o insumo pro estoque
- Relatórios: em "Área de administração" → "Relatórios", com filtro de período (atalhos de
  hoje/7 dias/30 dias/este mês ou datas customizadas) — faturamento total, número de
  comandas fechadas, ticket médio, gráfico de faturamento por dia, gráficos por forma de
  pagamento e por tipo de atendimento, e ranking dos produtos mais vendidos
- Notinha virtual: assim que o garçom fecha a conta, aparece uma notinha bem visual na tela
  (estilo cupom, com o nome do restaurante, itens, total e forma de pagamento) — o garçom
  mostra pro cliente ou lê os itens em voz alta. Pra ver de novo mais tarde, o link
  "Notinhas de hoje" no topo do site (visível pra garçom/caixa/gestão) lista as comandas
  fechadas no dia. Sem impressão física por enquanto (ver acima o porquê)
- Identidade visual por restaurante: em "Área de administração" → "Identidade visual" (ou,
  pelo super admin, no botão "Personalizar" da lista de restaurantes), cada restaurante pode
  trocar a logo, a cor principal e a imagem de fundo do app, além do nome/ícone que aparece
  na aba do navegador. Quem não personalizar nada continua com a aparência padrão da Thiro

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) (se ainda não tiver)
2. Clique em "New Project", escolha um nome (ex: `thiro-pedido`) e uma senha de banco de dados
   forte (guarde essa senha em um lugar seguro, ela é diferente das senhas do sistema)
3. Aguarde alguns minutos até o projeto ficar pronto

### 2. Rodar o SQL da Fase 1

1. No painel do Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em **New query**
3. Abra o arquivo `supabase/sql/001_fase1_fundacao.sql` deste projeto, copie todo o conteúdo
   e cole no editor
4. Clique em **Run**
5. Deve aparecer "Success. No rows returned" — isso confirma que as tabelas e regras de
   segurança foram criadas

### 3. Desativar cadastro público (segurança)

Como o cadastro de restaurantes é sempre feito por você (nunca pelo próprio dono do
restaurante se inscrevendo sozinho), vamos fechar essa porta:

1. No painel do Supabase, vá em **Authentication > Providers > Email**
2. Desative a opção **"Allow new users to sign up"** (ou equivalente, o nome pode variar
   um pouco conforme a versão do painel)

### 4. Criar o primeiro super admin (você)

1. Vá em **Authentication > Users > Add user**
2. Preencha seu e-mail e uma senha forte
3. Marque a opção **"Auto Confirm User"**
4. Depois de criado, copie o **User UID** (aparece na lista de usuários)
5. Volte no **SQL Editor**, rode este comando (trocando os valores):

```sql
insert into public.profiles (id, restaurant_id, full_name, role)
values ('COLE-O-UID-AQUI', null, 'Seu Nome', 'super_admin');
```

### 5. Publicar a Edge Function (criação de novos logins)

Isso exige o Supabase CLI instalado no seu computador. Se você não tiver, me avise que eu
te guio na instalação — ou podemos fazer essa etapa juntos quando chegar a hora.

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU-PROJECT-REF   # está em Project Settings > General
supabase functions deploy create-user
```

### 6. Configurar as chaves do projeto

1. No painel do Supabase, vá em **Project Settings > API**
2. Copie a **Project URL** e a **anon public key**
3. Neste projeto, copie o arquivo `.env.example` para um novo arquivo chamado `.env`
4. Cole os valores copiados:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 7. Instalar e rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente `http://localhost:5173`), entre com o
e-mail/senha do super admin que você criou no passo 4, e você deve cair no painel de
criação de restaurantes.

## Testando o fluxo completo

1. Logado como super admin, crie um restaurante de teste (ex: "Thiro Burguer") e um
   e-mail/senha de gestão
2. Saia (botão "Sair") e entre com o login de gestão que você acabou de criar
3. Você deve cair no painel de gestão — clique em "Entrar na área de administração"
4. Na primeira vez, o sistema pede para você criar a segunda senha (PIN); nas próximas
   vezes, ele só pede para digitar
5. Confirme que abrindo em outro navegador/celular com o mesmo login, os dados batem

## Estrutura do projeto

```
src/
  lib/supabaseClient.js       cliente do Supabase (usa as chaves do .env)
  context/AuthContext.jsx     sessão, perfil e restaurante do usuário logado
  context/AdminGateContext.jsx  controle da segunda senha de administração
  components/                 layout, rotas protegidas, redirecionamento por papel, ConfirmButton (confirmação sem diálogo do navegador), Notinha (recibo virtual), charts/ (BarList, VerticalBars)
  pages/
    Login.jsx
    superadmin/                painel do super admin (criar/gerenciar restaurantes)
    gestao/                    painel de gestão + área de administração (PIN) + cardápio + comandas físicas + usuários + estoque/receitas + relatórios
    garcom/                    comandas abertas (mesa/balcão/delivery) + lançamento de itens + fechamento na mesa
    cozinha/                   fila de pedidos em tempo real (KDS)
    caixa/                     "Notinhas de hoje": comandas fechadas hoje + notinha virtual de cada uma
supabase/
  sql/001_fase1_fundacao.sql             schema do banco + segurança (RLS) da Fase 1
  sql/002_fix_pgcrypto_search_path.sql   correção do PIN (pgcrypto no schema extensions)
  sql/003_fase2_cardapio.sql             tabelas de categorias/produtos + RLS da Fase 2
  sql/004_fase3_mesas_comandas.sql       tabelas de comandas/itens da Fase 3 (mesas removida na 005)
  sql/005_comandas_fisicas.sql           comandas físicas + mesa digitada (ajuste da Fase 3)
  sql/006_fase4_cozinha_realtime.sql     RLS de cozinha + Realtime ligado em comanda_itens (Fase 4)
  sql/007_fase5_caixa.sql                forma de pagamento + trava de itens após fechar (Fase 5)
  sql/008_fase6_balcao_delivery.sql      tipos de atendimento mesa/balcão/delivery (Fase 6)
  sql/009_fase7_estoque.sql              insumos, receitas e baixa automática por trigger (Fase 7)
  functions/create-user/                 Edge Function que cria novos logins com segurança
```

Relatórios (Fase 9) e a notinha virtual (Fase 8) não precisaram de SQL novo — são só código
de frontend.

## Site em produção

O sistema já está no ar em **https://thiro-pedido.vercel.app**, hospedado no Vercel (time
"Thiro", projeto `thiro-pedido`), com deploy automático a cada `git push` na branch `main`. O
código-fonte está no GitHub em `contatotrmktdigital-stack/Thiro.pedido`.

Detalhes importantes de quem for mexer nessa configuração:

- **Variáveis de ambiente no Vercel**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`,
  configuradas em Project Settings → Environment Variables. Como o Vite grava essas variáveis
  dentro dos arquivos do site já na hora de compilar (não lê elas depois, em tempo real), **toda
  vez que uma delas mudar é preciso fazer um Redeploy manual** no Vercel (aba Deployments → "..."
  → Redeploy) — só salvar a variável não é suficiente.
- **Chave anon do Supabase — use o formato antigo (JWT), não o novo**: em Project Settings → API
  do Supabase existem dois formatos de chave pública: a nova "publishable key" (começa com
  `sb_publishable_...`) e a clássica (um token longo que começa com `eyJ...`). Neste projeto, a
  chave nova causava erro 401 "Invalid API key" e o login parava de funcionar em produção — use
  sempre a clássica (`eyJ...`) tanto no `.env` local quanto na env var do Vercel.
- **`vercel.json`**: contém uma regra de rewrite (`"/(.*)" → "/index.html"`) necessária para as
  rotas do React Router (`/garcom`, `/cozinha`, etc.) funcionarem ao recarregar a página ou abrir
  o link direto — sem isso o Vercel retorna 404 nessas URLs.
- **Authentication → URL Configuration no Supabase**: o "Site URL" e os "Redirect URLs" precisam
  apontar para `https://thiro-pedido.vercel.app` (não `localhost`), senão links de e-mail (como
  recuperação de senha) abrem com erro de conexão recusada.

## Próximos passos

Todas as 9 fases planejadas já têm código pronto e testado, e o site já está no ar. Só falta:

1. Cadastrar o cardápio real, as comandas físicas e os insumos/receitas da hamburgueria
   (o que existe hoje é só estrutura de teste)
2. Testes com a equipe no dia a dia e ajustes conforme a necessidade real for aparecendo
3. Se algum dia fizer sentido imprimir de verdade num restaurante específico (impressora
   Epson TM-T20X via USB), isso é um trabalho novo a retomar — já existe experiência prévia
   com QZ Tray no histórico do projeto
4. Limpar os perfis de super_admin de teste que sobraram no banco durante o troubleshooting do
   login em produção (só a conta `thiagor.oliveira.profissional@gmail.com` está em uso hoje)

Qualquer dúvida em algum desses passos, é só chamar — posso te guiar em cada etapa.
