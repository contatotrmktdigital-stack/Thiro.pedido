import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { roleLabel } from "../../components/ProtectedRoute";
import AdminPinGate from "./AdminPinGate";
import { slugifyUsername, toLoginEmail } from "../../lib/staffLogin";

const PAPEIS_CRIAVEIS = ["garcom", "cozinha", "caixa", "gestao"];

const emptyForm = { fullName: "", username: "", password: "", role: "garcom" };

function UsuariosContent() {
  const { restaurant, profile } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [usernameEditado, setUsernameEditado] = useState(false);

  const sugerirUsername = (nome) => {
    const base = slugifyUsername(nome);
    if (!base || !restaurant?.slug) return base;
    return `${base}.${restaurant.slug}`;
  };

  const handleFullNameChange = (value) => {
    setForm((f) => ({
      ...f,
      fullName: value,
      username: usernameEditado ? f.username : sugerirUsername(value),
    }));
  };

  const loadUsuarios = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("id, full_name, role, active")
      .order("created_at");

    if (fetchError) setError(fetchError.message);
    else setUsuarios(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    setError("");
    setSuccessMsg("");
    setCreating(true);

    const username = form.username.trim();
    const { error: fnError } = await supabase.functions.invoke("create-user", {
      body: {
        email: toLoginEmail(username),
        password: form.password,
        full_name: form.fullName.trim(),
        role: form.role,
        restaurant_id: restaurant.id,
      },
    });

    setCreating(false);
    if (fnError) {
      setError(fnError.message || String(fnError));
      return;
    }

    setSuccessMsg(
      `Login criado para ${form.fullName} (${roleLabel(form.role)}). Usuário de login: "${username}" — anote e informe pro funcionário, junto com a senha.`
    );
    setForm(emptyForm);
    setUsernameEditado(false);
    await loadUsuarios();
  };

  const toggleActive = async (usuario) => {
    setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ active: !usuario.active })
      .eq("id", usuario.id);

    if (updateError) setError(updateError.message);
    else await loadUsuarios();
  };

  if (loading) {
    return <p>Carregando usuários...</p>;
  }

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      {error && <div className="error-box">{error}</div>}
      {successMsg && <div className="info-box">{successMsg}</div>}

      <div className="card">
        <h2>Novo usuário</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Cria o login que a pessoa vai usar pra entrar no sistema (não precisa da senha de
          administração — essa é só pra área de administração). Não precisa de e-mail: o nome de
          usuário é sugerido automaticamente a partir do nome, mas você pode editar se quiser.
        </p>

        <form onSubmit={handleCreate}>
          <div className="inline-form">
            <div className="field">
              <label>Nome</label>
              <input
                value={form.fullName}
                onChange={(e) => handleFullNameChange(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Papel</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {PAPEIS_CRIAVEIS.map((papel) => (
                  <option key={papel} value={papel}>
                    {roleLabel(papel)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="inline-form" style={{ marginBottom: 0 }}>
            <div className="field">
              <label>Nome de usuário (login)</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => {
                  setUsernameEditado(true);
                  setForm({ ...form, username: e.target.value });
                }}
                placeholder="gerado a partir do nome"
                required
              />
            </div>
            <div className="field">
              <label>Senha inicial</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="mínimo 6 caracteres"
                required
              />
            </div>
            <button
              className="btn-primary"
              type="submit"
              disabled={creating}
              style={{ width: "auto", padding: "10px 20px" }}
            >
              {creating ? "Criando..." : "Criar login"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Usuários do restaurante</h2>
        {usuarios.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum usuário cadastrado ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.full_name}</td>
                  <td>{roleLabel(usuario.role)}</td>
                  <td>
                    <span className={`status-pill ${usuario.active ? "active" : "inactive"}`}>
                      {usuario.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-secondary"
                      disabled={usuario.id === profile?.id}
                      onClick={() => toggleActive(usuario)}
                    >
                      {usuario.active ? "Desativar" : "Ativar"}
                    </button>
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

export default function UsuariosAdmin() {
  return (
    <AdminPinGate>
      <UsuariosContent />
    </AdminPinGate>
  );
}
