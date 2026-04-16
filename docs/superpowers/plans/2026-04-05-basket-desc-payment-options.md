# Basket Description & Payment Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sepet WhatsApp göndermeden önce opsiyonel kısa not alanı ve ödeme yöntemi seçimi ekle.

**Architecture:** `settings/site.json` ile kontrol edilen iki yeni alan — `isBasketDesc` (boolean flag) ve `paymentOptions` (string array). `update.sh`'daki `inject_basket_config()` bu değerleri BASKET_CONFIG JS objesine enjekte eder. `template/js/basket.js` DOM'u `initBasketDOM()` içinde bir kere oluşturur; WA butonu tıklandığında seçilen değerler mesaja eklenir. `template/css/basket.css` yeni elemanları stillendirir.

**Tech Stack:** Bash (build), Vanilla JS (ES5-uyumlu), CSS, JSON

---

## Dosya Haritası

| Dosya | Değişiklik |
|---|---|
| `settings/site.json` | `isBasketDesc`, `paymentOptions`, yeni label'lar ekle |
| `update.sh` | `inject_basket_config()`: yeni alanları BASKET_CONFIG'e aktar |
| `template/js/basket.js` | Textarea + radyo DOM, mesaj oluşturma |
| `template/css/basket.css` | Textarea + radyo stili |

---

## Task 1: `settings/site.json` — Yeni alanlar ve label'lar

**Files:**
- Modify: `settings/site.json`

- [ ] **Step 1: `isBasketDesc` ve `paymentOptions` alanlarını ekle**

`"isTelegramOrder": false,` satırından sonra ekle:

```json
  "isBasketDesc": true,
  "paymentOptions": ["Kapıda Kredi Kartı", "Kapıda Nakit", "Ödeme Linki"],
```

- [ ] **Step 2: Yeni label'ları `labels` nesnesine ekle**

`"tableLabel": "Table"` satırından sonra ekle:

```json
    "basketDescPlaceholder": "Add a note (optional)",
    "basketDescTooltip": "If you have anything more to specify, you can also message us directly on WhatsApp.",
    "paymentLabel": "Payment Method",
    "noteLabel": "Note"
```

- [ ] **Step 3: JSON'un geçerli olduğunu doğrula**

```bash
python3 -m json.tool settings/site.json > /dev/null && echo "OK"
```

Beklenen çıktı: `OK`

- [ ] **Step 4: Commit**

```bash
git add settings/site.json
git commit -m "feat: add isBasketDesc, paymentOptions and labels to site.json"
```

---

## Task 2: `update.sh` — `inject_basket_config()` genişlet

**Files:**
- Modify: `update.sh` (yalnızca `inject_basket_config` fonksiyonu)

- [ ] **Step 1: `isBasketDesc` flag'ını oku ve BASKET_CONFIG'e ekle**

`inject_basket_config()` içinde, `local js="let BASKET_CONFIG={"` satırından **önce**:

```bash
  local is_basket_desc="false"
  json_flag "$SITE_JSON" isBasketDesc && is_basket_desc="true"
```

Ardından `js` string'ine ilk değer eklenmesi sırasında (mevcut `warning` satırından önce değil, sonrasına):

`js+=",\"shippingWarning\":\"${shipping_warning}\""` satırından sonra şunu ekle:

```bash
  js+=",\"isBasketDesc\":${is_basket_desc}"
```

- [ ] **Step 2: `paymentOptions` dizisini oku ve BASKET_CONFIG'e ekle**

`local _sc=$(<"$SITE_JSON")` satırından sonra:

```bash
  local payment_options_json="[]"
  local _rpa='"paymentOptions"[[:space:]]*:[[:space:]]*(\[[^]]*\])'
  [[ "$_sc" =~ $_rpa ]] && payment_options_json="${BASH_REMATCH[1]}"
```

Ve `js+=",\"isBasketDesc\":${is_basket_desc}"` satırından sonra:

```bash
  js+=",\"paymentOptions\":${payment_options_json}"
```

- [ ] **Step 3: Yeni label'ları `label_keys` listesine ekle**

Mevcut satır:
```bash
  local label_keys="addToBasket basket myBasket itemSuffix for openBasket closeBasket subtotal shipping freeShipping total delete unit whatsAppOrder whatsAppGreeting telegramOrder telegramGreeting emptyBasket productsLinkText emptyBasketDesc waiterLabel tableLabel"
```

Bunu şununla değiştir:
```bash
  local label_keys="addToBasket basket myBasket itemSuffix for openBasket closeBasket subtotal shipping freeShipping total delete unit whatsAppOrder whatsAppGreeting telegramOrder telegramGreeting emptyBasket productsLinkText emptyBasketDesc waiterLabel tableLabel basketDescPlaceholder basketDescTooltip paymentLabel noteLabel"
```

- [ ] **Step 4: Build çalıştır, BASKET_CONFIG çıktısını doğrula**

```bash
bash update.sh 2>&1 | grep -E "basket|error|ERROR"
```

Beklenen: `basket config injected` çıktısı, hata yok.

```bash
grep -o 'isBasketDesc[^,}]*' site.js | head -1
grep -o 'paymentOptions[^]]*\]' site.js | head -1
```

Beklenen:
```
isBasketDesc":true
paymentOptions":["Kapıda Kredi Kartı","Kapıda Nakit","Ödeme Linki"]
```

- [ ] **Step 5: Commit**

```bash
git add update.sh
git commit -m "feat: inject isBasketDesc and paymentOptions into BASKET_CONFIG"
```

---

## Task 3: `template/js/basket.js` — DOM ve mesaj

**Files:**
- Modify: `template/js/basket.js`

- [ ] **Step 1: Modül başına `descInputEl` değişkenini ekle**

Dosyanın en başındaki `let emptyEl, descEl, wrapEl, toggleBtnEl, toggleInfoEl, contentEl, itemsEl, totalsEl;` satırını şununla değiştir:

```javascript
  let emptyEl, descEl, wrapEl, toggleBtnEl, toggleInfoEl, contentEl, itemsEl, totalsEl, descInputEl;
```

- [ ] **Step 2: `initBasketDOM()` içinde WA butonundan önce textarea ekle**

`let waBtn = txt(button, L("whatsAppOrder"), "wa");` satırından **önce** şunu ekle:

```javascript
    if (C.isBasketDesc) {
      let descWrap = div("basket-desc-wrap");
      descInputEl = document.createElement("textarea");
      descInputEl.className = "basket-desc-input";
      descInputEl.placeholder = L("basketDescPlaceholder");
      descInputEl.title = L("basketDescTooltip");
      descInputEl.rows = 2;
      descWrap.append(descInputEl);
      contentEl.append(descWrap);
    }
```

- [ ] **Step 3: `initBasketDOM()` içinde WA butonundan önce radyo grubu ekle**

Textarea bloğundan hemen sonra (hâlâ WA butonundan önce):

```javascript
    let payOpts = C.paymentOptions || [];
    if (payOpts.length > 1) {
      let payWrap = div("payment-options-wrap");
      payWrap.append(txt(span, L("paymentLabel") + ":"));
      let radioGroup = div("payment-radios");
      for (let pi = 0; pi < payOpts.length; pi++) {
        let lbl = document.createElement("label");
        let radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "basket-payment";
        radio.value = payOpts[pi];
        if (pi === 0) { radio.checked = true; }
        lbl.append(radio, " " + payOpts[pi]);
        radioGroup.append(lbl);
      }
      payWrap.append(radioGroup);
      contentEl.append(payWrap);
    }
```

- [ ] **Step 4: `getSelectedPayment()` ve `getBasketDesc()` yardımcı fonksiyonlarını ekle**

`getOrderArgs()` fonksiyonundan hemen önce ekle:

```javascript
  function getSelectedPayment() {
    let opts = C.paymentOptions || [];
    if (opts.length === 0) { return ""; }
    if (opts.length === 1) { return opts[0]; }
    let radios = document.querySelectorAll('input[name="basket-payment"]');
    for (let r = 0; r < radios.length; r++) {
      if (radios[r].checked) { return radios[r].value; }
    }
    return opts[0];
  }

  function getBasketDesc() {
    if (!descInputEl) { return ""; }
    return descInputEl.value.trim();
  }
```

- [ ] **Step 5: `buildOrderMsg()` sonuna ödeme ve not satırlarını ekle**

Mevcut son satır:
```javascript
    msg += L("total") + ": " + fmt(total) + " " + currencySymbol;
    return msg;
```

Bunu şununla değiştir:
```javascript
    msg += L("total") + ": " + fmt(total) + " " + currencySymbol;
    let payment = getSelectedPayment();
    if (payment) { msg += "\n" + L("paymentLabel") + ": " + payment; }
    let desc = getBasketDesc();
    if (desc) { msg += "\n" + L("noteLabel") + ": " + desc; }
    return msg;
```

- [ ] **Step 6: Build çalıştır**

```bash
bash update.sh 2>&1 | tail -5
```

Hata olmamalı.

- [ ] **Step 7: Commit**

```bash
git add template/js/basket.js
git commit -m "feat: add basket note textarea and payment method radio to basket"
```

---

## Task 4: `template/css/basket.css` — Stiller

**Files:**
- Modify: `template/css/basket.css`

- [ ] **Step 1: Textarea ve radyo grup stillerini dosya sonuna ekle**

`template/css/basket.css` dosyasının en sonuna ekle:

```css
#basket .basket-desc-wrap {
  max-width: 350px;
  margin: 0.5rem auto;
}

#basket .basket-desc-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d5c9b5;
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
  color: #333;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  background: #fafaf8;
  transition: border-color 0.2s;
}

#basket .basket-desc-input:focus {
  outline: none;
  border-color: var(--c-accent);
}

#basket .basket-desc-input::placeholder {
  color: #b0a090;
}

#basket .payment-options-wrap {
  max-width: 350px;
  margin: 0.75rem auto 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--c-brown);
}

#basket .payment-radios {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

#basket .payment-radios label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
  color: #444;
  cursor: pointer;
}

#basket .payment-radios input[type="radio"] {
  accent-color: var(--c-accent);
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Final build çalıştır**

```bash
bash update.sh 2>&1 | tail -5
```

Hata olmamalı.

- [ ] **Step 3: Tarayıcıda doğrula**

1. `index.html` (veya herhangi bir ürün sayfası) aç
2. Sepete ürün ekle
3. Sepet açıldığında:
   - Not textarea'sı görünmeli, mouse over tooltip metni göstermeli
   - 3 radyo butonu görünmeli ve ilki seçili olmalı
4. WA butonuna tıklayınca açılan mesaj şunu içermeli:
   ```
   Payment Method: Kapıda Kredi Kartı
   Note: [girilen not varsa]
   ```

- [ ] **Step 4: Commit**

```bash
git add template/css/basket.css
git commit -m "feat: style basket note textarea and payment options radio group"
```

---

## Self-Review

**Spec coverage:**
- ✅ `isBasketDesc = true` ise textarea gösterilir (Task 1, 3)
- ✅ `title` attribute tooltip metni (Task 3, Step 2)
- ✅ Tooltip metni site.json'da label olarak değiştirilebilir (Task 1, 2)
- ✅ `paymentOptions` array'i site.json'da tanımlanır (Task 1)
- ✅ Birden fazla seçenek varsa radyo butonları gösterilir (Task 3, Step 3)
- ✅ WA mesajına ödeme yöntemi eklenir (Task 3, Step 5)
- ✅ WA mesajına not eklenir (Task 3, Step 5)
- ✅ Tek seçenek varsa radyo gizli, yine de mesaja eklenir (Task 3, Step 4 `getSelectedPayment`)

**Placeholder scan:** Yok.

**Type consistency:**
- `descInputEl` — Task 3 Step 1'de tanımlanır, Step 2'de atanır, `getBasketDesc()`'de kullanılır ✅
- `C.paymentOptions` — Task 2'de BASKET_CONFIG'e eklenir, Task 3'te okunur ✅
- `C.isBasketDesc` — Task 2'de BASKET_CONFIG'e eklenir, Task 3'te okunur ✅
- `L("basketDescPlaceholder")`, `L("basketDescTooltip")`, `L("paymentLabel")`, `L("noteLabel")` — Task 1'de tanımlanır, Task 2'de label_keys'e eklenir ✅
- `input[name="basket-payment"]` — Task 3 Step 3'te oluşturulur, Step 4'te sorgulanır ✅
