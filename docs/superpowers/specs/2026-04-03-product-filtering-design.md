# Product Filtering & Category Grouping Design

**Tarih:** 2026-04-03
**Durum:** Onaylandı

---

## Amaç

İki bağımsız ama birlikte çalışabilen flag:

- **`isCategoryCollapsable`** — ürünleri kategori gruplarına ayırır; `true` ise `<details>/<summary>` ile açılıp kapanır, `false` ise `<h3>` başlıkları
- **`isFiltering`** — chip UI ekler, JS ile ürünleri filtreler, kategori/tag statik sayfaları üretir

Hedef: ozumle ve ays-restoran aynı `update.sh` altyapısını paylaşır.

---

## Kapsam Dışı

- `productSections` — site.json'dan kaldırılır; kategoriler artık product JSON'lardan otomatik toplanır
- Product JSON değişiklikleri — `tags` opsiyoneldir, mevcut dosyalara dokunulmaz
- URL'e filtre durumu yansıtma

---

## Render Matrisi

| isCategoryCollapsable | isFiltering | Kategoriler | Sonuç |
|---|---|---|---|
| false | false | tek | Düz `<ul>` liste |
| false | false | >1 | `<h3>` başlıklı gruplar |
| true | false | herhangi | `<details>/<summary>` gruplar |
| false | true | tek | Chip UI + düz liste |
| false | true | >1 | Chip UI + `<h3>` başlıklı gruplar |
| true | true | herhangi | Chip UI + `<details>` gruplar |

Filtre uygulandığında boş gruplar (`<details>` veya `<div>`) otomatik gizlenir.

---

## Veri Yapısı

### Product JSON — mevcut, değişmez
```json
{
  "category": { "name": "Peynir", "url": "peynir" }
}
```

### Product JSON — opsiyonel tags (kullanıcı kendi ekler)
```json
{
  "category": { "name": "Peynir", "url": "peynir" },
  "tags": [
    { "name": "Tuzlu", "url": "tuzlu" },
    { "name": "Erzincan", "url": "erzincan" }
  ]
}
```

`tags` yoksa tag satırı render edilmez; sadece kategori filtrelemesi çalışır.

---

## Filtre Mantığı (`isFiltering: true`)

```
gösterilen ürünler = (seçili kategorilerden biri) AND (seçili taglardan biri)
```

- Hiç seçim yoksa → tüm ürünler
- Birden fazla kategori seçimi → OR
- Birden fazla tag seçimi → OR
- Kategori + tag birlikte → AND
- Tag satırındaki taglar: seçili kategorilerin union'ı (hiç kategori seçili değilse tüm taglar)
- Kategori değişince yeni grubun dışında kalan seçili taglar otomatik deselect edilir

---

## Chip UI (`isFiltering: true`)

```
[ Tümü ]  [ Peynir ]  [ Tereyağı ]        ← kategori satırı (her zaman)
[ Tuzlu ] [ Tuzsuz ] [ Erzincan ] [ 1kg ] ← tag satırı (tag varsa her zaman)
─────────────────────────────────────────
  ## Peynir                               ← isCategoryCollapsable: false, >1 kategori
     <li data-cat="peynir" data-tags="tuzlu erzincan">
  ## Tereyağı
     <li data-cat="tereyagi" data-tags="tuzlu tuzsuz">
```

"Tümü" chip tüm seçimleri sıfırlar. Her `<li>` ürün kartı `data-cat` ve `data-tags` attribute'u taşır.

---

## Build Zamanı — `template/helper-filter.sh`

Yeni helper dosyası. `update.sh` tarafından opsiyonel source edilir:
```bash
[ -f "$TEMPLATE_DIR/helper-filter.sh" ] && source "$TEMPLATE_DIR/helper-filter.sh"
```

### Fonksiyonlar

**`collect_filter_data`**
Tüm product JSON'larını okur. Global array'leri doldurur:
- `FILTER_CATS` — `"url|name"` formatında unique kategoriler (sıralı: product JSON dosya sırasına göre)
- `FILTER_TAGS` — `"url|name"` formatında unique taglar

**`build_product_cards_grouped`**
`isCategoryCollapsable` veya `isFiltering` ile kategoriler >1 olduğunda çağrılır. `FILTER_CATS` üzerinde döner:
- `isCategoryCollapsable: true` → `<details open><summary>` wrapper
- `isCategoryCollapsable: false` → `<div class="cat-group"><h3>` wrapper
- Her `<li>`'ye `data-cat` ve `data-tags` eklenir (her zaman — ileride `isFiltering` eklenebilmesi için)

**`build_product_cards`** (dispatch)
```
isFiltering veya isCategoryCollapsable, ve FILTER_CATS > 1 → build_product_cards_grouped
aksi halde → düz <ul> (data-cat/data-tags olmadan)
```

**`build_filter_ui`**
`isFiltering: true` ise chip HTML üretir. Kategori satırı her zaman, tag satırı yalnızca `FILTER_TAGS` doluysa.

**`build_category_page url name`**
`/pages/{url}.html` üretir. O kategorideki ürünleri listeler. Sitemaplere eklenir.

**`build_tag_page url name`**
`/pages/{url}.html` üretir. O tag'e sahip ürünleri listeler. Sitemaplere eklenir.

**`build_filter_pages`**
`isFiltering: true` ise `FILTER_CATS` ve `FILTER_TAGS` üzerinde döner, ilgili sayfaları üretir.

**`validate_filter`**
`isFiltering: true` iken sorunları kontrol eder, hepsi tek mesajda:
```
WARNING: isFiltering is true but: single category, no tags found
```
Kontrol edilen koşullar (OR):
- Hiç kategori yok
- Tek kategori (filtre etkisiz)
- Tek tag (filtre etkisiz)

"Hiç tag yok" sessizce atlanır — normal durum, uyarı vermez.

---

## Client-side — `template/js/filter.js`

`isFiltering: true` build'larında `site.js`'e dahil edilir (`update.sh` JS dosya listesine koşullu ekler).

### Davranış
1. `.filter-cats` ve `.filter-tags` chip'lerine click listener ekler
2. Kategori seçiminde:
   - Union tag'lerini hesaplar, tag satırını günceller
   - Yeni kategoride olmayan seçili tagları deselect eder
   - Ürün listesini ve boş grupları filtreler
3. Tag seçiminde ürün listesini filtreler
4. "Tümü" chip: tüm seçimler sıfırlanır, tüm gruplar gösterilir

### Görünürlük kuralı
```js
// pseudocode
visible = (!selectedCats.length || selectedCats.includes(item.dataset.cat))
       && (!selectedTags.length || selectedTags.some(t => item.dataset.tags.split(' ').includes(t)))

// boş grup gizleme
group.hidden = group.querySelectorAll('li:not(.hidden)').length === 0
```

---

## Ürün Detay Sayfası

`isFiltering: true` iken ürün adının altına kategori ve tag linkleri eklenir (`template/partials/product.html`):
```html
<div class="product-meta-tags">
  <a href="/pages/peynir.html">Peynir</a>
  <a href="/pages/tuzlu.html">Tuzlu</a>
</div>
```

---

## Sitemap Entegrasyonu

`build_filter_pages` tarafından üretilen kategori/tag sayfaları:
- **XML sitemap:** `priority: 0.5`
- **HTML sitemap:** "Kategoriler" ve "Etiketler" bölümleri olarak eklenir

Kategori/tag sayfaları `showInSitemap` gerektirmez — `build_filter_pages` zaten kontrol eder.

---

## `site.json` Kontrolü

```json
"isCategoryCollapsable": true,
"isFiltering": true
```

Her flag bağımsız çalışır. İkisi birlikte: chip UI + collapsible gruplar.

---

## Etkilenen Dosyalar

| Dosya | Değişim |
|---|---|
| `template/helper-filter.sh` | Yeni — collect, grouped build, filter UI, pages, validation |
| `template/js/filter.js` | Yeni — client-side chip + filtre mantığı |
| `template/css/product.css` | Chip stilleri + `cat-group` / `details` stilleri |
| `template/helper-template.sh` | `build_product_cards` → `helper-filter.sh`'a dispatch |
| `template/partials/product.html` | `isFiltering: true` iken kategori/tag linkleri |
| `update.sh` | `helper-filter.sh` source, `IS_FILTERING` + `IS_CATEGORY_COLLAPSABLE` okuma, `filter.js` koşullu include, sitemap entegrasyonu |
| `settings/site.json` (her proje) | `productSections` kaldırılır |
