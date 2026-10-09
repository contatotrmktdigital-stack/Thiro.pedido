import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Landing from "../pages/Landing";

const HOME_BY_ROLE = {
  super_admin: "/superadmin",
  gestao: "/gestao",
  caixa: "/caixa",
  cozinha: "/cozinha",
  garcom: "/garcom",
};

export default function HomeRedirect() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div style={{ minHeight: "100dvh", background: "#0a0a0a" }} />;
  }

  if (!session) {
    return <Landing />;
  }

  const destination = HOME_BY_ROLE[profile?.role] || "/login";
  return <Navigate to={destination} replace />;
}
