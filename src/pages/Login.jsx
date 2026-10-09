import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toLoginEmail } from "../lib/staffLogin";
import "./Login.css";

const BENEFICIOS = [
  "Comandas e pedidos em tempo real",
  "Cozinha recebendo na hora",
  "Pix com QR code e notinha personalizada",
  "Relatórios do dia na palma da mão",
];

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: signInError } = await signIn(toLoginEmail(email), password);
    setSubmitting(false);
    if (signInError) {
      setError("E-mail/usuário ou senha incorretos.");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="lg">
      <aside className="lg-side">
        <Link to="/" className="lg-brand">
          <span className="lg-brand-mark">TP</span>
          <span>Thiro.pedido</span>
        </Link>

        <div className="lg-side-texto">
          <p className="lg-eyebrow">Sistema de comandas para restaurantes</p>
          <h1>
            Bem-vindo <span>de volta.</span>
          </h1>
          <p className="lg-side-sub">
            Entre para atender, acompanhar a cozinha e fechar contas sem correria.
          </p>
          <ul className="lg-beneficios">
            {BENEFICIOS.map((b) => (
              <li key={b}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="lg-side-rodape">Funciona no celular, tablet e computador.</p>
      </aside>

      <main className="lg-main">
        <div className="lg-card">
          <h2>Entrar</h2>
          <p className="lg-card-sub">Use o login da sua conta para continuar.</p>

          {error && (
            <div className="lg-erro" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="lg-campo">
              <label htmlFor="email">E-mail ou usuário</label>
              <input
                id="email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="lg-campo">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="lg-botao" type="submit" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <Link to="/" className="lg-voltar">
            &larr; Voltar para o início
          </Link>
        </div>
      </main>
    </div>
  );
}
