# Menu & Staff Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QR tabanlı restoran menü sayfası (`menu.html`) ve garson kimlik sayfası (`staff.html`) ekle; sipariş WhatsApp mesajına `[Garson: Ali]\n[Masa: 3]` başlığı otomatik giriyor.

**Architecture:** `build_menu()` fonksiyonu `settings/menu.json` varsa `menu.html`'i doğrudan üretir (build_pages() bypass). `staff.html` normal sayfa akışından (`settings/pages/staff.json` → `build_pages()`) geçer. `menu-qr.js` inline `<script>` olarak yalnızca `menu.html`'e eklenir; `?t=` parametresi basket.js'in `updateLinks()` mekanizması ile ürün sayfalarına otomatik taşınır.

**Tech Stack:** Bash, sed, vanilla JS (ES5), static HTML generation

---

## Dosya Haritası

| Durum | Dosya | Sorumluluk |
|-------|-------|-----------|
| Yeni | `settings/menu.json` | Menü config: title, waiterLabel, tableLabel, saveLabel |
| Yeni | `settings/pages/staff.json` | Staff sayfa tanımı (showInSitemap: false) |
| Yeni | `template/partials/staff-form.html` | Garson adı input formu |
| Yeni | `template/js/menu-qr.js` | `?t=` ve localStorage.waiter → window globals |
| Yeni | `template/css/menu.css` | Menu sayfasına özgü stiller |
| Değişiyor | `settings/site.json` | rootPages'e "menu" ekle; menuCss/menuCssOutput ekle |
| Değişiyor | `update.sh` | build_menu(), build_staff_form(), isForMenu filtresi, showInSitemap filtresi |
| Değişiyor | `template/process-template.sh` | build_menu_css() ekle |
| Değişiyor | `template/js/basket.js` | sendWhatsApp()'a garson/masa prefix |

---

## Task 1: `settings/site.json` — rootPages ve menuCss

**Files:**
- Modify: `settings/site.json`

- [ ] **Step 1: `rootPages` dizisine `"menu"` ekle**

`settings/site.json` dosyasını aç. Şu satırı bul:
```json
"rootPages": ["index", "404"],
```
Şu hale getir:
```json
"rootPages": ["index", "404", "menu"],
```

- [ ] **Step 2: `menuCss` ve `menuCssOutput` ekle**

`settings/site.json`'da `"assets"` bloğunun kapanan `}` satırından hemen önce şunu ekle (son property olarak virgül dikkat):

```json
"menuCss": "css/menu.css",
"menuCssOutput": "menu.css"
```

Sonuç:
```json
"assets": {
  "css": [...],
  "js": [...],
  "cssOutput": "site.css",
  "jsOutput": "site.js",
  "menuCss": "css/menu.css",
  "menuCssOutput": "menu.css"
},
```

- [ ] **Step 3: Syntax kontrol**

```bash
python3 -c "import json,sys; json.load(open('settings/site.json')); print('OK')"
```
Beklenen: `OK`

- [ ] **Step 4: Commit**

```bash
git add settings/site.json
git commit -m "config: add menu to rootPages and menuCss settings"
```

---

## Task 2: `template/css/menu.css` ve `process-template.sh`

**Files:**
- Create: `template/css/menu.css`
- Modify: `template/process-template.sh`

- [ ] **Step 1: `template/css/menu.css` oluştur**

```css
/* menu.css — QR menu page styles */
#basket .empty a { display: none; }
```

İlk satır: boş sepet durumunda "Ürünlerimiz" linkini menu'da gizler (müşteri zaten menu'da).

- [ ] **Step 2: `build_menu_css()` fonksiyonunu `process-template.sh`'e ekle**

`process-template.sh`'de `build_js` fonksiyonundan hemen sonra, `build_images` fonksiyonundan önce şunu ekle:

```bash
build_menu_css() {
  local menu_css_src=$(json_val "$SITE_JSON" menuCss)
  local menu_css_output=$(json_val "$SITE_JSON" menuCssOutput)
  [ -z "$menu_css_src" ] || [ -z "$menu_css_output" ] && return
  min "$TEMPLATE_DIR/$menu_css_src" > "$OUTPUT_DIR/$menu_css_output"
  echo "menu.css built"
}
```

- [ ] **Step 3: `process-template.sh` sonuna çağrı ekle**

Dosyanın sonunda `build_images` çağrısından sonra:

```bash
build_menu_css
```

- [ ] **Step 4: Test — `bash update.sh` çalıştır, `menu.css` üretildi mi kontrol et**

```bash
bash update.sh 2>&1 | grep -E "menu.css|ERROR"
ls -la menu.css
```
Beklenen: `menu.css built` çıktısı ve dosya var.

- [ ] **Step 5: Commit**

```bash
git add template/css/menu.css template/process-template.sh
git commit -m "feat: add menu.css and build_menu_css to process-template"
```

---

## Task 3: `template/js/menu-qr.js`

**Files:**
- Create: `template/js/menu-qr.js`

- [ ] **Step 1: Dosyayı oluştur**

```js
(function() {
  var params = new URLSearchParams(location.search);
  window.TABLE_NO = params.get('t') || '';
  window.WAITER_NAME = localStorage.getItem('waiter') || '';
})();
```

Bu script `window.TABLE_NO` ve `window.WAITER_NAME`'i tanımlar. `basket.js`'in `sendWhatsApp()` fonksiyonu bu globals'ı okuyacak (Task 8).

- [ ] **Step 2: Commit**

```bash
git add template/js/menu-qr.js
git commit -m "feat: add menu-qr.js for table/waiter globals"
```

---

## Task 4: `update.sh` — `isForMenu` filtresi ve `product-cards-all`

**Files:**
- Modify: `update.sh` (satır ~338–363 arası `build_product_cards()`)

- [ ] **Step 1: `build_product_cards()`'a `isForMenu: false` filtresi ekle**

`build_product_cards()` içindeki `for pj in ...` döngüsünün başına, `local name=...` satırından önce şunu ekle:

```bash
    grep -q '"isForMenu"[[:space:]]*:[[:space:]]*false' "$pj" && continue
```

Sonuç — `build_product_cards()` fonksiyonunun döngüsü:
```bash
  for pj in "$SETTINGS_DIR"/products/*.json; do
    grep -q '"isForMenu"[[:space:]]*:[[:space:]]*false' "$pj" && continue
    local name=$(json_val "$pj" name)
    ...
  done
```

- [ ] **Step 2: `build_product_cards_all()` fonksiyonunu ekle**

`build_product_cards()` fonksiyonundan hemen sonra, `build_tabs()` fonksiyonundan önce yeni fonksiyon ekle:

```bash
# --- Product Cards Builder (filtresiz — menu.html için) ---
build_product_cards_all() {
  local addToBasket=$(json_label addToBasket)
  local html="<ul class=\"prd\">"

  for pj in "$SETTINGS_DIR"/products/*.json; do
    local name=$(json_val "$pj" name)
    local url=$(json_val "$pj" url)
    local price=$(json_num "$pj" price)
    local shortDesc=$(json_val "$pj" shortDesc)
    local img=$(json_img "$pj")
    local id=$(json_val "$pj" id)

    html+="<li>"
    html+="<a href=\"/${PRODUCTS_DIR}/${url}.html\">"
    html+="<img src=\"/img/products/$(blur_src "$img")\" data-src=\"/img/products/${img}\" loading=\"lazy\" alt=\"${L_BRAND} ${name}\" title=\"${L_BRAND} ${name}\">"
    html+="<h3>${name}</h3>"
    html+="</a>"
    html+="<b>${price} ${SITE_CURRENCY_SYMBOL}</b>"
    html+="<p>${shortDesc}</p>"
    html+="<button data-id=\"${id}\">${addToBasket}</button>"
    html+="</li>"
  done

  html+="</ul>"
  printf '%s' "$html"
}
```

- [ ] **Step 3: `render_partial()` içine `product-cards-all` case'i ekle**

`render_partial()` fonksiyonundaki `case "$name" in` bloğunda `product-cards)` satırından hemen sonra:

```bash
    product-cards-all)
      build_product_cards_all
      ;;
```

- [ ] **Step 4: Test**

```bash
bash update.sh 2>&1 | grep -E "ERROR|pages built|products built"
```
Beklenen: hatasız tamamlanma.

- [ ] **Step 5: Commit**

```bash
git add update.sh
git commit -m "feat: add isForMenu filter and build_product_cards_all"
```

---

## Task 5: `update.sh` — `showInSitemap` filtresi

**Files:**
- Modify: `update.sh` (`build_sitemap_html()` satır ~133 ve `build_sitemap_xml()` satır ~164)

- [ ] **Step 1: `build_sitemap_html()` filtresini ekle**

`build_sitemap_html()` içindeki sayfa döngüsünde (`for pj in "$SETTINGS_DIR"/pages/*.json`), `[ "$name" = "404" ] && continue` satırından hemen sonra:

```bash
    grep -q '"showInSitemap"[[:space:]]*:[[:space:]]*false' "$pj" && continue
```

- [ ] **Step 2: `build_sitemap_xml()` filtresini ekle**

`build_sitemap_xml()` içindeki sayfa döngüsünde, `{ [ "$name" = "404" ] || [ "$name" = "index" ]; } && continue` satırından hemen sonra:

```bash
    grep -q '"showInSitemap"[[:space:]]*:[[:space:]]*false' "$pj" && continue
```

- [ ] **Step 3: Test — şimdilik filtrelenecek sayfa yok ama syntax bozulmamış olmalı**

```bash
bash update.sh 2>&1 | grep -E "sitemap|ERROR"
grep -c "<url>" sitemap.xml
```
Beklenen: Mevcut sayfa sayısı değişmemiş, hata yok.

- [ ] **Step 4: Commit**

```bash
git add update.sh
git commit -m "feat: add showInSitemap:false filter to sitemap builders"
```

---

## Task 6: `settings/menu.json`

**Files:**
- Create: `settings/menu.json`

- [ ] **Step 1: Dosyayı oluştur**

```json
{
  "title": "Menu | Özüm'le",
  "waiterLabel": "Waiter",
  "tableLabel": "Table",
  "saveLabel": "Save"
}
```

- [ ] **Step 2: Commit**

```bash
git add settings/menu.json
git commit -m "feat: add settings/menu.json config"
```

---

## Task 7: `update.sh` — `build_menu()` ve `build_staff_form()`

**Files:**
- Modify: `update.sh`

- [ ] **Step 1: `build_staff_form()` fonksiyonunu ekle**

`build_product_cards_all()` fonksiyonundan sonra:

```bash
# --- Staff Form Builder ---
build_staff_form() {
  local menu_json="$SETTINGS_DIR/menu.json"
  local tpl_file="$TEMPLATE_DIR/partials/staff-form.html"
  [ ! -f "$tpl_file" ] && return
  local waiter_label="Waiter"
  local save_label="Save"
  if [ -f "$menu_json" ]; then
    waiter_label=$(json_val "$menu_json" waiterLabel)
    save_label=$(json_val "$menu_json" saveLabel)
  fi
  local tpl
  tpl=$(<"$tpl_file")
  render_template "$tpl" \
    "waiterLabel" "$waiter_label" \
    "saveLabel" "$save_label"
}
```

- [ ] **Step 2: `staff-form` case'ini `render_partial()`'a ekle**

`render_partial()` içindeki `case "$name" in` bloğunda, `product-cards-all)` satırından hemen sonra:

```bash
    staff-form)
      build_staff_form
      ;;
```

- [ ] **Step 3: `build_menu()` fonksiyonunu ekle**

`build_staff_form()` fonksiyonundan sonra, `build_tabs()` fonksiyonundan önce:

```bash
# --- Build Menu Page ---
build_menu() {
  local menu_json="$SETTINGS_DIR/menu.json"
  [ ! -f "$menu_json" ] && return

  local title=$(json_val "$menu_json" title)
  local hmenu=$(build_hmenu "")
  local main_html=$(build_product_cards_all)

  local canonical="${SITE_DOMAIN}/menu.html"
  local hreflang=$(build_seo_tags "/menu.html")
  local lang_nav=$(build_lang_nav "/menu.html")
  local out_path=$(page_output_path "menu")

  local menu_qr_js
  menu_qr_js=$(min "$TEMPLATE_DIR/js/menu-qr.js")

  local extra="<link rel=\"stylesheet\" href=\"/menu.css\">"
  extra+="<script>${menu_qr_js}</script>"

  write_html_page "$out_path" "$title" "" "" \
    "$canonical" "$hreflang" "$lang_nav" \
    "$hmenu" "$main_html" "$extra"

  echo "menu.html built"
}
```

- [ ] **Step 4: `build_menu` çağrısını main execution sırasına ekle**

`update.sh`'in sonundaki ana çalıştırma bloğunda (`init_layout` satırından sonra, `build_pages` satırından önce):

```bash
init_layout
build_menu       # ← buraya ekle
build_pages
build_products
```

- [ ] **Step 5: Test**

```bash
bash update.sh 2>&1 | grep -E "menu|ERROR"
ls -la menu.html
```
Beklenen: `menu.html built` çıktısı, `menu.html` dosyası oluşmuş.

```bash
grep 'menu.css' menu.html
grep 'TABLE_NO\|WAITER_NAME\|URLSearchParams' menu.html
```
Beklenen: Her iki grep de sonuç döndürür.

- [ ] **Step 6: Commit**

```bash
git add update.sh
git commit -m "feat: add build_menu, build_staff_form, staff-form partial case"
```

---

## Task 8: `template/partials/staff-form.html`

**Files:**
- Create: `template/partials/staff-form.html`

- [ ] **Step 1: Dosyayı oluştur**

```html
<article><h2>{{waiterLabel}}</h2><section id="staff-form"><input type="text" id="waiter-input" placeholder="{{waiterLabel}}" autocomplete="off"><button id="waiter-save">{{saveLabel}}</button><p id="waiter-status"></p></section><script>(function(){var inp=document.getElementById('waiter-input');var btn=document.getElementById('waiter-save');var sts=document.getElementById('waiter-status');inp.value=localStorage.getItem('waiter')||'';btn.addEventListener('click',function(){var v=inp.value.trim();if(!v)return;localStorage.setItem('waiter',v);sts.textContent='✓';});})()</script></article>
```

- [ ] **Step 2: `settings/pages/staff.json` oluştur**

```json
{
  "title": "Staff | Özüm'le",
  "description": "",
  "keywords": "",
  "showOnHeaderMenu": false,
  "showInSitemap": false,
  "priority": 0.1,
  "partials": ["staff-form"]
}
```

- [ ] **Step 3: Test — `bash update.sh` ve staff.html**

```bash
bash update.sh 2>&1 | grep -E "ERROR|pages built"
ls -la pages/staff.html
```
Beklenen: `pages/staff.html` oluşmuş.

```bash
grep 'waiter-input\|localStorage' pages/staff.html
```
Beklenen: form elementleri var.

- [ ] **Step 4: `showInSitemap: false` çalışıyor mu kontrol et**

```bash
grep 'staff' sitemap.xml
```
Beklenen: Sonuç yok (staff sitemap'te değil).

- [ ] **Step 5: Commit**

```bash
git add template/partials/staff-form.html settings/pages/staff.json
git commit -m "feat: add staff-form partial and staff.json page config"
```

---

## Task 9: `template/js/basket.js` — WhatsApp prefix

**Files:**
- Modify: `template/js/basket.js`

- [ ] **Step 1: `sendWhatsApp()` fonksiyonunu bul**

Dosyada şu satırı bul (yaklaşık satır 155):
```js
  function sendWhatsApp(items, subtotal, shipping, total) {
    let msg = L("whatsAppGreeting") + "\n";
```

- [ ] **Step 2: Garson/masa prefix'i ekle**

O iki satırı şu hale getir:

```js
  function sendWhatsApp(items, subtotal, shipping, total) {
    let prefix = "";
    if (window.WAITER_NAME) { prefix += "[" + L("waiterLabel") + ": " + window.WAITER_NAME + "]\n"; }
    if (window.TABLE_NO)    { prefix += "[" + L("tableLabel")  + ": " + window.TABLE_NO    + "]\n"; }
    let msg = prefix + L("whatsAppGreeting") + "\n";
```

`window.WAITER_NAME` ve `window.TABLE_NO` sadece `menu.html`'de `menu-qr.js` tarafından set edilir. Normal sayfa ziyaretlerinde bu globals undefined → prefix boş kalır, mevcut davranış bozulmaz.

- [ ] **Step 3: `inject_basket_config()` içinde `waiterLabel`/`tableLabel` ekle**

`update.sh`'deki `inject_basket_config()` fonksiyonunda, `label_keys` değişkenine iki label ekle:

```bash
  local label_keys="addToBasket basket myBasket itemSuffix for openBasket closeBasket subtotal shipping freeShipping total delete unit whatsAppOrder whatsAppGreeting emptyBasket productsLinkText emptyBasketDesc waiterLabel tableLabel"
```

- [ ] **Step 4: `settings/site.json labels` bloğuna label'ları ekle**

`settings/site.json`'daki `"labels"` objesine ekle:
```json
"waiterLabel": "Waiter",
"tableLabel": "Table"
```

- [ ] **Step 5: Test**

```bash
bash update.sh 2>&1 | grep ERROR
grep 'waiterLabel\|tableLabel' site.js
```
Beklenen: `site.js` içinde `waiterLabel` ve `tableLabel` var.

- [ ] **Step 6: Tarayıcıda manuel test**

`menu.html?t=5` aç. `staff.html`'de "Test Waiter" yaz, kaydet. `menu.html?t=5`'e geri dön, ürün ekle, WhatsApp butonuna bas.

Beklenen mesaj başı:
```
[Waiter: Test Waiter]
[Table: 5]
Hello, I would like to place an order:
```

- [ ] **Step 7: Commit**

```bash
git add template/js/basket.js update.sh settings/site.json
git commit -m "feat: add waiter/table prefix to WhatsApp order message"
```

---

## Task 10: Son kontroller

- [ ] **`bash update.sh` temiz çalışıyor**

```bash
bash update.sh 2>&1
```
Beklenen: `ERROR` içeren satır yok.

- [ ] **`menu.html` kök dizinde**

```bash
ls -la menu.html
grep '<ul class="prd">' menu.html
grep 'menu.css' menu.html
grep 'TABLE_NO' menu.html
```

- [ ] **`pages/staff.html` oluşmuş ve sitemap dışında**

```bash
ls -la pages/staff.html
grep 'staff' sitemap.xml  # boş olmalı
grep 'staff' pages/site-haritasi.html  # boş olmalı
```

- [ ] **`sw.js` bozulmamış**

```bash
grep '"menu"' sw.js     # /menu.html varsa PAGES'e girmiş olabilir
node -e "let s=require('fs').readFileSync('sw.js','utf8'); let m=s.match(/__PAGES__|__CORE__|__PRODUCTS__/); console.log(m?'PLACEHOLDER KALDI':'OK')"
```
Beklenen: `OK`

- [ ] **Final commit**

```bash
git add -A
git status  # beklenmedik dosya yoksa
git commit -m "feat: complete menu and staff pages implementation"
```
