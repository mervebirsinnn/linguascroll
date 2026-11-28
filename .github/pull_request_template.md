<!--
  Bu şablon insan ve AI ajanları (Codex, Claude) için ortaktır. Boş bırakılan bölüm = eksik PR.
  Kısa yaz; son onayı veren kişi yalnızca bu özet + diff + CI sonucuna bakarak karar verir.
-->

## Ne ve neden
<!-- 1-3 cümle. Hangi sorun çözülüyor, neden bu yaklaşım? -->

## Kabul kriteri
<!-- Bu PR "bitti" sayılması için neyin doğru olması gerekiyor? Görevi yazan kişinin ölçütü. -->
- [ ]

## Test kanıtı
<!-- Çalıştırdığın komut + sonuç. "Çalıştı" yetmez; çıktıyı yapıştır. Çalıştıramadıysan açıkça yaz. -->
```
komut:
sonuç:
```

## Risk ve geri alma
<!-- Neyi bozabilir? Veritabanı/migration, API sözleşmesi (shared-types), Play/RevenueCat/ödeme, native görünüm var mı? Nasıl geri alınır? -->

## Kontrol listesi
- [ ] CI yeşil (`verify`, `stt-windows`)
- [ ] Sözleşme değiştiyse `packages/shared-types` güncellendi ve yeniden derlendi
- [ ] Production veritabanına / R2'ye yazma yok (varsa insan onayı alındı ve burada belirtildi)
- [ ] Gizli anahtar, `.env` ya da kişisel veri yok
- [ ] Bu PR'ı yazan ajan kendi PR'ını onaylamadı (inceleyen farklı ajan veya insan)
