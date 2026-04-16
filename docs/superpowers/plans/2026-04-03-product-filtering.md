# Product Filtering & Category Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `isCategoryCollapsable` ve `isFiltering` flag'larını destekle: kategoriye göre gruplandırma (`<h3>` veya `<details>`), chip UI ile client-side filtreleme, kategori/tag statik sayfa üretimi ve sitemap entegrasyonu.

**Spec:** `docs/superpowers/specs/2026-04-03-product-filtering-design.md`

**Architecture:** `helper-filter.sh` yeni helper dosyası; `update.sh` tarafından opsiyonel source edilir (`[ -f ... ] && source`). `build_product_cards` helper-template.sh'da `_plain` suffix ile yeniden adlandırılır; helper-filter.sh bu fonksiyonu override eder. `filter.js` process-template.sh tarafından `isFiltering: true` iken `site.js`'e eklenir.

**Tech Stack:** Bash, sed, vanilla JS (ES5), static HTML generation

---

## Dosya Haritası

| Durum | Dosya | Sorumluluk |
|-------|-------|-----------|
| Yeni | `template/helper-filter.sh` | collect, grouped build, filter UI, category/tag pages, sitemap entries, meta-tags helper |
| Yeni | `template/js/filter.js` | Client-side chip click, visible/hidden mantığı |
| Değişiyor | `template/css/product.css` | Chip stilleri + `.cat-group`/`details` stilleri |
| Değişiyor | `template/helper-template.sh` | `build_product_cards` → `build_product_cards_plain` + thin wrapper; `build_sitemap_html` filter sections |
| Değişiyor | `template/partials/product.html` | `{{product_meta_tags}}` placeholder |
| Değişiyor | `update.sh` | source helper-filter.sh; `build_products()` meta tags; `build_sitemap_xml` filter entries; main execution'a `build_filter_pages` çağrısı |
| Değişiyor | `template/process-template.sh` | `build_js()` içinde koşullu `filter.js` dahil etme |

---

## Task 1: `template/helper-template.sh` — `build_product_cards_plain` rename

**Files:**
- Modify: `template/helper-template.sh`

Bu task, helper-filter.sh'ın `build_product_cards` override yapabilmesi için zemin hazırlar.

- [ ] **Step 1: `build_product_cards()` → `build_product_cards_plain()` olarak yeniden adlandır**

`helper-template.sh`'daki `build_product_cards()` fonksiyonunun ilk satırını bul:
```bash
# --- Product Cards Builder ---
build_product_cards() {
```

Şu hale getir:
```bash
# --- Product Cards Builder (plain — single category or no filter flags) ---
build_product_cards_plain() {
```

- [ ] **Step 2: `build_product_cards_plain` sonrasına thin wrapper ekle**

`build_product_cards_plain()` fonksiyonunun kapanan `}`'ından hemen sonra şunu ekle:

```bash

# Dispatch wrapper — helper-filter.sh tarafından override edilebilir
build_product_cards() { build_product_cards_plain; }
```

- [ ] **Step 3: Test — rename bozulmadı mı**

```bash
bash update.sh 2>&1 | grep -E "ERROR|pages built|products built"
```
Beklenen: Hatasız tamamlanma. İndex ve urunlerimiz sayfalarında ürün listesi hâlâ görünüyor olmalı.

- [ ] **Step 4: Commit**

```bash
git add template/helper-template.sh
git commit -m "refactor: rename build_product_cards to build_product_cards_plain with dispatch wrapper"
```

---

## Task 2: `template/partials/product.html` — `{{product_meta_tags}}` placeholder

**Files:**
- Modify: `template/partials/product.html`

- [ ] **Step 1: `{{product_meta_tags}}` placeholder ekle**

`template/partials/product.html`'de `<h1 data-id="{{product_id}}">{{product_name}}</h1>` satırından hemen sonra şunu ekle:
```html
{{product_meta_tags}}
```

Sonuç:
```html
    <h1 data-id="{{product_id}}">{{product_name}}</h1>
    {{product_meta_tags}}
    <b>{{product_price}} {{currency_symbol}} <i>{{tax_label}}</i></b>
```

- [ ] **Step 2: `update.sh`'deki `build_products()` fonksiyonuna `product_meta_tags` argümanı ekle**

`update.sh`'deki `build_products()` fonksiyonunda, `local schema="${_SCHEMA_CACHE[$pj]}"` satırından hemen sonra şunu ekle:

```bash
    local meta_tags=""
    type build_product_meta_tags &>/dev/null && json_flag "$SITE_JSON" isFiltering \
      && meta_tags=$(build_product_meta_tags "$c")
```

Ardından aynı fonksiyondaki `render_template "$product_tpl" \` çağrısına yeni argümanı ekle. Mevcut son argümandan sonra:
```bash
      "tabs" "$tabs"
```
Şu hale getir:
```bash
      "tabs" "$tabs" \
      "product_meta_tags" "$meta_tags"
```

- [ ] **Step 3: Test**

```bash
bash update.sh 2>&1 | grep -E "ERROR|products built"
grep "product_meta_tags" products/erzincan-tulum-peyniri-1000gr.html
```
Beklenen: `product_meta_tags` satırı yok (çünkü `isFiltering: false`) — placeholder boş string ile değiştirilmiş olmalı.

- [ ] **Step 4: Commit**

```bash
git add template/partials/product.html update.sh
git commit -m "feat: add product_meta_tags placeholder to product template and build_products"
```

---

## Task 3: `template/process-template.sh` — koşullu `filter.js`

**Files:**
- Modify: `template/process-template.sh`

- [ ] **Step 1: `build_js()` fonksiyonuna koşullu `filter.js` ekle**

`process-template.sh`'deki `build_js()` fonksiyonunda, `} > "$OUTPUT_DIR/$js_output"` satırından hemen önce (yani `fi` bloğunun hemen sonrasına) şunu ekle:

```bash
    # Conditional filter.js — included when isFiltering: true
    if grep -q '"isFiltering"[[:space:]]*:[[:space:]]*true' "$SITE_JSON" \
       && [ -f "$TEMPLATE_DIR/js/filter.js" ]; then
      min "$TEMPLATE_DIR/js/filter.js"
    fi
```

Mevcut yapı:
```bash
  {
    [ -f "$SETTINGS_DIR/shipping.js" ] && min "$SETTINGS_DIR/shipping.js"
    ...
    fi
  } > "$OUTPUT_DIR/$js_output"
```

Yeni yapı (`fi`'den sonra, `}` kapama parantezinden önce):
```bash
  {
    [ -f "$SETTINGS_DIR/shipping.js" ] && min "$SETTINGS_DIR/shipping.js"
    ...
    fi
    # Conditional filter.js
    if grep -q '"isFiltering"[[:space:]]*:[[:space:]]*true' "$SITE_JSON" \
       && [ -f "$TEMPLATE_DIR/js/filter.js" ]; then
      min "$TEMPLATE_DIR/js/filter.js"
    fi
  } > "$OUTPUT_DIR/$js_output"
```

- [ ] **Step 2: Test — `isFiltering: false` iken `filter.js` dahil edilmiyor**

```bash
bash update.sh 2>&1 | grep -E "ERROR|js merged"
# site.js'de filter.js içeriği yok
grep -c "filter-cats\|filter-tags\|\.chip" site.js || echo "0 (doğru)"
```
Beklenen: `0`

- [ ] **Step 3: Commit**

```bash
git add template/process-template.sh
git commit -m "feat: conditionally include filter.js in build_js when isFiltering is true"
```

---

## Task 4: `template/css/product.css` — chip ve group stilleri

**Files:**
- Modify: `template/css/product.css`

- [ ] **Step 1: Chip UI stilleri ekle**

`template/css/product.css` dosyasının sonuna şunu ekle:

```css
/* --- Filter Chip UI --- */
.filter-ui {
  margin: 1.5rem 4rem 0;
}

.filter-cats,
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-bottom: .75rem;
}

.chip {
  padding: .35rem .9rem;
  border: 1.5px solid var(--c-primary);
  border-radius: 2rem;
  background: #fff;
  color: var(--c-primary);
  font-size: .88rem;
  cursor: pointer;
}

.chip.active {
  background: var(--c-primary);
  color: #fff;
}

/* --- Category Groups --- */
.cat-group {
  margin-top: 2rem;
}

.cat-group > h3 {
  margin: 0 4rem .75rem;
  font-size: 1.1rem;
  color: #444;
}

details.cat-group {
  margin-top: 2rem;
}

details.cat-group > summary {
  margin: 0 4rem .75rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: #444;
  cursor: pointer;
}

/* --- Product meta tags (category/tag links on product detail) --- */
.product-meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
  justify-content: center;
  margin: .25rem 0 .75rem;
}

.product-meta-tags a {
  padding: .2rem .7rem;
  border: 1px solid #ddd;
  border-radius: 1rem;
  font-size: .82rem;
  color: #666;
  text-decoration: none;
}

.product-meta-tags a:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}

@media (max-width: 600px) {
  .filter-ui {
    margin: 1rem 0 0;
  }
  .cat-group > h3,
  details.cat-group > summary {
    margin: 0 0 .75rem;
  }
}
```

- [ ] **Step 2: Test**

```bash
bash update.sh 2>&1 | grep -E "ERROR|css merged"
grep "filter-ui\|cat-group\|product-meta-tags" site.css
```
Beklenen: Her üç class da `site.css` içinde görünür.

- [ ] **Step 3: Commit**

```bash
git add template/css/product.css
git commit -m "feat: add chip UI, category group and product meta-tag styles"
```

---

## Task 5: `template/helper-filter.sh` — yeni dosya oluştur

**Files:**
- Create: `template/helper-filter.sh`

Bu dosya `update.sh` tarafından opsiyonel source edilir; tüm filtreleme ve gruplama fonksiyonlarını içerir.

- [ ] **Step 1: Dosyayı oluştur**

```bash
#!/bin/bash
# helper-filter.sh — Product filtering & category grouping
# Sourced by update.sh when present. Requires helper.sh + helper-template.sh.

FILTER_CATS=()   # "url|name" pairs, ordered by first appearance
FILTER_TAGS=()   # "url|name" pairs, ordered by first appearance
_FILTER_DATA_COLLECTED=0

# --- collect_filter_data ---
# Reads all product JSONs; populates FILTER_CATS and FILTER_TAGS.
collect_filter_data() {
  [ $_FILTER_DATA_COLLECTED -eq 1 ] && return
  FILTER_CATS=()
  FILTER_TAGS=()
  local seen_cats="" seen_tags=""

  for pj in "$SETTINGS_DIR"/products/*.json; do
    local c=$(<"$pj")

    # Extract category (single-line: "category": { "name": "...", "url": "..." })
    local cat_url="" cat_name=""
    local _rc='"category"[[:space:]]*:[[:space:]]*\{[^}]*"name"[[:space:]]*:[[:space:]]*"([^"]*)"[^}]*"url"[[:space:]]*:[[:space:]]*"([^"]*)"'
    local _rc2='"category"[[:space:]]*:[[:space:]]*\{[^}]*"url"[[:space:]]*:[[:space:]]*"([^"]*)"[^}]*"name"[[:space:]]*:[[:space:]]*"([^"]*)"'
    if [[ "$c" =~ $_rc ]]; then
      cat_name="${BASH_REMATCH[1]}"; cat_url="${BASH_REMATCH[2]}"
    elif [[ "$c" =~ $_rc2 ]]; then
      cat_url="${BASH_REMATCH[1]}"; cat_name="${BASH_REMATCH[2]}"
    fi

    if [ -n "$cat_url" ] && [[ "$seen_cats" != *"|${cat_url}|"* ]]; then
      FILTER_CATS+=("${cat_url}|${cat_name}")
      seen_cats+="|${cat_url}|"
    fi

    # Extract optional tags array (multi-line)
    local in_tags=0
    while IFS= read -r line; do
      [[ "$line" == *'"tags"'* ]] && { in_tags=1; continue; }
      [ $in_tags -eq 0 ] && continue
      [[ "$line" == *']'* ]] && break
      jstr "$line" url;  local tag_url="$_JVAL"
      jstr "$line" name; local tag_name="$_JVAL"
      if [ -n "$tag_url" ] && [[ "$seen_tags" != *"|${tag_url}|"* ]]; then
        FILTER_TAGS+=("${tag_url}|${tag_name}")
        seen_tags+="|${tag_url}|"
      fi
    done <<< "$c"
  done

  _FILTER_DATA_COLLECTED=1
}

# --- validate_filter ---
# Warns when isFiltering:true config is ineffective.
validate_filter() {
  json_flag "$SITE_JSON" isFiltering || return
  local cat_count=${#FILTER_CATS[@]}
  local tag_count=${#FILTER_TAGS[@]}
  local issues=""
  [ "$cat_count" -eq 0 ] && issues+=" no categories found,"
  [ "$cat_count" -eq 1 ] && issues+=" single category (filter has no effect),"
  [ "$tag_count" -eq 1 ] && issues+=" single tag (filter has no effect),"
  if [ -n "$issues" ]; then
    issues="${issues%,}"
    echo ""
    echo "WARNING: isFiltering is true but:${issues}"
    echo ""
  fi
}

# --- build_filter_ui ---
# Produces chip HTML (category row always; tag row only if FILTER_TAGS non-empty).
build_filter_ui() {
  local html="<div class=\"filter-ui\">"
  html+="<div class=\"filter-cats\">"
  json_label filterAll; local lbl_all="${_JVAL:-All}"
  html+="<button class=\"chip active\" data-cat=\"\">${lbl_all}</button>"
  for entry in "${FILTER_CATS[@]}"; do
    local url="${entry%%|*}"
    local name="${entry#*|}"
    html+="<button class=\"chip\" data-cat=\"${url}\">${name}</button>"
  done
  html+="</div>"
  if [ ${#FILTER_TAGS[@]} -gt 0 ]; then
    html+="<div class=\"filter-tags\">"
    for entry in "${FILTER_TAGS[@]}"; do
      local url="${entry%%|*}"
      local name="${entry#*|}"
      html+="<button class=\"chip\" data-tag=\"${url}\">${name}</button>"
    done
    html+="</div>"
  fi
  html+="</div>"
  printf '%s' "$html"
}

# --- _build_product_li ---
# Renders a single product <li>. Used by both grouped and plain builders.
_build_product_li() {
  local name="$1" url="$2" price="$3" shortDesc="$4" img="$5" id="$6"
  local cat_url="$7" tags_attr="$8"
  local addToBasket="$9"
  local li="<li"
  [ -n "$cat_url" ] && li+=" data-cat=\"${cat_url}\""
  [ -n "$tags_attr" ] && li+=" data-tags=\"${tags_attr}\""
  li+=">"
  li+="<a href=\"/${PRODUCTS_DIR}/${url}.html\">"
  li+="<img src=\"/img/products/${img%.webp}-k.webp\" data-src=\"/img/products/${img}\" loading=\"lazy\" alt=\"${L_BRAND} ${name}\" title=\"${L_BRAND} ${name}\">"
  li+="<h3>${name}</h3>"
  li+="</a>"
  li+="<b>${price} ${SITE_CURRENCY_SYMBOL}</b>"
  li+="<p>${shortDesc}</p>"
  li+="<button data-id=\"${id}\">${addToBasket}</button>"
  li+="</li>"
  printf '%s' "$li"
}

# --- _extract_product_cat_tags ---
# Extracts category url and tags space-joined string from product JSON content.
# Sets _PROD_CAT_URL and _PROD_TAGS_ATTR globals.
_extract_product_cat_tags() {
  local c="$1"
  _PROD_CAT_URL=""
  _PROD_TAGS_ATTR=""
  local _rc='"category"[[:space:]]*:[[:space:]]*\{[^}]*"name"[[:space:]]*:[[:space:]]*"[^"]*"[^}]*"url"[[:space:]]*:[[:space:]]*"([^"]*)"'
  local _rc2='"category"[[:space:]]*:[[:space:]]*\{[^}]*"url"[[:space:]]*:[[:space:]]*"([^"]*)"'
  [[ "$c" =~ $_rc ]]  && _PROD_CAT_URL="${BASH_REMATCH[1]}"
  [ -z "$_PROD_CAT_URL" ] && [[ "$c" =~ $_rc2 ]] && _PROD_CAT_URL="${BASH_REMATCH[1]}"
  # Tags
  local in_tags=0
  while IFS= read -r line; do
    [[ "$line" == *'"tags"'* ]] && { in_tags=1; continue; }
    [ $in_tags -eq 0 ] && continue
    [[ "$line" == *']'* ]] && break
    jstr "$line" url; [ -n "$_JVAL" ] && _PROD_TAGS_ATTR+="${_JVAL} "
  done <<< "$c"
  _PROD_TAGS_ATTR="${_PROD_TAGS_ATTR% }"
}

# --- build_product_cards_grouped ---
# Renders products grouped by category.
# Uses <details>/<summary> when isCategoryCollapsable:true, <div>/<h3> otherwise.
build_product_cards_grouped() {
  json_label addToBasket; local addToBasket="$_JVAL"
  local use_details=0
  json_flag "$SITE_JSON" isCategoryCollapsable && use_details=1
  local html=""

  for cat_entry in "${FILTER_CATS[@]}"; do
    local cat_url="${cat_entry%%|*}"
    local cat_name="${cat_entry#*|}"
    local group_items=""

    for pj in "$SETTINGS_DIR"/products/*.json; do
      local c=$(<"$pj")
      # isForMenu:false filter
      local _rf='"isForMenu"[[:space:]]*:[[:space:]]*false'
      [[ "$c" =~ $_rf ]] && continue
      _extract_product_cat_tags "$c"
      [ "$_PROD_CAT_URL" = "$cat_url" ] || continue

      jstr "$c" name;      local name="$_JVAL"
      jstr "$c" url;       local url="$_JVAL"
      jnum "$c" price;     local price="$_JVAL"
      jstr "$c" shortDesc; local shortDesc="$_JVAL"
      jimg "$c";           local img="$_JVAL"
      jstr "$c" id;        local id="$_JVAL"

      group_items+=$(_build_product_li "$name" "$url" "$price" "$shortDesc" "$img" "$id" "$cat_url" "$_PROD_TAGS_ATTR" "$addToBasket")
    done

    [ -z "$group_items" ] && continue

    if [ "$use_details" -eq 1 ]; then
      html+="<details class=\"cat-group\" open><summary>${cat_name}</summary>"
      html+="<ul class=\"prd\">${group_items}</ul>"
      html+="</details>"
    else
      html+="<div class=\"cat-group\">"
      html+="<h3>${cat_name}</h3>"
      html+="<ul class=\"prd\">${group_items}</ul>"
      html+="</div>"
    fi
  done

  printf '%s' "$html"
}

# --- build_product_cards (override) ---
# Dispatch: filter UI (if isFiltering) + grouped (if >1 cat) or plain.
build_product_cards() {
  [ $_FILTER_DATA_COLLECTED -eq 0 ] && collect_filter_data
  local cat_count=${#FILTER_CATS[@]}
  local html=""

  json_flag "$SITE_JSON" isFiltering && html+=$(build_filter_ui)

  if [ "$cat_count" -gt 1 ]; then
    html+=$(build_product_cards_grouped)
  else
    html+=$(build_product_cards_plain)
  fi

  printf '%s' "$html"
}

# --- build_product_meta_tags ---
# Produces <div class="product-meta-tags">...</div> for product detail pages.
# Called from build_products() in update.sh when isFiltering:true.
build_product_meta_tags() {
  local c="$1"
  _extract_product_cat_tags "$c"
  [ -z "$_PROD_CAT_URL" ] && return

  # Get category name
  local cat_name=""
  local _rcn='"category"[[:space:]]*:[[:space:]]*\{[^}]*"name"[[:space:]]*:[[:space:]]*"([^"]*)"'
  [[ "$c" =~ $_rcn ]] && cat_name="${BASH_REMATCH[1]}"
  [ -z "$cat_name" ] && return

  local html="<div class=\"product-meta-tags\">"
  html+="<a href=\"/${PAGES_DIR}/${_PROD_CAT_URL}.html\">${cat_name}</a>"

  local in_tags=0
  while IFS= read -r line; do
    [[ "$line" == *'"tags"'* ]] && { in_tags=1; continue; }
    [ $in_tags -eq 0 ] && continue
    [[ "$line" == *']'* ]] && break
    jstr "$line" url;  local tag_url="$_JVAL"
    jstr "$line" name; local tag_name="$_JVAL"
    [ -n "$tag_url" ] && html+="<a href=\"/${PAGES_DIR}/${tag_url}.html\">${tag_name}</a>"
  done <<< "$c"

  html+="</div>"
  printf '%s' "$html"
}

# --- build_category_page ---
# Builds /pages/{url}.html listing products in that category.
build_category_page() {
  local cat_url="$1"
  local cat_name="$2"

  json_label addToBasket; local addToBasket="$_JVAL"
  local items=""

  for pj in "$SETTINGS_DIR"/products/*.json; do
    local c=$(<"$pj")
    _extract_product_cat_tags "$c"
    [ "$_PROD_CAT_URL" = "$cat_url" ] || continue

    jstr "$c" name;      local name="$_JVAL"
    jstr "$c" url;       local url="$_JVAL"
    jnum "$c" price;     local price="$_JVAL"
    jstr "$c" shortDesc; local shortDesc="$_JVAL"
    jimg "$c";           local img="$_JVAL"
    jstr "$c" id;        local id="$_JVAL"

    items+=$(_build_product_li "$name" "$url" "$price" "$shortDesc" "$img" "$id" "$cat_url" "$_PROD_TAGS_ATTR" "$addToBasket")
  done

  [ -z "$items" ] && return

  local html="<article><h2>${cat_name}</h2><ul class=\"prd\">${items}</ul></article>"
  local title="${cat_name} | ${L_BRAND}"
  local out_path="${OUTPUT_DIR}/${PAGES_DIR}/${cat_url}.html"
  local seo_path="/${PAGES_DIR}/${cat_url}.html"
  local canonical="${SITE_DOMAIN}${seo_path}"
  build_seo_tags "$seo_path"; local hreflang="$_SEO_TAGS"
  build_lang_nav "$seo_path"; local lang_nav="$_LANG_NAV"
  build_hmenu ""; local hmenu="$_HMENU"

  write_html_page "$out_path" "$title" "" "" "$canonical" "$hreflang" "$lang_nav" "$hmenu" "$html" ""
}

# --- build_tag_page ---
# Builds /pages/{url}.html listing products with that tag.
build_tag_page() {
  local tag_url="$1"
  local tag_name="$2"

  json_label addToBasket; local addToBasket="$_JVAL"
  local items=""

  for pj in "$SETTINGS_DIR"/products/*.json; do
    local c=$(<"$pj")
    _extract_product_cat_tags "$c"
    [[ " ${_PROD_TAGS_ATTR} " == *" ${tag_url} "* ]] || continue

    jstr "$c" name;      local name="$_JVAL"
    jstr "$c" url;       local url="$_JVAL"
    jnum "$c" price;     local price="$_JVAL"
    jstr "$c" shortDesc; local shortDesc="$_JVAL"
    jimg "$c";           local img="$_JVAL"
    jstr "$c" id;        local id="$_JVAL"

    items+=$(_build_product_li "$name" "$url" "$price" "$shortDesc" "$img" "$id" "$_PROD_CAT_URL" "$_PROD_TAGS_ATTR" "$addToBasket")
  done

  [ -z "$items" ] && return

  local html="<article><h2>${tag_name}</h2><ul class=\"prd\">${items}</ul></article>"
  local title="${tag_name} | ${L_BRAND}"
  local out_path="${OUTPUT_DIR}/${PAGES_DIR}/${tag_url}.html"
  local seo_path="/${PAGES_DIR}/${tag_url}.html"
  local canonical="${SITE_DOMAIN}${seo_path}"
  build_seo_tags "$seo_path"; local hreflang="$_SEO_TAGS"
  build_lang_nav "$seo_path"; local lang_nav="$_LANG_NAV"
  build_hmenu ""; local hmenu="$_HMENU"

  write_html_page "$out_path" "$title" "" "" "$canonical" "$hreflang" "$lang_nav" "$hmenu" "$html" ""
}

# --- build_filter_pages ---
# Builds category and tag pages when isFiltering:true.
# Populates FILTER_PAGE_CATS and FILTER_PAGE_TAGS for sitemap use.
FILTER_PAGE_CATS=()
FILTER_PAGE_TAGS=()

build_filter_pages() {
  json_flag "$SITE_JSON" isFiltering || return
  [ $_FILTER_DATA_COLLECTED -eq 0 ] && collect_filter_data
  validate_filter

  mkdir -p "$OUTPUT_DIR/$PAGES_DIR"
  FILTER_PAGE_CATS=()
  FILTER_PAGE_TAGS=()

  for entry in "${FILTER_CATS[@]}"; do
    local url="${entry%%|*}"
    local name="${entry#*|}"
    build_category_page "$url" "$name"
    FILTER_PAGE_CATS+=("$entry")
  done

  for entry in "${FILTER_TAGS[@]}"; do
    local url="${entry%%|*}"
    local name="${entry#*|}"
    build_tag_page "$url" "$name"
    FILTER_PAGE_TAGS+=("$entry")
  done

  local total=$(( ${#FILTER_PAGE_CATS[@]} + ${#FILTER_PAGE_TAGS[@]} ))
  echo "filter pages built (${#FILTER_PAGE_CATS[@]} categories, ${#FILTER_PAGE_TAGS[@]} tags)"
}
```

- [ ] **Step 2: Commit**

```bash
git add template/helper-filter.sh
git commit -m "feat: add helper-filter.sh with collect, grouped build, filter UI, category/tag pages"
```

---

## Task 6: `update.sh` — source, main execution, sitemaps

**Files:**
- Modify: `update.sh`

- [ ] **Step 1: `helper-filter.sh` source ekle**

`update.sh` satır 10'daki `helper-menu.sh` source satırından hemen sonra:
```bash
[ -f "$TEMPLATE_DIR/helper-filter.sh" ] && source "$TEMPLATE_DIR/helper-filter.sh"
```

Mevcut:
```bash
[ -f "$TEMPLATE_DIR/helper-menu.sh" ] && source "$TEMPLATE_DIR/helper-menu.sh"
```

Yeni:
```bash
[ -f "$TEMPLATE_DIR/helper-menu.sh" ] && source "$TEMPLATE_DIR/helper-menu.sh"
[ -f "$TEMPLATE_DIR/helper-filter.sh" ] && source "$TEMPLATE_DIR/helper-filter.sh"
```

- [ ] **Step 2: `build_sitemap_xml()` içine filter entries ekle**

`update.sh`'deki `build_sitemap_xml()` fonksiyonunda, products döngüsünden sonra, `xml+='</urlset>'` satırından hemen önce şunu ekle:

```bash
  # Filter pages (categories + tags) — populated by build_filter_pages
  if type build_filter_pages &>/dev/null; then
    for entry in "${FILTER_PAGE_CATS[@]}" "${FILTER_PAGE_TAGS[@]}"; do
      local furl="${entry%%|*}"
      xml+="<url><loc>${SITE_DOMAIN}/${PAGES_DIR}/${furl}.html</loc><priority>0.5</priority></url>"
    done
  fi
```

- [ ] **Step 3: `build_sitemap_html()` içine filter sections ekle**

`helper-template.sh`'deki `build_sitemap_html()` fonksiyonunda, products döngüsünden (`html+="</ul>"`) hemen sonra şunu ekle:

```bash
  # Filter pages — categories section
  if type build_filter_pages &>/dev/null && [ ${#FILTER_PAGE_CATS[@]} -gt 0 ]; then
    json_label categories; local lbl_cats="${_JVAL:-Categories}"
    html+="<h3>${lbl_cats}</h3><ul>"
    for entry in "${FILTER_PAGE_CATS[@]}"; do
      local furl="${entry%%|*}"
      local fname="${entry#*|}"
      html+="<li><a href='/${PAGES_DIR}/${furl}.html'>${fname}</a></li>"
    done
    html+="</ul>"
  fi
  if type build_filter_pages &>/dev/null && [ ${#FILTER_PAGE_TAGS[@]} -gt 0 ]; then
    json_label tags; local lbl_tags="${_JVAL:-Tags}"
    html+="<h3>${lbl_tags}</h3><ul>"
    for entry in "${FILTER_PAGE_TAGS[@]}"; do
      local furl="${entry%%|*}"
      local fname="${entry#*|}"
      html+="<li><a href='/${PAGES_DIR}/${furl}.html'>${fname}</a></li>"
    done
    html+="</ul>"
  fi
```

- [ ] **Step 4: Main execution'a `build_filter_pages` ekle**

`update.sh` sonundaki main execution bloğunda `build_products` satırından hemen sonra:

```bash
build_products
type build_filter_pages &>/dev/null && build_filter_pages
build_sitemap_xml
```

- [ ] **Step 5: Test — `isFiltering: false` iken hiçbir şey değişmemeli**

```bash
bash update.sh 2>&1
```
Beklenen çıktı: mevcut çıktıyla aynı — "filter pages built" satırı YOK (çünkü `isFiltering: false`).

```bash
grep "dairy-products" sitemap.xml || echo "Yok (doğru)"
```
Beklenen: Yok.

- [ ] **Step 6: Commit**

```bash
git add update.sh template/helper-template.sh
git commit -m "feat: wire helper-filter.sh into update.sh — source, build_filter_pages, sitemap integration"
```

---

## Task 7: `template/js/filter.js` — client-side chip filter

**Files:**
- Create: `template/js/filter.js`

- [ ] **Step 1: Dosyayı oluştur**

```js
(function() {
  var catsEl = document.querySelector('.filter-cats');
  var tagsEl = document.querySelector('.filter-tags');
  if (!catsEl) return;

  var selectedCats = [];
  var selectedTags = [];

  function getItems() {
    return document.querySelectorAll('ul.prd li');
  }

  function applyFilter() {
    var items = getItems();
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var cat = item.dataset.cat || '';
      var tags = item.dataset.tags ? item.dataset.tags.split(' ') : [];
      var catOk = !selectedCats.length || selectedCats.indexOf(cat) !== -1;
      var tagOk = !selectedTags.length || selectedTags.some(function(t) { return tags.indexOf(t) !== -1; });
      item.hidden = !(catOk && tagOk);
    }
    // Hide empty groups
    var groups = document.querySelectorAll('.cat-group, details.cat-group');
    for (var g = 0; g < groups.length; g++) {
      var visible = groups[g].querySelectorAll('li:not([hidden])');
      groups[g].hidden = visible.length === 0;
    }
  }

  function updateTagRow() {
    if (!tagsEl) return;
    var chips = tagsEl.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      var chip = chips[i];
      var tag = chip.dataset.tag;
      // Show tag only if it belongs to a product in selected categories
      var relevant = false;
      if (!selectedCats.length) {
        relevant = true;
      } else {
        var items = getItems();
        for (var j = 0; j < items.length; j++) {
          var item = items[j];
          if (selectedCats.indexOf(item.dataset.cat || '') !== -1) {
            var tags = item.dataset.tags ? item.dataset.tags.split(' ') : [];
            if (tags.indexOf(tag) !== -1) { relevant = true; break; }
          }
        }
      }
      chip.hidden = !relevant;
      // Deselect hidden tags
      if (!relevant) {
        chip.classList.remove('active');
        var idx = selectedTags.indexOf(tag);
        if (idx !== -1) selectedTags.splice(idx, 1);
      }
    }
  }

  catsEl.addEventListener('click', function(e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var cat = chip.dataset.cat;

    if (cat === '') {
      // "All" — reset everything
      selectedCats = [];
      selectedTags = [];
      catsEl.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('active'); });
      if (tagsEl) tagsEl.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('active'); });
      chip.classList.add('active');
    } else {
      catsEl.querySelector('[data-cat=""]').classList.remove('active');
      var idx = selectedCats.indexOf(cat);
      if (idx === -1) { selectedCats.push(cat); chip.classList.add('active'); }
      else            { selectedCats.splice(idx, 1); chip.classList.remove('active'); }
      if (!selectedCats.length) {
        catsEl.querySelector('[data-cat=""]').classList.add('active');
      }
    }

    updateTagRow();
    applyFilter();
  });

  if (tagsEl) {
    tagsEl.addEventListener('click', function(e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var tag = chip.dataset.tag;
      var idx = selectedTags.indexOf(tag);
      if (idx === -1) { selectedTags.push(tag); chip.classList.add('active'); }
      else            { selectedTags.splice(idx, 1); chip.classList.remove('active'); }
      applyFilter();
    });
  }
})();
```

- [ ] **Step 2: Commit**

```bash
git add template/js/filter.js
git commit -m "feat: add filter.js client-side chip filter"
```

---

## Task 8: End-to-end test — `isFiltering: true` aktif et

**Files:**
- Modify: `settings/site.json` (geçici test)

- [ ] **Step 1: `isFiltering: true` yap**

`settings/site.json`'da:
```json
"isFiltering": false,
```
→
```json
"isFiltering": true,
```

- [ ] **Step 2: `bash update.sh` çalıştır**

```bash
bash update.sh 2>&1
```
Beklenen çıktı:
```
css merged
js merged
...
filter pages built (1 categories, 0 tags)
sitemap.xml built
sw.js built
```

> **Not:** Mevcut 4 ürünün tümü "Dairy Products" kategorisinde, tag yok. "single category" WARNING görünmeli.

- [ ] **Step 3: Üretilen dosyaları doğrula**

```bash
# Chip UI (tek kategori olsa bile isFiltering:true iken ekleniyor)
grep "filter-ui\|filter-cats" index.html

# Grouped structure (tek kategori → plain list çünkü cat_count==1)
grep "cat-group" index.html || echo "Yok (doğru — tek kategori)"

# filter.js dahil edildi mi?
grep "filter-cats\|selectedCats" site.js

# Category page oluştu mu?
ls pages/dairy-products.html

# Sitemap'te category page var mı?
grep "dairy-products" sitemap.xml
```

- [ ] **Step 4: Product detail meta tags doğrula**

```bash
grep "product-meta-tags" products/erzincan-tulum-peyniri-1000gr.html
# Beklenen: <div class="product-meta-tags"><a href="/pages/dairy-products.html">Dairy Products</a></div>
```

- [ ] **Step 5: `isFiltering: false`'a geri al ve son kez test**

```bash
# settings/site.json'da isFiltering: false'a geri dön
sed -i 's/"isFiltering": true/"isFiltering": false/' settings/site.json
bash update.sh 2>&1
```
Beklenen: "filter pages built" satırı YOK. `pages/dairy-products.html` silindi (overwrite edilmedi ama build_filter_pages çalışmadı — dosya BUILD edilmez, ama varolan silinmez; bu kabul edilebilir).

```bash
grep "filter-ui\|selectedCats" site.js || echo "Yok (doğru)"
```
Beklenen: Yok.

- [ ] **Step 6: Final commit**

```bash
git add settings/site.json  # isFiltering: false hali
git commit -m "test: verify isFiltering:true generates filter UI, category pages, and sitemap entries"
```

---

## Task 9: Son kontroller

- [ ] **`site.json` labels için `filterAll`, `categories`, `tags` ekle (opsiyonel)**

`settings/site.json`'daki `"labels"` bloğuna şunları ekle:
```json
"filterAll": "All",
"categories": "Categories",
"tags": "Tags"
```
Varsayılan değerler helper-filter.sh'da kodlanmıştır; bu adım sadece site diline göre özelleştirme içindir.

```bash
bash update.sh 2>&1 | grep ERROR
git add settings/site.json
git commit -m "config: add filterAll, categories, tags labels"
```

- [ ] **`bash update.sh` temiz çalışıyor**

```bash
bash update.sh 2>&1 | grep ERROR || echo "Hata yok"
```

- [ ] **Tüm sayfalarda ürün listesi hâlâ görünüyor**

`index.html` ve `pages/urunlerimiz.html`'de `<ul class="prd">` var mı?

```bash
grep -c 'class="prd"' index.html pages/urunlerimiz.html
```
Beklenen: Her dosyada `1`.
