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
  const [ativo, setAtivo] = useState(false);
  const [link, setLink] = useState("");
  const [salvo, setSalvo] = useState({ ativo: false, link: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const carregar = async () => {
      if (!restaurant?.id) return;
      const { data, error: fetchError } = await supabase
        .from("restaurants")
        .select("cardapio_url, cardapio_ativo")
        .eq("id", restaurant.id)
        .single();
      if (fetchError) setError(fetchError.message);
      else {
        const url = data?.cardapio_url || "";
        const ligado = Boolean(data?.cardapio_ativo);
        setLink(url);
        setAtivo(ligado);
        setSalvo({ ativo: ligado, link: url });
      }
      setLoading(false);
    };
    carregar();
  }, [restaurant?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const url = normalizarLink(link);
    if (ativo && !url) {
      setError("Para ligar o cardápio digital, cole o link do cardápio.");
      return;
    }
    if (url && !linkValido(url)) {
      setError(
        "Esse link não parece válido. Cole o endereço completo, por exemplo https://meucardapio.com/dils."
      );
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ cardapio_url: url || null, cardapio_ativo: ativo })
      .eq("id", restaurant.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setLink(url);
    setSalvo({ ativo, link: url });
    setSuccessMsg(
      ativo
        ? "Salvo! A aba Cardápio aparece para o cliente e abre o seu link."
        : "Salvo! A aba Cardápio não aparece para o cliente."
    );
  };

  if (loading) return <p>Carregando...</p>;

  const mudou = ativo !== salvo.ativo || normalizarLink(link) !== salvo.link;

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
          Quando o cliente escaneia o QR code da comanda, ele vê o consumo dele. Se o seu
          cardápio é digital, ligue a opção abaixo e cole o link: aparece uma aba "Cardápio" que
          abre direto nele. Se o seu cardápio é físico (impresso), deixe desligado.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="troca">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span className="troca-trilho" aria-hidden="true" />
            <span className="troca-texto">
              <strong>{ativo ? "Cardápio digital ligado" : "Cardápio digital desligado"}</strong>
              <small>
                {ativo
                  ? "O cliente vê a aba Cardápio na tela da comanda."
                  : "O cliente vê só a comanda dele, sem a aba Cardápio."}
              </small>
            </span>
          </label>

          <div className="field" style={{ marginTop: 16, opacity: ativo ? 1 : 0.6 }}>
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
              disabled={saving || !mudou}
              style={{ width: "auto", padding: "10px 20px" }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {salvo.link && (
              <a href={salvo.link} target="_blank" rel="noopener noreferrer">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "auto", padding: "10px 20px" }}
                >
                  Testar o link
                </button>
              </a>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Como o cliente usa</h2>
        <ol style={{ paddingLeft: 18, lineHeight: 1.7, margin: 0 }}>
          <li>Escaneia o QR code impresso na comanda, sem precisar de login.</li>
          <li>Em "Minha comanda", vê tudo que foi lançado, com o status de cada item.</li>
          <li>Se o cardápio digital estiver ligado, a aba "Cardápio" abre o seu link.</li>
          <li>Quando a comanda é paga e fechada, o consumo some e a comanda volta a ficar livre.</li>
        </ol>
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
