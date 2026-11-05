# Masa Kartı Atölyesi geliştirme talimatları

- Kanonik uygulama kaynağı `app/umutcan.html` dosyasıdır. Kök `umutcan.html` kalıcı başlangıç dosyasıdır; elle düzenlenmez.
- Kullanıcı program değişikliklerini uygulamadaki **Update** düğmesiyle almak istiyor. Her uygulama kodu değişikliğinde `python3 scripts/publish_app.py` çalıştır; kaynak, yeni değişmez release, `app-update.json` ve üretilen başlangıç dosyasını aynı commit ile main dalına yayınla. Eski release dosyalarını değiştirme/silme.
- Her yeni uygulama sürümü için `app/release-notes.json` dosyasına kısa Türkçe başlık ve değişiklik maddeleri ekle. Kullanıcı bu notları Update yanındaki **Yenilikler** düğmesinden okuyor. `UMUT_RELEASE_NOTES` işaretlerini koru; betik notları çalışan sürümün içine gömer ve notu olmayan sürümün yayınını engeller. Notlar, kaynak ve yayın çıktıları aynı commit ile gitmelidir.
- Tema/görsel eklemelerini `assets/`, `themes/`, `index.json` üzerinden yap. Yalnızca tema değiştiyse uygulamayı yeniden yayınlamak gerekmez. Kullanıcıya sürekli HTML indirtme.
- Launcher protokolü 1'i, uygulama kimliğini, Update düğmesini ve `UmutShell.watch/ready` anlaşmasını koru. Güncelleme SHA-256 ve sürüm/boyut doğrulamasını atlama. Başlangıç dosyasının kullanıcıdaki kopyası sabit kalırken sonraki uygulama sürümleri çalışmalıdır.
- `mk3` ile başlayan kullanıcı verilerini/anahtarlarını koru. İsimler, logo, ayarlar, favoriler, şablonlar ve gizlenen temalar güncellemede korunmalıdır. Güncelleme verileri `umutcan.app.*` alanında tutulur.
- Anlamlı tarayıcı doğrulaması: Update ile gerçek kod değişimi, yeniden açılış ve çevrimdışı açılışta yeni sürüm, kullanıcı verilerinin korunması, ağ/doğrulama hatasında mevcut sürümün çalışması, hatalı açılışta geri dönüş. Sadece sözdizimi kontrolüyle teslim etme.

- Kullanıcıdaki eski başlangıç dosyası Update ile fiziksel olarak değişmez. Başlangıç dosyasındaki bir hata düzeltiliyorsa eski dosyalara uyumluluk düzeltmesini uygulama runtime'ına da ekle. `clearStartupPlaceholder` eski başlangıç dosyalarının bıraktığı `main.boot` yazısını temizler; bunu koru ve güncellemeyi orijinal eski başlangıç dosyasıyla doğrula.
