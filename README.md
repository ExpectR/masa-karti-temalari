# Masa Kartı Atölyesi — Umutcan

Online tema kataloğu ve uygulamanın güncel kaynağı.

## Kullanım

Görsel temaları okuyabilen `umutcan.html` (2.0.0 ve sonrası) sürümünde **Tema Mağazası → Online yenile → Online** yolunu kullanın. Yeni temalar ve görseller bu depodan alınır; tema eklemek için HTML dosyasını yeniden dağıtmak gerekmez.

Önceki uygulamada görseller sadece dosyanın içine gömülüyordu. Uzaktaki görselleri okuyabilmek için uygulamanın **bir kez** bu sürüme geçirilmesi gerekir. Daha önce kaydedilmiş ayarlar, şablonlar ve gizlenen temalar aynı tarayıcı depolamasında korunur. Görsellerin ilk yüklemesi internet bağlantısı gerektirir.

## Doğal koleksiyon

- Doğal Gül & Şakayık
- Doğal Gelincik & Papatya
- Doğal Lavanta & Anemon
- Doğal Sonbahar
- Doğal Kokina & Çam

İsimler ve diğer yazılar görsele gömülü değildir; uygulamada düzenlenir. Beş mevcut desen teması katalogda korunur.

## Yeni tema ekleme

1. Arka planı `assets/tema-adi.webp` olarak ekleyin (PNG/JPEG de desteklenir).
2. `themes/tema-adi.json` oluşturun.
3. `index.json` içindeki `themes` listesine dosyayı ekleyin.
4. Görsel değiştiğinde katalogdaki `version` sayısını artırın. Uygulamada **Online yenile** seçin.

Örnek görsel tema:

```json
{
  "schemaVersion": 2,
  "id": "tema-adi",
  "cat": "bayan",
  "n": "Tema adı",
  "bg": "#faf7f0",
  "c": "#713e48",
  "a": "#713e48",
  "font": "'Cormorant Garamond',serif",
  "image": "assets/tema-adi.webp"
}
```

Kategoriler: `bayan`, `bay`, `menu`, `autumn`, `newyear`. Sürüm 1 desen temaları da desteklenir. Görsel temaların sürüm 2 olması eski uygulamaların bunları yanlışlıkla basit desen olarak göstermesini önler. Yalnızca bu depodaki `assets/` görselleri kabul edilir; temalardan JavaScript çalıştırılmaz.

Kaynak görseller yapay zekâ ile üretilmiştir; uygulama için WebP biçimine dönüştürülmüştür.
