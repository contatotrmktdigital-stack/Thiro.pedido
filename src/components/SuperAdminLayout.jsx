import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../pages/superadmin/SuperAdmin.css";

export default function SuperAdminLayout() {
  const { profile, signOut } = useAuth();

  useEffect(() => {
    document.title = "Painel · Thiro.pedido";
    return () => {
      document.title = "Thiro.pedido";
    };
  }, []);

  return (
    <div className="sa">
      <header className="sa-top">
        <Link to="/superadmin" className="sa-brand">
          <span className="sa-brand-mark">
            <img src="/logo-simbolo.png" alt="" />
          </span>
          <span>Thiro.pedido</span>
          <span className="sa-badge">Painel do dono</span>
        </Link>
        <div className="sa-user">
          <span className="sa-user-nome">{profile?.full_name}</span>
          <button type="button" className="sa-sair" onClick={signOut}>
            Sair
          </button>
        </div>
      </header>
      <main className="sa-main">
        <Outlet />
      </main>
    </div>
  );
}
