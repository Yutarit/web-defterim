// --- Sabitler ---
const HEDEF_KLASOR_ADI = "WebDefterim";
const EKLENTI_ADI = "Web Defterim"
const ANA_HTML_DOSYA_ADI = "WebDefterim.html";
const TARGET_FILE_ID_KEY = 'webDefterimMainFileId'; // Ana dosya ID'sinin storage key'i
const FOLDER_ID_KEY = 'webDefterimFolderId';       // Klasör ID'sinin storage key'i

// --- Yardımcı HTML Kaçış Fonksiyonu ---
const escapeHTML = (str) => str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';

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

// --- Sağ Tıklama Menüsü Oluşturma ---
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Web Defterim] Eklenti yüklendi/güncellendi (v3.3).');

    // 1. Kaydetme Menüsü
    chrome.contextMenus.remove("webDefterimKaydet", () => {
        if (chrome.runtime.lastError) { /* Hata önemli değil */ }
        chrome.contextMenus.create({
            id: "webDefterimKaydet",
            title: `Bu İçeriği ${EKLENTI_ADI}'e Ekle`,
            contexts: ["selection", "image", "link"]
        });
        console.log('[Web Defterim] "Kaydet" menüsü oluşturuldu.');
    });

    // 2. Defteri Göster Menüsü
    chrome.contextMenus.remove("webDefterimGoster", () => {
         if (chrome.runtime.lastError) { /* Hata önemli değil */ }
         chrome.contextMenus.create({
             id: "webDefterimGoster",
             title: `${EKLENTI_ADI}'i Göster`,
             contexts: ["page", "action"]
         });
         console.log('[Web Defterim] "Defteri Göster" menüsü oluşturuldu.');
    });
});


// --- Sağ Tıklama Olayı ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "webDefterimKaydet") {
    // 1. Kaydetme İşlemi
        const sayfaUrl = info.pageUrl || (tab ? tab.url : '');
        const sayfaBasligi = tab ? tab.title : 'Başlık Yok';
        let contentToSave = null;
        let contentType = '';

        console.log("--- Web Defterim'e Ekleme İsteği ---");
        // ... (loglama) ...

        try {
            // İçerik türünü belirle ve contentToSave'i doldur
            if (info.mediaType === "image" && info.srcUrl) { /* ... resim formatlama ... */
                contentType = 'image';
                const escapedSrcUrl = escapeHTML(info.srcUrl);
                const imageTitleGuess = info.srcUrl.substring(info.srcUrl.lastIndexOf('/') + 1) || "Kaydedilen Resim";
                contentToSave = `<div class="image-entry" style="text-align: center; margin-bottom: 1em; padding: 10px; background-color:#f0f0f0; border-radius: 4px;">...<img src="${escapedSrcUrl}" ...>...</div>`; // Kısaltıldı
            } else if (info.linkUrl && !info.selectionText) { /* ... link formatlama ... */
                 contentType = 'link';
                 const escapedLinkUrl = escapeHTML(info.linkUrl);
                 const linkText = info.linkText || info.linkUrl;
                 contentToSave = `<div class="link-entry" style="...">...<a href="${escapedLinkUrl}" ...>${escapedLinkUrl}</a>...</div>`; // Kısaltıldı
            } else if (info.selectionText) { /* ... seçim alma ... */
                 contentType = 'selection';
                 if (!tab || !tab.id) throw new Error("Seçimi almak için geçerli sekme bilgisi bulunamadı.");
                 contentToSave = await getSelectedHtml(tab.id);
            } else { /* ... bilinmeyen tür ... */
                bildirimGoster("Uyarı", "Kaydedilecek içerik türü anlaşılamadı."); return;
            }

            // İçerik kontrolü
            if (contentToSave == null || (typeof contentToSave === 'string' && contentToSave.trim() === "")) {
                bildirimGoster("Uyarı", "Kaydedilecek geçerli içerik bulunamadı veya alınamadı."); return;
            }

            // Kaydetme
            console.log(`[Web Defterim] ${contentType} içeriği kaydediliyor...`);
            await anaKaydetmeIslemi(contentToSave, sayfaUrl, sayfaBasligi);

        } catch (error) {
            console.error("[Web Defterim] Kaydetme işlemi sırasında hata:", error);
            // Hata Bildirimi
            let hataMesaji = `Kaydetme sırasında hata: ${error.message || 'Bilinmeyen Hata'}`;
             if (error.message && error.message.includes("Sayfa içeriğine erişilemiyor")) { hataMesaji = "Sayfadan içerik alınamadı (korumalı sayfa?)."; }
             else if (error.message && error.message.includes("OAuth")) { hataMesaji = "Google kimlik doğrulaması başarısız oldu."; }
             else if (error.message && error.message.includes("API Hatası")) { hataMesaji = `Google Drive işlemi başarısız oldu: ${error.message}`; }
            bildirimGoster("Hata", hataMesaji);
        }

  // 2. Defteri Göster İşlemi
  } else if (info.menuItemId === "webDefterimGoster") {
    try {
        // <<<--- handleShowNotebook yerine doğrudan yeni sekmeyi aç ---<<<
        const viewerUrl = chrome.runtime.getURL('defter_goruntuleyici.html');
        console.log(`[onClicked] Görüntüleyici sayfası açılıyor: ${viewerUrl}`);
        await chrome.tabs.create({ url: viewerUrl, active: true });
    } catch (error) {
        console.error("[onClicked] Görüntüleyici sekmesi açılırken hata:", error);
        bildirimGoster("Hata", `Defter görüntüleyici açılamadı: ${error.message}`);
    }
  }
});

// --- Arka Plan Mesaj Dinleyicisi (YENİ) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[onMessage] Mesaj alındı:", message);
  if (message.action === "getDefterIcerik") {
      console.log("[onMessage] Defter içerik isteği alındı. İşleniyor...");
      // İçeriği asenkron olarak alıp cevabı gönder
      fetchDefterContentForViewer()
          .then(htmlContent => {
              console.log("[onMessage] İçerik başarıyla alındı, gönderiliyor.");
              sendResponse({ success: true, htmlContent: htmlContent });
          })
          .catch(error => {
              console.error("[onMessage] İçerik alınırken hata:", error);
              sendResponse({ success: false, error: error.message || 'Bilinmeyen bir hata oluştu.' });
          });
      // Asenkron yanıt göndereceğimizi belirtmek için true döndür
      return true;
  }
  // Diğer mesaj türleri için false döndür veya işlem yapma
  return false;
});

// --- Defter İçeriğini Alıp Döndüren Yardımcı Fonksiyon (YENİ) ---
async function fetchDefterContentForViewer() {
  console.log("[fetchDefterContent] Başlatıldı.");
  let fileId = null;
  let token = null;

  // 1. Dosya ID'sini al
  try {
      const data = await storageLocalGet([TARGET_FILE_ID_KEY]);
      fileId = data[TARGET_FILE_ID_KEY];
      if (!fileId) throw new Error(`"${ANA_HTML_DOSYA_ADI}" dosyası bilgisi bulunamadı.`);
      console.log(`[fetchDefterContent] Dosya ID: ${fileId}`);
  } catch (storageError) { throw new Error(`Yerel depodan okuma hatası: ${storageError.message}`); }

  // 2. Yetki Al
  try {
      token = await getAuthToken(true); // Etkileşim gerekebilir
  } catch (authError) { throw new Error(`Yetki alınamadı: ${authError.message}`); }

  // 3. İçeriği İndir
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  console.log(`[fetchDefterContent] İçerik indiriliyor: ${downloadUrl}`);
  try {
      const response = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) {
          // Hata durumları
          const errorText = await response.text();
          console.error(`[fetchDefterContent] İndirme hatası (${response.status}): ${errorText}`);
          if (response.status === 404) {
              await storageLocalSet({ [TARGET_FILE_ID_KEY]: null }).catch(e => console.error("ID temizlerken hata:", e));
              throw new Error(`Dosya Drive'da bulunamadı (404).`);
          } else if (response.status === 401 || response.status === 403) {
              chrome.identity.removeCachedAuthToken({ token: token }, () => {});
              throw new Error(`Dosya okuma izni hatası (${response.status}).`);
          } else { throw new Error(`Drive API hatası (${response.status}).`); }
      }
      const htmlContent = await response.text();
      console.log(`[fetchDefterContent] İçerik başarıyla alındı.`);
      return htmlContent; // HTML içeriğini döndür
  } catch (fetchError) { throw new Error(`İçerik indirilirken hata: ${fetchError.message}`); }
}
// --- Seçili Alanın HTML'ini Alma Fonksiyonu ---
async function getSelectedHtml(tabId) {
  console.log(`[getSelectedHtml] Tab ID ${tabId} için çalıştırılıyor.`);
  try {
      const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
              console.log('[Injected Script] Çalışıyor...');
              const selection = window.getSelection();
              if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                  console.log('[Injected Script] Seçim yok veya geçersiz.');
                  return null;
              }
              try {
                  const range = selection.getRangeAt(0);
                  const clonedSelection = range.cloneContents();
                  // <<<--- LOG EKLE ---<<<
                  console.log('[Injected Script] Klonlanan İçerik (Fragment):', clonedSelection);
                  const container = document.createElement('div');
                  container.appendChild(clonedSelection);
                  const finalHTML = container.innerHTML;
                  // <<<--- LOG EKLE ---<<<
                  console.log('[Injected Script] Dönen HTML (ilk 500 char):', finalHTML ? finalHTML.substring(0, 500) : 'BOŞ veya NULL');
                  return finalHTML;
              } catch (innerError) {
                  console.error('[Injected Script] İçerik işlenirken HATA:', innerError);
                  return null;
              }
          },
      });
// ... (executeScript sonrası sonuç kontrolü aynı kalır) ...
       if (!Array.isArray(results) || results.length === 0) return null;
       const firstResult = results[0];
       if (!firstResult || firstResult.result === undefined || firstResult.result === null || typeof firstResult.result !== 'string') return null;
       return firstResult.result;

  } catch (error) {
       console.error("[getSelectedHtml] executeScript çağrılırken HATA:", error);
       throw new Error(`Sayfa içeriğine erişirken hata: ${error.message}`);
   }
}

// --- Ana Kaydetme İşlemi ---
async function anaKaydetmeIslemi(htmlIcerik, url, baslik) {
    // ... (Önceki tam kod - token alma, klasör/dosya ID alma, create/append çağırma) ...
    console.log("[anaKaydetmeIslemi] Başlatıldı.");
    let token = null;
    try {
        token = await getAuthToken(true);
        const klasorId = await getWebDefterimFolderId(token);
        let targetFileId = await getMainHtmlFileId(token);
        if (targetFileId) {
            await appendContentToDriveFile(token, targetFileId, htmlIcerik, url, baslik);
            bildirimGoster("Başarılı", `İçerik "${EKLENTI_ADI}" dosyasına eklendi.`);
        } else {
            targetFileId = await createMainHtmlFile(token, klasorId, htmlIcerik, url, baslik);
            await storageLocalSet({ [TARGET_FILE_ID_KEY]: targetFileId });
            bildirimGoster("Başarılı", `"${EKLENTI_ADI}" dosyası oluşturuldu ve ilk içerik eklendi.`);
        }
    } catch (error) { console.error("[anaKaydetmeIslemi] Hata:", error); throw error; }
}

// --- Ana HTML Dosya ID'sini Alma/Kontrol Etme ---
async function getMainHtmlFileId(token) { // Token parametresi ekle
    try {
        const data = await storageLocalGet([TARGET_FILE_ID_KEY]);
        const fileId = data[TARGET_FILE_ID_KEY];
        if (fileId) {
            console.log(`[getMainHtmlFileId] Yerel depodan ID: ${fileId}. Kontrol ediliyor...`);
            const isValid = await checkFileExists(token, fileId); // Token'ı ilet
            if (isValid) return fileId;
            else {
                console.warn("[getMainHtmlFileId] ID geçersiz. Temizleniyor.");
                await storageLocalSet({ [TARGET_FILE_ID_KEY]: null }).catch(e => console.error("ID temizlenirken hata:", e));
                return null;
            }
        }
        return null;
    } catch (error) { console.warn("[getMainHtmlFileId] Hata:", error); return null; }
}

// --- Drive Dosyasının/Klasörünün Varolup Olmadığını Kontrol Etme ---
async function checkFileExists(token, fileOrFolderId) {
    if (!fileOrFolderId) return false;
    const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileOrFolderId}?fields=id,trashed,mimeType`; // mimeType ekleyelim
    console.log(`[checkFileExists] ID ${fileOrFolderId} kontrol ediliyor...`);
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`[checkFileExists] ID ${fileOrFolderId} için yanıt durumu: ${response.status}`);
        if (response.status === 404) {
            return false;
        }
        // Yetkilendirme hatası (401) veya İzin hatası (403)
        if (response.status === 401 || response.status === 403) {
             console.warn(`[checkFileExists] ID (${fileOrFolderId}) kontrolü sırasında ${response.status} hatası. Token veya izin sorunu olabilir. Geçersiz varsayılıyor.`);
             // Bu durumda ID'yi geçersiz saymak daha doğru olabilir.
             return false;
        }
        if (!response.ok) {
             // Diğer sunucu hataları (5xx)
             console.warn(`[checkFileExists] ID (${fileOrFolderId}) kontrolü sırasında API hatası (${response.status}): ${response.statusText}. Geçerli varsayılıyor.`);
             return true; // Geçici hata olabilir, var kabul edelim
        }
        const data = await response.json();
        if (data.trashed) {
             console.log(`[checkFileExists] ID (${fileOrFolderId}) çöp kutusunda.`);
             return false;
        }
        // İsteğe bağlı: Mime tipini de kontrol edebiliriz (örn: klasör ID'si mi dosya ID'si mi bekliyoruz)
        console.log(`[checkFileExists] ID (${fileOrFolderId}) geçerli (MimeType: ${data.mimeType}).`);
        return true;
    } catch (error) {
        console.error(`[checkFileExists] ID (${fileOrFolderId}) varlığı kontrol edilirken ağ hatası:`, error);
        return true; // Ağ hatasında var kabul et
    }
}

// --- Klasör ID Alma/Oluşturma Fonksiyonları ---
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
          await storageLocalSet({ webDefterimFolderId: null }).catch(e => console.error("Klasör ID temizlenirken hata:", e));
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
        // Klasör oluşturma kritik, hata fırlatmalı
        throw new Error(`Hedef klasör ('${HEDEF_KLASOR_ADI}') oluşturulamadı: ${createError.message}`);
    }
  }

  // 4. Bulunan veya oluşturulan ID'yi yerel depolamaya kaydet
  if (folderId) {
      try {
        await storageLocalSet({ webDefterimFolderId: folderId });
        console.log("[getWebDefterimFolderId] Klasör ID'si yerel depolamaya kaydedildi.");
      } catch (error) {
        // Kaydetme hatası kritik değil, sadece sonraki sefer tekrar arar.
        console.warn("[getWebDefterimFolderId] Yerel depolamaya klasör ID'si kaydedilirken hata:", error);
      }
  } else {
      // Bu durumun olmaması lazım (ya bulundu ya oluşturuldu)
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
        // Yetkilendirme/izin hatası ise özel mesaj verelim
        if (response.status === 401 || response.status === 403) {
             chrome.identity.removeCachedAuthToken({ token: token }, () => {});
             throw new Error(`Klasör arama izni hatası (${response.status}). Token veya API iznini kontrol edin.`);
        }
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
      return data.files[0].id; // İlkini döndür
    } else {
      console.log(`[searchForFolder] Klasör bulunamadı.`);
      return null;
    }
  } catch (error) {
     console.error("[searchForFolder] Klasör arama sırasında kritik hata:", error);
     // Zaten yukarıda özel mesaj verildi, hatayı tekrar fırlat
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
       if (response.status === 401 || response.status === 403) {
             chrome.identity.removeCachedAuthToken({ token: token }, () => {});
             throw new Error(`Klasör oluşturma izni hatası (${response.status}). Token veya API iznini kontrol edin.`);
       }
       throw new Error(`Klasör oluşturma API Hatası (${response.status}): ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`[createFolder] Klasör oluşturuldu: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error("[createFolder] Klasör oluşturma sırasında kritik hata:", error);
    throw error;
  }
}


// --- Ana HTML Dosyasını Oluşturma ---
async function createMainHtmlFile(token, parentFolderId, firstHtmlContent, url, baslik) {
    console.log(`[createMainHtmlFile] Ana dosya "${ANA_HTML_DOSYA_ADI}" oluşturuluyor, parent: ${parentFolderId}`);
    const now = new Date();
    const initialEntryHtml = formatHtmlEntry(firstHtmlContent, url, baslik, now); // İlk notu formatla

    // Temel HTML yapısı ve stiller
    const fileContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(EKLENTI_ADI)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; line-height: 1.6; margin: 20px; background-color: #f8f9fa; color: #212529; }
    .container { max-width: 900px; margin: 10px auto; }
    h1 { border-bottom: 2px solid #dee2e6; padding-bottom: 0.5em; margin-bottom: 1em; color: #343a40; }
    .entry { background-color: #fff; border: 1px solid #dee2e6; border-radius: .25rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 .125rem .25rem rgba(0,0,0,.075); overflow: hidden; /* İçerik taşmasını önle */ }
    .entry-meta { font-size: 0.875em; color: #6c757d; border-bottom: 1px solid #eee; padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
    .entry-meta p { margin: 0.25rem 0; word-break: break-all; /* Uzun URL'ler için */ }
    .entry-meta strong { color: #495057; }
    .entry-meta a { color: #007bff; text-decoration: none; }
    .entry-meta a:hover { text-decoration: underline; }
    .entry-content { margin-top: 1rem; word-wrap: break-word; }
    .entry-content img, .entry-content video, .entry-content iframe { max-width: 100%; height: auto; border-radius: .25rem; margin-bottom: .5rem; background-color: #eee; display: block; /* Ekstra boşlukları kaldırabilir */ }
    .entry-content table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; border: 1px solid #ccc; }
    .entry-content th, .entry-content td { border: 1px solid #ccc; padding: .5rem .75rem; text-align: left; }
    .entry-content th { background-color: #e9ecef; font-weight: 600; }
    .entry-content pre { background-color: #f1f1f1; padding: 1em; border-radius: .25rem; overflow-x: auto; font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.9em;}
    .entry-content blockquote { border-left: .25em solid #eee; padding-left: 1em; margin-left: 0; font-style: italic; color: #555;}
    hr.entry-separator { border: 0; height: 1px; background-color: #ced4da; margin: 2rem 0; }
    .footer-note { text-align: center; font-size: 0.8em; color: #aaa; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee; }
  </style>
</head>
<body>
<div class="container">
  <h1>${escapeHTML(EKLENTI_ADI)}</h1>
  <p>Bu dosya, Web Defterim Chrome uzantısı ile kaydedilen içerikleri içerir.</p>

  ${initialEntryHtml}

  <hr class="entry-separator">
  <!-- NOT_EKLEME_NOKTASI -->
</div>
<p class="footer-note">Dosya Oluşturulma: ${now.toISOString()}</p>
</body>
</html>`;

    const apiUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const metadata = {
        name: ANA_HTML_DOSYA_ADI,
        mimeType: 'text/html',
        parents: [parentFolderId],
        description: `Web Defterim uzantısı tarafından oluşturulan notlar. Oluşturulma: ${now.toISOString()}`
    };

    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' });
    const contentBlob = new Blob([fileContent], { type: 'text/html; charset=UTF-8' });

    const requestBody = new FormData();
    requestBody.append('metadata', metadataBlob);
    requestBody.append('file', contentBlob, ANA_HTML_DOSYA_ADI);

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
            if (response.status === 401 || response.status === 403) {
                 chrome.identity.removeCachedAuthToken({ token: token }, () => {});
                 throw new Error(`Ana dosya oluşturma izni hatası (${response.status}).`);
            }
            throw new Error(`Google Drive API hatası (${response.status}): ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log("[createMainHtmlFile] Ana HTML dosyası başarıyla oluşturuldu:", data);
        return data.id;

    } catch (error) {
        console.error("[createMainHtmlFile] Ana HTML dosyası oluşturma sırasında kritik hata:", error);
        throw error; // Hatanın yukarıya iletilmesi
    }
}

// --- Mevcut Drive Dosyasına İçerik Ekleme ---
async function appendContentToDriveFile(token, fileId, newHtmlContent, url, baslik) {
    console.log(`[appendContentToDriveFile] Dosya (${fileId}) içeriği alınıyor...`);
    const currentContent = await getDriveFileContent(token, fileId);

    console.log("[appendContentToDriveFile] Yeni içerik formatlanıyor...");
    const now = new Date();
    const newEntryHtml = formatHtmlEntry(newHtmlContent, url, baslik, now);

    // Yeni içeriği ekle (<!-- NOT_EKLEME_NOKTASI --> yorumundan HEMEN ÖNCE)
    const insertionMarker = '<!-- NOT_EKLEME_NOKTASI -->';
    const insertionPoint = currentContent.indexOf(insertionMarker);
    let updatedContent;

    if (insertionPoint !== -1) {
        // Yeni içeriği ve ayıracı marker'dan önce ekle
        updatedContent = currentContent.slice(0, insertionPoint)
                       + newEntryHtml + '\n'
                       + '<hr class="entry-separator">\n' // Yeni nottan SONRA ayraç
                       + currentContent.slice(insertionPoint); // Marker ve sonrası
        console.log(`[appendContentToDriveFile] İçerik "${insertionMarker}" öncesine eklendi.`);
    } else {
        // Eğer marker bulunamazsa, </body>'den önce eklemeyi dene
        const fallbackMarker = '</body>';
        const fallbackPoint = currentContent.lastIndexOf(fallbackMarker);
        if (fallbackPoint !== -1) {
            console.warn(`[appendContentToDriveFile] "${insertionMarker}" bulunamadı! </body> öncesine ekleniyor.`);
            updatedContent = currentContent.slice(0, fallbackPoint)
                           + newEntryHtml + '\n'
                           + '<hr class="entry-separator">\n'
                           + currentContent.slice(fallbackPoint);
        } else {
             console.error(`[appendContentToDriveFile] Ne "${insertionMarker}" ne de "${fallbackMarker}" bulunamadı! İçerik sona ekleniyor.`);
             // Sona eklerken ayraç eklemek mantıklı olabilir
             updatedContent = currentContent + '\n<hr class="entry-separator">\n' + newEntryHtml;
        }
    }

    // Footer'daki tarihi güncelle (varsa)
    const footerMarker = '<p class="footer-note">'; // Başlangıcı ara
    const footerStart = updatedContent.lastIndexOf(footerMarker);
    if (footerStart !== -1) {
        const footerEnd = updatedContent.indexOf('</p>', footerStart);
        if (footerEnd !== -1) {
             // Mevcut footer içeriğini al ve tarihi güncelle
             // Örneğin: "Dosya Oluşturulma: ... | Son Güncelleme: ..."
             const newFooterText = `Son Güncelleme: ${now.toISOString()}`;
             updatedContent = updatedContent.slice(0, footerStart + footerMarker.length) +
                              newFooterText + // Veya mevcut içeriği koruyup ekleyebilirsiniz
                              updatedContent.slice(footerEnd);
             console.log("[appendContentToDriveFile] Footer tarihi güncellendi.");
        }
    }


    console.log(`[appendContentToDriveFile] Dosya (${fileId}) içeriği güncelleniyor...`);
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
             if (response.status === 401 || response.status === 403) {
                  chrome.identity.removeCachedAuthToken({ token: token }, () => {});
                  throw new Error(`Dosya güncelleme izni hatası (${response.status}).`);
             }
             if (response.status === 404) { throw new Error(`Güncellenecek dosya bulunamadı (404) - ID: ${fileId}`); }
             throw new Error(`Google Drive API hatası (${response.status}): ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log("[appendContentToDriveFile] Dosya başarıyla güncellendi:", data);
        // Başarı durumunda bir şey döndürmeye gerek yok

    } catch (error) {
         console.error("[appendContentToDriveFile] Dosya güncelleme sırasında kritik hata:", error);
         throw error; // Hatanın yukarı gitmesi için
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
            const errorText = await response.text(); // Hata mesajını almayı dene
            console.error(`[getDriveFileContent] API hatası (${response.status}): ${response.statusText} - ${errorText}`);
            if (response.status === 404) { throw new Error(`Dosya içeriği alınamadı, dosya bulunamadı (404) - ID: ${fileId}`); }
            if (response.status === 401 || response.status === 403) {
                chrome.identity.removeCachedAuthToken({ token: token }, () => {});
                throw new Error(`Dosya okuma izni hatası (${response.status}) - ID: ${fileId}`);
            }
            throw new Error(`API Hatası (${response.status}) - İçerik Alınamadı: ${response.statusText}`);
        }
        const content = await response.text();
        console.log(`[getDriveFileContent] Dosya (${fileId}) içeriği başarıyla alındı (uzunluk: ${content.length}).`);
        return content;
    } catch (error) {
        console.error(`[getDriveFileContent] Dosya (${fileId}) içeriği alınırken kritik hata:`, error);
        // Hatanın türüne göre farklı işlemler yapılabilir ama şimdilik yukarı fırlatalım
        throw error;
    }
}


// --- HTML Not Girdisini Formatlama ---
function formatHtmlEntry(htmlContent, url, title, date) {
    // Güvenlik için escape etme
    const safeTitle = escapeHTML(title);
    const safeUrl = escapeHTML(url);

    return `
<div class="entry">
  <div class="entry-meta">
    <p><strong>Başlık:</strong> ${safeTitle || 'Başlık Yok'}</p>
    <p><strong>Kaynak:</strong> <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl || 'URL Yok'}</a></p>
    <p><strong>Tarih:</strong> ${date.toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'long' })}</p>
  </div>
  <div class="entry-content">
    ${htmlContent || '<i>İçerik alınamadı veya boştu.</i>'}
  </div>
</div>`;
}

// --- Bildirim Gösterme (Güncellendi - chrome.runtime.getURL ile) ---
function bildirimGoster(baslik, mesaj) {
  const notificationId = `web-defterim-notif-${Date.now()}`;
  const iconRelativePath = 'icons/icon128.png'; // İkonun projedeki yolu
  let absoluteIconUrl = '';

  try {
      absoluteIconUrl = chrome.runtime.getURL(iconRelativePath);
      console.log(`[bildirimGoster] İkon URL oluşturuldu: ${absoluteIconUrl}`);
  } catch (e) {
      console.error(`[bildirimGoster] chrome.runtime.getURL(${iconRelativePath}) hatası:`, e);
  }

  console.log(`[bildirimGoster] Bildirim: Başlık="${baslik}", Mesaj="${mesaj}", Icon="${absoluteIconUrl || 'Yok'}"`);

  const notificationOptions = {
      type: 'basic',
      title: `Web Defterim - ${baslik}`,
      message: mesaj.substring(0, 250)
  };

  if (absoluteIconUrl) {
      notificationOptions.iconUrl = absoluteIconUrl;
  } else {
       console.warn("[bildirimGoster] İkonsuz bildirim gösterilecek.");
  }

  chrome.notifications.create(notificationId, notificationOptions, (createdNotificationId) => {
      if (chrome.runtime.lastError) {
          console.error(`[bildirimGoster] Bildirim oluşturma hatası (ID: ${notificationId}):`, chrome.runtime.lastError);
          console.warn(`BİLDİRİM GÖSTERİLEMEDİ - Başlık: ${baslik}, Mesaj: ${mesaj}. Hata: ${chrome.runtime.lastError.message}`);
      } else {
          console.log(`[bildirimGoster] Bildirim başarıyla oluşturuldu (ID: ${createdNotificationId})`);
      }
  });
}

// Service Worker başlangıç logu
console.log("[Web Defterim] Service Worker (v3.3 - Blob URL) başlatıldı.");