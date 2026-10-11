import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AREAS = [
  {
    to: "/garcom",
    titulo: "Garçom",
    texto: "Abrir comandas e lançar pedidos",
    icone: "M6 2h12v20l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h4",
  },
  {
    to: "/cozinha",
    titulo: "Cozinha",
    texto: "Ver e preparar os pedidos",
    icone: "M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  },
  {
    to: "/gestao/administracao",
    titulo: "Gestão",
    texto: "Relatórios, cardápio e ajustes",
    nota: "Pede a senha de administração",
    icone: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  },
];

export default function GestaoHome() {
  const { restaurant } = useAuth();

  return (
    <div className="areas">
      <div className="areas-titulo">
        <h1>Para onde vamos?</h1>
        <p>{restaurant?.name ? `${restaurant.name} · escolha a área de trabalho` : "Escolha a área de trabalho"}</p>
      </div>
      <div className="areas-grade">
        {AREAS.map((a) => (
          <Link key={a.to} to={a.to} className="area-card">
            <span className="area-card-icone">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={a.icone} />
              </svg>
            </span>
            <span className="area-card-titulo">{a.titulo}</span>
            <span className="area-card-texto">{a.texto}</span>
            {a.nota && <span className="area-card-nota">{a.nota}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
