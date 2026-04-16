# Menu & Staff Pages — Design Spec

**Date:** 2026-04-03  
**Scope:** QR-based restaurant menu page + garson kimlik sayfası

---

## Amaç

Müşteriler QR kodu okutarak ürünleri görür, sepete ekler ve WhatsApp üzerinden sipariş verir. Sipariş mesajına otomatik olarak masa numarası ve garson adı eklenir. Garson adı `staff.html` üzerinden `localStorage`'a kaydedilir; masa numarası QR URL'deki `?t=` parametresinden okunur.

---

## 1. Yeni Dosyalar

### `settings/menu.json`
`settings/` kökünde (`company.json` ile aynı seviye). `pages/` altında değil.

```json
{
  "title": "Menü | Özüm'le",
  "waiterLabel": "Garson",
  "tableLabel": "Masa"
}
```

- `waiterLabel` / `tableLabel`: WhatsApp mesajında ve `staff.html`'de kullanılan label'lar.
- Bu dosya yoksa `update.sh` menu sayfasını üretmez.

---

### `settings/pages/staff.json`

```json
{
  "title": "Garson Girişi | Özüm'le",
  "description": "",
  "keywords": "",
  "showOnHeaderMenu": false,
  "showInSitemap": false,
  "partials": ["staff-form"]
}
```

- `showInSitemap: false` → `build_sitemap_html()` ve `build_sitemap_xml()` bu sayfayı atlar.
- `showOnHeaderMenu: false` → navigasyonda görünmez.
- Bu dosya yoksa `update.sh` staff sayfasını üretmez.

---

### `template/partials/staff-form.html`

Garson adı giriş formu. Sayfa yüklendiğinde `localStorage.waiter` varsa input'u doldurur.

```html
<section id="staff-form">
  <h2>{{waiterLabel}}</h2>
  <input type="text" id="waiter-input" placeholder="{{waiterLabel}}" autocomplete="off">
  <button id="waiter-save">{{saveLabel}}</button>
  <p id="waiter-status"></p>
</section>
<script>
  (function() {
    var inp = document.getElementById('waiter-input');
    var btn = document.getElementById('waiter-save');
    var sts = document.getElementById('waiter-status');
    inp.value = localStorage.getItem('waiter') || '';
    btn.addEventListener('click', function() {
      var v = inp.value.trim();
      if (!v) return;
      localStorage.setItem('waiter', v);
      sts.textContent = '✓';
    });
  })();
</script>
```

- Label'lar `settings/menu.json`'dan `update.sh` tarafından yerleştirilir.
- `saveLabel` → `menu.json`'a `"saveLabel": "Kaydet"` olarak eklenir.

---

### `template/js/menu-qr.js`

Sadece `menu.html`'e `extra_scripts` ile dahil edilir.

**Sorumluluklar:**
1. URL'den `t` parametresini oku → `window.TABLE_NO` olarak tanımla.
2. `localStorage.waiter` → `window.WAITER_NAME` olarak tanımla.

```js
(function() {
  var params = new URLSearchParams(location.search);
  window.TABLE_NO = params.get('t') || '';
  window.WAITER_NAME = localStorage.getItem('waiter') || '';
})();
```

`basket.js`'in `sendWhatsApp()` fonksiyonu bu değişkenleri okur.

---

### `template/css/menu.css`

`menu.html`'e özgü stiller. `site.json`'a ayrı output olarak tanımlanır:

```json
"menuCss": ["css/menu.css"],
"menuCssOutput": "menu.css"
```

`process-template.sh` bunu `menu.css` olarak üretir. `settings/pages/menu.json`'ın `extra_styles` alanı ile sayfaya dahil edilir.

---

## 2. Değişen Dosyalar

### `update.sh` — `build_product_cards()`

`isForMenu` field'ı kontrol edilir:
- Field yoksa veya `true` ise → regular sayfada göster.
- `false` ise → `product-cards` (web listesi) partial'ından hariç tut.

Yeni `product-cards-all` partial case'i eklenir → `isForMenu` farkı olmaksızın tüm ürünleri listeler. `menu.html` bu partial'ı kullanır.

### `update.sh` — `build_sitemap_html()` ve `build_sitemap_xml()`

`settings/pages/*.json` iterasyonuna filtre eklenir:

```bash
json_flag "$pj" showInSitemap && continue  # false ise atla
```

Varsayılan: field yoksa `true` kabul edilir (mevcut sayfalar etkilenmez).

### `update.sh` — `build_menu()` (yeni fonksiyon)

`settings/menu.json` yoksa fonksiyon erken çıkar. Varsa `settings/pages/menu.json`'ı da oluşturup `build_pages()` akışına sokar — ya da doğrudan `write_html_page()` çağırır.

```bash
build_menu() {
  [ ! -f "$SETTINGS_DIR/menu.json" ] && return
  # menu.json'dan title, label'lar okunur
  # product-cards-all partial'ı ile HTML üretilir
  # menu.html kök dizinde yazılır (rootPages'de "menu" olduğundan page_output_path() doğru yolu verir)
}
```

`build_pages()` çağrısından önce `build_menu` çağrılır. `settings/pages/staff.json` ise normal `build_pages()` iterasyonu ile işlenir — ek kontrol gerekmez.

### `update.sh` — `rootPages`

`menu` eklenir:

```json
"rootPages": ["index", "404", "menu"]
```

→ `menu.html` `pages/` yerine kök dizinde oluşur.

### `template/js/basket.js` — `sendWhatsApp()`

Mesajın başına masa ve garson satırları eklenir:

```js
function sendWhatsApp(items, subtotal, shipping, total) {
  var prefix = '';
  if (window.WAITER_NAME) prefix += '[Garson: ' + window.WAITER_NAME + ']\n';
  if (window.TABLE_NO)    prefix += '[Masa: '   + window.TABLE_NO   + ']\n';
  var msg = prefix + L("whatsAppGreeting") + "\n";
  // ... mevcut devam
}
```

`window.TABLE_NO` ve `window.WAITER_NAME` tanımlı değilse (normal web sayfası) prefix boş kalır — mevcut davranış bozulmaz.

---

## 3. `?t=` Parametresi Akışı

`basket.js`'deki `updateLinks()` her render'da `location.search`'i tüm internal linklere ekler. Bu sayede `menu.html?t=3` üzerinden ürün sayfasına geçildiğinde URL `products/tulum.html?t=3` olur — parametre korunur. `sessionStorage` kullanılmaz.

---

## 4. Kullanıcı Akışı

```
Garson:
  staff.html → adını girer → localStorage.waiter = "Ali"

Müşteri:
  QR okutur → menu.html?t=3
    ↓ menu-qr.js: TABLE_NO=3, WAITER_NAME="Ali"
  Ürünleri seçer (basket.js normal çalışır)
  "WhatsApp ile Gönder" → sendWhatsApp()
    → "[Garson: Ali]\n[Masa: 3]\nMerhaba, sipariş vermek istiyorum: ..."
```

---

## 5. Kapsam Dışı

- İntranet sipariş sistemi (mutfak display, Python sunucu) → ayrı repo/proje.
- `menu.html` Service Worker cache'i → WhatsApp zaten internet gerektiriyor, offline anlamsız.
- Garson PIN koruması → URL gizliliği yeterli; `showInSitemap: false` ile arama motorlarından gizlenir.
