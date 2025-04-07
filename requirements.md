# Proje Gereksinimleri - Web Defterim Chrome Eklentisi

Bu belge, Web Defterim Chrome eklentisinin fonksiyonel ve teknik gereksinimlerini detaylandırmaktadır.

## 1. Fonksiyonel Gereksinimler (FR)

### 1.1. İçerik Yakalama (MVP)
*   **FR1.1.1:** Kullanıcı, herhangi bir web sayfasında fare ile metin seçebilmelidir.
*   **FR1.1.2:** Kullanıcı metin seçtiğinde, sağ tıklama menüsünde eklentiye ait bir "Kaydet" seçeneği görünmelidir.
*   **FR1.1.3:** "Kaydet" seçeneğine tıklandığında, seçili metin yakalanmalıdır.
*   **FR1.1.4:** Metinle birlikte, metnin alındığı web sayfasının tam URL'si de otomatik olarak yakalanmalıdır.
*   **FR1.1.5 (Gelecek):** Kullanıcı, web sayfasındaki görselleri sağ tıklama menüsü veya eklenti arayüzü ile yakalayabilmelidir.
*   **FR1.1.6 (Gelecek):** Kullanıcı, ekran görüntüsü (seçili alan, görünen alan, tam sayfa) alabilmelidir.

### 1.2. Google Drive Entegrasyonu (MVP)
*   **FR1.2.1:** Eklenti, kullanıcıyı Google hesabı ile güvenli bir şekilde (OAuth 2.0) doğrulamalıdır.
*   **FR1.2.2:** Eklenti, Google Drive'a dosya yazmak için gerekli izinleri kullanıcıdan istemelidir.
*   **FR1.2.3:** Yakalanan içerik (metin ve URL), kullanıcının Google Drive'ına kaydedilmelidir.
*   **FR1.2.4:** Kaydedilen içerikler, kullanıcının Drive'ında "Web Defterim" (veya yapılandırılabilir başka bir isim) adlı özel bir klasörde saklanmalıdır.
*   **FR1.2.5:** Eğer belirtilen klasör kullanıcının Drive'ında mevcut değilse, eklenti bu klasörü otomatik olarak oluşturmalıdır.
*   **FR1.2.6:** Her yakalama işlemi, Drive'da ayrı bir dosya olarak saklanmalıdır (MVP için `.txt` veya `.md` formatında). Dosya içeriği en azından yakalanan metni ve kaynak URL'sini içermelidir. Dosya adı, yakalama zamanı veya sayfa başlığı gibi bilgilerden türetilebilir.

### 1.3. Not Yönetimi (Gelecek)
*   **FR1.3.1 (Gelecek):** Kullanıcı, kaydedilmiş notlara özel başlıklar ekleyebilmeli/düzenleyebilmelidir.
*   **FR1.3.2 (Gelecek):** Kullanıcı, kaydedilmiş notlara kişisel açıklamalar veya yorumlar ekleyebilmelidir.
*   **FR1.3.3 (Gelecek):** Kullanıcı, notları organize etmek için etiketler (tags) ekleyebilmeli/kaldırabilmelidir.
*   **FR1.3.4 (Gelecek):** Kullanıcı, notları içeriğe, başlığa veya etikete göre arayabilmelidir (Bu özellik muhtemelen Workspace eklentisi tarafında daha anlamlı olacaktır).

### 1.4. Kullanıcı Arayüzü ve Geri Bildirim (MVP)
*   **FR1.4.1:** Sağ tıklama menüsü seçeneği açık ve anlaşılır olmalıdır.
*   **FR1.4.2:** Kaydetme işlemi tamamlandığında (başarılı veya başarısız), kullanıcıya kısa süreli bir bildirim (notification) gösterilmelidir.
*   **FR1.4.3 (Gelecek):** Tarayıcı araç çubuğunda eklenti ikonu bulunmalı ve tıklandığında temel eylemleri (örn: ekran görüntüsü al) veya ayarları içeren bir popup açılmalıdır.

## 2. Teknik Gereksinimler (TR)

*   **TR1.1:** Eklenti, Chrome Manifest V3 spesifikasyonlarına uygun olarak geliştirilmelidir.
*   **TR1.2:** Google API'leri ile etkileşim için Google API JavaScript İstemci Kütüphanesi veya `fetch` API kullanılmalıdır.
*   **TR1.3:** Google Drive API v3 kullanılmalıdır.
*   **TR1.4:** Kimlik doğrulama için Chrome Identity API (`chrome.identity`) kullanılmalıdır.
*   **TR1.5:** Sağ tıklama menüsü için Context Menus API (`chrome.contextMenus`) kullanılmalıdır.
*   **TR1.6:** İçerik yakalama (Content Script) ve arka plan işlemleri (Background Service Worker) arasında iletişim için Mesajlaşma API'ları (`chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`) kullanılmalıdır.
*   **TR1.7:** Kullanıcı ayarları veya geçici veriler için Storage API (`chrome.storage`) kullanılabilir.
*   **TR1.8:** Kod, modüler (farklı işlevler için ayrı JavaScript dosyaları) ve okunabilir (yorum satırları, anlamlı değişken adları) olmalıdır.
*   **TR1.9:** Hata yönetimi (API hataları, ağ sorunları, izin reddi vb.) uygun şekilde ele alınmalıdır.

## 3. Non-Fonksiyonel Gereksinimler (NFR)

*   **NFR1.1 (Performans):** Eklenti, tarayıcının genel performansını gözle görülür şekilde yavaşlatmamalıdır. İçerik betiklerinin (content scripts) çalışması optimize edilmelidir.
*   **NFR1.2 (Güvenlik):** Kullanıcı kimlik bilgileri ve verileri güvenli bir şekilde işlenmelidir. İstenen izinler minimumda tutulmalıdır (Principle of Least Privilege). OAuth token'ları güvenli bir şekilde yönetilmelidir.
*   **NFR1.3 (Kullanılabilirlik):** Eklentinin kullanımı sezgisel ve kolay olmalıdır.
*   **NFR1.4 (Güvenilirlik):** Eklenti, farklı web sitelerinde ve senaryolarda tutarlı bir şekilde çalışmalıdır. API hatalarına karşı dayanıklı olmalıdır.
*   **NFR1.5 (Bakım):** Kodun bakımı ve gelecekteki geliştirmeler için kolayca anlaşılabilir ve genişletilebilir olması hedeflenmelidir.

## 4. Bağımlılıklar ve Ön Koşullar

*   **DK1:** Geliştirme ve kullanım için Google Chrome tarayıcı.
*   **DK2:** Bir Google Hesabı.
*   **DK3:** Google Cloud Platform üzerinde proje oluşturma ve API'leri etkinleştirme yetkisi.
*   **DK4:** Temel JavaScript, HTML, CSS bilgisi.
*   **DK5:** Chrome Extension API'ları ve Google Drive API hakkında temel anlayış.
*   **DK6:** Kod editörü (VS Code, Cursor vb.) ve Git versiyon kontrol sistemi.