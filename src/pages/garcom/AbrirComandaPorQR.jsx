import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function AbrirComandaPorQR() {
  const { comandaFisicaId } = useParams();
  const { restaurant, profile } = useAuth();
  const navigate = useNavigate();

  const [comandaFisica, setComandaFisica] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mesaNumero, setMesaNumero] = useState("");
  const [abrindo, setAbrindo] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setError("");

      const { data: fisica, error: fisicaError } = await supabase
        .from("comandas_fisicas")
        .select("id, numero")
        .eq("id", comandaFisicaId)
        .single();

      if (fisicaError || !fisica) {
        setError("Comanda física não encontrada. Confira se o QR code é de um restaurante ativo.");
        setLoading(false);
        return;
      }

      const { data: aberta } = await supabase
        .from("comandas")
        .select("id")
        .eq("comanda_fisica_id", comandaFisicaId)
        .eq("status", "aberta")
        .maybeSingle();

      if (aberta) {
        navigate(`/garcom/comanda/${aberta.id}`, { replace: true });
        return;
      }

      setComandaFisica(fisica);
      setLoading(false);
    };

    carregar();
  }, [comandaFisicaId, navigate]);

  const handleAbrir = async (e) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    const mesa = Number(mesaNumero);
    if (!Number.isInteger(mesa) || mesa <= 0) {
      setError("Informe um número de mesa válido.");
      return;
    }

    setError("");
    setAbrindo(true);
    const { data: novaComanda, error: insertError } = await supabase
      .from("comandas")
      .insert({
        restaurant_id: restaurant.id,
        tipo: "mesa",
        mesa_numero: mesa,
        comanda_fisica_id: comandaFisicaId,
        aberta_por: profile?.id,
      })
      .select()
      .single();

    setAbrindo(false);
    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "Essa comanda física já está em uso em outro atendimento aberto."
          : insertError.message
      );
      return;
    }
    navigate(`/garcom/comanda/${novaComanda.id}`, { replace: true });
  };

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (error && !comandaFisica) {
    return (
      <div className="card">
        <div className="error-box">{error}</div>
        <Link to="/garcom">&larr; Voltar</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Abrir comanda {comandaFisica?.numero}</h2>
      <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
        Digite o número da mesa em que essa comanda vai ficar.
      </p>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleAbrir} className="inline-form">
        <div className="field">
          <label>Número da mesa</label>
          <input
            value={mesaNumero}
            onChange={(e) => setMesaNumero(e.target.value)}
            placeholder="Ex: 5"
            inputMode="numeric"
            autoFocus
            required
          />
        </div>
        <button className="btn-primary" type="submit" disabled={abrindo}>
          {abrindo ? "Abrindo..." : "Abrir comanda"}
        </button>
      </form>
    </div>
  );
}
