import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Um QR só para dois públicos: quem está logado no restaurante (garçom) cai no fluxo de abrir/lançar
// a comanda; quem não está logado (o cliente) vê a própria comanda e o cardápio.
export default function QrEntrada() {
  const { comandaFisicaId } = useParams();
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="centered-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  return session ? (
    <Navigate to={`/garcom/abrir-qr/${comandaFisicaId}`} replace />
  ) : (
    <Navigate to={`/c/${comandaFisicaId}`} replace />
  );
}
