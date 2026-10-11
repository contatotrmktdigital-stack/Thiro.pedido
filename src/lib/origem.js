import { useLocation } from "react-router-dom";

// O restaurante tem um login só, então "quem fez o pedido" vira "de qual área":
// dentro da Gestão (/gestao/...) o pedido é da gestão; na tela do garçom, do atendente.
export function useOrigem() {
  const { pathname } = useLocation();
  const origem = pathname.startsWith("/gestao") ? "gestao" : "atendente";
  return { origem, basePedidos: origem === "gestao" ? "/gestao/pedidos" : "/garcom" };
}

export const LABEL_ORIGEM = { atendente: "Atendente", gestao: "Gestão" };
