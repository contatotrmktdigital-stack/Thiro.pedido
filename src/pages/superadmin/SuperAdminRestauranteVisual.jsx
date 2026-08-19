import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import IdentidadeVisualForm from "../../components/IdentidadeVisualForm";

export default function SuperAdminRestauranteVisual() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRestaurant = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("restaurants")
      .select("id, name, logo_url, cor_primaria, background_url")
      .eq("id", restaurantId)
      .single();

    if (fetchError) setError(fetchError.message);
    else setRestaurant(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRestaurant();
  }, [restaurantId]);

  return (
    <div>
      <p>
        <Link to="/superadmin">&larr; Voltar para restaurantes</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <p>Carregando...</p>
      ) : restaurant ? (
        <div className="card">
          <h2>Identidade visual — {restaurant.name}</h2>
          <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
            Personalize a aparência do app desse restaurante. Ele também pode ajustar isso por
            conta própria em Área de administração &rarr; Identidade visual.
          </p>
          <IdentidadeVisualForm restaurant={restaurant} onSaved={loadRestaurant} />
        </div>
      ) : (
        <p>Restaurante não encontrado.</p>
      )}
    </div>
  );
}
