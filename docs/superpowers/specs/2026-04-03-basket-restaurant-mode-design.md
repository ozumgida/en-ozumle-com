# Basket Restaurant Mode

**Tarih:** 2026-04-03  
**Durum:** Onaylandı

## Problem

`menu.html` (restoran QR menüsü) e-ticaret `basket.js`'ini paylaşıyor. Ancak restoran bağlamında ilgisiz birkaç UI öğesi görünüyor:

- `h5` — basketWarning ("Sepete ürün ekledikten sonra WhatsApp'a tıkla...")
- `h6` — waWarningText ("WhatsApp kullanmıyorsan mail at...")
- `small` — shippingWarningText ("15 kg üzeri kargo bedava")
- Kargo satırı — `makeRow(L("shipping"), ...)` toplamlar bölümünde
- WhatsApp mesajı — kargo satırı içeriyor

## Çözüm

`BASKET_CONFIG.restaurantMode = true` flag'i. `basket.js` bu flag'i okur; restoran modunda yukarıdaki öğeleri oluşturmaz, kargo hesaplamaz.

## Tasarım

### `template/menu-layout.html`

`site.js`'den hemen sonra tek satır inline script:

```html
<script src="/site.js"></script>
<script>BASKET_CONFIG.restaurantMode=true;</script>
```

### `template/js/basket.js`

`restaurantMode` değişkeni dosyanın başında okunur:

```js
let restaurantMode = C.restaurantMode || false;
```

Dört kontrol noktası:

| Yer | Mevcut | restaurantMode=true |
|---|---|---|
| `initBasketDOM` — h5 | `if (warningText) { descEl = h5(...) }` | atla (descEl oluşturulmuyor) |
| `initBasketDOM` — h6 | `if (waWarningText) { ... h6() }` | atla |
| `renderBasket` — kargo | `shipping = calculateShippingPrice(...)` + makeRow + small | `shipping = 0`, satır ve small atlanır |
| `sendWhatsApp` — kargo satırı | `msg += L("shipping") + ": " + ...` | atla |
| `sendWhatsApp` — subtotal satırı | `msg += L("subtotal") + ": " + ...` | atla (total=subtotal, tekrar gereksiz) |

`renderBasket`'ta subtotal satırı da kaldırılır (kargo yoksa "Subtotal:" + "Total:" ikisi anlamsız — sadece "Total:" yeterli):

```
restaurantMode=false:  Subtotal: X   Kargo: Y   Toplam: Z
restaurantMode=true:   Toplam: X
```

### Kapsam Dışı

- `calculateShippingPrice` (shipping.js) değişmez
- E-ticaret sayfaları hiç etkilenmez (`BASKET_CONFIG.restaurantMode` undefined = false)
- `descEl` null olduğunda `renderBasket`'taki `if (descEl) { show/hide(descEl) }` guard'ları zaten bu durumu kapsıyor — ek değişiklik gerekmez

## Etkilenen Dosyalar

| Dosya | Değişim |
|---|---|
| `template/menu-layout.html` | 1 satır inline script eklenir |
| `template/js/basket.js` | restaurantMode değişkeni + 4 kontrol |
| `site.js` | `update.sh` ile otomatik üretilir |
| `menu.html` | `update.sh` ile otomatik üretilir |
