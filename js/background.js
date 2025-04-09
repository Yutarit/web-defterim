// background.js (Sürüm 3.1 - Bildirim Düzeltmesi, Resim Kaydetme, İndirme Kaldırıldı)

// --- Sabitler ---
const HEDEF_KLASOR_ADI = "Web Defterim";
const ANA_HTML_DOSYA_ADI = "Web Defterim Notları.html";
const TARGET_FILE_ID_KEY = 'webDefterimMainFileId'; // Depolama anahtarı

// --- Yardımcı HTML Kaçış Fonksiyonu ---
// Güvenlik için URL ve Başlıkları HTML içine yerleştirmeden önce çağırın
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

// --- Sağ Tıklama Menüsü ---
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Web Defterim] Eklenti yüklendi/güncellendi (v3.1).');
    // Önceki menüyü kaldırıp yeniden oluşturmak (hata mesajını yoksay)
    chrome.contextMenus.remove("webDefterimKaydet", () => {
        if (chrome.runtime.lastError) { /* console.log("Kaldırma hatası (önemsiz):", chrome.runtime.lastError.message); */ }
        chrome.contextMenus.create({
            id: "webDefterimKaydet",
            // Başlığı daha genel yapalım
            title: `Bu İçeriği "${ANA_HTML_DOSYA_ADI}" Dosyasına Ekle`,
            // Hem metin seçimi hem de resimler için görünür yap
            contexts: ["selection", "image"] // <<<--- DEĞİŞİKLİK BURADA
        });
        console.log('[Web Defterim] Sağ tıklama menüsü oluşturuldu/güncellendi (selection + image).');
    });
});


// --- Sağ Tıklama Olayı (Güncellendi) ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "webDefterimKaydet") {
        // Sayfa URL'sini info nesnesinden almak daha güvenilir olabilir
        const sayfaUrl = info.pageUrl || (tab ? tab.url : ''); // info.pageUrl yoksa tab.url kullan
        const sayfaBasligi = tab ? tab.title : 'Başlık Yok'; // tab olmayabilir (örn: resim sekmede açıldıysa)
        let contentToSave = null; // Kaydedilecek HTML içeriği
        let contentType = ''; // İçerik türünü belirlemek için (loglama/hata mesajı için)

        console.log("--- Web Defterim'e Ekleme İsteği ---");
        console.log("Tıklama Bilgisi (info):", info); // Tüm info objesini logla
        console.log("Sekme Bilgisi (tab):", tab);
        console.log("Sayfa URL:", sayfaUrl);
        console.log("Sayfa Başlığı:", sayfaBasligi);
        console.log("------------------------------------");

        try {
            // 1. Durum: Resme tıklandıysa
            if (info.mediaType === "image" && info.srcUrl) {
                contentType = 'image';
                console.log("[Web Defterim] Resim içeriği algılandı. URL:", info.srcUrl);
                // Resmi basit bir HTML yapısı içinde formatla
                const escapedSrcUrl = escapeHTML(info.srcUrl);
                // Resmin başlığını almaya çalış (alt text veya dosya adı olabilir)
                // Doğrudan info objesinde yok, getSelectedHtml gibi bir inject gerekebilir, şimdilik basit tutalım.
                const imageTitleGuess = info.srcUrl.substring(info.srcUrl.lastIndexOf('/') + 1) || "Kaydedilen Resim";

                contentToSave = `<div class="image-entry" style="text-align: center; margin-bottom: 1em; padding: 10px; background-color:#f0f0f0; border-radius: 4px;">
                                   <p><strong>${escapeHTML(imageTitleGuess)}</strong></p>
                                   <a href="${escapedSrcUrl}" target="_blank" rel="noopener noreferrer">
                                     <img src="${escapedSrcUrl}" alt="${escapeHTML(imageTitleGuess)}" style="max-width:95%; height:auto; border:1px solid #ccc; margin-top: 5px; background-color: #fff;">
                                   </a>
                                   <p style="font-size: 0.8em; margin-top: 5px;"><a href="${escapedSrcUrl}" target="_blank" rel="noopener noreferrer">Resim Kaynağı</a></p>
                                 </div>`;

            // 2. Durum: Metin seçildiyse (info.selectionText kontrolü daha güvenli olabilir)
            // info.linkUrl kontrolü ekleyerek link üzerine sağ tıklamayı da hariç tutalım (eğer sadece seçimi istiyorsak)
            } else if (info.selectionText && !info.linkUrl) {
                 contentType = 'selection';
                 // Geçerli sekme ID'si olduğundan emin ol (seçim için gerekli)
                 if (!tab || !tab.id) {
                    console.error("[Web Defterim] Seçim içeriği için geçerli sekme ID'si yok.");
                    bildirimGoster("Hata", "Seçimi almak için geçerli sekme bilgisi bulunamadı.");
                    return;
                 }
                 console.log("[Web Defterim] Seçim içeriği algılandı. HTML alınıyor...");
                 contentToSave = await getSelectedHtml(tab.id); // Seçili HTML'i al

            // 3. Durum: Linke tıklandıysa (şimdilik basitçe linki kaydedelim)
            } else if (info.linkUrl && !info.selectionText) { // Sadece linke tıklandıysa, seçim yoksa
                 contentType = 'link';
                 console.log("[Web Defterim] Link içeriği algılandı. URL:", info.linkUrl);
                 const escapedLinkUrl = escapeHTML(info.linkUrl);
                 // Link metnini almaya çalışalım (tab DOM'una erişmek gerekebilir, şimdilik URL'i kullanalım)
                 const linkTitleGuess = info.linkUrl;

                 contentToSave = `<div class="link-entry" style="margin-bottom: 1em; padding: 10px; background-color:#eef; border: 1px solid #dde; border-radius: 4px;">
                                    <p><strong>Kaydedilen Bağlantı:</strong></p>
                                    <a href="${escapedLinkUrl}" target="_blank" rel="noopener noreferrer">${escapedLinkUrl}</a>
                                  </div>`;


            // 4. Diğer Durumlar (Beklenmedik veya desteklenmeyen, örn: video, audio)
            } else {
                console.warn("[Web Defterim] Tanımlanamayan veya desteklenmeyen içerik türü:", info);
                // Eğer selectionText varsa ama linkUrl de varsa (link içeren bir metin seçilmişse)
                if (info.selectionText && info.linkUrl) {
                   contentType = 'selection_with_link';
                    if (!tab || !tab.id) {
                       console.error("[Web Defterim] Seçim içeriği için geçerli sekme ID'si yok.");
                       bildirimGoster("Hata", "Seçimi almak için geçerli sekme bilgisi bulunamadı.");
                       return;
                    }
                    console.log("[Web Defterim] Link içeren seçim algılandı. HTML alınıyor...");
                    contentToSave = await getSelectedHtml(tab.id); // Seçili HTML'i almayı dene
                } else {
                   bildirimGoster("Uyarı", "Kaydedilecek içerik türü anlaşılamadı veya desteklenmiyor.");
                   return;
                }
            }

            // Alınan içeriğin geçerliliğini kontrol et (null, undefined, boş string)
            if (contentToSave == null || (typeof contentToSave === 'string' && contentToSave.trim() === "")) {
                console.warn(`[Web Defterim] ${contentType} için içerik alınamadı veya boş.`);
                let uyariMesaji = "Kaydedilecek içerik bulunamadı veya boş.";
                if (contentType === 'image') uyariMesaji = "Resim URL'si işlenemedi veya boş.";
                else if (contentType === 'selection' || contentType === 'selection_with_link') uyariMesaji = "Kaydedilecek seçili bir metin bulunamadı veya alınamadı.";
                else if (contentType === 'link') uyariMesaji = "Bağlantı URL'si alınamadı.";
                bildirimGoster("Uyarı", uyariMesaji);
                return;
            }

            // İçerik başarıyla alındı/oluşturuldu, kaydetme işlemine geç
            console.log(`[Web Defterim] ${contentType} içeriği başarıyla alındı/formatlandı. Kaydediliyor...`);
            // Ana kaydetme fonksiyonunu çağırırken, sayfa başlığını değil, içeriğe özel bir başlık kullanabiliriz
            // Şimdilik sayfa başlığını kullanmaya devam edelim.
            await anaKaydetmeIslemi(contentToSave, sayfaUrl, sayfaBasligi);

        } catch (error) {
            // Hata yakalama (getSelectedHtml veya anaKaydetmeIslemi'nden gelebilir)
            console.error("[Web Defterim] İşlem sırasında genel hata:", error);
            let hataMesaji = `Bir hata oluştu: ${error.message || 'Bilinmeyen Hata'}`;
            if (error.message && error.message.includes("Sayfa içeriğine erişirken hata")) {
                hataMesaji = "Sayfadan içerik alınamadı. Bu sayfa korumalı veya özel olabilir.";
            } else if (error.message && error.message.includes("OAuth")) {
                hataMesaji = "Google kimlik doğrulaması başarısız oldu. Tekrar deneyin.";
            } else if (error.message && error.message.includes("API Hatası")) {
                 hataMesaji = `Google Drive işlemi başarısız oldu: ${error.message}`;
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
      // world: 'MAIN', // Nadiren gerekebilir
      func: () => {
        // --- Bu kısım sayfa içinde çalışır (Content Script gibi) ---
        console.log('[Injected Script] Çalışıyor...');
        const selection = window.getSelection();
        console.log('[Injected Script] Selection nesnesi:', selection);
        console.log('[Injected Script] Selection toString():', selection ? selection.toString().substring(0, 200) : 'N/A');

        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          console.log('[Injected Script] Seçim yok, rangeCount 0 veya isCollapsed true.');
          return null;
        }
        console.log(`[Injected Script] rangeCount: ${selection.rangeCount}, isCollapsed: ${selection.isCollapsed}`);

        try {
            const range = selection.getRangeAt(0);
            console.log('[Injected Script] Range alındı:', range);
            const clonedSelection = range.cloneContents();
            console.log('[Injected Script] İçerik klonlandı (DocumentFragment):', clonedSelection);
            const container = document.createElement('div');
            container.appendChild(clonedSelection);

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

            const finalHTML = container.innerHTML;
            console.log('[Injected Script] Dönen HTML (ilk 200 char):', finalHTML ? finalHTML.substring(0, 200) : 'BOŞ');
            if (finalHTML === undefined || finalHTML === null) {
                console.warn('[Injected Script] container.innerHTML null veya undefined döndü.');
                return null;
            }
            return finalHTML;
        } catch (innerError) {
             console.error('[Injected Script] İçerik işlenirken HATA:', innerError);
             return null;
        }
        // --- Sayfa içi script sonu ---
      },
    });

    // --- executeScript sonrası background script'e dönüldü ---
    console.log("[getSelectedHtml] executeScript ham sonuçları:", results);

    if (!Array.isArray(results) || results.length === 0) {
        console.warn("[getSelectedHtml] executeScript beklenen dizi sonucunu döndürmedi:", results);
        return null;
    }

    const firstResult = results[0];
    if (!firstResult || firstResult.result === undefined) {
         console.warn("[getSelectedHtml] executeScript ilk sonucu veya result özelliği tanımsız:", firstResult);
         // result undefined ise genellikle script içinde bir hata olmuştur (console'da görünür)
         return null;
    }

    if (firstResult.result === null) {
        console.log("[getSelectedHtml] executeScript sonucu explicit olarak null.");
        return null;
    }

    if (typeof firstResult.result !== 'string') {
         console.warn("[getSelectedHtml] executeScript sonucu beklenen string türünde değil:", typeof firstResult.result, firstResult.result);
         return null;
    }

    console.log("[getSelectedHtml] Geçerli string sonuç bulundu, döndürülüyor.");
    return firstResult.result;

  } catch (error) {
    console.error("[getSelectedHtml] executeScript çağrılırken HATA:", error);
    // Chrome'un iç sayfalarında (örn: chrome://extensions) çalışmaz.
    if (error.message.includes("Cannot access contents of url")) {
        throw new Error("Sayfa içeriğine erişilemiyor (korumalı sayfa olabilir).");
    } else if (error.message.includes("No tab with id")) {
         throw new Error("Geçersiz sekme ID'si.");
    }
    // Diğer hatalar için genel mesaj
    throw new Error(`Sayfa içeriğine erişirken hata: ${error.message}`);
  }
}


// --- Ana Kaydetme İşlemi ---
async function anaKaydetmeIslemi(htmlIcerik, url, baslik) {
    console.log("[anaKaydetmeIslemi] Başlatıldı.");
    try {
        console.log("[Web Defterim] OAuth jetonu isteniyor...");
        const token = await getAuthToken(true);
        console.log("[Web Defterim] OAuth jetonu alındı.");

        console.log(`[Web Defterim] "${HEDEF_KLASOR_ADI}" klasör ID'si alınıyor...`);
        const klasorId = await getWebDefterimFolderId(token);
        console.log(`[Web Defterim] Klasör ID'si alındı: ${klasorId}`);

        console.log(`[Web Defterim] Ana HTML dosyası (${ANA_HTML_DOSYA_ADI}) ID'si alınıyor/kontrol ediliyor...`);
        let targetFileId = await getMainHtmlFileId(token);

        if (targetFileId) {
            console.log(`[Web Defterim] Mevcut dosya ID'si (${targetFileId}) bulundu. İçerik eklenecek.`);
            await appendContentToDriveFile(token, targetFileId, htmlIcerik, url, baslik);
            bildirimGoster("Başarılı", `İçerik "${ANA_HTML_DOSYA_ADI}" dosyasına eklendi.`);

        } else {
            console.log(`[Web Defterim] Ana dosya ID'si bulunamadı veya geçersiz. Yeni dosya oluşturulacak: ${ANA_HTML_DOSYA_ADI}`);
            targetFileId = await createMainHtmlFile(token, klasorId, htmlIcerik, url, baslik);
            console.log(`[Web Defterim] Ana dosya oluşturuldu: ${targetFileId}`);
            await storageLocalSet({ [TARGET_FILE_ID_KEY]: targetFileId });
            console.log("[Web Defterim] Yeni dosya ID'si yerel depolamaya kaydedildi.");
            bildirimGoster("Başarılı", `"${ANA_HTML_DOSYA_ADI}" dosyası oluşturuldu ve ilk içerik eklendi.`);
        }
        console.log("[anaKaydetmeIslemi] Başarıyla tamamlandı.");

    } catch (error) {
        // Bu catch bloğu getAuthToken, getWebDefterimFolderId, getMainHtmlFileId,
        // appendContentToDriveFile veya createMainHtmlFile fonksiyonlarından gelen hataları yakalar.
        console.error("[anaKaydetmeIslemi] Hata yakalandı:", error);
        // Hata mesajını yukarıdaki genel catch bloğuna tekrar fırlatalım ki bildirim gösterilsin.
        // Eğer burada spesifik bir işlem yapmak istemiyorsanız, bu catch bloğu kaldırılabilir,
        // çünkü ana onClicked listener'ında zaten bir catch var.
        // Ama loglama için kalabilir.
        throw error; // Hatanın yukarı iletilmesi önemli
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
                await storageLocalSet({ [TARGET_FILE_ID_KEY]: null }).catch(e => console.error("Dosya ID temizlenirken hata:", e));
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
  <title>${escapeHTML(ANA_HTML_DOSYA_ADI)}</title>
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
  <h1>${escapeHTML(ANA_HTML_DOSYA_ADI)}</h1>
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

// --- Bildirim Gösterme (Güncellendi) ---
function bildirimGoster(baslik, mesaj) {
  const notificationId = `web-defterim-notif-${Date.now()}`;
  // Proje kök dizininde 'icons' klasörü olduğunu varsayalım
  const iconPath = 'icons/icon128.png';

  console.log(`[bildirimGoster] Bildirim gösterilecek: Başlık="${baslik}", Mesaj="${mesaj}", Icon="${iconPath}"`);

  // Önce mevcut aynı ID'li bildirimi temizle (isteğe bağlı, hızlı tıklamalarda üst üste binmeyi önler)
  // chrome.notifications.clear(notificationId, (wasCleared) => {
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon128.png', // manifest.json'daki yola göre ayarla
        title: `Web Defterim - ${baslik}`,
        message: mesaj.substring(0, 250)
      }, (createdNotificationId) => {
          // Bildirim oluşturma sonrası hata kontrolü
          if (chrome.runtime.lastError) {
              console.error(`[bildirimGoster] Bildirim oluşturma hatası (ID: ${notificationId}):`, chrome.runtime.lastError);
              // Alternatif olarak console'a log basmak
              console.warn(`BİLDİRİM GÖSTERİLEMEDİ - Başlık: ${baslik}, Mesaj: ${mesaj}`);
          } else {
              console.log(`[bildirimGoster] Bildirim başarıyla oluşturuldu/gösterildi (ID: ${createdNotificationId})`);
              // Bildirimi birkaç saniye sonra otomatik kapat (isteğe bağlı)
              // setTimeout(() => {
              //     chrome.notifications.clear(createdNotificationId);
              // }, 5000); // 5 saniye
          }
      });
  // }); // clear kullanılıyorsa kapatma parantezi
}

// Service Worker başlangıç logu
console.log("[Web Defterim] Service Worker (v3.1) başlatıldı.");