/**
 * Service worker mínimo.
 *
 * Existe por dos razones: sin un worker con manejador de `fetch` el navegador
 * no ofrece instalar la app, y con él la cáscara (HTML, CSS, JS) abre al
 * instante en la segunda visita.
 *
 * NO cachea las respuestas de GraphQL ni las imágenes de Bunny y Facebook. El
 * dashboard muestra métricas y estados que cambian: servir datos viejos desde
 * el caché haría creer que una publicación sigue programada cuando ya salió, o
 * que un año no está sincronizado cuando sí. Un dato desactualizado que parece
 * fresco es peor que esperar la red.
 */

const CACHE = "ng-creator-v1";

self.addEventListener("install", (evento) => {
  // El worker nuevo toma el control sin esperar a que se cierren las pestañas
  // viejas: si no, un deploy tarda en verse hasta que el usuario cierra todo.
  self.skipWaiting();
  evento.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Solo lo que sirve este mismo origen. Las llamadas al backend y las imágenes
  // de los CDN quedan siempre en la red.
  if (url.origin !== self.location.origin) return;

  // Red primero, caché como respaldo. Al revés se serviría una versión vieja
  // del dashboard después de cada deploy.
  evento.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
