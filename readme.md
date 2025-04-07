# Web Defterim - Chrome Eklentisi

Kullanıcıların web sayfalarından içerik (metin, resim vb.) toplayarak kişisel bir dijital defter oluşturmalarını ve bu defteri Google Drive'da saklamalarını sağlayan bir Chrome eklentisi.

## Proje Amacı

Bu projenin amacı, internette gezinirken karşılaşılan değerli bilgileri (metin parçaları, görseller, bağlantılar, notlar) kolayca yakalayıp, organize bir şekilde kullanıcının kendi Google Drive hesabında depolamasına olanak tanımaktır. Zamanla, bu notlara etiket ekleme, açıklama yazma ve içerikleri kolayca arama gibi özellikler eklenecektir.

## Temel Özellikler (MVP - Minimum Uygulanabilir Ürün)

*   **Metin Yakalama:** Web sayfasında seçilen metni yakalama.
*   **Kaynak Bilgisi:** Yakalanan metnin alındığı web sayfasının URL'sini otomatik olarak kaydetme.
*   **Google Drive Entegrasyonu:**
    *   Kullanıcının Google Hesabı ile güvenli kimlik doğrulama (OAuth 2.0).
    *   Yakalanan içeriği ve kaynak URL'sini kullanıcının Google Drive'ında belirlenen bir klasöre (`Web Defterim`) basit bir dosya olarak (örneğin `.md` veya `.txt`) kaydetme.
    *   `Web Defterim` klasörü yoksa otomatik olarak oluşturma.
*   **Kullanıcı Arayüzü:**
    *   Seçili metin üzerinde sağ tıklandığında çıkan menüye ("Web Defterim'e Kaydet" gibi) bir seçenek ekleme.
    *   Kaydetme işleminin başarılı veya başarısız olduğuna dair basit bir bildirim gösterme.

## Gelecekteki Özellikler (Yol Haritası)

*   **Gelişmiş İçerik Yakalama:**
    *   Resim yakalama (Sağ tık menüsü veya eklenti arayüzü ile).
    *   Ekran görüntüsü alma (Seçili alan, görünen alan, tam sayfa).
    *   HTML Tablolarını yakalama.
*   **Not Yönetimi:**
    *   Yakalanan notlara **Başlık** ekleme/düzenleme.
    *   Notlara **Açıklama/Kişisel Not** ekleme.
    *   Notları **Etiketleme (Tagging)** ve etiketlere göre filtreleme.
    *   Notları arama.
*   **Google Workspace Entegrasyonu (İleri Seviye):**
    *   Google Docs/Sheets yan panelinde notları görüntüleme ve içeriği dokümana ekleme.
*   **Kullanıcı Arayüzü Geliştirmeleri:**
    *   Tarayıcı araç çubuğunda eklentiye ait bir ikon ve popup menü.
    *   Daha detaylı ayarlar sayfası.
*   **Formatlama:** Yakalanan metnin temel formatını (kalın, italik vb.) koruma veya Markdown olarak kaydetme.
*   **Senkronizasyon:** Farklı cihazlar arasında ayarların senkronizasyonu (Chrome Storage API ile).

## Teknoloji Stack'i

*   **Ön Yüz (Eklenti):** JavaScript, HTML, CSS
*   **Tarayıcı API'ları:** Chrome Extension API (Manifest V3), Context Menus, Storage, Identity, Scripting
*   **Arka Uç (Servis):** Google Drive API v3
*   **Kimlik Doğrulama:** Google OAuth 2.0

## Kurulum (Geliştirme Ortamı)

1.  **Depoyu Klonla:**
    ```bash
    git clone <depo-adresi>
    cd web-defterim-chrome-extension
    ```
2.  **Google Cloud Projesi Oluştur:**
    *   Google Cloud Platform'da yeni bir proje oluşturun.
    *   Google Drive API'yi etkinleştirin.
    *   OAuth 2.0 İstemci Kimliği (Client ID) oluşturun (Uygulama türü: Chrome Uygulaması). Oluşturulan Client ID'yi eklentinin manifest dosyasına eklemeniz gerekecek.
3.  **Chrome'a Yükle:**
    *   Chrome tarayıcınızı açın ve `chrome://extensions` adresine gidin.
    *   Sağ üst köşedeki "Geliştirici modu"nu etkinleştirin.
    *   "Paketlenmemiş öğe yükle" düğmesine tıklayın ve proje klasörünü seçin.
4.  **Kimlik Doğrulama:** Eklenti ilk kez çalıştığında veya Google Drive'a erişim gerektiğinde, Google hesabınızla oturum açmanız ve gerekli izinleri vermeniz istenecektir.

## Kullanım (MVP)

1.  Herhangi bir web sayfasında ilginizi çeken bir metni fare ile seçin.
2.  Seçili alan üzerinde sağ tıklayın.
3.  Açılan menüden "Web Defterim'e Kaydet" (veya benzeri) seçeneğini tıklayın.
4.  İşlemin başarılı olduğuna dair bir bildirim alacaksınız.
5.  Google Drive hesabınızda "Web Defterim" adlı klasörü kontrol edin, seçtiğiniz metin ve kaynak URL'sini içeren yeni bir dosya görmelisiniz.