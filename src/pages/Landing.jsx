import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

// Contato da home. Preencha pra ligar os botões "Falar no WhatsApp"/"Contato":
//   whatsapp: só números, com país e DDD (ex: "5567999999999")
//   email: ex: "contato@seudominio.com"
// Se os dois ficarem vazios, os botões de contato simplesmente não aparecem.
const CONTATO = { whatsapp: "", email: "" };

const contatoHref = CONTATO.whatsapp
  ? `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent("Olá! Quero conhecer o Thiro.pedido.")}`
  : CONTATO.email
    ? `mailto:${CONTATO.email}`
    : null;

const ICONES = {
  receipt: "M6 2h12v20l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h4",
  qr: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v3 M14 20h3 M20 20h1",
  flame: "M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-5-5",
  pix: "M12 2l10 10-10 10L2 12z M8 12l4-4 4 4-4 4z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
  box: "M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  moto: "M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8 15h5l3-6h-4 M16 9h3l2 4",
  palette:
    "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1-1.5-1-3s1-2 3-2h2a3 3 0 0 0 3-3c0-5-4-8-9-8z M7.5 11h.01 M10 7.5h.01 M14.5 7.5h.01",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  device: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2",
  check: "M5 12l5 5L20 7",
};

function Icon({ name, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONES[name]} />
    </svg>
  );
}

const DESTAQUES = [
  { icone: "bolt", titulo: "Tempo real", texto: "O pedido aparece na cozinha no mesmo segundo." },
  { icone: "pix", titulo: "Pix com QR code", texto: "Valor certo, direto na conta do restaurante." },
  { icone: "device", titulo: "Em qualquer tela", texto: "Celular, tablet ou computador, sem instalar nada." },
  { icone: "palette", titulo: "Sua marca", texto: "Logo e cores do seu restaurante dentro do app." },
];

const FUNCIONALIDADES = [
  { icone: "receipt", titulo: "Comandas e mesas", texto: "Abra, lance itens e feche a conta direto do celular do garçom." },
  { icone: "qr", titulo: "QR code da comanda", texto: "Aproxime o celular da ficha e a comanda abre sozinha." },
  { icone: "flame", titulo: "Cozinha em tempo real", texto: "Fila de pedidos que atualiza sozinha, com observações em destaque." },
  { icone: "search", titulo: "Cardápio rápido", texto: "Categorias em menu lateral e busca por nome para achar tudo em segundos." },
  { icone: "pix", titulo: "Pagamento Pix", texto: "QR code gerado na hora com o valor exato da conta." },
  { icone: "file", titulo: "Notinha personalizada", texto: "Conta com o nome e as cores do seu restaurante, em tela cheia." },
  { icone: "box", titulo: "Controle de estoque", texto: "Receita de cada produto e baixa automática dos insumos." },
  { icone: "chart", titulo: "Relatórios", texto: "Faturamento, formas de pagamento e produtos mais vendidos por período." },
  { icone: "moto", titulo: "Balcão e delivery", texto: "Atenda retirada e entrega com taxa de entrega somada na conta." },
  { icone: "palette", titulo: "Identidade visual", texto: "Cada restaurante com sua logo, cor principal e imagem de fundo." },
];

const PASSOS = [
  { titulo: "Cadastramos seu restaurante", texto: "Criamos seu acesso e deixamos tudo pronto para você começar." },
  { titulo: "Você coloca sua marca", texto: "Logo, cores, cardápio e fichas de comanda do seu jeito." },
  { titulo: "Sua equipe atende", texto: "Garçom lança, cozinha prepara e o cliente paga na mesa." },
];

const TELAS = [
  {
    titulo: "Garçom",
    itens: ["Abre comandas e lança pedidos", "Busca o produto pelo nome", "Fecha a conta com notinha e Pix"],
  },
  {
    titulo: "Cozinha",
    itens: ["Recebe os pedidos na hora", "Vê observações em destaque", "Marca pronto com um toque"],
  },
  {
    titulo: "Gestão",
    itens: ["Cardápio, estoque e equipe", "Relatórios e caixinha", "Identidade visual do restaurante"],
  },
];

function TelaDoApp() {
  return (
    <div className="lp-phone" aria-hidden="true">
      <div className="lp-phone-top">
        <span>Mesa 5 · Comanda 12</span>
        <span className="lp-phone-dot" />
      </div>
      <div className="lp-phone-body">
        <div className="lp-phone-row">
          <span>2x X Burger</span>
          <strong>R$ 50,00</strong>
        </div>
        <div className="lp-phone-pill lp-pill-orange">Em preparo</div>
        <div className="lp-phone-row">
          <span>1x Fritas média</span>
          <strong>R$ 25,00</strong>
        </div>
        <div className="lp-phone-pill lp-pill-green">Entregue</div>
        <div className="lp-phone-row">
          <span>2x Refrigerante lata</span>
          <strong>R$ 14,00</strong>
        </div>
        <div className="lp-phone-pill lp-pill-green">Entregue</div>
        <div className="lp-phone-sep" />
        <div className="lp-phone-row">
          <span>Taxa de serviço (10%)</span>
          <strong>R$ 8,90</strong>
        </div>
        <div className="lp-phone-total">
          <span>Total</span>
          <strong>R$ 97,90</strong>
        </div>
        <div className="lp-phone-btn">Fechar comanda</div>
      </div>
      <div className="lp-toast">
        <Icon name="flame" size={18} />
        <div>
          <strong>Novo pedido na cozinha</strong>
          <span>Mesa 8 · 1x X Bacon</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const anteriorBg = html.style.background;
    const anteriorScroll = html.style.scrollBehavior;
    html.style.background = "#0a0a0a";
    html.style.scrollBehavior = "smooth";
    return () => {
      html.style.background = anteriorBg;
      html.style.scrollBehavior = anteriorScroll;
    };
  }, []);

  const fecharMenu = () => setMenuAberto(false);

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-header-inner">
          <a href="#topo" className="lp-brand" onClick={fecharMenu}>
            <span className="lp-brand-mark"><img src="/logo-simbolo.png" alt="" /></span>
            <span>Thiro.pedido</span>
          </a>

          <nav className={`lp-nav${menuAberto ? " aberto" : ""}`}>
            <a href="#funcionalidades" onClick={fecharMenu}>Funcionalidades</a>
            <a href="#como-funciona" onClick={fecharMenu}>Como funciona</a>
            <a href="#telas" onClick={fecharMenu}>Telas</a>
            <a href="#contato" onClick={fecharMenu}>Contato</a>
            <Link to="/login" className="lp-btn lp-btn-primary lp-nav-entrar" onClick={fecharMenu}>
              Entrar
            </Link>
          </nav>

          <button
            type="button"
            className="lp-burger"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main id="topo">
        <section className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-hero-texto">
              <p className="lp-eyebrow">Sistema de comandas para restaurantes</p>
              <h1>
                Comanda, cozinha e caixa em <span>um só app.</span>
              </h1>
              <p className="lp-hero-sub">
                O garçom lança o pedido no celular, a cozinha recebe na hora e o cliente paga com Pix
                na mesa. Sem papel, sem correria, sem conta errada.
              </p>
              <div className="lp-hero-acoes">
                <Link to="/login" className="lp-btn lp-btn-primary lp-btn-grande">
                  Entrar
                </Link>
                {contatoHref && (
                  <a href={contatoHref} className="lp-btn lp-btn-ghost lp-btn-grande">
                    Falar com a gente
                  </a>
                )}
              </div>
              <p className="lp-hero-nota">Funciona no celular, tablet e computador. Sem instalar nada.</p>
            </div>
            <div className="lp-hero-visual">
              <TelaDoApp />
            </div>
          </div>
        </section>

        <section className="lp-faixa">
          <div className="lp-container lp-faixa-grid">
            {DESTAQUES.map((d) => (
              <div key={d.titulo} className="lp-faixa-item">
                <span className="lp-faixa-icone">
                  <Icon name={d.icone} />
                </span>
                <div>
                  <strong>{d.titulo}</strong>
                  <p>{d.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="funcionalidades" className="lp-secao">
          <div className="lp-container">
            <p className="lp-eyebrow">Funcionalidades</p>
            <h2>Tudo que seu restaurante precisa no dia a dia</h2>
            <div className="lp-grade">
              {FUNCIONALIDADES.map((f) => (
                <article key={f.titulo} className="lp-card">
                  <span className="lp-card-icone">
                    <Icon name={f.icone} />
                  </span>
                  <h3>{f.titulo}</h3>
                  <p>{f.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="lp-secao lp-secao-laranja">
          <div className="lp-container">
            <p className="lp-eyebrow lp-eyebrow-escuro">Como funciona</p>
            <h2>Em três passos você está atendendo</h2>
            <div className="lp-passos">
              {PASSOS.map((p, i) => (
                <div key={p.titulo} className="lp-passo">
                  <span className="lp-passo-num">{i + 1}</span>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="telas" className="lp-secao">
          <div className="lp-container">
            <p className="lp-eyebrow">Um app, várias telas</p>
            <h2>Cada pessoa da equipe vê o que precisa</h2>
            <div className="lp-grade lp-grade-3">
              {TELAS.map((t) => (
                <article key={t.titulo} className="lp-card lp-card-tela">
                  <h3>{t.titulo}</h3>
                  <ul>
                    {t.itens.map((item) => (
                      <li key={item}>
                        <Icon name="check" size={18} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-secao lp-secao-escura">
          <div className="lp-container lp-marca">
            <div>
              <p className="lp-eyebrow">Sua marca, seu jeito</p>
              <h2>A área do seu restaurante é 100% sua</h2>
              <p className="lp-marca-texto">
                Cada restaurante coloca a própria logo, escolhe a cor principal e a imagem de fundo.
                A notinha, o menu e as telas da equipe ficam com a cara do seu negócio.
              </p>
              <ul className="lp-lista">
                <li><Icon name="check" size={18} /> Logo do restaurante</li>
                <li><Icon name="check" size={18} /> Cor principal em todo o app</li>
                <li><Icon name="check" size={18} /> Imagem de fundo</li>
                <li><Icon name="check" size={18} /> Nome e cores na notinha</li>
              </ul>
            </div>
            <div className="lp-marca-amostra" aria-hidden="true">
              <div className="lp-amostra" style={{ "--cor": "#c2410c" }}>
                <span className="lp-amostra-logo">SB</span>
                <strong>Seu Burguer</strong>
              </div>
              <div className="lp-amostra" style={{ "--cor": "#15803d" }}>
                <span className="lp-amostra-logo">PZ</span>
                <strong>Pizzaria Bella</strong>
              </div>
              <div className="lp-amostra" style={{ "--cor": "#1d4ed8" }}>
                <span className="lp-amostra-logo">BC</span>
                <strong>Bar do Centro</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="contato" className="lp-cta">
          <div className="lp-container lp-cta-inner">
            <h2>Quer o Thiro.pedido no seu restaurante?</h2>
            <p>Fale com a gente e deixe seu atendimento mais rápido e organizado.</p>
            <div className="lp-hero-acoes lp-cta-acoes">
              {contatoHref ? (
                <a href={contatoHref} className="lp-btn lp-btn-escuro lp-btn-grande">
                  Falar com a gente
                </a>
              ) : null}
              <Link to="/login" className="lp-btn lp-btn-escuro-ghost lp-btn-grande">
                Já sou cliente: entrar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <a href="#topo" className="lp-brand">
            <span className="lp-brand-mark"><img src="/logo-simbolo.png" alt="" /></span>
            <span>Thiro.pedido</span>
          </a>
          <p>Comandas, cozinha e caixa para restaurantes.</p>
          <Link to="/login">Entrar</Link>
        </div>
      </footer>
    </div>
  );
}
