import { useEffect } from "react";
import { Outlet, Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "./ProtectedRoute";
import { buildRestaurantThemeVars } from "../lib/theme";
import SinoChamados from "./SinoChamados";

// O login do restaurante (papel "gestao") entra numa área por vez: Garçom, Cozinha ou Gestão.
// Os atalhos ficam sempre no topo, pra trocar sem passar pela tela inicial.
function areaAtual(pathname) {
  if (pathname.startsWith("/garcom")) return "garcom";
  if (pathname.startsWith("/cozinha")) return "cozinha";
  if (pathname.startsWith("/caixa")) return "garcom";
  if (pathname.startsWith("/gestao") && pathname !== "/gestao") return "gestao";
  return null;
}

export default function AppLayout() {
  const { profile, restaurant, signOut } = useAuth();
  const { pathname } = useLocation();
  const telaCheia = pathname === "/gestao/administracao";
  const area = areaAtual(pathname);
  const loginUnico = profile?.role === "gestao";

  useEffect(() => {
    document.title = restaurant?.name || "Thiro.pedido";
    const iconLink = document.querySelector('link[rel="icon"]');
    if (iconLink) {
      iconLink.href = restaurant?.logo_url || "/logo-simbolo.png";
    }
    return () => {
      document.title = "Thiro.pedido";
      if (iconLink) iconLink.href = "/logo-simbolo.png";
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

  const brand = (
    <>
      {restaurant?.logo_url ? (
        <div
          className="brand-mark"
          style={{ background: `url(${restaurant.logo_url}) center/cover`, padding: 0 }}
        />
      ) : (
        <div className="brand-mark">TP</div>
      )}
      <span className="brand-nome">{restaurant ? restaurant.name : "Thiro.pedido"}</span>
    </>
  );

  return (
    <div className="app-shell" style={shellStyle}>
      <header className="topbar">
        {loginUnico ? (
          <Link to="/gestao" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            {brand}
          </Link>
        ) : (
          <div className="brand">{brand}</div>
        )}
        <div className="topbar-user">
          <SinoChamados />
          {!loginUnico && <span className="topbar-nome">{profile?.full_name}</span>}
          {!loginUnico && profile?.role && <span className="role-badge">{roleLabel(profile.role)}</span>}
          <button className="logout-btn" onClick={signOut}>
            Sair
          </button>
        </div>
      </header>

      {loginUnico && (
        <nav className="area-nav" aria-label="Áreas do restaurante">
          <NavLink to="/garcom" className={`area-chip${area === "garcom" ? " ativa" : ""}`}>
            Garçom
          </NavLink>
          <NavLink to="/cozinha" className={`area-chip${area === "cozinha" ? " ativa" : ""}`}>
            Cozinha
          </NavLink>
          <NavLink to="/gestao/administracao" className={`area-chip${area === "gestao" ? " ativa" : ""}`}>
            Gestão
          </NavLink>
        </nav>
      )}

      <main className={`page-content${telaCheia ? " page-content--cheia" : ""}`}>
        <Outlet />
      </main>
    </div>
  );
}
