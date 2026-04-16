# en-ozumle-com — Geliştirici Notları

## Derleme Sistemi

Bu site bir **şablon tabanlı statik site üretici** kullanır.

### Kaynak dosyalar (`template/`)

- `template/js/*.js` — JavaScript kaynak dosyaları
- `template/css/*.css` — CSS kaynak dosyaları
- `template/partials/*.html` — HTML parçaları
- `template/layout.html` — Ana sayfa şablonu

### Üretilen dosyalar (doğrudan düzenleme)

`site.js`, `site.css`, `sw.js`, `pages/*.html`, `products/*.html` ve `sitemap.xml` dosyaları **otomatik olarak üretilir**.

> Bu dosyaları doğrudan düzenleme. Değişiklikler `update.sh` çalıştırıldığında kaybolur.

### Değişiklik yapma adımları

1. İlgili kaynak dosyayı `template/` altında düzenle
2. Proje kökünde `update.sh` çalıştır:
   ```bash
   bash update.sh
   ```

### Ayar dosyaları (`settings/`)

- `settings/site.json` — Site geneli ayarlar (dil, alan adı, etiketler vb.)
- `settings/company.json` — Şirket bilgileri (telefon, e-posta, adres vb.)
- `settings/pages/*.json` — Sayfa içerikleri
- `settings/products/*.json` — Ürün içerikleri
- `settings/shipping.js` — Kargo hesaplama mantığı (müşteri tarafından düzenlenebilir)
