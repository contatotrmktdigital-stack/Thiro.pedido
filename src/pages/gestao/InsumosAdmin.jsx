import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import AdminPinGate from "./AdminPinGate";
import ConfirmButton from "../../components/ConfirmButton";

const emptyForm = { nome: "", unidade: "un", quantidadeEstoque: "", estoqueMinimo: "" };

function InsumosContent() {
  const { restaurant } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [ajusteId, setAjusteId] = useState(null);
  const [ajusteValor, setAjusteValor] = useState("");

  const loadInsumos = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("insumos")
      .select("id, nome, unidade, quantidade_estoque, estoque_minimo")
      .order("nome");

    if (fetchError) setError(fetchError.message);
    else setInsumos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadInsumos();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("insumos").insert({
      restaurant_id: restaurant.id,
      nome: form.nome.trim(),
      unidade: form.unidade.trim() || "un",
      quantidade_estoque: Number(String(form.quantidadeEstoque).replace(",", ".")) || 0,
      estoque_minimo: form.estoqueMinimo
        ? Number(String(form.estoqueMinimo).replace(",", "."))
        : null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(emptyForm);
    await loadInsumos();
  };

  const handleDelete = async (insumo) => {
    setError("");
    const { error: deleteError } = await supabase.from("insumos").delete().eq("id", insumo.id);
    if (deleteError) setError(deleteError.message);
    else await loadInsumos();
  };

  const iniciarAjuste = (insumo) => {
    setAjusteId(insumo.id);
    setAjusteValor(String(insumo.quantidade_estoque));
  };

  const salvarAjuste = async (insumo) => {
    const novoValor = Number(String(ajusteValor).replace(",", "."));
    if (Number.isNaN(novoValor)) {
      setError("Informe uma quantidade válida.");
      return;
    }
    setError("");
    const { error: updateError } = await supabase
      .from("insumos")
      .update({ quantidade_estoque: novoValor })
      .eq("id", insumo.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setAjusteId(null);
    await loadInsumos();
  };

  if (loading) {
    return <p>Carregando estoque...</p>;
  }

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Novo insumo</h2>
        <form onSubmit={handleCreate}>
          <div className="inline-form">
            <div className="field">
              <label>Nome</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Pão de brioche"
                required
              />
            </div>
            <div className="field">
              <label>Unidade</label>
              <input
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                placeholder="un, kg, g, L, ml..."
              />
            </div>
          </div>
          <div className="inline-form" style={{ marginBottom: 0 }}>
            <div className="field">
              <label>Quantidade em estoque</label>
              <input
                value={form.quantidadeEstoque}
                onChange={(e) => setForm({ ...form, quantidadeEstoque: e.target.value })}
                placeholder="Ex: 100"
                inputMode="decimal"
              />
            </div>
            <div className="field">
              <label>Estoque mínimo (opcional)</label>
              <input
                value={form.estoqueMinimo}
                onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
                placeholder="Ex: 20"
                inputMode="decimal"
              />
            </div>
            <button
              className="btn-primary"
              type="submit"
              disabled={saving}
              style={{ width: "auto", padding: "10px 20px" }}
            >
              {saving ? "Adicionando..." : "Adicionar insumo"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Insumos cadastrados</h2>
        {insumos.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum insumo cadastrado ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Estoque</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((insumo) => {
                const abaixoDoMinimo =
                  insumo.estoque_minimo !== null && insumo.quantidade_estoque < insumo.estoque_minimo;
                const negativo = insumo.quantidade_estoque < 0;
                return (
                  <tr key={insumo.id}>
                    <td>{insumo.nome}</td>
                    <td>
                      {ajusteId === insumo.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            value={ajusteValor}
                            onChange={(e) => setAjusteValor(e.target.value)}
                            inputMode="decimal"
                            style={{ width: 90 }}
                          />
                          <span>{insumo.unidade}</span>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontWeight: negativo || abaixoDoMinimo ? 700 : 400,
                            color: negativo
                              ? "var(--color-red-700)"
                              : abaixoDoMinimo
                              ? "var(--color-red-600)"
                              : "var(--color-text)",
                          }}
                        >
                          {insumo.quantidade_estoque} {insumo.unidade}
                          {(negativo || abaixoDoMinimo) && " ⚠"}
                        </span>
                      )}
                    </td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {ajusteId === insumo.id ? (
                        <>
                          <button className="btn-primary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => salvarAjuste(insumo)}>
                            Salvar
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ width: "auto", padding: "6px 12px" }}
                            onClick={() => setAjusteId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-secondary"
                            style={{ width: "auto", padding: "6px 12px" }}
                            onClick={() => iniciarAjuste(insumo)}
                          >
                            Ajustar estoque
                          </button>
                          <ConfirmButton
                            style={{ padding: "6px 12px" }}
                            onConfirm={() => handleDelete(insumo)}
                          >
                            Excluir
                          </ConfirmButton>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Receitas</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Defina quais insumos (e quanto de cada) cada produto do cardápio consome.
        </p>
        <Link to="/gestao/administracao/estoque/receitas">
          <button className="btn-primary btn-accent" style={{ width: "auto", padding: "8px 16px" }}>
            Gerenciar receitas dos produtos
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function InsumosAdmin() {
  return (
    <AdminPinGate>
      <InsumosContent />
    </AdminPinGate>
  );
}
