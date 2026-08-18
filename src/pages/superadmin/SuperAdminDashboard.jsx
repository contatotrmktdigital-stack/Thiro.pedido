import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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

  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [creating, setCreating] = useState(false);

  const loadRestaurants = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("restaurants")
      .select("id, name, slug, active, created_at")
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

      const { data: newRestaurant, error: insertError } = await supabase
        .from("restaurants")
        .insert({ name: form.name.trim(), slug })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: fnError } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.ownerEmail.trim(),
          password: form.ownerPassword,
          full_name: form.ownerName.trim(),
          role: "gestao",
          restaurant_id: newRestaurant.id,
        },
      });

      if (fnError) throw fnError;

      setSuccessMsg(
        `Restaurante "${newRestaurant.name}" criado! Login da gestão: ${form.ownerEmail}`
      );
      setForm({ name: "", ownerName: "", ownerEmail: "", ownerPassword: "" });
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

  return (
    <div>
      <div className="card">
        <h2>Novo restaurante</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Cria a conta do restaurante e o primeiro login de gestão (o dono usa esse e-mail e senha
          para entrar e depois pode trocar a senha).
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
              <label>E-mail de login</label>
              <input
                type="email"
                value={form.ownerEmail}
                onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Senha inicial</label>
              <input
                type="text"
                value={form.ownerPassword}
                onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                placeholder="mínimo 6 caracteres"
                required
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
        {loading ? (
          <p>Carregando...</p>
        ) : restaurants.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum restaurante cadastrado ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Identificador</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.slug}</td>
                  <td>
                    <span className={`status-pill ${r.active ? "active" : "inactive"}`}>
                      {r.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => toggleActive(r)}>
                      {r.active ? "Desativar" : "Ativar"}
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
