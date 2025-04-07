// --- Sağ Tıklama Menüsü Oluşturma ---
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Web Defterim] Eklenti yüklendi/güncellendi.');
    chrome.contextMenus.create({
      id: "webDefterimKaydet",
      title: "Seçili Metni Web Defterim'e Kaydet",
      contexts: ["selection"]
    });
    console.log('[Web Defterim] Sağ tıklama menüsü oluşturuldu.');
  });
  
  // --- Sağ Tıklama Menüsü Tıklama Olayı ---
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "webDefterimKaydet") {
      const seciliMetin = info.selectionText;
      const sayfaUrl = tab.url;
      const sayfaBasligi = tab.title;
  
      console.log("--- Web Defterim'e Kaydedilecek Veri ---");
      console.log("Seçili Metin:", seciliMetin);
      console.log("Sayfa URL'si:", sayfaUrl);
      console.log("Sayfa Başlığı:", sayfaBasligi);
      console.log("---------------------------------------");
  
      // Google Drive'a kaydetme işlemini başlat
      googleKimlikDogrulaVeKaydet(seciliMetin, sayfaUrl, sayfaBasligi);
    }
  });
  
  // --- Google Kimlik Doğrulama ve Drive'a Kaydetme Fonksiyonu ---
  function googleKimlikDogrulaVeKaydet(metin, url, baslik) {
    // 1. Google'dan OAuth 2.0 jetonunu al
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        console.error("[Web Defterim] Kimlik doğrulama hatası:", chrome.runtime.lastError);
        bildirimGoster("Hata", "Google hesabınıza erişim izni alınamadı. Lütfen tekrar deneyin veya eklenti izinlerini kontrol edin.");
        return;
      }
  
      console.log("[Web Defterim] OAuth jetonu alındı.");
  
      // 2. Jeton alındıysa, Google Drive'a dosyayı kaydet
      googleDriveDosyaOlustur(token, metin, url, baslik);
    });
  }
  
  // --- Google Drive API ile Dosya Oluşturma Fonksiyonu ---
  async function googleDriveDosyaOlustur(token, metin, url, baslik) {
    const dosyaAdi = `WebNot_${new Date().toISOString().replace(/[:\-.]/g, '')}.txt`; // Benzersiz dosya adı (Örn: WebNot_20231027T103000Z.txt)
    const dosyaIcerigi = `
  Başlık: ${baslik}
  Kaynak URL: ${url}
  Tarih: ${new Date().toLocaleString()}
  
  --- Alınan Metin ---
  ${metin}
  `;
  
    // Google Drive API v3 - Dosya Oluşturma Endpoint'i
    const apiUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  
    // Multipart request için sınır (boundary) belirle
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  
    // İstek gövdesini (body) oluştur
    const metadata = {
      name: dosyaAdi,
      mimeType: 'text/plain'
      // TODO: Gelecekte buraya 'parents': ['KLASOR_ID'] eklenerek belirli bir klasöre kaydedilebilir.
    };
  
    let requestBody = `--${boundary}\r\n`;
    requestBody += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
    requestBody += JSON.stringify(metadata) + '\r\n';
    requestBody += `--${boundary}\r\n`;
    requestBody += 'Content-Type: text/plain\r\n\r\n';
    requestBody += dosyaIcerigi + '\r\n';
    requestBody += `--${boundary}--`;
  
    try {
      console.log("[Web Defterim] Google Drive API'ye dosya oluşturma isteği gönderiliyor...");
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: requestBody
      });
  
      if (!response.ok) {
        // API'den hata döndüyse detayları alıp loglayalım
        const errorData = await response.json().catch(() => ({})); // JSON parse hatası olursa boş obje dön
        console.error(`[Web Defterim] Google Drive API Hatası (${response.status}):`, response.statusText, errorData);
        // Token süresi dolmuş olabilir, token'ı geçersiz kılalım ki tekrar alınsın
        if (response.status === 401) {
          chrome.identity.removeCachedAuthToken({ token: token }, () => {
            console.log("[Web Defterim] Geçersiz token önbellekten silindi.");
          });
          bildirimGoster("Hata", "Kimlik doğrulama sorunu (Token süresi dolmuş olabilir). Lütfen tekrar deneyin.");
        } else {
          bildirimGoster("Hata", `Google Drive'a kaydedilemedi. Sunucu hatası: ${response.status} ${response.statusText}`);
        }
        return; // Hata durumunda fonksiyondan çık
      }
  
      // Başarılı ise
      const data = await response.json();
      console.log("[Web Defterim] Dosya başarıyla oluşturuldu:", data);
      bildirimGoster("Başarılı", `"${metin.substring(0, 30)}..." notu Google Drive'a kaydedildi!`);
  
    } catch (error) {
      // Ağ hatası veya başka bir fetch hatası
      console.error("[Web Defterim] Google Drive'a kaydetme sırasında ağ hatası veya başka bir sorun:", error);
      bildirimGoster("Hata", "Google Drive'a bağlanırken bir sorun oluştu. İnternet bağlantınızı kontrol edin.");
    }
  }
  
  
  // --- Yardımcı Bildirim Fonksiyonu ---
  function bildirimGoster(baslik, mesaj) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png', // İkon yolunu kontrol et
      title: `Web Defterim - ${baslik}`,
      message: mesaj
    });
  }