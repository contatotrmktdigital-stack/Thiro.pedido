import { Link } from "react-router-dom";
import AdminPinGate from "./AdminPinGate";

const ICONES = {
  pedido: "M6 2h12v20l-3-2-3 2-3-2-3 2z M12 8v6 M9 11h6",
  abertas: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
  notinhas: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
  historico: "M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 7v5l3 2",
  relatorios: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  caixinha: "M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  cardapio: "M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z M4 4v18 M9 7h6 M9 11h6",
  fidelidade: "M12 21s-7-4.4-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.6 12 21 12 21z",
  link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  estoque: "M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8",
  fisicas: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  pix: "M12 2l10 10-10 10L2 12z M8 12l4-4 4 4-4 4z",
  visual:
    "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1-1.5-1-3s1-2 3-2h2a3 3 0 0 0 3-3c0-5-4-8-9-8z M7.5 11h.01 M10 7.5h.01 M14.5 7.5h.01",
};

// Ordem: o que se usa no dia a dia primeiro, configurações por último.
const BLOCOS = [
  { to: "/gestao/pedidos", icone: "pedido", titulo: "Lançar pedido" },
  { to: "/gestao/administracao/comandas-abertas", icone: "abertas", titulo: "Comandas em aberto" },
  { to: "/caixa", icone: "notinhas", titulo: "Notinhas de hoje" },
  { to: "/gestao/administracao/historico", icone: "historico", titulo: "Histórico de pedidos" },
  { to: "/gestao/administracao/relatorios", icone: "relatorios", titulo: "Relatórios" },
  { to: "/gestao/administracao/caixinha", icone: "caixinha", titulo: "10% da casa" },
  { to: "/gestao/administracao/fidelidade", icone: "fidelidade", titulo: "Fidelidade" },
  { to: "/gestao/administracao/cardapio", icone: "cardapio", titulo: "Cardápio" },
  { to: "/gestao/administracao/cardapio-digital", icone: "link", titulo: "Cardápio digital" },
  { to: "/gestao/administracao/estoque", icone: "estoque", titulo: "Estoque" },
  { to: "/gestao/administracao/comandas-fisicas", icone: "fisicas", titulo: "Comandas físicas" },
  { to: "/gestao/administracao/pix", icone: "pix", titulo: "Pagamento Pix" },
  { to: "/gestao/administracao/identidade-visual", icone: "visual", titulo: "Identidade visual" },
];

function Icone({ nome }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONES[nome]} />
    </svg>
  );
}

export default function AdministracaoHome() {
  return (
    <AdminPinGate>
      <div className="gestao">
        <div className="gestao-titulo">
          <h1>Gestão</h1>
          <p>Escolha o que deseja fazer.</p>
        </div>
        <div className="gestao-grade">
          {BLOCOS.map((b) => (
            <Link key={b.to} to={b.to} className="gestao-bloco">
              <span className="gestao-bloco-icone">
                <Icone nome={b.icone} />
              </span>
              <span className="gestao-bloco-titulo">{b.titulo}</span>
            </Link>
          ))}
        </div>
      </div>
    </AdminPinGate>
  );
}
