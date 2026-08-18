import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HOME_BY_ROLE = {
  super_admin: "/superadmin",
  gestao: "/gestao",
  caixa: "/caixa",
  cozinha: "/cozinha",
  garcom: "/garcom",
};

export default function HomeRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="centered-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  const destination = HOME_BY_ROLE[profile?.role] || "/login";
  return <Navigate to={destination} replace />;
}
