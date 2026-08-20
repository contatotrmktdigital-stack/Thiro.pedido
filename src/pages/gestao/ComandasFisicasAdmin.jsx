import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import AdminPinGate from "./AdminPinGate";
import ConfirmButton from "../../components/ConfirmButton";
import QrCodeComanda from "../../components/QrCodeComanda";

function ComandasFisicasContent() {
  const { restaurant } = useAuth();
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [novoNumero, setNovoNumero] = useState("");
  const [saving, setSaving] = useState(false);
  const [qrAberto, setQrAberto] = useState(null);

  const loadComandasFisicas = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("comandas_fisicas")
      .select("id, numero")
      .order("numero");

    if (fetchError) setError(fetchError.message);
    else setComandas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadComandasFisicas();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    const numero = Number(novoNumero);
    if (!Number.isInteger(numero) || numero <= 0) {
      setError("Informe um número de comanda válido.");
      return;
    }

    setSaving(true);
    setError("");
    const { error: insertError } = await supabase
      .from("comandas_fisicas")
      .insert({ numero, restaurant_id: restaurant.id });
    setSaving(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? `Já existe uma comanda número ${numero}.`
          : insertError.message
      );
      return;
    }
    setNovoNumero("");
    await loadComandasFisicas();
  };

  const handleDelete = async (comanda) => {
    setError("");
    const { error: deleteError } = await supabase
      .from("comandas_fisicas")
      .delete()
      .eq("id", comanda.id);
    if (deleteError) setError(deleteError.message);
    else await loadComandasFisicas();
  };

  if (loading) {
    return <p>Carregando comandas...</p>;
  }

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Comandas numeradas</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Cadastre aqui os números das comandas físicas que vocês entregam para o cliente. O
          garçom vai ver esses números no painel de atendimento.
        </p>

        <form onSubmit={handleCreate} className="inline-form">
          <div className="field">
            <label>Número da comanda</label>
            <input
              value={novoNumero}
              onChange={(e) => setNovoNumero(e.target.value)}
              placeholder="Ex: 12"
              inputMode="numeric"
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Adicionando..." : "Adicionar comanda"}
          </button>
        </form>

        {comandas.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma comanda cadastrada ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Comanda</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comandas.map((comanda) => (
                <tr key={comanda.id}>
                  <td>Comanda {comanda.numero}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setQrAberto(qrAberto === comanda.id ? null : comanda.id)}
                    >
                      {qrAberto === comanda.id ? "Fechar QR" : "Ver QR"}
                    </button>
                    <ConfirmButton onConfirm={() => handleDelete(comanda)}>Excluir</ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {qrAberto && (
        <QrCodeComanda
          numero={comandas.find((c) => c.id === qrAberto)?.numero}
          restaurantName={restaurant?.name}
          url={`${window.location.origin}/garcom/abrir/${qrAberto}`}
        />
      )}
    </div>
  );
}

export default function ComandasFisicasAdmin() {
  return (
    <AdminPinGate>
      <ComandasFisicasContent />
    </AdminPinGate>
  );
}
