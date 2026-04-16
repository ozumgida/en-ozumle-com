# Basket Restaurant Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `menu.html`'deki sepette kargo satırı, uyarı metinleri (h5/h6/small) ve WhatsApp mesajındaki kargo/subtotal satırları gizlenmeli; bunun için `BASKET_CONFIG.restaurantMode=true` flag'i kullanılır.

**Architecture:** `menu-layout.html`'e `site.js`'den hemen sonra tek satır inline script eklenir. `basket.js` `C.restaurantMode` flag'ini okur; `initBasketDOM`'da h5/h6 oluşturmaz, `renderBasket`'ta kargo hesaplamaz ve toplam satırını sadeleştirir, `sendWhatsApp`'ta kargo ve subtotal satırlarını atlar. E-ticaret sayfaları etkilenmez — `restaurantMode` undefined olduğunda false gibi davranır.

**Tech Stack:** Vanilla JS, statik site derleme (`update.sh`), `template/` kaynak dosyaları → `site.js` / `menu.html` çıktısı

---

### Task 1: `menu-layout.html` — restaurantMode flag'ini set et

**Files:**
- Modify: `template/menu-layout.html:16`

- [ ] **Step 1: Dosyayı oku ve konumu doğrula**

  `template/menu-layout.html` şu an şöyle görünmeli (satır 15-17):

  ```html
      <section id="basket"></section>
      <script src="/site.js"></script>
    </body>
  ```

- [ ] **Step 2: Inline script satırını ekle**

  `template/menu-layout.html` içinde `<script src="/site.js"></script>` satırından hemen sonrasına ekle:

  ```html
      <section id="basket"></section>
      <script src="/site.js"></script>
      <script>BASKET_CONFIG.restaurantMode=true;</script>
    </body>
  ```

  Dosyanın tamamı şöyle olmalı:

  ```html
  <!DOCTYPE html>
  <html lang="{{lang}}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>{{title}}</title>
      <link rel="stylesheet" href="/site.css" />
      <link rel="stylesheet" href="/menu.css" />
      <link rel="icon" href="/favicon.png" type="image/png"/>
    </head>
    <body>
      <section class="off">{{offline_warning}}</section>
      <header><a href="/"><img src="/logo.png" alt="{{slogan}}" title="{{slogan}}" /></a></header>
      <main>{{main}}</main>
      <section id="basket"></section>
      <script src="/site.js"></script>
      <script>BASKET_CONFIG.restaurantMode=true;</script>
    </body>
  </html>
  ```

  **Neden `site.js`'den sonra?** `BASKET_CONFIG` değişkeni `site.js` içinde tanımlanıyor (`let BASKET_CONFIG = {}`). Script yüklenmeden önce property set etmek hata verir.

---

### Task 2: `basket.js` — restaurantMode kontrolleri

**Files:**
- Modify: `template/js/basket.js:10-17` (değişken okuması)
- Modify: `template/js/basket.js:175-179` (h5 / initBasketDOM)
- Modify: `template/js/basket.js:211-215` (h6 / initBasketDOM)
- Modify: `template/js/basket.js:269-277` (shipping / renderBasket)
- Modify: `template/js/basket.js:301-315` (sendWhatsApp)

- [ ] **Step 1: `restaurantMode` değişkenini oku**

  `template/js/basket.js` satır 10-17 arası şu an:

  ```js
  let C = BASKET_CONFIG;
  let warningText = C.warning || "";
  let waWarningText = C.waWarning || "";
  let shippingWarningText = C.shippingWarning || "";
  let currencySymbol = C.currency || "\u20BA";
  let waNumber = C.waNumber || "";
  let labels = C.labels || {};
  let L = function(k) { return labels[k]; };
  ```

  `let restaurantMode = C.restaurantMode || false;` satırını `let waNumber` satırından sonra ekle:

  ```js
  let C = BASKET_CONFIG;
  let warningText = C.warning || "";
  let waWarningText = C.waWarning || "";
  let shippingWarningText = C.shippingWarning || "";
  let currencySymbol = C.currency || "\u20BA";
  let waNumber = C.waNumber || "";
  let restaurantMode = C.restaurantMode || false;
  let labels = C.labels || {};
  let L = function(k) { return labels[k]; };
  ```

- [ ] **Step 2: `initBasketDOM` — h5 oluşturmayı kaldır**

  Şu an satır 175-179:

  ```js
  if (warningText) {
    descEl = h5("hidden");
    parseBr(warningText, descEl);
    basketSection.append(descEl);
  }
  ```

  `restaurantMode` kontrolünü ekle:

  ```js
  if (warningText && !restaurantMode) {
    descEl = h5("hidden");
    parseBr(warningText, descEl);
    basketSection.append(descEl);
  }
  ```

  **Not:** `descEl` başlangıçta `undefined`. `renderBasket` içinde `if (descEl) { show/hide(descEl) }` guard'ı zaten mevcut — `descEl` oluşturulmadığında otomatik atlanır, ek değişiklik gerekmez.

- [ ] **Step 3: `initBasketDOM` — h6 oluşturmayı kaldır**

  Şu an satır 211-215:

  ```js
  if (waWarningText) {
    let warn = h6();
    parseBr(waWarningText, warn);
    contentEl.append(warn);
  }
  ```

  `restaurantMode` kontrolünü ekle:

  ```js
  if (waWarningText && !restaurantMode) {
    let warn = h6();
    parseBr(waWarningText, warn);
    contentEl.append(warn);
  }
  ```

- [ ] **Step 4: `renderBasket` — kargo hesabını ve satırları kaldır**

  Şu an satır 267-277:

  ```js
  empty(totalsEl);

  let shipping = calculateShippingPrice(items);
  let total = subtotal + shipping;

  totalsEl.append(makeRow(L("subtotal") + ":", fmt(subtotal) + " " + currencySymbol));
  totalsEl.append(makeRow(L("shipping") + ":", shipping > 0 ? fmt(shipping) + " " + currencySymbol : L("freeShipping")));
  if (shippingWarningText) {
    totalsEl.append(txt(small, shippingWarningText));
  }
  totalsEl.append(makeRow(L("total") + ":", fmt(total) + " " + currencySymbol, "total"));
  ```

  Şu şekilde değiştir:

  ```js
  empty(totalsEl);

  if (restaurantMode) {
    totalsEl.append(makeRow(L("total") + ":", fmt(subtotal) + " " + currencySymbol, "total"));
  } else {
    let shipping = calculateShippingPrice(items);
    let total = subtotal + shipping;
    totalsEl.append(makeRow(L("subtotal") + ":", fmt(subtotal) + " " + currencySymbol));
    totalsEl.append(makeRow(L("shipping") + ":", shipping > 0 ? fmt(shipping) + " " + currencySymbol : L("freeShipping")));
    if (shippingWarningText) {
      totalsEl.append(txt(small, shippingWarningText));
    }
    totalsEl.append(makeRow(L("total") + ":", fmt(total) + " " + currencySymbol, "total"));
  }
  ```

- [ ] **Step 5: `sendWhatsApp` — kargo ve subtotal satırlarını kaldır**

  Şu an satır 301-315:

  ```js
  function sendWhatsApp(items, subtotal, shipping, total) {
    let prefix = "";
    if (window.WAITER_NAME) { prefix += "[" + L("waiterLabel") + ": " + window.WAITER_NAME + "]\n"; }
    if (window.TABLE_NO)    { prefix += "[" + L("tableLabel")  + ": " + window.TABLE_NO    + "]\n"; }
    let msg = prefix + L("whatsAppGreeting") + "\n";
    for (let i = 0; i < items.length; i++) {
      msg += items[i].quantity + "x " + items[i].name + " - " + fmt(items[i].price * items[i].quantity) + " " + currencySymbol + "\n";
    }
    msg += L("subtotal") + ": " + fmt(subtotal) + " " + currencySymbol + "\n";
    msg += L("shipping") + ": " + (shipping > 0 ? fmt(shipping) + " " + currencySymbol : L("freeShipping")) + "\n";
    msg += L("total") + ": " + fmt(total) + " " + currencySymbol;
    let encoded = encodeURIComponent(msg);
    if (IS_MOBILE) { window.open("https://wa.me/" + waNumber + "?text=" + encoded, "_blank"); }
    else { window.open("https://web.whatsapp.com/send?phone=" + waNumber + "&text=" + encoded, "_blank"); }
  }
  ```

  Şu şekilde değiştir:

  ```js
  function sendWhatsApp(items, subtotal, shipping, total) {
    let prefix = "";
    if (window.WAITER_NAME) { prefix += "[" + L("waiterLabel") + ": " + window.WAITER_NAME + "]\n"; }
    if (window.TABLE_NO)    { prefix += "[" + L("tableLabel")  + ": " + window.TABLE_NO    + "]\n"; }
    let msg = prefix + L("whatsAppGreeting") + "\n";
    for (let i = 0; i < items.length; i++) {
      msg += items[i].quantity + "x " + items[i].name + " - " + fmt(items[i].price * items[i].quantity) + " " + currencySymbol + "\n";
    }
    if (!restaurantMode) {
      msg += L("subtotal") + ": " + fmt(subtotal) + " " + currencySymbol + "\n";
      msg += L("shipping") + ": " + (shipping > 0 ? fmt(shipping) + " " + currencySymbol : L("freeShipping")) + "\n";
    }
    msg += L("total") + ": " + fmt(total) + " " + currencySymbol;
    let encoded = encodeURIComponent(msg);
    if (IS_MOBILE) { window.open("https://wa.me/" + waNumber + "?text=" + encoded, "_blank"); }
    else { window.open("https://web.whatsapp.com/send?phone=" + waNumber + "&text=" + encoded, "_blank"); }
  }
  ```

  **Not:** `sendWhatsApp` çağrısı (`initBasketDOM` içinde) şu an `shipping` ve `total` parametrelerini hesaplayıp geçiriyor. `restaurantMode=true` olduğunda renderBasket kargo hesaplamıyor — bu yüzden WhatsApp button click handler'ını da güncellememiz gerekiyor.

  WhatsApp butonunun click handler'ını bul (satır ~201-208):

  ```js
  waBtn.addEventListener("click", function() {
    let items = getItems();
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) subtotal += items[i].price * items[i].quantity;
    let shipping = calculateShippingPrice(items);
    let total = subtotal + shipping;
    sendWhatsApp(items, subtotal, shipping, total);
  });
  ```

  Şu şekilde değiştir:

  ```js
  waBtn.addEventListener("click", function() {
    let items = getItems();
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) subtotal += items[i].price * items[i].quantity;
    let shipping = restaurantMode ? 0 : calculateShippingPrice(items);
    let total = subtotal + shipping;
    sendWhatsApp(items, subtotal, shipping, total);
  });
  ```

- [ ] **Step 6: `update.sh` çalıştır**

  ```bash
  bash update.sh
  ```

  Beklenen çıktı (hepsi başarılı):
  ```
  css merged
  js merged
  images processed
  menu.css built
  product catalog injected
  basket config injected
  schemas precomputed
  menu.html built
  pages built
  products built
  sitemap.xml built
  sw.js built
  ```

- [ ] **Step 7: Manuel doğrulama — e-ticaret sayfası (restaurantMode=false)**

  1. `index.html` veya herhangi bir ürün sayfasını aç
  2. Sepete ürün ekle
  3. Doğrula:
     - h5 basketWarning görünüyor ("Ürünleri ekledikten sonra WhatsApp'a tıkla...")
     - Kargo satırı gösteriliyor
     - WhatsApp mesajında "Subtotal:", "Kargo:", "Toplam:" satırları var

- [ ] **Step 8: Manuel doğrulama — menu.html (restaurantMode=true)**

  1. `menu.html`'i aç (veya yerel sunucu: `python3 -m http.server 8080`)
  2. DevTools > Console: `BASKET_CONFIG.restaurantMode` → `true` olmalı
  3. Sepete ürün ekle
  4. Doğrula:
     - h5 yok (basketWarning görünmüyor)
     - h6 yok (waWarningText görünmüyor)
     - Toplamlar bölümünde sadece "Total: X ₺" var (Subtotal ve Kargo yok, small yok)
  5. "Send Order via WhatsApp" tıkla
  6. WhatsApp mesajında doğrula:
     - Her ürün satırı var
     - "Subtotal:" satırı YOK
     - "Kargo:" satırı YOK
     - "Total: X ₺" var
     - Garson/masa bilgisi varsa prefix'te görünüyor

---

## Notlar

- `calculateShippingPrice` (`settings/shipping.js`) hiç değişmez.
- `site.js` ve `menu.html` `update.sh` ile otomatik üretilir — bu dosyaları doğrudan düzenleme.
- `descEl` null guard'ları (`if (descEl) { show/hide(descEl) }`) `renderBasket` içinde zaten mevcut — restaurantMode=true olduğunda descEl hiç oluşturulmadığı için bu guard'lar otomatik çalışır.
