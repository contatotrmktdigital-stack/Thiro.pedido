import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import ConfirmButton from "../../components/ConfirmButton";
import { readFunctionErrorMessage } from "../../lib/functionError";
import { normalizarLogin, toLoginEmail } from "../../lib/staffLogin";

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const emptyForm = {
    name: "",
    ownerName: "",
    login: "",
    ownerPassword: "",
    email: "",
    telefone: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const loadRestaurants = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("restaurants")
      .select("id, name, slug, active, owner_email, login_acesso, email, telefone, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRestaurants(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setCreating(true);

    try {
      const slug = slugify(form.name);
      if (!slug) {
        throw new Error("Informe um nome de restaurante válido.");
      }
      if (form.ownerPassword.length < 6) {
        throw new Error("A senha precisa ter pelo menos 6 caracteres.");
      }
      const login = form.login.trim();
      if (!login.includes("@") && !normalizarLogin(login)) {
        throw new Error("Informe um login válido (use letras ou números).");
      }

      const { data: newRestaurant, error: insertError } = await supabase
        .from("restaurants")
        .insert({
          name: form.name.trim(),
          slug,
          login_acesso: login,
          email: form.email.trim() || null,
          telefone: form.telefone.trim() || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: fnError } = await supabase.functions.invoke("create-user", {
        body: {
          email: toLoginEmail(login),
          password: form.ownerPassword,
          full_name: form.ownerName.trim(),
          role: "gestao",
          restaurant_id: newRestaurant.id,
        },
      });

      if (fnError) {
        // O restaurante já tinha sido criado, mas sem o login de gestão não serve pra nada —
        // desfaz pra não deixar restaurante órfão (mesma função usada no botão "Apagar").
        await supabase.rpc("delete_restaurant", { p_restaurant_id: newRestaurant.id });
        const mensagem = await readFunctionErrorMessage(fnError);
        throw new Error(
          /already.*registered|already exists|duplicate/i.test(mensagem)
            ? "Esse login já está em uso por outro restaurante. Escolha outro."
            : mensagem
        );
      }

      setSuccessMsg(
        `Restaurante "${newRestaurant.name}" criado! Login de acesso: ${login} (senha: ${form.ownerPassword})`
      );
      setForm(emptyForm);
      await loadRestaurants();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (restaurant) => {
    setError("");
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ active: !restaurant.active })
      .eq("id", restaurant.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      await loadRestaurants();
    }
  };

  const handleDelete = async (restaurant) => {
    setError("");
    setSuccessMsg("");
    setDeletingId(restaurant.id);
    try {
      const { error: rpcError } = await supabase.rpc("delete_restaurant", {
        p_restaurant_id: restaurant.id,
      });
      if (rpcError) throw rpcError;

      setSuccessMsg(`Restaurante "${restaurant.name}" apagado, junto com os logins da equipe.`);
      await loadRestaurants();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Novo restaurante</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Cria a conta do restaurante e o login de acesso dele. O login é livre: pode ser o nome da
          hamburgueria, CPF, telefone ou e-mail. E-mail e telefone de contato são opcionais e
          servem só para o cadastro no seu sistema.
        </p>

        {error && <div className="error-box">{error}</div>}
        {successMsg && <div className="info-box">{successMsg}</div>}

        <form onSubmit={handleCreate}>
          <div className="inline-form">
            <div className="field">
              <label>Nome do restaurante</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Thiro Burguer"
                required
              />
            </div>
            <div className="field">
              <label>Nome do dono/gestor</label>
              <input
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="inline-form">
            <div className="field">
              <label>Login de acesso</label>
              <input
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="Ex: dilsburguer, CPF, telefone ou e-mail"
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label>Senha inicial (mínimo 6 caracteres)</label>
              <input
                type="text"
                value={form.ownerPassword}
                onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                placeholder="Ex: 123456"
                autoComplete="off"
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="inline-form">
            <div className="field">
              <label>E-mail de contato (opcional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Só para cadastro"
              />
            </div>
            <div className="field">
              <label>Telefone de contato (opcional)</label>
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="Só para cadastro"
                inputMode="tel"
              />
            </div>
            <button className="btn-primary" type="submit" disabled={creating}>
              {creating ? "Criando..." : "Criar restaurante"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Restaurantes cadastrados</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          "Desativar" só bloqueia o acesso (dá pra reverter). "Apagar" é definitivo: some com o
          cardápio, comandas, estoque, relatórios, identidade visual e os logins da equipe desse
          restaurante.
        </p>
        {loading ? (
          <p>Carregando...</p>
        ) : restaurants.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum restaurante cadastrado ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login de acesso</th>
                <th>Contato</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.name}
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>{r.slug}</div>
                  </td>
                  <td>{r.login_acesso || r.owner_email || "—"}</td>
                  <td>
                    {r.email || r.telefone ? (
                      <>
                        {r.email && <div>{r.email}</div>}
                        {r.telefone && <div>{r.telefone}</div>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${r.active ? "active" : "inactive"}`}>
                      {r.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link to={`/superadmin/restaurantes/${r.id}/visual`}>
                      <button className="btn-secondary" style={{ width: "auto" }}>
                        Personalizar
                      </button>
                    </Link>
                    <button className="btn-secondary" onClick={() => toggleActive(r)}>
                      {r.active ? "Desativar" : "Ativar"}
                    </button>
                    <ConfirmButton
                      onConfirm={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      confirmLabel="Apagar de vez?"
                      style={{ width: "auto" }}
                    >
                      {deletingId === r.id ? "Apagando..." : "Apagar"}
                    </ConfirmButton>
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
