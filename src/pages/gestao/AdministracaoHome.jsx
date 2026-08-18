import { Link } from "react-router-dom";
import AdminPinGate from "./AdminPinGate";

export default function AdministracaoHome() {
  return (
    <AdminPinGate>
      <div className="card">
        <h2>Área de administração</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Escolha o que deseja gerenciar.
        </p>
        <div className="role-grid">
          <div className="role-grid-item">
            <h3 style={{ marginTop: 0 }}>Cardápio</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Categorias e produtos do restaurante.
            </p>
            <Link to="/gestao/administracao/cardapio">
              <button
                className="btn-primary btn-accent"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                Gerenciar cardápio
              </button>
            </Link>
          </div>
          <div className="role-grid-item">
            <h3 style={{ marginTop: 0 }}>Comandas físicas</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Números das fichas de comanda entregues ao cliente.
            </p>
            <Link to="/gestao/administracao/comandas-fisicas">
              <button
                className="btn-primary btn-accent"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                Gerenciar comandas
              </button>
            </Link>
          </div>
          <div className="role-grid-item">
            <h3 style={{ marginTop: 0 }}>Usuários</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Logins da equipe (garçom, cozinha, caixa, gestão).
            </p>
            <Link to="/gestao/administracao/usuarios">
              <button
                className="btn-primary btn-accent"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                Gerenciar usuários
              </button>
            </Link>
          </div>
          <div className="role-grid-item">
            <h3 style={{ marginTop: 0 }}>Estoque</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Insumos, quantidade em estoque e receita dos produtos.
            </p>
            <Link to="/gestao/administracao/estoque">
              <button
                className="btn-primary btn-accent"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                Gerenciar estoque
              </button>
            </Link>
          </div>
          <div className="role-grid-item">
            <h3 style={{ marginTop: 0 }}>Relatórios</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Faturamento, formas de pagamento e produtos mais vendidos.
            </p>
            <Link to="/gestao/administracao/relatorios">
              <button
                className="btn-primary btn-accent"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                Ver relatórios
              </button>
            </Link>
          </div>
        </div>
      </div>
    </AdminPinGate>
  );
}
