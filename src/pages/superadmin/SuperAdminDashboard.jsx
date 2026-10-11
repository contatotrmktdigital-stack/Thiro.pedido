import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import ConfirmButton from "../../components/ConfirmButton";
import { readFunctionErrorMessage } from "../../lib/functionError";
import { normalizarLogin, toLoginEmail } from "../../lib/staffLogin";

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

const EMPTY_FORM = {
  name: "",
  ownerName: "",
  login: "",
  ownerPassword: "",
  email: "",
  telefone: "",
};

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
];

function formatData(iso) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

export function ClienteCard({ r, deletingId, onGerenciar, onToggle, onApagar }) {
  const inicial = (r.name || "?").trim().charAt(0).toUpperCase();
  return (
    <article className={`sa-cliente${r.active ? "" : " inativo"}`}>
      <div className="sa-cliente-topo">
        <span
          className="sa-avatar"
          style={r.logo_url ? { backgroundImage: `url(${r.logo_url})` } : undefined}
        >
          {r.logo_url ? "" : inicial}
        </span>
        <div className="sa-cliente-nome">
          <strong>{r.name}</strong>
          <span>{r.slug}</span>
        </div>
        <span className={`sa-pill ${r.active ? "ativo" : "inativo"}`}>
          {r.active ? "Ativo" : "Inativo"}
        </span>
      </div>

      <dl className="sa-cliente-dados">
        <div>
          <dt>Login de acesso</dt>
          <dd>{r.login_acesso || r.owner_email || "—"}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{r.email || "—"}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>{r.telefone || "—"}</dd>
        </div>
        <div>
          <dt>Cliente desde</dt>
          <dd>{formatData(r.created_at)}</dd>
        </div>
      </dl>

      <div className="sa-cliente-acoes">
        <button type="button" className="sa-btn sa-btn-primario" onClick={() => onGerenciar(r)}>
          Gerenciar
        </button>
        <Link to={`/superadmin/restaurantes/${r.id}/visual`} className="sa-btn sa-btn-ghost">
          Personalizar
        </Link>
        <button type="button" className="sa-btn sa-btn-ghost" onClick={() => onToggle(r)}>
          {r.active ? "Desativar" : "Ativar"}
        </button>
        <ConfirmButton
          onConfirm={() => onApagar(r)}
          disabled={deletingId === r.id}
          confirmLabel="Apagar de vez?"
          className="sa-btn sa-btn-perigo"
          style={{ width: "auto" }}
        >
          {deletingId === r.id ? "Apagando..." : "Apagar"}
        </ConfirmButton>
      </div>
    </article>
  );
}

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [acesso, setAcesso] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [deletingId, setDeletingId] = useState(null);

  const [gerenciando, setGerenciando] = useState(null);
  const [dadosForm, setDadosForm] = useState({ name: "", email: "", telefone: "" });
  const [novaSenha, setNovaSenha] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalErro, setModalErro] = useState("");

  const loadRestaurants = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, active, owner_email, login_acesso, email, telefone, logo_url, created_at"
      )
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

  const resumo = useMemo(() => {
    const trintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      total: restaurants.length,
      ativos: restaurants.filter((r) => r.active).length,
      inativos: restaurants.filter((r) => !r.active).length,
      novos: restaurants.filter((r) => new Date(r.created_at).getTime() >= trintaDiasAtras).length,
    };
  }, [restaurants]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (filtro === "ativos" && !r.active) return false;
      if (filtro === "inativos" && r.active) return false;
      if (!termo) return true;
      return [r.name, r.slug, r.login_acesso, r.owner_email, r.email, r.telefone]
        .filter(Boolean)
        .some((campo) => campo.toLowerCase().includes(termo));
    });
  }, [restaurants, busca, filtro]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setAcesso(null);
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

      setSuccessMsg(`Restaurante "${newRestaurant.name}" criado!`);
      setAcesso({ nome: newRestaurant.name, login, senha: form.ownerPassword });
      setForm(EMPTY_FORM);
      setMostrarForm(false);
      await loadRestaurants();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCreating(false);
    }
  };

  const copiarAcesso = async () => {
    if (!acesso) return;
    const texto = [
      `Acesso ao Thiro.pedido — ${acesso.nome}`,
      `Site: ${window.location.origin}`,
      `Login: ${acesso.login}`,
      `Senha: ${acesso.senha}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setError("Não consegui copiar automaticamente. Selecione o texto e copie à mão.");
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

  const abrirGerenciar = (restaurant) => {
    setGerenciando(restaurant);
    setDadosForm({
      name: restaurant.name || "",
      email: restaurant.email || "",
      telefone: restaurant.telefone || "",
    });
    setNovaSenha("");
    setModalMsg("");
    setModalErro("");
  };

  const salvarDados = async (e) => {
    e.preventDefault();
    if (!dadosForm.name.trim()) {
      setModalErro("O nome do restaurante não pode ficar em branco.");
      return;
    }
    setModalBusy(true);
    setModalErro("");
    setModalMsg("");
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({
        name: dadosForm.name.trim(),
        email: dadosForm.email.trim() || null,
        telefone: dadosForm.telefone.trim() || null,
      })
      .eq("id", gerenciando.id);
    setModalBusy(false);
    if (updateError) {
      setModalErro(updateError.message);
      return;
    }
    setModalMsg("Dados salvos.");
    await loadRestaurants();
  };

  const redefinirSenha = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      setModalErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setModalBusy(true);
    setModalErro("");
    setModalMsg("");
    const { error: rpcError } = await supabase.rpc("admin_reset_restaurant_password", {
      p_restaurant_id: gerenciando.id,
      p_new_password: novaSenha,
    });
    setModalBusy(false);
    if (rpcError) {
      setModalErro(rpcError.message);
      return;
    }
    setModalMsg(`Senha de login redefinida. Nova senha: ${novaSenha}`);
    setNovaSenha("");
  };

  const zerarSenhaAdmin = async () => {
    setModalBusy(true);
    setModalErro("");
    setModalMsg("");
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ admin_pin_hash: null })
      .eq("id", gerenciando.id);
    setModalBusy(false);
    if (updateError) {
      setModalErro(updateError.message);
      return;
    }
    setModalMsg("Senha de administração zerada. Na próxima vez, o restaurante cria uma nova.");
  };

  return (
    <div className="sa-pagina">
      <div className="sa-titulo">
        <div>
          <h1>Seus clientes</h1>
          <p>Cadastre, acompanhe e gerencie todos os restaurantes da plataforma.</p>
        </div>
        <button
          type="button"
          className="sa-btn sa-btn-primario sa-btn-grande"
          onClick={() => setMostrarForm((v) => !v)}
        >
          {mostrarForm ? "Fechar cadastro" : "+ Novo restaurante"}
        </button>
      </div>

      {error && (
        <div className="sa-aviso sa-aviso-erro" role="alert">
          {error}
        </div>
      )}
      {successMsg && <div className="sa-aviso sa-aviso-ok">{successMsg}</div>}

      {acesso && (
        <div className="sa-acesso">
          <div>
            <strong>Dados de acesso para enviar ao cliente</strong>
            <p>
              Login: <b>{acesso.login}</b> · Senha: <b>{acesso.senha}</b>
            </p>
            <p className="sa-acesso-nota">
              Essa senha só aparece agora. Se perder, é só redefinir em "Gerenciar".
            </p>
          </div>
          <button type="button" className="sa-btn sa-btn-primario" onClick={copiarAcesso}>
            {copiado ? "Copiado!" : "Copiar dados de acesso"}
          </button>
        </div>
      )}

      <section className="sa-resumo" aria-label="Resumo">
        <div className="sa-stat">
          <span>Restaurantes</span>
          <strong>{resumo.total}</strong>
        </div>
        <div className="sa-stat">
          <span>Ativos</span>
          <strong className="verde">{resumo.ativos}</strong>
        </div>
        <div className="sa-stat">
          <span>Inativos</span>
          <strong>{resumo.inativos}</strong>
        </div>
        <div className="sa-stat">
          <span>Novos em 30 dias</span>
          <strong className="laranja">{resumo.novos}</strong>
        </div>
      </section>

      {mostrarForm && (
        <section className="sa-painel">
          <h2>Novo restaurante</h2>
          <p className="sa-painel-sub">
            O login é livre: pode ser o nome da hamburgueria, CPF, telefone ou e-mail. E-mail e
            telefone de contato são opcionais e servem só para o cadastro no seu sistema.
          </p>
          <form onSubmit={handleCreate} className="sa-form">
            <label className="sa-campo">
              <span>Nome do restaurante</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Thiro Burguer"
                required
              />
            </label>
            <label className="sa-campo">
              <span>Nome do dono/gestor</span>
              <input
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                required
              />
            </label>
            <label className="sa-campo">
              <span>Login de acesso</span>
              <input
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="Ex: dilsburguer, CPF, telefone ou e-mail"
                autoComplete="off"
                required
              />
            </label>
            <label className="sa-campo">
              <span>Senha inicial (mínimo 6 caracteres)</span>
              <input
                value={form.ownerPassword}
                onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                placeholder="Ex: 123456"
                autoComplete="off"
                minLength={6}
                required
              />
            </label>
            <label className="sa-campo">
              <span>E-mail de contato (opcional)</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Só para cadastro"
              />
            </label>
            <label className="sa-campo">
              <span>Telefone de contato (opcional)</span>
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="Só para cadastro"
                inputMode="tel"
              />
            </label>
            <div className="sa-form-acoes">
              <button className="sa-btn sa-btn-primario sa-btn-grande" type="submit" disabled={creating}>
                {creating ? "Criando..." : "Criar restaurante"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="sa-lista">
        <div className="sa-barra">
          <input
            className="sa-busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, login, e-mail ou telefone"
            aria-label="Buscar restaurante"
          />
          <div className="sa-filtros" role="group" aria-label="Filtrar por status">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`sa-filtro${filtro === f.value ? " ativo" : ""}`}
                onClick={() => setFiltro(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="sa-vazio">Carregando...</p>
        ) : restaurants.length === 0 ? (
          <p className="sa-vazio">
            Nenhum restaurante cadastrado ainda. Clique em "+ Novo restaurante" para começar.
          </p>
        ) : visiveis.length === 0 ? (
          <p className="sa-vazio">Nenhum restaurante encontrado com esse filtro.</p>
        ) : (
          <div className="sa-grade">
            {visiveis.map((r) => (
              <ClienteCard
                key={r.id}
                r={r}
                deletingId={deletingId}
                onGerenciar={abrirGerenciar}
                onToggle={toggleActive}
                onApagar={handleDelete}
              />
            ))}
          </div>
        )}
        <p className="sa-rodape-lista">
          "Desativar" só bloqueia o acesso (dá pra reverter). "Apagar" é definitivo: some com o
          cardápio, comandas, estoque, relatórios, identidade visual e os logins da equipe.
        </p>
      </section>

      {gerenciando && (
        <div className="sa-modal-fundo" onClick={() => setGerenciando(null)}>
          <div
            className="sa-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Gerenciar ${gerenciando.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sa-modal-topo">
              <h2>Gerenciar {gerenciando.name}</h2>
              <button
                type="button"
                className="sa-modal-fechar"
                aria-label="Fechar"
                onClick={() => setGerenciando(null)}
              >
                ×
              </button>
            </div>

            {modalErro && (
              <div className="sa-aviso sa-aviso-erro" role="alert">
                {modalErro}
              </div>
            )}
            {modalMsg && <div className="sa-aviso sa-aviso-ok">{modalMsg}</div>}

            <form onSubmit={salvarDados} className="sa-modal-secao">
              <h3>Dados do cadastro</h3>
              <label className="sa-campo">
                <span>Nome do restaurante</span>
                <input
                  value={dadosForm.name}
                  onChange={(e) => setDadosForm({ ...dadosForm, name: e.target.value })}
                  required
                />
              </label>
              <label className="sa-campo">
                <span>E-mail de contato (opcional)</span>
                <input
                  type="email"
                  value={dadosForm.email}
                  onChange={(e) => setDadosForm({ ...dadosForm, email: e.target.value })}
                />
              </label>
              <label className="sa-campo">
                <span>Telefone de contato (opcional)</span>
                <input
                  value={dadosForm.telefone}
                  onChange={(e) => setDadosForm({ ...dadosForm, telefone: e.target.value })}
                  inputMode="tel"
                />
              </label>
              <button className="sa-btn sa-btn-primario" type="submit" disabled={modalBusy}>
                Salvar dados
              </button>
            </form>

            <div className="sa-modal-secao">
              <h3>Segurança</h3>
              <form onSubmit={redefinirSenha} className="sa-modal-linha">
                <label className="sa-campo">
                  <span>Nova senha de login (mínimo 6 caracteres)</span>
                  <input
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite a nova senha"
                    autoComplete="off"
                  />
                </label>
                <button className="sa-btn sa-btn-ghost" type="submit" disabled={modalBusy}>
                  Redefinir senha
                </button>
              </form>
              <div className="sa-modal-linha sa-modal-pin">
                <p>
                  Senha de administração: se o restaurante esqueceu, zere aqui. Ele cria uma
                  nova na próxima vez que entrar em Administração.
                </p>
                <ConfirmButton
                  onConfirm={zerarSenhaAdmin}
                  disabled={modalBusy}
                  confirmLabel="Zerar mesmo?"
                  className="sa-btn sa-btn-ghost"
                  style={{ width: "auto" }}
                >
                  Zerar senha de administração
                </ConfirmButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
