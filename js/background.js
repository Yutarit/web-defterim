// background.js (Sürüm 1.2 - Tek Dosyaya Ekleme ve İndirme - Detaylı Loglama ile)

// --- Sabitler ---
const HEDEF_KLASOR_ADI = "Web Defterim";
const ANA_HTML_DOSYA_ADI = "Web Defterim Notları.html"; // Ana dosyanın adı
const TARGET_FILE_ID_KEY = 'webDefterimMainFileId'; // Depolama anahtarı

// --- Chrome API Promise Sarmalayıcıları ---
function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        console.error("getAuthToken Hatası:", chrome.runtime.lastError);
        reject(new Error(`OAuth jetonu alınamadı: ${chrome.runtime.lastError.message}`));
      } else if (!token) {
        console.error("getAuthToken Hatası: Boş token döndü.");
        reject(new Error("OAuth jetonu alınamadı. İzin verilmemiş olabilir."));
      }
      else {
        resolve(token);
      }
    });
  });
}

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

// --- Sağ Tıklama Menüsü ---
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Web Defterim] Eklenti yüklendi/güncellendi (v1.2 Log).');
    // Önceki menüyü kaldırıp yeniden oluşturmak (hata mesajını yoksay)
    chrome.contextMenus.remove("webDefterimKaydet", () => {
        if (chrome.runtime.lastError) { /* console.log("Kaldırma hatası (önemsiz):", chrome.runtime.lastError.message); */ }
        chrome.contextMenus.create({
            id: "webDefterimKaydet",
            title: `Seçili İçeriği "${ANA_HTML_DOSYA_ADI}" Dosyasına Ekle`, // Başlık güncellendi
            contexts: ["selection"]
        });
        console.log('[Web Defterim] Sağ tıklama menüsü oluşturuldu/güncellendi.');
    });
});


// --- Sağ Tıklama Olayı ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "webDefterimKaydet") {
        const sayfaUrl = tab.url;
        const sayfaBasligi = tab.title;

        console.log("--- Web Defterim'e Ekleme İsteği ---");
        console.log("Sayfa URL'si:", sayfaUrl);
        console.log("Sayfa Başlığı:", sayfaBasligi);
        console.log("Sekme ID:", tab.id);
        console.log("------------------------------------");

        if (!tab || !tab.id) {
            bildirimGoster("Hata", "Aktif sekme bilgisi alınamadı.");
            return;
        }

        try {
            console.log("[Web Defterim] Seçili HTML alınıyor...");
            const seciliHTML = await getSelectedHtml(tab.id); // DETAYLI LOGLAMA OLAN FONKSİYON ÇAĞRILIYOR

            // seciliHTML'in hem null hem de undefined olup olmadığını kontrol et, sonra trim'i dene
            if (seciliHTML == null || seciliHTML.trim() === "") { // DÜZELTİLMİŞ KONTROL
                console.warn("[Web Defterim] Seçili içerik null, undefined veya boş."); // Bu mesajı gördüyseniz, getSelectedHtml null/undefined/"" döndürmüştür
                bildirimGoster("Uyarı", "Kaydedilecek seçili bir içerik bulunamadı veya içerik boş.");
                return; // Fonksiyon burada durur
            }
            // Eğer buraya gelindiyse, seciliHTML geçerli bir string içeriyor demektir.
            console.log("[Web Defterim] Geçerli seçili HTML alındı. Kaydetme işlemine devam ediliyor.");

            await anaKaydetmeIslemi(seciliHTML, sayfaUrl, sayfaBasligi);

        } catch (error) {
            console.error("[Web Defterim] Ana işlem sırasında hata:", error);
            let hataMesaji = `Bir hata oluştu: ${error.message || 'Bilinmeyen Hata'}`;
             if (error.message && error.message.includes("Dosya bulunamadı (404)")) {
                 hataMesaji = `Ana "${ANA_HTML_DOSYA_ADI}" dosyası Drive'da bulunamadı. Yerel depolama temizleniyor, tekrar deneyin.`;
                 await storageLocalSet({ [TARGET_FILE_ID_KEY]: null }).catch(e => console.error("Dosya ID temizlenirken hata:", e));
             } else if (error.message && error.message.includes("OAuth jetonu alınamadı")) {
                hataMesaji = "Google hesabınıza erişim izni alınamadı/yenilenemedi. Tekrar deneyin.";
             } else if (error.message && error.message.includes("Failed to fetch")) {
                hataMesaji = "Ağ hatası. İnternet bağlantınızı veya Google Drive durumunu kontrol edin.";
             } else if (error.message && error.message.includes("Sayfa içeriğine erişirken hata")) {
                hataMesaji = "Sayfadan içerik alınamadı. Bu sayfa korumalı veya özel olabilir.";
             }
            bildirimGoster("Hata", hataMesaji);
        }
    }
});

// --- Seçili Alanın HTML'ini Alma Fonksiyonu (Detaylı Loglama ile) ---
async function getSelectedHtml(tabId) {
  console.log(`[getSelectedHtml] Tab ID ${tabId} için çalıştırılıyor.`);
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      // world: 'MAIN', // Bazen MAIN world'de çalışmak gerekebilir, ama genellikle ISOLATED yeterlidir.
      func: () => {
        // --- Bu kısım sayfa içinde çalışır (Content Script gibi) ---
        console.log('[Injected Script] Çalışıyor...');
        const selection = window.getSelection();
        // Seçim nesnesini ve içeriğini logla (içerik çok uzun olabilir dikkat)
        console.log('[Injected Script] Selection nesnesi:', selection);
        console.log('[Injected Script] Selection toString():', selection ? selection.toString().substring(0, 200) : 'N/A');

        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) { // isCollapsed ekledik (nokta seçimi kontrolü)
          console.log('[Injected Script] Seçim yok, rangeCount 0 veya isCollapsed true.');
          return null; // Seçim yoksa null dön
        }
        console.log(`[Injected Script] rangeCount: ${selection.rangeCount}, isCollapsed: ${selection.isCollapsed}`);

        try { // İçerideki işlemleri de try-catch'e alalım
            const range = selection.getRangeAt(0);
            console.log('[Injected Script] Range alındı:', range);
            const clonedSelection = range.cloneContents(); // DocumentFragment döndürür
            console.log('[Injected Script] İçerik klonlandı (DocumentFragment):', clonedSelection);
            const container = document.createElement('div');
            container.appendChild(clonedSelection); // Fragment'ı div'e ekle

            // URL düzeltme işlemleri...
            container.querySelectorAll('img').forEach(img => {
                 if (img.src && !img.src.startsWith('http') && !img.src.startsWith('data:')) {
                     try { img.src = new URL(img.getAttribute('src'), window.location.href).href; } catch (e) { console.warn("Geçersiz resim URL'si:", img.getAttribute('src'), e); }
                 }
             });
            container.querySelectorAll('a').forEach(a => {
                  if (a.href && !a.href.startsWith('http') && !a.href.startsWith('data:') && !a.href.startsWith('mailto:') && !a.href.startsWith('#')) {
                      try { a.href = new URL(a.getAttribute('href'), window.location.href).href; } catch (e) { console.warn("Geçersiz bağlantı URL'si:", a.getAttribute('href'), e); }
                  }
                  a.target = '_blank';
             });

            const finalHTML = container.innerHTML; // Div'in iç HTML'ini al
            console.log('[Injected Script] Dönen HTML (ilk 200 char):', finalHTML ? finalHTML.substring(0, 200) : 'BOŞ');
            // Dönen HTML boş olabilir mi? Evet, seçilen bazı özel öğelerde (örn: sadece <br>) olabilir.
            if (finalHTML === undefined || finalHTML === null) {
                console.warn('[Injected Script] container.innerHTML null veya undefined döndü.');
                return null;
            }
            return finalHTML;
        } catch (innerError) {
             console.error('[Injected Script] İçerik işlenirken HATA:', innerError);
             return null; // Hata durumunda null dön
        }
        // --- Sayfa içi script sonu ---
      },
    });

    // --- executeScript sonrası background script'e dönüldü ---
    // Dönen sonucu daha dikkatli inceleyelim
    console.log("[getSelectedHtml] executeScript ham sonuçları:", results); // Ham sonucu logla

    // results bir dizi olmalı.
    if (!Array.isArray(results) || results.length === 0) {
        console.warn("[getSelectedHtml] executeScript beklenen dizi sonucunu döndürmedi:", results);
        return null;
    }

    // İlk sonucun (frame 0) result özelliğini alalım
    const firstResult = results[0];
    if (!firstResult || firstResult.result === undefined) {
         // Hata durumu veya inject edilen script'in undefined döndüğü durum
         console.warn("[getSelectedHtml] executeScript ilk sonucu veya result özelliği tanımsız:", firstResult);
         return null;
    }

    // Sonuç null olabilir (inject edilen script null döndürdüyse)
    if (firstResult.result === null) {
        console.log("[getSelectedHtml] executeScript sonucu explicit olarak null.");
        return null;
    }

    // Sonuç bir string olmalı
    if (typeof firstResult.result !== 'string') {
         console.warn("[getSelectedHtml] executeScript sonucu beklenen string türünde değil:", typeof firstResult.result, firstResult.result);
         return null; // Beklenmedik tür, null dönelim
    }

    // Buraya geldiyse, geçerli bir string sonuç var demektir
    console.log("[getSelectedHtml] Geçerli string sonuç bulundu, döndürülüyor.");
    return firstResult.result; // String HTML'i döndür

  } catch (error) {
    // executeScript çağrısında bir hata oluştu (izinler, geçersiz tabId vb.)
    console.error("[getSelectedHtml] executeScript çağrılırken HATA:", error);
    // Hatanın yukarıya iletilmesi önemli
    throw new Error(`Sayfa içeriğine erişirken hata: ${error.message}`);
  }
}


// --- Ana Kaydetme İşlemi (Güncellendi) ---
async function anaKaydetmeIslemi(htmlIcerik, url, baslik) {
    console.log("[Web Defterim] OAuth jetonu isteniyor...");
    const token = await getAuthToken(true);
    console.log("[Web Defterim] OAuth jetonu alındı.");

    console.log(`[Web Defterim] "${HEDEF_KLASOR_ADI}" klasör ID'si alınıyor...`);
    const klasorId = await getWebDefterimFolderId(token); // Klasör hala lazım
    console.log(`[Web Defterim] Klasör ID'si alındı: ${klasorId}`);

    console.log(`[Web Defterim] Ana HTML dosyası (${ANA_HTML_DOSYA_ADI}) ID'si alınıyor/kontrol ediliyor...`);
    let targetFileId = await getMainHtmlFileId(token); // Dosya ID'sini al/kontrol et

    let updatedHtmlContent; // Güncellenmiş içeriği tutacak değişken

    if (targetFileId) {
        console.log(`[Web Defterim] Mevcut dosya ID'si (${targetFileId}) bulundu. İçerik eklenecek.`);
        try {
            updatedHtmlContent = await appendContentToDriveFile(token, targetFileId, htmlIcerik, url, baslik);
            bildirimGoster("Başarılı", `Not "${ANA_HTML_DOSYA_ADI}" dosyasına eklendi.`);
        } catch (appendError) {
             console.error("[Web Defterim] Dosyaya ekleme sırasında hata:", appendError);
             if (appendError.message && appendError.message.includes("404")) {
                  console.warn("[Web Defterim] Eklenmeye çalışılan dosya bulunamadı. ID temizleniyor.");
                  await storageLocalSet({ [TARGET_FILE_ID_KEY]: null }).catch(e => console.error("Dosya ID temizlenirken hata:", e));;
                  throw new Error(`Ana dosya (${targetFileId}) Drive'da bulunamadı (404). Lütfen tekrar deneyin, dosya yeniden oluşturulacak.`);
             }
             throw appendError;
        }

    } else {
        console.log(`[Web Defterim] Ana dosya ID'si bulunamadı veya geçersiz. Yeni dosya oluşturulacak: ${ANA_HTML_DOSYA_ADI}`);
        targetFileId = await createMainHtmlFile(token, klasorId, htmlIcerik, url, baslik);
        updatedHtmlContent = await getDriveFileContent(token, targetFileId); // Oluşturulan içeriği al
        console.log(`[Web Defterim] Ana dosya oluşturuldu: ${targetFileId}`);
        await storageLocalSet({ [TARGET_FILE_ID_KEY]: targetFileId });
        console.log("[Web Defterim] Yeni dosya ID'si yerel depolamaya kaydedildi.");
        bildirimGoster("Başarılı", `"${ANA_HTML_DOSYA_ADI}" dosyası oluşturuldu ve ilk not eklendi.`);
    }

    if (updatedHtmlContent) {
        console.log("[Web Defterim] Yerel indirme tetikleniyor...");
        triggerLocalDownload(updatedHtmlContent, ANA_HTML_DOSYA_ADI);
    }
}

// --- Ana HTML Dosya ID'sini Alma/Kontrol Etme ---
async function getMainHtmlFileId(token) {
    try {
        const data = await storageLocalGet([TARGET_FILE_ID_KEY]);
        const fileId = data[TARGET_FILE_ID_KEY];
        if (fileId) {
            console.log(`[getMainHtmlFileId] Yerel depodan dosya ID'si bulundu: ${fileId}. Geçerlilik kontrol ediliyor...`);
            const isValid = await checkFileExists(token, fileId);
            if (isValid) {
                console.log("[getMainHtmlFileId] Dosya ID'si geçerli.");
                return fileId;
            } else {
                console.warn("[getMainHtmlFileId] Yerel depodaki dosya ID'si artık geçerli değil. ID temizleniyor.");
                await storageLocalSet({ [TARGET_FILE_ID_KEY]: null }).catch(e => console.error("Dosya ID temizlenirken hata:", e));;
                return null;
            }
        }
        console.log("[getMainHtmlFileId] Yerel depoda kayıtlı dosya ID'si yok.");
        return null;
    } catch (error) {
        console.warn("[getMainHtmlFileId] Yerel depodan dosya ID'si okunurken hata:", error);
        return null;
    }
}

// --- Drive Dosyasının/Klasörünün Varolup Olmadığını Kontrol Etme ---
async function checkFileExists(token, fileOrFolderId) {
    if (!fileOrFolderId) return false;
    const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileOrFolderId}?fields=id,trashed`;
    console.log(`[checkFileExists] ID ${fileOrFolderId} kontrol ediliyor...`);
    try {
        const response = await fetch(apiUrl, {
            method: 'GET', // GET açıkça belirtmek iyi olabilir
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`[checkFileExists] ID ${fileOrFolderId} için yanıt durumu: ${response.status}`);
        if (response.status === 404) {
            return false;
        }
        if (!response.ok) {
             console.warn(`[checkFileExists] ID (${fileOrFolderId}) kontrolü sırasında API hatası (${response.status}): ${response.statusText}. Geçerli varsayılıyor.`);
             return true;
        }
        const data = await response.json();
        if (data.trashed) {
             console.log(`[checkFileExists] ID (${fileOrFolderId}) çöp kutusunda.`);
             return false;
        }
        console.log(`[checkFileExists] ID (${fileOrFolderId}) geçerli.`);
        return true;
    } catch (error) {
        console.error(`[checkFileExists] ID (${fileOrFolderId}) varlığı kontrol edilirken ağ hatası:`, error);
        return true; // Ağ hatasında var kabul et
    }
}

// --- Klasör ID Alma/Oluşturma ---
async function getWebDefterimFolderId(token) {
  let folderId = null;
  // 1. Yerel depolamayı kontrol et
  try {
    const data = await storageLocalGet(['webDefterimFolderId']);
    if (data.webDefterimFolderId) {
      console.log("[getWebDefterimFolderId] Yerel depodan klasör ID'si deneniyor:", data.webDefterimFolderId);
      const isValid = await checkFileExists(token, data.webDefterimFolderId);
      if (isValid) {
           console.log("[getWebDefterimFolderId] Yerel depolamadaki Klasör ID geçerli.");
           return data.webDefterimFolderId;
      } else {
          console.warn("[getWebDefterimFolderId] Yerel depolamadaki Klasör ID artık geçerli değil. Tekrar aranacak.");
          await storageLocalSet({ webDefterimFolderId: null }).catch(e => console.error("Klasör ID temizlenirken hata:", e));;
      }
    }
  } catch (error) {
    console.warn("[getWebDefterimFolderId] Yerel depolamadan klasör ID'si okunurken hata:", error);
  }

  // 2. Drive'da ara
  console.log(`[getWebDefterimFolderId] "${HEDEF_KLASOR_ADI}" klasörü Drive'da aranıyor...`);
  folderId = await searchForFolder(token, HEDEF_KLASOR_ADI);

  // 3. Bulunamadıysa oluştur
  if (folderId) {
    console.log(`[getWebDefterimFolderId] "${HEDEF_KLASOR_ADI}" klasörü bulundu: ${folderId}`);
  } else {
    console.log(`[getWebDefterimFolderId] "${HEDEF_KLASOR_ADI}" klasörü bulunamadı, oluşturuluyor...`);
    try {
        folderId = await createFolder(token, HEDEF_KLASOR_ADI);
        console.log(`[getWebDefterimFolderId] Klasör oluşturuldu: ${folderId}`);
    } catch (createError) {
        console.error("[getWebDefterimFolderId] Klasör oluşturma başarısız:", createError);
        throw new Error(`Hedef klasör oluşturulamadı: ${createError.message}`);
    }
  }

  // 4. Bulunan veya oluşturulan ID'yi yerel depolamaya kaydet
  if (folderId) {
      try {
        await storageLocalSet({ webDefterimFolderId: folderId });
        console.log("[getWebDefterimFolderId] Klasör ID'si yerel depolamaya kaydedildi.");
      } catch (error) {
        console.warn("[getWebDefterimFolderId] Yerel depolamaya klasör ID'si kaydedilirken hata:", error);
      }
  }

  if (!folderId) {
      throw new Error("Klasör ID'si alınamadı veya oluşturulamadı.");
  }

  return folderId;
 }

// --- Drive'da Klasör Arama ---
async function searchForFolder(token, folderName) {
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
  const encodedQuery = encodeURIComponent(query);
  const apiUrl = `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&fields=files(id,name)&spaces=drive&orderBy=createdTime`;
  console.log(`[searchForFolder] "${folderName}" aranıyor... URL: ${apiUrl}`);
  try {
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[searchForFolder] Yanıt durumu: ${response.status}`);
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[searchForFolder] API yanıtı (${response.status}): ${errorText}`);
        throw new Error(`Klasör arama API Hatası (${response.status}): ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`[searchForFolder] Bulunan dosyalar:`, data.files);
    if (data.files && data.files.length > 0) {
      const exactMatch = data.files.find(f => f.name === folderName);
      if (exactMatch) {
           console.log(`[searchForFolder] Tam eşleşme bulundu: ${exactMatch.id}`);
           return exactMatch.id;
      }
      console.warn(`[searchForFolder] Tam isim eşleşmesi bulunamadı ('${folderName}'). İlk bulunan kullanılıyor: ID ${data.files[0].id}, İsim '${data.files[0].name}'`);
      return data.files[0].id;
    } else {
      console.log(`[searchForFolder] Klasör bulunamadı.`);
      return null;
    }
  } catch (error) {
     console.error("[searchForFolder] Klasör arama sırasında hata:", error);
     if (error.message && (error.message.includes("401") || error.message.includes("OAuth"))) {
        chrome.identity.removeCachedAuthToken({ token: token }, () => {});
        throw new Error("Kimlik doğrulama sorunu (Klasör aranırken). Token geçersiz olabilir.");
     }
     throw error;
  }
}

// --- Drive'da Klasör Oluşturma ---
async function createFolder(token, folderName) {
  const apiUrl = 'https://www.googleapis.com/drive/v3/files';
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  console.log(`[createFolder] "${folderName}" oluşturuluyor...`);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });
    console.log(`[createFolder] Yanıt durumu: ${response.status}`);
    if (!response.ok) {
       const errorText = await response.text();
       console.error(`[createFolder] API yanıtı (${response.status}): ${errorText}`);
       throw new Error(`Klasör oluşturma API Hatası (${response.status}): ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`[createFolder] Klasör oluşturuldu: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error("[createFolder] Klasör oluşturma sırasında hata:", error);
    if (error.message && (error.message.includes("401") || error.message.includes("OAuth"))) {
        chrome.identity.removeCachedAuthToken({ token: token }, () => {});
        throw new Error("Kimlik doğrulama sorunu (Klasör oluşturulurken). Token geçersiz olabilir.");
     }
    throw error;
  }
}


// --- Ana HTML Dosyasını Oluşturma ---
async function createMainHtmlFile(token, parentFolderId, firstHtmlContent, url, baslik) {
    console.log(`[createMainHtmlFile] Ana dosya "${ANA_HTML_DOSYA_ADI}" oluşturuluyor, parent: ${parentFolderId}`);
    const now = new Date();
    const initialEntryHtml = formatHtmlEntry(firstHtmlContent, url, baslik, now);

    const fileContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ANA_HTML_DOSYA_ADI}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; line-height: 1.6; margin: 20px; background-color: #f8f9fa; color: #212529; }
    .container { max-width: 900px; margin: 10px auto; }
    h1 { border-bottom: 2px solid #dee2e6; padding-bottom: 0.5em; margin-bottom: 1em; }
    .entry { background-color: #fff; border: 1px solid #dee2e6; border-radius: .25rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 .125rem .25rem rgba(0,0,0,.075); }
    .entry-meta { font-size: 0.875em; color: #6c757d; border-bottom: 1px solid #eee; padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
    .entry-meta p { margin: 0.25rem 0; }
    .entry-meta strong { color: #495057; }
    .entry-meta a { color: #007bff; text-decoration: none; }
    .entry-meta a:hover { text-decoration: underline; }
    .entry-content { margin-top: 1rem; word-wrap: break-word; }
    .entry-content img, .entry-content video, .entry-content iframe { max-width: 100%; height: auto; border-radius: .25rem; margin-bottom: .5rem; background-color: #eee; }
    .entry-content table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; border: 1px solid #ccc; }
    .entry-content th, .entry-content td { border: 1px solid #ccc; padding: .5rem .75rem; text-align: left; }
    .entry-content th { background-color: #e9ecef; font-weight: 600; }
    .entry-content pre { background-color: #f1f1f1; padding: 1em; border-radius: .25rem; overflow-x: auto; font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.9em;}
    .entry-content blockquote { border-left: .25em solid #eee; padding-left: 1em; margin-left: 0; font-style: italic; color: #555;}
    hr.entry-separator { border: 0; height: 1px; background-color: #ced4da; margin: 2rem 0; }
    .footer-note { text-align: center; font-size: 0.8em; color: #aaa; margin-top: 2rem; }
  </style>
</head>
<body>
<div class="container">
  <h1>${ANA_HTML_DOSYA_ADI}</h1>
  <p>Bu dosya, Web Defterim Chrome uzantısı ile kaydedilen notları içerir.</p>
  <hr class="entry-separator">

  ${initialEntryHtml}

  <!-- NOT_EKLEME_NOKTASI -->
</div>
<p class="footer-note">Son güncelleme: ${new Date().toISOString()}</p>
</body>
</html>`;

    const apiUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const metadata = {
        name: ANA_HTML_DOSYA_ADI,
        mimeType: 'text/html',
        parents: [parentFolderId],
        description: `Web Defterim uzantısı tarafından oluşturulan notlar. Son not eklenme: ${now.toISOString()}`
    };

    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' });
    const contentBlob = new Blob([fileContent], { type: 'text/html; charset=UTF-8' });

    const requestBody = new FormData();
    requestBody.append('metadata', metadataBlob);
    requestBody.append('file', contentBlob, ANA_HTML_DOSYA_ADI); // Dosya adını FormData'ya eklemek bazen işe yarar

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: requestBody
        });
        console.log(`[createMainHtmlFile] Yanıt durumu: ${response.status}`);
        if (!response.ok) {
            let errorData = {}; try { errorData = await response.json(); } catch(e) { errorData.message = await response.text(); }
            const errorMessage = `Ana dosya oluşturma API Hatası (${response.status}): ${response.statusText} - ${JSON.stringify(errorData)}`;
            console.error("[createMainHtmlFile]", errorMessage);
            if (response.status === 401) { chrome.identity.removeCachedAuthToken({ token: token }, () => {}); throw new Error("Kimlik doğrulama sorunu (Dosya Oluşturma)."); }
            throw new Error(`Google Drive API hatası (${response.status}): ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log("[createMainHtmlFile] Ana HTML dosyası başarıyla oluşturuldu:", data);
        return data.id;

    } catch (error) {
        console.error("[createMainHtmlFile] Ana HTML dosyası oluşturma sırasında kritik hata:", error);
        throw error;
    }
}

// --- Mevcut Drive Dosyasına İçerik Ekleme ---
async function appendContentToDriveFile(token, fileId, newHtmlContent, url, baslik) {
    console.log(`[appendContentToDriveFile] Dosya (${fileId}) içeriği alınıyor...`);
    const currentContent = await getDriveFileContent(token, fileId);

    console.log("[appendContentToDriveFile] Yeni not formatlanıyor...");
    const now = new Date();
    const newEntryHtml = formatHtmlEntry(newHtmlContent, url, baslik, now);

    // Yeni içeriği ekle (<!-- NOT_EKLEME_NOKTASI --> yorumundan önce)
    // Bu, </body>'den daha güvenilir olabilir.
    const insertionMarker = '<!-- NOT_EKLEME_NOKTASI -->';
    const insertionPoint = currentContent.indexOf(insertionMarker);
    let updatedContent;

    if (insertionPoint !== -1) {
        updatedContent = currentContent.slice(0, insertionPoint)
                       + newEntryHtml + '\n'
                       + '<hr class="entry-separator">\n' // Yeni nottan SONRA ayraç
                       + currentContent.slice(insertionPoint);
        console.log(`[appendContentToDriveFile] İçerik "${insertionMarker}" öncesine eklendi.`);
    } else {
        // Eğer marker bulunamazsa (eski dosya formatı?), </body>'den önce eklemeyi dene
        const fallbackMarker = '</body>';
        const fallbackPoint = currentContent.lastIndexOf(fallbackMarker);
        if (fallbackPoint !== -1) {
            console.warn(`[appendContentToDriveFile] "${insertionMarker}" bulunamadı! </body> öncesine ekleniyor.`);
            updatedContent = currentContent.slice(0, fallbackPoint)
                           + '<hr class="entry-separator">\n'
                           + newEntryHtml + '\n'
                           + currentContent.slice(fallbackPoint);
        } else {
            // body de bulunamazsa, sona ekle
             console.error(`[appendContentToDriveFile] Ne "${insertionMarker}" ne de "${fallbackMarker}" bulunamadı! İçerik sona ekleniyor.`);
             updatedContent = currentContent + '\n<hr class="entry-separator">\n' + newEntryHtml;
        }
    }

    // Footer'daki tarihi güncelle (varsa)
    const footerMarker = '<p class="footer-note">Son güncelleme: ';
    const footerStart = updatedContent.lastIndexOf(footerMarker);
    if (footerStart !== -1) {
        const footerEnd = updatedContent.indexOf('</p>', footerStart);
        if (footerEnd !== -1) {
             updatedContent = updatedContent.slice(0, footerStart + footerMarker.length) +
                              now.toISOString() +
                              updatedContent.slice(footerEnd);
             console.log("[appendContentToDriveFile] Footer tarihi güncellendi.");
        }
    }


    console.log(`[appendContentToDriveFile] Dosya (${fileId}) içeriği güncelleniyor...`);
    // Güncelleme için v3 update metadata + media aynı anda desteklemiyor gibi.
    // Önce metadata (description) güncelle, sonra media yükle. VEYA sadece media yükle.
    // Sadece media yüklemek daha basit ve genellikle yeterli.
    const updateMediaUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const contentBlob = new Blob([updatedContent], { type: 'text/html; charset=UTF-8' });

    try {
        const response = await fetch(updateMediaUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/html; charset=UTF-8'
            },
            body: contentBlob
        });
        console.log(`[appendContentToDriveFile] Yanıt durumu: ${response.status}`);
         if (!response.ok) {
             let errorData = {}; try { errorData = await response.json(); } catch(e) { errorData.message = await response.text(); }
             const errorMessage = `Dosya güncelleme API Hatası (${response.status}): ${response.statusText} - ${JSON.stringify(errorData)}`;
             console.error("[appendContentToDriveFile]", errorMessage);
             if (response.status === 401) { chrome.identity.removeCachedAuthToken({ token: token }, () => {}); throw new Error("Kimlik doğrulama sorunu (Dosya Güncelleme)."); }
             if (response.status === 404) { throw new Error(`Dosya bulunamadı (404) - ID: ${fileId}`); }
             throw new Error(`Google Drive API hatası (${response.status}): ${errorData.message || response.statusText}`);
        }

        const data = await response.json(); // Başarılı güncelleme yanıtını al
        console.log("[appendContentToDriveFile] Dosya başarıyla güncellendi:", data);

        // İsteğe bağlı: Metadata'yı ayrı bir PATCH ile güncelle (description)
        /*
        const updateMetaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
        const metaUpdateBody = { description: `Web Defterim Notları. Son ekleme: ${now.toISOString()}` };
        await fetch(updateMetaUrl, {
             method: 'PATCH',
             headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
             body: JSON.stringify(metaUpdateBody)
        });
        console.log("[appendContentToDriveFile] Dosya metadata (description) güncellendi.");
        */

        return updatedContent; // Güncellenmiş içeriği döndür

    } catch (error) {
         console.error("[appendContentToDriveFile] Dosya güncelleme sırasında kritik hata:", error);
         throw error;
    }
}

// --- Drive Dosyasının İçeriğini Alma ---
async function getDriveFileContent(token, fileId) {
    const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    console.log(`[getDriveFileContent] ID ${fileId} içeriği alınıyor... URL: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`[getDriveFileContent] Yanıt durumu: ${response.status}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[getDriveFileContent] API hatası (${response.status}): ${response.statusText} - ${errorText}`);
            if (response.status === 404) { throw new Error(`Dosya içeriği alınamadı, bulunamadı (404) - ID: ${fileId}`); }
            if (response.status === 401) { chrome.identity.removeCachedAuthToken({ token: token }, () => {}); throw new Error("Kimlik doğrulama sorunu (İçerik Alma)."); }
            // 403 Forbidden (örn. scope yetersiz veya dosya sahibi değilseniz)
            if (response.status === 403) { throw new Error(`Dosya içeriği okuma izni yok (403) - ID: ${fileId}`);}
            throw new Error(`API Hatası (${response.status}) - İçerik Alınamadı: ${response.statusText}`);
        }
        // İçeriği text olarak alalım
        const content = await response.text();
        console.log(`[getDriveFileContent] Dosya (${fileId}) içeriği başarıyla alındı (uzunluk: ${content.length}).`);
        return content;
    } catch (error) {
        // Fetch sırasındaki ağ hataları veya yukarıdaki throw'lar buraya düşer
        console.error(`[getDriveFileContent] Dosya (${fileId}) içeriği alınırken kritik hata:`, error);
        // Hatanın türüne göre farklı işlemler yapılabilir ama şimdilik yukarı fırlatalım
        throw error;
    }
}


// --- HTML Not Girdisini Formatlama ---
function formatHtmlEntry(htmlContent, url, title, date) {
    // title ve url'i HTML'e karşı güvenli hale getir (içlerine zararlı kod enjekte edilmesini önle)
    const escapeHTML = (str) => str 
        ? str.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#39;') 
        : '';
        
    const safeTitle = escapeHTML(title);
    const safeUrl = escapeHTML(url); // URL'i de escape etmek en güvenlisi
    
        return `
    <div class="entry">
      <div class="entry-meta">
        <p><strong>Başlık:</strong> ${safeTitle || 'Başlık Yok'}</p>
        <p><strong>Kaynak:</strong> <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></p>
        <p><strong>Tarih:</strong> ${date.toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'long' })}</p>
      </div>
      <div class="entry-content">
        ${htmlContent || '<i>İçerik alınamadı.</i>'}
      </div>
    </div>`;

}


// --- Yerel İndirmeyi Tetikleme ---
function triggerLocalDownload(content, filename) {
    console.log(`[triggerLocalDownload] "${filename}" için indirme başlatılıyor...`);
    try {
        const blob = new Blob([content], { type: 'text/html;charset=UTF-8' });
        const objectUrl = URL.createObjectURL(blob);
        console.log(`[triggerLocalDownload] Blob URL oluşturuldu: ${objectUrl}`);

        chrome.downloads.download({
            url: objectUrl,
            filename: filename,
            saveAs: true // Kullanıcıya sor
        }, (downloadId) => {
            // downloadId tanımsızsa veya hata varsa
            if (downloadId === undefined || chrome.runtime.lastError) {
                 const errorMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : "Download ID alınamadı.";
                 console.error("[triggerLocalDownload] İndirme başlatılamadı:", errorMsg);
                 bildirimGoster("Hata", `Dosya indirilemedi: ${errorMsg}`);
                 URL.revokeObjectURL(objectUrl); // Hata durumunda URL'i hemen serbest bırak
                 return;
            }

            // Başarılıysa
            console.log(`[triggerLocalDownload] İndirme başlatıldı, ID: ${downloadId}`);
            const listener = (delta) => {
                  // Sadece ilgili indirme ID'si ve tamamlanma/iptal durumuyla ilgilen
                  if (delta.id === downloadId && delta.state && delta.state.current !== 'in_progress') {
                      console.log(`[triggerLocalDownload] İndirme (${downloadId}) durumu değişti: ${delta.state.current}. Object URL serbest bırakılıyor.`);
                      URL.revokeObjectURL(objectUrl);
                      chrome.downloads.onChanged.removeListener(listener); // Dinleyiciyi kaldır
                  }
             };
             chrome.downloads.onChanged.addListener(listener);

             // Önlem: Belirli bir süre sonra URL'i ve dinleyiciyi her ihtimale karşı kaldır
             setTimeout(() => {
                 console.log(`[triggerLocalDownload] Zaman aşımı (${downloadId}). Object URL ve listener kaldırılıyor (eğer hala varsa).`);
                 URL.revokeObjectURL(objectUrl); // Zaten kaldırılmışsa sorun olmaz
                 chrome.downloads.onChanged.removeListener(listener);
             }, 120000); // 2 dakika
        });
    } catch (error) {
        console.error("[triggerLocalDownload] Yerel indirme sırasında kritik hata:", error);
        bildirimGoster("Hata", "Dosya indirilirken bir sorun oluştu.");
        // Eğer objectUrl oluşturulduysa, onu temizlemeye çalışalım
        if (typeof objectUrl !== 'undefined') {
            try { URL.revokeObjectURL(objectUrl); } catch (revokeError) {}
        }
    }
}

// --- Bildirim Gösterme ---
function bildirimGoster(baslik, mesaj) {
  const notificationId = `web-defterim-notif-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: 'basic',
    // iconUrl: '../icons/icon128.png', // icons klasörünüz varsa yolu düzeltin
    iconUrl: 'icons/icon128.png', // Genellikle manifest ile aynı seviyede olur
    title: `Web Defterim - ${baslik}`,
    message: mesaj.substring(0, 250)
  });
}

console.log("[Web Defterim] Service Worker (v1.2 Log) başlatıldı.");