import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import AdminPinGate from "./AdminPinGate";
import ConfirmButton from "../../components/ConfirmButton";

const emptyProdutoForm = { id: null, nome: "", descricao: "", preco: "", categoria_id: "" };

function CardapioContent() {
  const { restaurant } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [novaCategoria, setNovaCategoria] = useState("");
  const [savingCategoria, setSavingCategoria] = useState(false);

  const [produtoForm, setProdutoForm] = useState(emptyProdutoForm);
  const [savingProduto, setSavingProduto] = useState(false);

  const loadCardapio = async () => {
    setLoading(true);
    setError("");

    const [categoriasResult, produtosResult] = await Promise.all([
      supabase.from("categorias").select("id, nome").order("created_at"),
      supabase
        .from("produtos")
        .select("id, nome, descricao, preco, ativo, categoria_id")
        .order("created_at"),
    ]);

    if (categoriasResult.error) {
      setError(categoriasResult.error.message);
    } else if (produtosResult.error) {
      setError(produtosResult.error.message);
    } else {
      setCategorias(categoriasResult.data || []);
      setProdutos(produtosResult.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCardapio();
  }, []);

  const handleCreateCategoria = async (e) => {
    e.preventDefault();
    if (!restaurant?.id) return;
    setSavingCategoria(true);
    setError("");

    const { error: insertError } = await supabase
      .from("categorias")
      .insert({ nome: novaCategoria.trim(), restaurant_id: restaurant.id });

    setSavingCategoria(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNovaCategoria("");
    await loadCardapio();
  };

  const handleDeleteCategoria = async (categoria) => {
    setError("");
    const { error: deleteError } = await supabase.from("categorias").delete().eq("id", categoria.id);
    if (deleteError) setError(deleteError.message);
    else await loadCardapio();
  };

  const startEditProduto = (produto) => {
    setProdutoForm({
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco: String(produto.preco).replace(".", ","),
      categoria_id: produto.categoria_id,
    });
  };

  const cancelEditProduto = () => setProdutoForm(emptyProdutoForm);

  const handleSaveProduto = async (e) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    const precoNumero = Number(String(produtoForm.preco).replace(",", "."));
    if (Number.isNaN(precoNumero) || precoNumero < 0) {
      setError("Informe um preço válido.");
      return;
    }
    if (!produtoForm.categoria_id) {
      setError("Escolha uma categoria.");
      return;
    }

    setSavingProduto(true);
    setError("");

    const payload = {
      nome: produtoForm.nome.trim(),
      descricao: produtoForm.descricao.trim() || null,
      preco: precoNumero,
      categoria_id: produtoForm.categoria_id,
      restaurant_id: restaurant.id,
    };

    const { error: saveError } = produtoForm.id
      ? await supabase.from("produtos").update(payload).eq("id", produtoForm.id)
      : await supabase.from("produtos").insert(payload);

    setSavingProduto(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setProdutoForm(emptyProdutoForm);
    await loadCardapio();
  };

  const toggleAtivo = async (produto) => {
    setError("");
    const { error: updateError } = await supabase
      .from("produtos")
      .update({ ativo: !produto.ativo })
      .eq("id", produto.id);
    if (updateError) setError(updateError.message);
    else await loadCardapio();
  };

  const handleDeleteProduto = async (produto) => {
    setError("");
    const { error: deleteError } = await supabase.from("produtos").delete().eq("id", produto.id);
    if (deleteError) setError(deleteError.message);
    else await loadCardapio();
  };

  const nomeCategoria = (id) => categorias.find((c) => c.id === id)?.nome || "—";

  if (loading) {
    return <p>Carregando cardápio...</p>;
  }

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Categorias</h2>
        <form onSubmit={handleCreateCategoria} className="inline-form">
          <div className="field">
            <label>Nova categoria</label>
            <input
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              placeholder="Ex: Hambúrgueres"
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={savingCategoria}>
            {savingCategoria ? "Adicionando..." : "Adicionar categoria"}
          </button>
        </form>

        {categorias.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Nome</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => (
                <tr key={categoria.id}>
                  <td>{categoria.nome}</td>
                  <td>
                    <ConfirmButton onConfirm={() => handleDeleteCategoria(categoria)}>Excluir</ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>{produtoForm.id ? "Editar produto" : "Novo produto"}</h2>
        {categorias.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>
            Cadastre pelo menos uma categoria antes de adicionar produtos.
          </p>
        ) : (
          <form onSubmit={handleSaveProduto}>
            <div className="inline-form">
              <div className="field">
                <label>Nome do produto</label>
                <input
                  value={produtoForm.nome}
                  onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })}
                  placeholder="Ex: X-Salada"
                  required
                />
              </div>
              <div className="field">
                <label>Categoria</label>
                <select
                  value={produtoForm.categoria_id}
                  onChange={(e) => setProdutoForm({ ...produtoForm, categoria_id: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Preço (R$)</label>
                <input
                  value={produtoForm.preco}
                  onChange={(e) => setProdutoForm({ ...produtoForm, preco: e.target.value })}
                  placeholder="Ex: 29,90"
                  inputMode="decimal"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Descrição (opcional)</label>
              <input
                value={produtoForm.descricao}
                onChange={(e) => setProdutoForm({ ...produtoForm, descricao: e.target.value })}
                placeholder="Ex: Pão brioche, hambúrguer 180g, queijo, alface e tomate"
              />
            </div>
            <div className="inline-form" style={{ marginBottom: 0 }}>
              <button
                className="btn-primary"
                type="submit"
                disabled={savingProduto}
                style={{ width: "auto", padding: "10px 20px" }}
              >
                {savingProduto ? "Salvando..." : produtoForm.id ? "Salvar alterações" : "Adicionar produto"}
              </button>
              {produtoForm.id && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "auto", padding: "10px 20px" }}
                  onClick={cancelEditProduto}
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Produtos cadastrados</h2>
        {produtos.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum produto cadastrado ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td>{produto.nome}</td>
                  <td>{nomeCategoria(produto.categoria_id)}</td>
                  <td>
                    {Number(produto.preco).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td>
                    <span className={`status-pill ${produto.ativo ? "active" : "inactive"}`}>
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn-secondary" onClick={() => startEditProduto(produto)}>
                      Editar
                    </button>
                    <button className="btn-secondary" onClick={() => toggleAtivo(produto)}>
                      {produto.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <ConfirmButton onConfirm={() => handleDeleteProduto(produto)}>Excluir</ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function CardapioAdmin() {
  return (
    <AdminPinGate>
      <CardapioContent />
    </AdminPinGate>
  );
}
