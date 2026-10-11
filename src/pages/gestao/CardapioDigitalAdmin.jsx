import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import AdminPinGate from "./AdminPinGate";

function normalizarLink(texto) {
  const limpo = texto.trim();
  if (!limpo) return "";
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

function linkValido(url) {
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

function CardapioDigitalContent() {
  const { restaurant } = useAuth();
  const [link, setLink] = useState("");
  const [salvo, setSalvo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const carregar = async () => {
      if (!restaurant?.id) return;
      const { data, error: fetchError } = await supabase
        .from("restaurants")
        .select("cardapio_url")
        .eq("id", restaurant.id)
        .single();
      if (fetchError) setError(fetchError.message);
      else {
        setLink(data?.cardapio_url || "");
        setSalvo(data?.cardapio_url || "");
      }
      setLoading(false);
    };
    carregar();
  }, [restaurant?.id]);

  const salvar = async (novoValor) => {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ cardapio_url: novoValor || null })
      .eq("id", restaurant.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setLink(novoValor);
    setSalvo(novoValor);
    setSuccessMsg(novoValor ? "Link salvo! Os clientes já veem o cardápio por ele." : "Link removido.");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = normalizarLink(link);
    if (url && !linkValido(url)) {
      setError("Esse link não parece válido. Cole o endereço completo, por exemplo https://meucardapio.com/dils.");
      return;
    }
    salvar(url);
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a Gestão</Link>
      </p>

      {error && <div className="error-box">{error}</div>}
      {successMsg && <div className="info-box">{successMsg}</div>}

      <div className="card">
        <h2>Cardápio digital</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Quando o cliente escaneia o QR code da comanda, ele vê o consumo dele e uma aba
          "Cardápio". Cole aqui o link do seu cardápio digital: a aba abre direto nele. Se deixar
          em branco, o cliente vê o cardápio cadastrado no sistema (nomes e preços).
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="cardapio-link">Link do cardápio</label>
            <input
              id="cardapio-link"
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              type="submit"
              disabled={saving}
              style={{ width: "auto", padding: "10px 20px" }}
            >
              {saving ? "Salvando..." : "Salvar link"}
            </button>
            {salvo && (
              <>
                <a href={salvo} target="_blank" rel="noopener noreferrer">
                  <button type="button" className="btn-secondary" style={{ width: "auto", padding: "10px 20px" }}>
                    Testar o link
                  </button>
                </a>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving}
                  style={{ width: "auto", padding: "10px 20px" }}
                  onClick={() => salvar("")}
                >
                  Remover link
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Como o cliente usa</h2>
        <ol style={{ paddingLeft: 18, lineHeight: 1.7, margin: 0 }}>
          <li>Escaneia o QR code impresso na comanda, sem precisar de login.</li>
          <li>Em "Minha comanda", vê tudo que foi lançado, com o status de cada item.</li>
          <li>Em "Cardápio", abre o seu link (ou vê o cardápio do sistema).</li>
          <li>Quando a comanda é paga e fechada, o consumo some e a comanda volta a ficar livre.</li>
        </ol>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 0 }}>
          Os QR codes já impressos continuam valendo: o garçom (logado) cai no atendimento de
          sempre e o cliente cai nessa visão.
        </p>
      </div>
    </div>
  );
}

export default function CardapioDigitalAdmin() {
  return (
    <AdminPinGate>
      <CardapioDigitalContent />
    </AdminPinGate>
  );
}
