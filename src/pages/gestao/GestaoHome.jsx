import { Link } from "react-router-dom";

export default function GestaoHome() {
  return (
    <div>
      <div className="card placeholder-screen">
        <h2>Painel de gestão</h2>
        <p>
          O dashboard de vendas e relatórios chega nas próximas fases. Por enquanto, você já pode
          acessar a área de administração protegida pela segunda senha.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/gestao/administracao">
            <button className="btn-primary btn-accent" style={{ width: "auto", padding: "10px 20px" }}>
              Entrar na área de administração
            </button>
          </Link>
          <Link to="/garcom">
            <button className="btn-secondary" style={{ width: "auto", padding: "10px 20px" }}>
              Fazer pedido (como garçom)
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
