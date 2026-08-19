import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminPinGate from "./AdminPinGate";
import IdentidadeVisualForm from "../../components/IdentidadeVisualForm";

function IdentidadeVisualContent() {
  const { restaurant, refreshProfile } = useAuth();

  if (!restaurant) {
    return <p>Carregando...</p>;
  }

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      <div className="card">
        <h2>Identidade visual</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Personalize a aparência do app pra combinar com a marca do seu restaurante.
        </p>
        <IdentidadeVisualForm restaurant={restaurant} onSaved={refreshProfile} />
      </div>
    </div>
  );
}

export default function IdentidadeVisualAdmin() {
  return (
    <AdminPinGate>
      <IdentidadeVisualContent />
    </AdminPinGate>
  );
}
