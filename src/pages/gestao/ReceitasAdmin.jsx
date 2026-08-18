import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AdminPinGate from "./AdminPinGate";

function ReceitasContent() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      const { data, error: fetchError } = await supabase
        .from("produtos")
        .select("id, nome, categorias(nome)")
        .order("nome");

      if (fetchError) setError(fetchError.message);
      else setProdutos(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <p>Carregando produtos...</p>;
  }

  return (
    <div>
      <p>
        <Link to="/gestao/administracao/estoque">&larr; Voltar para o estoque</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Receitas dos produtos</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Escolha um produto pra definir quais insumos ele usa e quanto de cada um.
        </p>

        {produtos.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>
            Nenhum produto cadastrado ainda. Cadastre produtos em "Gerenciar cardápio" primeiro.
          </p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td>{produto.nome}</td>
                  <td>{produto.categorias?.nome}</td>
                  <td>
                    <Link to={`/gestao/administracao/estoque/receitas/${produto.id}`}>
                      <button className="btn-secondary">Editar receita</button>
                    </Link>
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

export default function ReceitasAdmin() {
  return (
    <AdminPinGate>
      <ReceitasContent />
    </AdminPinGate>
  );
}
