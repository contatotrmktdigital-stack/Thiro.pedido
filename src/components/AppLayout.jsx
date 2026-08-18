import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "./ProtectedRoute";

const PODE_VER_NOTINHAS = ["garcom", "caixa", "gestao"];

export default function AppLayout() {
  const { profile, restaurant, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">TP</div>
          <span>Thiro.pedido{restaurant ? ` · ${restaurant.name}` : ""}</span>
        </div>
        <div className="topbar-user">
          {profile?.role && PODE_VER_NOTINHAS.includes(profile.role) && (
            <Link to="/caixa" className="logout-btn" style={{ textDecoration: "none" }}>
              Notinhas de hoje
            </Link>
          )}
          <span>{profile?.full_name}</span>
          {profile?.role && <span className="role-badge">{roleLabel(profile.role)}</span>}
          <button className="logout-btn" onClick={signOut}>
            Sair
          </button>
        </div>
      </header>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
