import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import AdminPinGate from "./AdminPinGate";

function ReceitaProdutoContent() {
  const { produtoId } = useParams();
  const { restaurant } = useAuth();

  const [produto, setProduto] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [insumoId, setInsumoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTudo = async () => {
    setLoading(true);
    setError("");

    const [produtoResult, linhasResult, insumosResult] = await Promise.all([
      supabase.from("produtos").select("id, nome").eq("id", produtoId).single(),
      supabase
        .from("produto_insumos")
        .select("id, quantidade, insumos(id, nome, unidade)")
        .eq("produto_id", produtoId)
        .order("created_at"),
      supabase.from("insumos").select("id, nome, unidade").order("nome"),
    ]);

    if (produtoResult.error) setError(produtoResult.error.message);
    else if (linhasResult.error) setError(linhasResult.error.message);
    else if (insumosResult.error) setError(insumosResult.error.message);
    else {
      setProduto(produtoResult.data);
      setLinhas(linhasResult.data || []);
      setInsumos(insumosResult.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId]);

  const insumosJaUsados = new Set(linhas.map((l) => l.insumos?.id));
  const insumosDisponiveis = insumos.filter((i) => !insumosJaUsados.has(i.id));

  const handleAdicionar = async (e) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    const qtd = Number(String(quantidade).replace(",", "."));
    if (!insumoId) {
      setError("Escolha um insumo.");
      return;
    }
    if (Number.isNaN(qtd) || qtd <= 0) {
      setError("Informe uma quantidade válida.");
      return;
    }

    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("produto_insumos").insert({
      restaurant_id: restaurant.id,
      produto_id: produtoId,
      insumo_id: insumoId,
      quantidade: qtd,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setInsumoId("");
    setQuantidade("");
    await loadTudo();
  };

  const handleRemover = async (linha) => {
    setError("");
    const { error: deleteError } = await supabase.from("produto_insumos").delete().eq("id", linha.id);
    if (deleteError) setError(deleteError.message);
    else await loadTudo();
  };

  if (loading) {
    return <p>Carregando receita...</p>;
  }

  if (!produto) {
    return <div className="error-box">Produto não encontrado.</div>;
  }

  return (
    <div>
      <p>
        <Link to="/gestao/administracao/estoque/receitas">&larr; Voltar para receitas</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Receita de {produto.nome}</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Cada vez que esse produto for vendido, o estoque desses insumos baixa automaticamente
          na quantidade indicada.
        </p>

        {linhas.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum insumo vinculado ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Quantidade por unidade vendida</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id}>
                  <td>{linha.insumos?.nome}</td>
                  <td>
                    {linha.quantidade} {linha.insumos?.unidade}
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleRemover(linha)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {insumosDisponiveis.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", marginTop: 16 }}>
            {insumos.length === 0
              ? "Cadastre insumos primeiro em Estoque → Novo insumo."
              : "Todos os insumos cadastrados já estão nessa receita."}
          </p>
        ) : (
          <form onSubmit={handleAdicionar} className="inline-form" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Insumo</label>
              <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
                <option value="">Selecione...</option>
                {insumosDisponiveis.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Quantidade</label>
              <input
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Ex: 1"
                inputMode="decimal"
              />
            </div>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Adicionando..." : "Adicionar à receita"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ReceitaProdutoEditor() {
  return (
    <AdminPinGate>
      <ReceitaProdutoContent />
    </AdminPinGate>
  );
}
