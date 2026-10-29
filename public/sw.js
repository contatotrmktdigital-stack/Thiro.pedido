// Service worker do Thiro.pedido — serve só para receber notificações push.
// Propositalmente NÃO guarda cache nem intercepta páginas: as telas (inclusive as do QR da comanda)
// continuam sendo carregadas direto da internet, exatamente como antes.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = {};
  }
  const titulo = dados.titulo || "Thiro.pedido";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || "",
      tag: dados.tag,
      icon: "/logo-simbolo.png",
      badge: "/logo-simbolo.png",
      data: { url: dados.url || "/" },
      renotify: Boolean(dados.tag),
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ("focus" in janela) {
          if (janela.url !== destino && "navigate" in janela) janela.navigate(destino);
          return janela.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
