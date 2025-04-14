# Web Defterim - Chrome Uzantısı

Bu Chrome uzantısı, web'de gezinirken önemli gördüğünüz metinleri, resimleri veya bağlantıları Google Drive'ınızdaki tek bir HTML dosyasına hızlıca kaydetmenizi ve daha sonra bu not defterini kolayca görüntülemenizi sağlar.

## Özellikler

*   **Metin Seçimi Kaydetme:** Web sayfalarında seçtiğiniz metinleri, temel HTML formatıyla birlikte kaydeder.
*   **Resim Kaydetme:** Bir resme sağ tıklayarak doğrudan not defterinize ekleyebilirsiniz.
*   **Bağlantı Kaydetme:** Bir bağlantıya sağ tıklayarak URL'sini kaydedebilirsiniz.
*   **Tek Dosyada Toplama:** Tüm notlar, Google Drive'ınızdaki "Web Defterim" klasöründe bulunan "Web Defterim Notları.html" adlı tek bir dosyada biriktirilir.
*   **Defteri Görüntüleme:** Sağ tıklama menüsü veya (eklenecek) eklenti ikonu aracılığıyla not defterinizi yeni bir sekmede, okunabilir formatta görüntüleyebilirsiniz.
*   **Google Drive Entegrasyonu:** Güvenli OAuth 2.0 kimlik doğrulaması ile Google Drive hesabınızı kullanır.

## Nasıl Çalışır?

1.  Kaydetmek istediğiniz içeriğe (seçili metin, resim, bağlantı) sağ tıklayın.
2.  Açılan menüden "Bu İçeriği 'Web Defterim Notları.html' Dosyasına Ekle" seçeneğini seçin.
3.  Uzantı, içeriği alır ve Google Drive'daki ilgili klasör ve dosyanıza ekler. (Dosya veya klasör yoksa otomatik oluşturulur).
4.  İşlem başarılı veya başarısız olduğunda bildirim alırsınız.
5.  Sayfaya veya eklenti ikonuna sağ tıklayıp "'Web Defterim Notları.html' Dosyasını Göster" seçeneği ile notlarınızı içeren HTML sayfasını yeni bir sekmede açabilirsiniz.

## Kurulum

Detaylı kurulum adımları için lütfen [SETUP.md](SETUP.md) dosyasına bakın.

## Kullanım

1.  Uzantıyı Chrome'a yükleyin ve ilk kullanımda Google hesabı erişim iznini verin.
2.  Bir web sayfasında içerik seçin veya bir resme/bağlantıya sağ tıklayın.
3.  "Bu İçeriği Ekle" seçeneğini kullanın.
4.  Notlarınızı görmek için sayfaya veya eklenti ikonuna sağ tıklayıp "Dosyayı Göster" seçeneğini kullanın.

## Dosya Yapısı (Önemli Dosyalar)

*   `background.js`: Uzantının ana mantığını içeren Service Worker betiği (Drive API çağrıları, menü yönetimi, mesajlaşma vb.).
*   `defter_goruntuleyici.html`: Not defterini göstermek için kullanılan uzantı içi HTML sayfası.
*   `defter_goruntuleyici.js`: Görüntüleyici sayfasının arka planla iletişim kurmasını ve içeriği göstermesini sağlayan JavaScript dosyası.
*   `icons/`: Uzantı ikonlarını içeren klasör.

## Gelecek Planları ve Geliştirme Fikirleri

Yukarıda listelenen birçok geliştirme fikri bulunmaktadır (Not ekleme, etiketleme, arama, ayarlar sayfası vb.). Katkıda bulunmak isterseniz lütfen iletişime geçin (eğer proje açıksa).

## Lisans

(Buraya bir lisans belirtin, örn: MIT License)