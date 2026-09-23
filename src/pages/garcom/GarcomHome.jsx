import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const TIPOS = [
  { value: "mesa", label: "Mesa" },
  { value: "balcao", label: "Balcão/retirada" },
  { value: "delivery", label: "Delivery" },
];

function labelComanda(comanda) {
  if (comanda.tipo === "mesa") {
    return { titulo: `Mesa ${comanda.mesa_numero}`, subtitulo: `Comanda ${comanda.comandas_fisicas?.numero}` };
  }
  if (comanda.tipo === "balcao") {
    return { titulo: "Balcão", subtitulo: comanda.cliente_nome };
  }
  return {
    titulo: "Delivery",
    subtitulo:
      comanda.cliente_nome ||
      new Date(comanda.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function GarcomHome() {
  const { restaurant, profile } = useAuth();
  const navigate = useNavigate();

  const [comandasAbertas, setComandasAbertas] = useState([]);
  const [comandasFisicas, setComandasFisicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tipo, setTipo] = useState("mesa");
  const [mesaNumero, setMesaNumero] = useState("");
  const [comandaFisicaId, setComandaFisicaId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [taxaEntrega, setTaxaEntrega] = useState("");
  const [abrindo, setAbrindo] = useState(false);

  const loadDados = async () => {
    setLoading(true);
    setError("");

    const [comandasResult, comandasFisicasResult] = await Promise.all([
      supabase
        .from("comandas")
        .select("id, tipo, mesa_numero, comanda_fisica_id, cliente_nome, created_at, comandas_fisicas(numero)")
        .eq("status", "aberta")
        .order("created_at"),
      supabase.from("comandas_fisicas").select("id, numero").order("numero"),
    ]);

    if (comandasResult.error) setError(comandasResult.error.message);
    else if (comandasFisicasResult.error) setError(comandasFisicasResult.error.message);
    else {
      setComandasAbertas(comandasResult.data || []);
      setComandasFisicas(comandasFisicasResult.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDados();
  }, []);

  const idsComandaFisicaEmUso = new Set(comandasAbertas.map((c) => c.comanda_fisica_id));
  const comandasFisicasLivres = comandasFisicas.filter((cf) => !idsComandaFisicaEmUso.has(cf.id));

  const limparFormulario = () => {
    setMesaNumero("");
    setComandaFisicaId("");
    setClienteNome("");
    setTaxaEntrega("");
  };

  const handleAbrirComanda = async (e) => {
    e.preventDefault();
    if (!restaurant?.id) return;
    setError("");

    const payload = {
      restaurant_id: restaurant.id,
      tipo,
      aberta_por: profile?.id,
    };

    if (tipo === "mesa") {
      const mesa = Number(mesaNumero);
      if (!Number.isInteger(mesa) || mesa <= 0) {
        setError("Informe um número de mesa válido.");
        return;
      }
      if (!comandaFisicaId) {
        setError("Escolha o número da comanda física entregue ao cliente.");
        return;
      }
      payload.mesa_numero = mesa;
      payload.comanda_fisica_id = comandaFisicaId;
    } else if (tipo === "balcao") {
      if (!clienteNome.trim()) {
        setError("Informe o nome do cliente.");
        return;
      }
      payload.cliente_nome = clienteNome.trim();
    } else {
      if (!clienteNome.trim()) {
        setError("Informe o nome do cliente.");
        return;
      }
      payload.cliente_nome = clienteNome.trim();
      payload.taxa_entrega = Number(String(taxaEntrega).replace(",", ".")) || 0;
    }

    setAbrindo(true);
    const { data: novaComanda, error: insertError } = await supabase
      .from("comandas")
      .insert(payload)
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
    limparFormulario();
    navigate(`/garcom/comanda/${novaComanda.id}`);
  };

  if (loading) {
    return <p>Carregando...</p>;
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Abrir nova comanda</h2>

        <div className="field">
          <label>Tipo de atendimento</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {tipo === "mesa" &&
          (comandasFisicas.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>
              Nenhuma comanda física cadastrada ainda. Peça para a gestão cadastrar em Área de
              administração &rarr; Comandas físicas.
            </p>
          ) : comandasFisicasLivres.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>
              Todas as comandas físicas estão em uso no momento.
            </p>
          ) : (
            <form onSubmit={handleAbrirComanda} className="inline-form">
              <div className="field">
                <label>Número da mesa</label>
                <input
                  value={mesaNumero}
                  onChange={(e) => setMesaNumero(e.target.value)}
                  placeholder="Ex: 5"
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="field">
                <label>Comanda física entregue</label>
                <select
                  value={comandaFisicaId}
                  onChange={(e) => setComandaFisicaId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {comandasFisicasLivres.map((cf) => (
                    <option key={cf.id} value={cf.id}>
                      Comanda {cf.numero}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" type="submit" disabled={abrindo}>
                {abrindo ? "Abrindo..." : "Abrir comanda"}
              </button>
            </form>
          ))}

        {tipo === "balcao" && (
          <form onSubmit={handleAbrirComanda} className="inline-form">
            <div className="field">
              <label>Nome do cliente</label>
              <input
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Ex: João"
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={abrindo}>
              {abrindo ? "Abrindo..." : "Abrir comanda"}
            </button>
          </form>
        )}

        {tipo === "delivery" && (
          <form onSubmit={handleAbrirComanda} className="inline-form">
            <div className="field">
              <label>Nome do cliente</label>
              <input
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Ex: João"
                required
              />
            </div>
            <div className="field">
              <label>Taxa de entrega (R$, opcional)</label>
              <input
                value={taxaEntrega}
                onChange={(e) => setTaxaEntrega(e.target.value)}
                placeholder="Ex: 8,00"
                inputMode="decimal"
              />
            </div>
            <button className="btn-primary" type="submit" disabled={abrindo}>
              {abrindo ? "Abrindo..." : "Abrir comanda"}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Comandas em atendimento</h2>
        {comandasAbertas.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma comanda aberta no momento.</p>
        ) : (
          <div className="role-grid">
            {comandasAbertas.map((comanda) => {
              const { titulo, subtitulo } = labelComanda(comanda);
              return (
                <button
                  key={comanda.id}
                  className="btn-secondary"
                  onClick={() => navigate(`/garcom/comanda/${comanda.id}`)}
                  style={{
                    width: "100%",
                    padding: "16px",
                    textAlign: "center",
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  {titulo}
                  <br />
                  <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{subtitulo}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
