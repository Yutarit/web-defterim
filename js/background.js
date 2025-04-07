// --- Sabitler ---
const HEDEF_KLASOR_ADI = "Web Defterim"; // Kayıtların yapılacağı klasör adı

// --- Chrome API'lerini Promise'e Çevirme Yardımcıları ---
// chrome.identity.getAuthToken için Promise sarmalayıcı
function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// chrome.storage.local.get için Promise sarmalayıcı
function storageLocalGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

// chrome.storage.local.set için Promise sarmalayıcı
function storageLocalSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// --- Sağ Tıklama Menüsü Oluşturma ---
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Web Defterim] Eklenti yüklendi/güncellendi.');
  chrome.contextMenus.create({
    id: "webDefterimKaydet",
    title: `Seçili Metni "${HEDEF_KLASOR_ADI}" Klasörüne Kaydet`, // Başlığı güncelledik
    contexts: ["selection"]
  });
  console.log('[Web Defterim] Sağ tıklama menüsü oluşturuldu.');
});

// --- Sağ Tıklama Menüsü Tıklama Olayı ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => { // async yaptık
  if (info.menuItemId === "webDefterimKaydet") {
    const seciliMetin = info.selectionText;
    const sayfaUrl = tab.url;
    const sayfaBasligi = tab.title;

    console.log("--- Web Defterim'e Kaydedilecek Veri ---");
    console.log("Seçili Metin:", seciliMetin);
    console.log("Sayfa URL'si:", sayfaUrl);
    console.log("Sayfa Başlığı:", sayfaBasligi);
    console.log("---------------------------------------");

    try {
      // Ana kaydetme işlemini başlat
      await anaKaydetmeIslemi(seciliMetin, sayfaUrl, sayfaBasligi);
    } catch (error) {
      console.error("[Web Defterim] Ana kaydetme işleminde hata:", error);
      let hataMesaji = "Bilinmeyen bir hata oluştu.";
      if (error.message && error.message.includes("OAuth")) {
         hataMesaji = "Google hesabınıza erişim izni alınamadı. Lütfen tekrar deneyin veya eklenti izinlerini kontrol edin.";
      } else if (error.message && (error.message.includes("NetworkError") || error.message.includes("Failed to fetch"))) {
         hataMesaji = "Google Drive'a bağlanırken bir sorun oluştu. İnternet bağlantınızı kontrol edin.";
      } else if (error.message) {
         hataMesaji = `Bir hata oluştu: ${error.message}`;
      }
      bildirimGoster("Hata", hataMesaji);
    }
  }
});

// --- Ana Kaydetme İşlemi ---
async function anaKaydetmeIslemi(metin, url, baslik) {
  // 1. Google'dan OAuth 2.0 jetonunu al (Promise kullanarak)
  console.log("[Web Defterim] OAuth jetonu isteniyor...");
  const token = await getAuthToken(true); // interactive: true
  console.log("[Web Defterim] OAuth jetonu alındı.");

  // 2. Hedef klasörün ID'sini al (yoksa oluştur)
  console.log(`[Web Defterim] "${HEDEF_KLASOR_ADI}" klasör ID'si alınıyor...`);
  const klasorId = await getWebDefterimFolderId(token);
  console.log(`[Web Defterim] Klasör ID'si alındı: ${klasorId}`);

  // 3. Google Drive'a dosyayı (belirtilen klasöre) kaydet
  await googleDriveDosyaOlustur(token, metin, url, baslik, klasorId);
}

// --- "Web Defterim" Klasör ID'sini Alma veya Oluşturma Fonksiyonu ---
async function getWebDefterimFolderId(token) {
  try {
    // Önce yerel depolamayı kontrol et
    const data = await storageLocalGet(['webDefterimFolderId']);
    if (data.webDefterimFolderId) {
      console.log("[Web Defterim] Klasör ID'si yerel depolamadan bulundu:", data.webDefterimFolderId);
      // ID'nin hala geçerli olup olmadığını hızlıca kontrol edebiliriz (isteğe bağlı ama iyi pratik)
      // try { await checkFolderExists(token, data.webDefterimFolderId); return data.webDefterimFolderId; } catch { /* ID geçersiz, aşağı devam et */ }
      return data.webDefterimFolderId;
    }
  } catch (error) {
    console.warn("[Web Defterim] Yerel depolamadan klasör ID'si okunurken hata:", error);
  }

  console.log(`[Web Defterim] "${HEDEF_KLASOR_ADI}" klasörü Drive'da aranıyor...`);
  let klasorId = await searchForFolder(token, HEDEF_KLASOR_ADI);

  if (klasorId) {
    console.log(`[Web Defterim] "${HEDEF_KLASOR_ADI}" klasörü bulundu: ${klasorId}`);
  } else {
    console.log(`[Web Defterim] "${HEDEF_KLASOR_ADI}" klasörü bulunamadı, oluşturuluyor...`);
    klasorId = await createFolder(token, HEDEF_KLASOR_ADI);
    console.log(`[Web Defterim] Klasör oluşturuldu: ${klasorId}`);
  }

  // Bulunan veya oluşturulan ID'yi yerel depolamaya kaydet
  try {
    await storageLocalSet({ webDefterimFolderId: klasorId });
    console.log("[Web Defterim] Klasör ID'si yerel depolamaya kaydedildi.");
  } catch (error) {
    console.warn("[Web Defterim] Yerel depolamaya klasör ID'si kaydedilirken hata:", error);
  }

  return klasorId;
}

// --- Drive'da Klasör Arama Fonksiyonu ---
async function searchForFolder(token, folderName) {
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  const encodedQuery = encodeURIComponent(query);
  const apiUrl = `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&fields=files(id)&spaces=drive`;

  try {
    const response = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Klasör arama API Hatası (${response.status}): ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id; // İlk bulunan klasörün ID'sini döndür
    } else {
      return null; // Klasör bulunamadı
    }
  } catch (error) {
     console.error("[Web Defterim] Klasör arama sırasında hata:", error);
     throw error; // Hatanın yukarıya iletilmesi için tekrar fırlat
  }
}

// --- Drive'da Klasör Oluşturma Fonksiyonu ---
async function createFolder(token, folderName) {
  const apiUrl = 'https://www.googleapis.com/drive/v3/files';
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });
    if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(`Klasör oluşturma API Hatası (${response.status}): ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    return data.id; // Yeni oluşturulan klasörün ID'sini döndür
  } catch (error) {
    console.error("[Web Defterim] Klasör oluşturma sırasında hata:", error);
    throw error; // Hatanın yukarıya iletilmesi için tekrar fırlat
  }
}

// --- Google Drive API ile Dosya Oluşturma Fonksiyonu (Güncellendi) ---
async function googleDriveDosyaOlustur(token, metin, url, baslik, klasorId) { // klasorId parametresi eklendi
  // Dosya adı: Sayfa başlığından türet (geçersiz karakterleri temizle), yoksa tarih kullan
  let temizBaslik = baslik ? baslik.replace(/[<>:"\/\\|?*]+/g, '_').substring(0, 100) : ''; // Geçersiz karakterleri _ ile değiştir, kısalt
  const dosyaAdi = temizBaslik ? `${temizBaslik}.txt` : `WebNot_${new Date().toISOString().replace(/[:\-.]/g, '')}.txt`;

  const dosyaIcerigi = `
Başlık: ${baslik || 'Başlık Yok'}
Kaynak URL: ${url}
Tarih: ${new Date().toLocaleString()}

--- Alınan Metin ---
${metin}
`;

  const apiUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  const metadata = {
    name: dosyaAdi,
    mimeType: 'text/plain',
    parents: [klasorId] // <<<--- Klasör ID'sini buraya ekledik!
  };

  let requestBody = `--${boundary}\r\n`;
  requestBody += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
  requestBody += JSON.stringify(metadata) + '\r\n';
  requestBody += `--${boundary}\r\n`;
  requestBody += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n'; // Charset UTF-8 eklemek iyi olabilir
  requestBody += dosyaIcerigi + '\r\n';
  requestBody += `--${boundary}--`;

  try {
    console.log(`[Web Defterim] Google Drive API'ye dosya oluşturma isteği gönderiliyor (Klasör: ${klasorId})...`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `Dosya oluşturma API Hatası (${response.status}): ${response.statusText} - ${JSON.stringify(errorData)}`;
      console.error("[Web Defterim]", errorMessage);
      // Token süresi dolmuş olabilir
      if (response.status === 401) {
        chrome.identity.removeCachedAuthToken({ token: token }, () => {
          console.log("[Web Defterim] Geçersiz token önbellekten silindi.");
        });
         throw new Error("Kimlik doğrulama sorunu (Token süresi dolmuş olabilir). Lütfen tekrar deneyin.");
      } else {
         throw new Error(`Google Drive'a kaydedilemedi. Sunucu hatası: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    console.log("[Web Defterim] Dosya başarıyla oluşturuldu:", data);
    bildirimGoster("Başarılı", `"${metin.substring(0, 30)}..." notu "${HEDEF_KLASOR_ADI}" klasörüne kaydedildi!`);

  } catch (error) {
    console.error("[Web Defterim] Google Drive'a kaydetme sırasında hata:", error);
    throw error; // Hatanın ana fonksiyona iletilmesi için tekrar fırlat
  }
}


// --- Yardımcı Bildirim Fonksiyonu ---
function bildirimGoster(baslik, mesaj) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon48.png', // İkon yolunu kontrol et (js/ içinden ../icons/)
    title: `Web Defterim - ${baslik}`,
    message: mesaj.substring(0, 200) // Mesajları biraz kısaltabiliriz
  });
}