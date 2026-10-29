import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ativarPush, desativarPush, ehIphone, estadoPush, instaladoNaTela } from "../lib/push";

function areaDaRota(pathname) {
  if (pathname.startsWith("/cozinha")) return "cozinha";
  if (pathname.startsWith("/gestao") && pathname !== "/gestao") return "gestao";
  return "garcom";
}

// Liga/desliga os avisos (push) NESTE aparelho. O aviso é por área: quem ativa na tela da Cozinha
// recebe pedidos novos; na do Garçom/Gestão recebe os chamados dos clientes.
export default function AvisosPush() {
  const { restaurant } = useAuth();
  const { pathname } = useLocation();
  const [estado, setEstado] = useState("carregando");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const area = areaDaRota(pathname);

  useEffect(() => {
    let vivo = true;
    estadoPush().then((e) => vivo && setEstado(e));
    return () => {
      vivo = false;
    };
  }, []);

  const alternar = async () => {
    setOcupado(true);
    setErro("");
    try {
      if (estado === "ativo") {
        await desativarPush();
        setEstado("inativo");
      } else {
        const r = await ativarPush({ restaurantId: restaurant.id, area });
        if (!r.ok) {
          setErro(
            r.erro === "permissao_negada"
              ? "Você não permitiu os avisos. Libere nas configurações do navegador."
              : "Não deu para ativar agora. Tente de novo."
          );
        }
        setEstado(await estadoPush());
      }
    } catch {
      setErro("Não deu para ativar agora. Tente de novo.");
    }
    setOcupado(false);
  };

  if (estado === "carregando") return null;

  if (estado === "nao_suportado") {
    const precisaInstalar = ehIphone() && !instaladoNaTela();
    return (
      <p className="avisos-push-dica">
        {precisaInstalar
          ? "No iPhone, para receber avisos: toque em Compartilhar › “Adicionar à Tela de Início” e abra o Thiro.pedido por esse ícone."
          : "Este aparelho/navegador não suporta avisos com o site fechado."}
      </p>
    );
  }

  if (estado === "bloqueado") {
    return (
      <p className="avisos-push-dica">
        Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador (ícone de
        cadeado, ao lado do endereço) e recarregue.
      </p>
    );
  }

  return (
    <div className="avisos-push">
      <button type="button" className="avisos-push-botao" disabled={ocupado} onClick={alternar}>
        {ocupado ? "..." : estado === "ativo" ? "🔔 Avisos ligados neste aparelho · desligar" : "🔔 Ativar avisos neste aparelho"}
      </button>
      {erro && <p className="avisos-push-dica erro">{erro}</p>}
    </div>
  );
}
