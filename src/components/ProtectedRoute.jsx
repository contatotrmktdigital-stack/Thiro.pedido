import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  gestao: "Gestão",
  caixa: "Caixa",
  cozinha: "Cozinha",
  garcom: "Garçom",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="centered-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="centered-screen">
        <div className="auth-card">
          <div className="error-box">
            Seu login existe, mas não há um perfil vinculado a ele. Peça para o administrador
            verificar seu cadastro no Thiro.pedido.
          </div>
        </div>
      </div>
    );
  }

  if (!profile.active) {
    return (
      <div className="centered-screen">
        <div className="auth-card">
          <div className="error-box">Seu acesso está desativado. Fale com a gestão do restaurante.</div>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
