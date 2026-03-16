let CACHE = "ozumle-en-v20260225115203";
let CORE = ["/","/site.css","/site.js","/logo.png","/favicon.png","/favicon.ico"];
let PRODUCTS = ["/products/erzincan-tulum-peyniri-1000gr.html","/products/erzincan-tulum-peyniri-500gr.html","/products/tuzlu-tereyagi-900gr.html","/products/tuzsuz-tereyagi-500gr.html","/img/products/erzincan-tulum-peyniri-1000gr-k.webp","/img/products/erzincan-tulum-peyniri-1000gr.webp","/img/products/erzincan-tulum-peyniri-500gr-k.webp","/img/products/erzincan-tulum-peyniri-500gr.webp","/img/products/tuzlu-tereyagi-900gr-k.webp","/img/products/tuzlu-tereyagi-900gr.webp","/img/products/tuzsuz-tereyagi-500gr-k.webp","/img/products/tuzsuz-tereyagi-500gr.webp"];
let PAGES = ["/pages/gizlilik-politikasi.html","/pages/hakkimizda.html","/pages/iletisim.html","/pages/kvkk.html","/pages/lezzetimizin-hikayesi.html","/pages/satis-sozlesmesi.html","/pages/site-haritasi.html","/pages/urunlerimiz.html","/index.html","/404.html","/img/address.png","/img/basket.png","/img/delete.png","/img/email.png","/img/facebook.png","/img/instagram.png","/img/linkedin.png","/img/map.png","/img/menu-close.png","/img/menu-open.png","/img/minus.png","/img/phone.png","/img/plus.png","/img/telegram.png","/img/whatsapp.png","/img/youtube.png","/img/pages/404-k.webp","/img/pages/404.webp","/img/pages/gizlilik-politikasi-k.webp","/img/pages/gizlilik-politikasi.webp","/img/pages/hakkimizda-k.webp","/img/pages/hakkimizda.webp","/img/pages/hero-footer-k.webp","/img/pages/hero-footer.webp","/img/pages/hero-header-k.webp","/img/pages/hero-header.webp","/img/pages/iletisim-k.webp","/img/pages/iletisim.webp","/img/pages/kvkk-k.webp","/img/pages/kvkk.webp","/img/pages/lezzetimizin-hikayesi-k.webp","/img/pages/lezzetimizin-hikayesi.webp","/img/pages/satis-sozlesmesi-k.webp","/img/pages/satis-sozlesmesi.webp","/img/pages/site-haritasi-k.webp","/img/pages/site-haritasi.webp"];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(CORE); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("message", function(e) {
  if (e.data === "cache-all") {
    caches.open(CACHE).then(function(c) {
      c.addAll(PRODUCTS).then(function() {
        return c.addAll(PAGES);
      }, function() {
        return c.addAll(PAGES);
      });
    });
  }
});

self.addEventListener("fetch", function(e) {
  if (e.request.method !== "GET") return;

  let url = new URL(e.request.url);
  let isCore = CORE.indexOf(url.pathname) !== -1;

  if (isCore) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        let clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(url.pathname, clone); });
        return res;
      }).catch(function() {
        return caches.match(url.pathname);
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function(cached) {
      let fetched = fetch(e.request).then(function(res) {
        let clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(url.pathname, clone); });
        return res;
      }).catch(function() {
        return cached;
      });
      return cached || fetched;
    })
  );
});
