# Web Defterim Uzantısı - Test Kullanıcısı Kurulum ve Kullanım Kılavuzu

Merhaba!

Web Defterim Chrome uzantısını test etmeye yardımcı olduğunuz için çok teşekkürler! Bu kılavuz, uzantıyı tarayıcınıza nasıl yükleyeceğinizi ve kullanmaya başlayacağınızı adım adım anlatacaktır.

**Web Defterim Nedir?**

Bu uzantı, internette gezinirken beğendiğiniz veya saklamak istediğiniz metinleri, resimleri ve bağlantıları, **kendi** Google Drive hesabınızdaki özel bir not defterine (HTML formatında) kolayca kaydetmenizi sağlar. Daha sonra bu defteri istediğiniz zaman açıp notlarınıza bakabilirsiniz.

**Test Süreci Hakkında Önemli Bilgi**

Bu, uzantının henüz yayınlanmamış bir **test sürümüdür**. Amacımız, yayınlamadan önce olası hataları bulmak ve kullanıcı deneyimini iyileştirmektir. Karşılaştığınız sorunlar veya gördüğünüz eksiklikler hakkındaki geri bildirimleriniz bizim için çok değerlidir.

**!! ÇOK ÖNEMLİ: KULLANILACAK GOOGLE HESABI !!**

*   Uzantı şu anda Google'ın sisteminde "Test" modundadır. Bu nedenle, uzantıya Google Drive erişimi için izin verirken, **mutlaka geliştiriciye daha önce bildirdiğiniz ve test kullanıcısı olarak eklenen Google hesabınızı** kullanmanız gerekmektedir.
*   **Farklı bir Google hesabı ile giriş yapmaya çalışırsanız, Google izin vermeyecek ve bir hata ekranı ile karşılaşacaksınız.** Lütfen kurulum ve ilk kullanım sırasında doğru hesabı seçtiğinizden emin olun.

**Gereksinimler**

*   **Google Chrome Tarayıcı:** Uzantıyı kullanabilmek için güncel bir Chrome tarayıcısına ihtiyacınız var.
*   **Google Hesabı:** Yukarıda belirtildiği gibi, **test için onaylanmış** Google hesabınız.

**Kurulum Adımları**

1.  **Uzantı Dosyalarını İndirin ve Hazırlayın:**
    *   Size gönderilen `.zip` uzantılı dosyayı (örneğin `WebDefterim_Test.zip`) bilgisayarınıza indirin.
    *   Bu `.zip` dosyasına sağ tıklayın ve "Tümünü Ayıkla...", "Buraya Çıkart" veya benzeri bir seçenekle **yeni bir klasör içine** çıkartın. (Örneğin, Masaüstünüzde "**WebDefterimTestKlasoru**" adında bir klasör oluşturup dosyaları **bu klasörün içine** çıkartın). Bu klasörün yerini unutmayın, birazdan kullanacağız.

2.  **Chrome Uzantılar Sayfasını Açın:**
    *   Chrome tarayıcınızı açın.
    *   Adres çubuğuna `chrome://extensions/` yazın ve Enter tuşuna basın.

3.  **Geliştirici Modunu Açın:**
    *   Açılan "Uzantılar" sayfasının sağ üst köşesinde bulunan "**Geliştirici modu**" yazısının yanındaki anahtarı **açık** konuma getirin (Anahtar sağa kaymalı ve rengi değişmelidir). *Bu mod, test sürümlerini yükleyebilmemiz için gereklidir.*

4.  **Uzantıyı Yükleyin:**
    *   Geliştirici modu açıkken, sayfanın sol üst tarafında "**Paketlenmemiş öğe yükle**" (Load unpacked) düğmesi görünecektir. Bu düğmeye tıklayın.
    *   Bir klasör seçme penceresi açılacak. Bu pencerede, **1. adımda dosyaları içine çıkarttığınız klasörü** (örneğin, Masaüstünüzdeki "**WebDefterimTestKlasoru**"nü) bulun ve **sadece klasörün kendisini seçin** (içine girmeyin!).
    *   "**Klasör Seç**" (Select Folder) düğmesine tıklayın.

5.  **Kurulum Başarılı:**
    *   Eğer adımları doğru yaptıysanız, "Web Defterim" uzantısı şimdi Uzantılar sayfanızdaki listede bir kart olarak görünmeli ve etkin olmalıdır.

**İlk Kullanım ve Google Hesabı İzni**

1.  Uzantıyı ilk kez kullanmak istediğinizde (örneğin, bir web sayfasında metin seçip sağ tıklayıp "Bu İçeriği... Ekle" dediğinizde), Google sizden izin isteyecektir.
2.  Karşınıza Google'ın standart izin ekranı çıkacak. Bu ekranda, "Web Defterim" uygulamasının Google hesabınıza erişmek istediği belirtilecektir.
3.  **Tekrar Hatırlatma:** Bu ekranda **mutlaka test için onaylanmış Google hesabınızı** seçin.
4.  Uzantının Google Drive dosyalarınıza erişmesine izin vermeniz istenecektir (Uzantı sadece kendi oluşturduğu "Web Defterim" klasörü ve içindeki dosyayla ilgilenir). "**İzin Ver**" (Allow) düğmesine tıklayın.

**Nasıl Kullanılır ve Test Edilir?**

1.  **Kaydetme:**
    *   Farklı web sitelerinde gezinin.
    *   Kaydetmek istediğiniz **metni seçip sağ tıklayın** ve menüden "Bu İçeriği... Ekle" seçeneğini kullanın.
    *   Bir **resmin üzerine sağ tıklayıp** menüden "Bu İçeriği... Ekle" seçeneğini kullanın.
    *   Bir **bağlantının üzerine sağ tıklayıp** menüden "Bu İçeriği... Ekle" seçeneğini kullanın.
    *   Her kaydetme işleminden sonra çıkan bildirimi (başarılı veya hatalı) kontrol edin.
2.  **Görüntüleme:**
    *   Birkaç içerik kaydettikten sonra, herhangi bir web sayfasının boş bir alanına **sağ tıklayın**.
    *   Menüden "**'Web Defterimi Göster**" seçeneğine tıklayın.
    *   Yeni bir sekmede not defterinizin açılması gerekir. Kaydettiğiniz içeriklerin (metin, resim, link) düzgün görünüp görünmediğini kontrol edin.
    *   Defterin genel görünümünü ve okunabilirliğini değerlendirin.

**Geri Bildirim Nasıl Yapılır?**

Test sırasında lütfen aşağıdaki durumlara dikkat edin ve bize bildirin:

*   **Hatalar:** Karşılaştığınız herhangi bir hata mesajı (özellikle bildirimlerde veya konsolda gördüğünüz - konsolu açmak için sayfada F12'ye basabilirsiniz).
*   **Beklenmedik Davranışlar:** Uzantının beklediğiniz gibi çalışmadığı durumlar (örn. yanlış içeriği kaydetmesi, defterin açılmaması vb.).
*   **Kullanım Zorlukları:** Hangi adımların kafa karıştırıcı veya zor olduğunu belirtin.
*   **İyi Çalışanlar:** Beğendiğiniz veya sorunsuz çalışan özellikleri de duymak isteriz!
*   **Öneriler:** Eklenmesini istediğiniz veya mevcut özelliklerin nasıl iyileştirilebileceğine dair fikirleriniz.

Lütfen geri bildirimlerinizi **[Buraya Geri Bildirim Kanalını Yazın - Örn: Şu e-posta adresine gönderin: ..., Google Form linki:, Ortak doküman linki:]** adresine/yöntemiyle iletin.

Mümkünse, hata durumunda hangi web sitesinde olduğunuzu ve ne yapmaya çalıştığınızı belirtmeniz sorunu anlamamıza çok yardımcı olacaktır.

Yardımlarınız ve değerli geri bildirimleriniz için şimdiden çok teşekkürler!