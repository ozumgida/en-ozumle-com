# Lazy Image SW Cache Skip — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ürün sayfalarında büyük görsel SW cache'deyse thumbnail'i göstermeden direkt büyük resmi yükle.

**Architecture:** `template/js/lazy.js` içindeki IntersectionObserver callback'i, büyük resmi yüklemeden önce `caches.match()` ile SW cache'ini sorgular. Cache'de varsa anında swap yapar; yoksa mevcut `Image()` + `onload` akışı devam eder. `window.caches` guard'ı ile `caches` API'si desteklenmeyen ortamlarda (HTTP, eski tarayıcı) mevcut davranış korunur.

**Tech Stack:** Vanilla JS, Cache API (`window.caches`), IntersectionObserver, Service Worker (mevcut `sw.js`)

---

### Task 1: `lazy.js` IO Callback'ini Güncelle

**Files:**
- Modify: `template/js/lazy.js:8-18`

- [ ] **Step 1: Mevcut dosyayı oku ve context'i doğrula**

  `template/js/lazy.js` dosyasını aç. Şu an şöyle görünmeli:

  ```js
  (function() {
    let imgs = document.querySelectorAll("img[data-src]");
    if (!imgs.length) { return; }

    let observer = new IntersectionObserver(function(entries) {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          let img = entries[i].target;
          let real = new Image();
          real.onload = function() {
            this._target.src = this._target.dataset.src;
            this._target.removeAttribute("data-src");
          };
          real._target = img;
          real.src = img.dataset.src;
          observer.unobserve(img);
        }
      }
    });

    for (let i = 0; i < imgs.length; i++) { observer.observe(imgs[i]); }
  })();
  ```

- [ ] **Step 2: IO callback bloğunu güncelle**

  `template/js/lazy.js` dosyasını tamamen şu içerikle değiştir:

  ```js
  (function() {
    let imgs = document.querySelectorAll("img[data-src]");
    if (!imgs.length) { return; }

    let observer = new IntersectionObserver(function(entries) {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          let img = entries[i].target;
          let fullSrc = img.dataset.src;
          observer.unobserve(img);

          (window.caches
            ? caches.match(fullSrc)
            : Promise.resolve(null)
          ).then(function(cached) {
            if (cached) {
              img.src = fullSrc;
              img.removeAttribute("data-src");
            } else {
              let real = new Image();
              real.onload = function() {
                img.src = fullSrc;
                img.removeAttribute("data-src");
              };
              real.src = fullSrc;
            }
          });
        }
      }
    });

    for (let i = 0; i < imgs.length; i++) { observer.observe(imgs[i]); }
  })();
  ```

  **Değişikliklerin özeti:**
  - `fullSrc` değişkeni `observer.unobserve` öncesinde alınır (closure güvenliği için)
  - `observer.unobserve(img)` cache check'ten önce çağrılır — async `then` içinde IO tekrar tetiklenmesin diye
  - `window.caches` guard'ı: `caches` API'si HTTPS veya localhost dışında tanımsız, guard olmadan hata fırlatır
  - `caches.match(fullSrc)` tüm SW cache bucket'larını tarar — cache adını bilmek gerekmez
  - `real._target` pattern'i kaldırıldı; `img` değişkeni closure üzerinden direkt erişilebilir

- [ ] **Step 3: `update.sh` çalıştır**

  Proje kökünde:

  ```bash
  bash update.sh
  ```

  Bu komut `template/js/lazy.js` dosyasını okuyarak `site.js`'e entegre eder. Hata çıkmazsa devam et.

- [ ] **Step 4: Manuel doğrulama — cache yok senaryosu (ilk yükleme)**

  1. Tarayıcıda DevTools aç → Application → Storage → "Clear site data" ile tüm cache ve SW'yi temizle
  2. Bir ürün sayfasını aç (ör. `products/erzincan-tulum-peyniri-500gr.html`)
  3. Network sekmesinde görsel isteklerini gözlemle:
     - Thumbnail (`-k.webp`) yüklenmiş olmalı
     - Görüntü viewport'a girince büyük resim (`-k` olmadan) yüklenmeli ve swap gerçekleşmeli
  4. Beklenen: mevcut davranış ile aynı — thumbnail önce, büyük resim sonra

- [ ] **Step 5: Manuel doğrulama — cache var senaryosu (tekrar ziyaret)**

  1. Sayfayı kapat ve yeniden aç (SW'nin cache'i doldurması için sayfa yüklendikten 60 saniye bekle ya da DevTools'dan "cache-all" message gönder)
  2. Network sekmesinde `Disable cache` KAPALI olduğunu doğrula
  3. Sayfayı yenile
  4. Beklenen:
     - Büyük resim için thumbnail flash'ı görünmez
     - Network sekmesinde büyük resim isteği `(from ServiceWorker)` olarak görünür
     - Thumbnail isteği (`-k.webp`) de görünebilir (HTML'de `src` attribute'u olduğu için) ama swap bekleme süresi sıfır olmalı

- [ ] **Step 6: Commit**

  ```bash
  git add template/js/lazy.js site.js
  git commit -m "perf: lazy.js - SW cache'deyse thumbnail swap'ı atla"
  ```

---

## Notlar

- `settings/` veya `template/` altındaki başka dosyalara dokunulmaz.
- `sw.js` değişmez — cache stratejisi aynı kalır.
- HTML şablonlarındaki `src` (thumbnail) ve `data-src` (büyük resim) attribute'ları korunur.
