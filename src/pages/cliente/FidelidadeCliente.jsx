import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Versão do texto de consentimento (LGPD). Se o texto mudar, troque a versão: o banco guarda
// qual versão cada cliente aceitou, junto com a data e a hora.
const LGPD_VERSAO = "v1-2026-10";

const ERROS = {
  nao_encontrada: "Não encontramos essa comanda. Fale com o garçom.",
  indisponivel: "O programa de fidelidade não está disponível agora.",
  sem_aceite: "Para participar, aceite o uso dos seus dados.",
  nome_invalido: "Digite seu nome completo (nome e sobrenome).",
  cpf_invalido: "CPF inválido. Confira os números.",
  telefone_invalido: "Telefone inválido. Digite com DDD.",
  email_invalido: "E-mail inválido. Confira o endereço.",
  sem_comanda_aberta: "Peça ao garçom para abrir sua comanda e tente de novo.",
  comanda_ja_vinculada: "Esta comanda já tem um cadastro de fidelidade.",
  ja_cadastrado: "Esse CPF já está cadastrado aqui. Use “Ver minhas visitas” para consultar.",
};

function mascaraCpf(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export default function FidelidadeCliente({ comandaFisicaId, restaurante, comanda, fidelidade, aoAtualizar }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", email: "", aceite: false });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [recemCadastrado, setRecemCadastrado] = useState(false);

  const [consultando, setConsultando] = useState(false);
  const [cpfConsulta, setCpfConsulta] = useState("");
  const [consultaCarregando, setConsultaCarregando] = useState(false);
  const [consulta, setConsulta] = useState(null);
  const [erroConsulta, setErroConsulta] = useState("");

  if (!fidelidade?.ativa) return null;

  const podeCadastrar = Boolean(comanda) && !fidelidade.cadastrado;

  const mudar = (campo) => (e) => {
    const valor = campo === "aceite" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [campo]: campo === "cpf" ? mascaraCpf(valor) : valor }));
  };

  const cadastrar = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { data, error } = await supabase.rpc("fidelidade_cadastrar", {
      p_comanda_fisica_id: comandaFisicaId,
      p_nome: form.nome,
      p_cpf: form.cpf,
      p_telefone: form.telefone,
      p_email: form.email,
      p_aceite: form.aceite,
      p_lgpd_versao: LGPD_VERSAO,
    });
    setEnviando(false);
    if (error || !data?.ok) {
      setErro(ERROS[data?.erro] || "Não conseguimos concluir agora. Tente de novo ou fale com o garçom.");
      return;
    }
    setRecemCadastrado(true);
    setAberto(false);
    setForm({ nome: "", cpf: "", telefone: "", email: "", aceite: false });
    await aoAtualizar();
  };

  const consultar = async (e) => {
    e.preventDefault();
    setErroConsulta("");
    setConsulta(null);
    setConsultaCarregando(true);
    const { data, error } = await supabase.rpc("fidelidade_consultar_publico", {
      p_comanda_fisica_id: comandaFisicaId,
      p_cpf: cpfConsulta,
    });
    setConsultaCarregando(false);
    if (error || !data?.ok) {
      setErroConsulta(ERROS[data?.erro] || "Não conseguimos consultar agora. Tente de novo.");
      return;
    }
    setConsulta(data);
  };

  return (
    <section className="cc-fid">
      {recemCadastrado && (
        <div className="cc-card cc-fid-ok">
          <strong>Cadastro feito! 🎉</strong>
          <p>
            Seu desconto de 10% nos produtos desta compra já está aplicado, e hoje conta como a sua
            visita nº 1.
          </p>
        </div>
      )}

      {podeCadastrar && !aberto && (
        <div className="cc-card cc-fid-convite">
          <strong>Ganhe 10% de desconto</strong>
          <p>Cadastre-se no nosso programa de fidelidade e ganhe desconto nos produtos desta compra.</p>
          <button type="button" className="cc-botao" onClick={() => setAberto(true)}>
            Quero meu desconto
          </button>
        </div>
      )}

      {podeCadastrar && aberto && (
        <form className="cc-card cc-fid-form" onSubmit={cadastrar}>
          <h2>Programa de fidelidade</h2>
          <label>
            Nome completo
            <input value={form.nome} onChange={mudar("nome")} autoComplete="name" required />
          </label>
          <label>
            CPF
            <input
              value={form.cpf}
              onChange={mudar("cpf")}
              inputMode="numeric"
              placeholder="000.000.000-00"
              autoComplete="off"
              required
            />
          </label>
          <label>
            Telefone (com DDD)
            <input
              value={form.telefone}
              onChange={mudar("telefone")}
              inputMode="tel"
              placeholder="(11) 90000-0000"
              autoComplete="tel"
              required
            />
          </label>
          <label>
            E-mail
            <input type="email" value={form.email} onChange={mudar("email")} autoComplete="email" required />
          </label>
          <label className="cc-fid-aceite">
            <input type="checkbox" checked={form.aceite} onChange={mudar("aceite")} />
            <span>
              Autorizo o uso dos meus dados (nome, CPF, telefone e e-mail) por {restaurante.nome}{" "}
              <strong>somente para o programa de fidelidade</strong> (contar visitas, dar desconto e
              prêmios). Posso pedir a exclusão dos meus dados a qualquer momento ao restaurante.
            </span>
          </label>
          {erro && <p className="cc-aviso erro">{erro}</p>}
          <div className="cc-fid-botoes">
            <button type="submit" className="cc-botao" disabled={enviando}>
              {enviando ? "Enviando..." : "Cadastrar e ganhar 10%"}
            </button>
            <button type="button" className="cc-fid-link" onClick={() => setAberto(false)}>
              Agora não
            </button>
          </div>
        </form>
      )}

      {fidelidade.cadastrado && fidelidade.google_url && (
        <a className="cc-fid-google" href={fidelidade.google_url} target="_blank" rel="noopener noreferrer">
          ⭐ Gostou? Avalie a gente no Google (opcional)
        </a>
      )}

      <div className="cc-fid-consulta">
        {!consultando ? (
          <button type="button" className="cc-fid-link" onClick={() => setConsultando(true)}>
            Fidelidade: ver minhas visitas
          </button>
        ) : (
          <form className="cc-card" onSubmit={consultar}>
            <h2>Minhas visitas</h2>
            <label>
              Digite seu CPF
              <input
                value={cpfConsulta}
                onChange={(e) => setCpfConsulta(mascaraCpf(e.target.value))}
                inputMode="numeric"
                placeholder="000.000.000-00"
                autoComplete="off"
                required
              />
            </label>
            {erroConsulta && <p className="cc-aviso erro">{erroConsulta}</p>}
            {consulta && !consulta.cadastrado && (
              <p className="cc-fid-resultado">Não encontramos cadastro com esse CPF neste restaurante.</p>
            )}
            {consulta?.cadastrado && (
              <div className="cc-fid-resultado">
                <p>
                  Você tem <strong>{consulta.visitas}</strong> visita{consulta.visitas === 1 ? "" : "s"}.
                </p>
                {consulta.proximo_premio ? (
                  <p>
                    Faltam <strong>{consulta.faltam}</strong> para: {consulta.proximo_premio}.
                  </p>
                ) : (
                  <p>Você já alcançou todos os prêmios disponíveis. 🎉</p>
                )}
                {(consulta.premios_disponiveis || []).length > 0 && (
                  <p>
                    Prêmio para resgatar: <strong>{consulta.premios_disponiveis.join(", ")}</strong>. Fale com
                    o restaurante.
                  </p>
                )}
              </div>
            )}
            <div className="cc-fid-botoes">
              <button type="submit" className="cc-botao" disabled={consultaCarregando}>
                {consultaCarregando ? "Consultando..." : "Consultar"}
              </button>
              <button type="button" className="cc-fid-link" onClick={() => setConsultando(false)}>
                Fechar
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
