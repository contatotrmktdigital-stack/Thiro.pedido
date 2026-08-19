import { useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "./ProtectedRoute";
import { buildRestaurantThemeVars } from "../lib/theme";

const PODE_VER_NOTINHAS = ["garcom", "caixa", "gestao"];

export default function AppLayout() {
  const { profile, restaurant, signOut } = useAuth();

  useEffect(() => {
    document.title = restaurant?.name || "Thiro.pedido";
    const iconLink = document.querySelector('link[rel="icon"]');
    if (iconLink) {
      iconLink.href = restaurant?.logo_url || "/favicon.svg";
    }
    return () => {
      document.title = "Thiro.pedido";
      if (iconLink) iconLink.href = "/favicon.svg";
    };
  }, [restaurant?.name, restaurant?.logo_url]);

  const themeVars = restaurant?.cor_primaria ? buildRestaurantThemeVars(restaurant.cor_primaria) : null;
  const shellStyle = { ...themeVars };
  if (restaurant?.background_url) {
    shellStyle.backgroundImage = `linear-gradient(rgba(244,246,251,0.92), rgba(244,246,251,0.92)), url(${restaurant.background_url})`;
    shellStyle.backgroundSize = "cover";
    shellStyle.backgroundPosition = "center";
    shellStyle.backgroundAttachment = "fixed";
  }

  return (
    <div className="app-shell" style={shellStyle}>
      <header className="topbar">
        <div className="brand">
          {restaurant?.logo_url ? (
            <div
              className="brand-mark"
              style={{ background: `url(${restaurant.logo_url}) center/cover`, padding: 0 }}
            />
          ) : (
            <div className="brand-mark">TP</div>
          )}
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
