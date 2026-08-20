// Quando uma Edge Function responde com erro (status diferente de 2xx), o
// supabase-js só guarda a mensagem genérica "Edge Function returned a non-2xx
// status code" em fnError.message — a mensagem de verdade que a função
// mandou (ex: "A senha precisa ter pelo menos 6 caracteres.") fica dentro da
// resposta HTTP, em fnError.context. Essa função lê ela de volta.
export async function readFunctionErrorMessage(fnError) {
  try {
    const body = await fnError?.context?.json();
    if (body?.error) return body.error;
  } catch {
    // resposta não era JSON — cai no fallback abaixo
  }
  return fnError?.message || String(fnError);
}
