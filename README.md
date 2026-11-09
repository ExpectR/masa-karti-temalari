# Masa Kartı Atölyesi — Umutcan

Online tema kataloğu ve uygulamanın güncel kaynağı.

## Kullanım ve Update

Ana dizindeki **`umutcan.html` başlangıç dosyasını bir kez** indirip aynı dosyayı aynı tarayıcıda açın. Önceki sürümde bu sistem olmadığı için ilk geçişte bu dosya gereklidir.

Sol menüdeki **Update** butonu programın tamamını günceller: GitHub'daki son sürüm kontrol edilir, paket indirilip doğrulanır ve uygulama aynı dosyada yeniden açılır. Sonraki program değişikliklerinde HTML'i yeniden indirmeye gerek yoktur. Çalışan sürüm butonun yanında görünür.

Güncel uygulama tarayıcıda tutulur; dosyayı kapatıp açınca ve internet olmadığında da kayıtlı sürüm açılır. Diskteki başlangıç HTML'inin üzerine yazılmaz. Aynı tarayıcıyı ve dosya konumunu kullanın; tarayıcı verilerini silmek hem uygulamanın kayıtlarını hem kurulmuş güncellemeleri kaldırabilir.

İsimler, logo, tasarım ayarları, favoriler, şablonlar ve silinen/gizlenen temalar güncellemede korunur. İndirme veya doğrulama başarısız olursa mevcut sürüm devam eder. Yeni sürüm açılışı tamamlayamazsa son çalışan sürüm ve güncelleme öncesi ayarlar geri yüklenir. Tarayıcı depolaması doluysa güncelleme uygulanmaz, mevcut sürüm çalışır.

Update, sürüm bilgisini ve uygulama paketini GitHub Contents API üzerinden her kontrolde yeni bir URL ile alır; böylece ham `main` dosyalarının beş dakikalık önbelleğine bağlı kalmaz. API geçici olarak kullanılamazsa yedek ham kaynak denenir. Yedek kaynak aynı/eski sürümü gösteriyorsa son sürüm doğrulanamadığı belirtilir; yanlış bir “zaten güncelsin” sonucu verilmez. Boyut, SHA-256 ve sürüm doğrulaması ile geri dönüş korunur. GitHub API için hesap veya token gerekmez; anonim API sınırına ulaşıldığında kullanıcıya kontrolün tamamlanamadığı bildirilir. Kontrol yalnızca Update tıklanınca yapılır.

Update yanındaki **Yenilikler** düğmesi, kullandığınız sürümün kısa değişiklik notlarını ve önceki güncellemeleri gösterir. Notlar sürümün içinde saklanır; internet olmadan da açılır.

Tema güncellemeleri için **Tema Mağazası → Online yenile → Online** yolunu kullanın. Bu işlem tema kataloğunu yeniler; **Update** ise program kodunu günceller. Yeni görsellerin ilk yüklemesi internet gerektirir.

## Gemini Tasarım Asistanı

Gemini bölümü ayar aramasının hemen altındadır. İsteğini yazınca genel tasarım için bir öneri hazırlar; **Şu an / Önerilen** karşılaştırmasını gösterir. Kart ancak **Uygula** ile değişir. **Geri al** (veya Ctrl+Z) asistanın uyguladığı değişikliği de geri alır. Öneri hazırlanırken kart düzenlenirse eski öneri uygulanmaz.

### Windows'ta ilk bağlantı

1. [Google AI Studio](https://aistudio.google.com/api-keys) üzerinden bir Gemini API anahtarı oluştur. Ücretsiz katmanı kullanmak için Google projesinde ücretli faturalandırmayı açma. Kota ve model erişimi Google hesabına bağlıdır; uygulama kota dolunca başka ücretli modele geçmez, otomatik tekrar deneme yapmaz.
2. Bu proje klasöründeki **Gemini Başlat.cmd** dosyasını aç. Tarayıcıda açılan yerel kurulum sayfasının parola alanına anahtarı yapıştır. Yardımcı anahtarın model erişimini doğrular, sonra anahtarı yalnızca bu Windows hesabında açılabilen şifreli bir dosyaya kaydeder. `.local/` Git tarafından dışlanır. Anahtarı HTML'e, kaynak koda veya sohbete yazma.
3. Yardımcıdaki **Bağlantı kodunu kopyala** düğmesini kullan. Atölyeyi **Update** ile 2.2.10 veya sonrasına güncelle. Gemini → **Bağlantı** bölümüne bu kodu yapıştırıp kontrol et. Bu kod API anahtarından ayrıdır.
4. Kurulum sekmesini kapatabilirsin; bilgisayarı yeniden başlattığında **Gemini Başlat.cmd** dosyasını yeniden aç. Yardımcıyı durdurmak için kurulum sayfasındaki **Yardımcıyı durdur** düğmesini kullan. Anahtarı değiştirmek için `powershell.exe -NoProfile -STA -File scripts/start-gemini.ps1 -Configure` çalıştır.

Bilgisayarda yapay zekâ modeli çalışmaz. Küçük bir Node.js 20+ bağlantı yardımcısı yalnızca `127.0.0.1:8766` üzerinde dinler; yapay zekâ Google sunucularında çalışır. Codex'in paketli Node.js'i varsa otomatik bulunur. Bu yöntem aynı bilgisayarda açılan HTML içindir; iPhone veya başka bir bilgisayar bu yerel bağlantıyı kullanamaz. Web üzerinden kullanım ayrı bir sunucu ve erişim düzeni gerektirir.

Gemini'ye yalnızca yazdığın istek, izin verilen tasarım ayarları, tema ve yazı tipi adları gönderilir. İsim listesi, logo/resim dosyaları, mevcut yazı içerikleri, favoriler, şablonlar ve bağlantı kodu Google'a gönderilmez. Google'ın ücretsiz katmanının veri kullanım koşulları geçerlidir; isteme özel bilgi yazma. Karta özel düzenlemeler korunur; asistan genel tasarımı düzenler. İlk sürüm serbest öğe ekleme/silme veya dosya işlemleri yapmaz.

Model yanıtı sunucuda ve tarayıcıda izin listesiyle doğrulanır; JavaScript/HTML çalıştırılmaz. Yerel bağlantı kodu olmadan öneri istenemez. Model `gemini-3.1-flash-lite`; yardımcıda saatte en fazla 30 istek ve aynı anda tek istek sınırı vardır. Google'ın daha düşük ücretsiz kota sınırları ayrıca geçerlidir.

## Program değişikliklerini yayınlama

1. `app/umutcan.html` dosyasında uygulamayı düzenleyin. `Update` düğmesini, sürüm metaverisini ve `UmutShell.watch/ready` bağlantısını koruyun.
2. `app/release-notes.json` dosyasına yayınlayacağınız sürüm için kısa Türkçe başlık ve değişiklik maddeleri ekleyin. `python3 scripts/publish_app.py` çalıştırın. Betik notu bulunmayan sürümü yayınlamaz; `UMUT_RELEASE_NOTES` işaretleri arasına sürüme uygun notları gömer. Paylaşılan `scripts/update_transport.js` hem runtime içindeki `UMUT_UPDATE_TRANSPORT` işaretlerine hem üretilen başlangıç dosyasına otomatik eklenir; işaretleri koruyun. Böylece kullanıcıdaki eski başlangıç dosyaları da yeni runtime üzerinden hızlı kontrolü kullanır. Son yayınlanan sürümün patch numarası otomatik artırılır. Belirli sürüm için `--version 2.2.0` kullanılabilir.
3. `app/umutcan.html`, üretilen yeni `releases/umutcan-X.Y.Z.html`, `app-update.json`, `umutcan.html`, `app/release-notes.json` ve güncellenen `index.json` dosyalarını **aynı commit** ile `main` dalına gönderin.
4. Gerçek tarayıcıda Update ile yeni özelliğin açıldığını, ayarların korunduğunu ve yeniden açılışta yeni sürümün kaldığını doğrulayın.

`releases/` dosyaları değiştirilemez yayınlardır; mevcut bir yayını değiştirmek yerine yeni sürüm oluşturulur. Manifest sürümü, byte uzunluğunu ve SHA-256 değerini içerir. Başlangıç protokolü 1 sabit tutulur; eski başlangıç dosyaları yeni program sürümlerini açmaya devam eder. GitHub erişimi sırasında hesap/token gerekmez; depo herkese açıktır.

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

