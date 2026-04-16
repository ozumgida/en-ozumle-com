# Lazy Image: SW Cache'deyse Thumbnail'i Atla

**Tarih:** 2026-04-03  
**Dosya:** `template/js/lazy.js`  
**Durum:** Onaylandı

## Problem

Ürün sayfalarında görseller iki aşamalı yüklenir:

1. Küçük resim (`-k.webp`) `src` olarak gösterilir — ilk yüklemede ağ beklemesini azaltmak için.
2. IntersectionObserver görüntüyü viewport'ta algıladığında `lazy.js` büyük resmi (`Image()` ile) arka planda yükler ve `onload`'da `src`'yi değiştirir.

**Sorun:** İkinci ziyarette büyük resim Service Worker cache'inde mevcuttur. Ancak mevcut kod yine de thumbnail → yükle → değiştir döngüsünden geçer. Cache'den sunulsa bile `Image().onload` için bir frame/tick beklenir ve kullanıcı kısa da olsa thumbnail'i görür.

## Çözüm

Intersection Observer callback'i tetiklendiğinde, büyük resmi ağdan yüklemeden önce `caches.match()` ile SW cache'ini sorgula. Cache'de varsa `src`'yi anında değiştir; yoksa mevcut `Image()` + `onload` akışı devam eder.

## Tasarım

### Akış

```
Görüntü viewport'a girer (IO tetikler)
          ↓
observer.unobserve(img)
          ↓
window.caches mevcut mu?
  Hayır → doğrudan Image() akışına geç
  Evet  → caches.match(fullSrc)
              ↙              ↘
        cache var         cache yok
            ↓                 ↓
    src = fullSrc      Image() oluştur
    data-src sil       → yükle → onload
                       → src = fullSrc
                       → data-src sil
```

### Değişecek Dosya

**`template/js/lazy.js`** — yalnızca IO callback bloğu güncellenir.

Mevcut:
```js
let real = new Image();
real.onload = function() {
  this._target.src = this._target.dataset.src;
  this._target.removeAttribute("data-src");
};
real._target = img;
real.src = img.dataset.src;
observer.unobserve(img);
```

Hedef:
```js
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
```

### Kapsam Dışı

- SW (`template/js/sw.js`) değişmez.
- HTML şablonları değişmez (thumbnail `src` attribute'u korunur).
- Görsel geçiş animasyonu eklenmez.
- HTTP cache kontrolü yapılmaz (`caches` API yalnızca SW cache'ini sorgular).

## Kısıtlar ve Yedek Davranış

| Durum | Davranış |
|---|---|
| `window.caches` tanımsız (HTTP, eski tarayıcı) | `Promise.resolve(null)` → mevcut Image() akışı |
| SW henüz kurulmamış / cache boş | `caches.match()` → `undefined` → mevcut Image() akışı |
| Büyük resim cache'de var | Anında `src` değişimi, thumbnail görünmez |

## Etkilenen Dosyalar

| Dosya | Değişim |
|---|---|
| `template/js/lazy.js` | IO callback güncellenir |
| `site.js` | `update.sh` çalıştırılınca otomatik üretilir |
