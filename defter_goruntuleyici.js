const yukleniyorDiv = document.getElementById('yukleniyor');
const icerikAlaniDiv = document.getElementById('icerikAlani');

console.log("Defter Görüntüleyici Script'i çalıştı.");

// Sayfa yüklendiğinde arka plana içerik isteği gönder
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Yüklendi. Arka plana içerik isteği gönderiliyor...");
    chrome.runtime.sendMessage({ action: "getDefterIcerik" }, (response) => {
        yukleniyorDiv.style.display = 'none'; // Yükleniyor mesajını gizle

        if (chrome.runtime.lastError) {
            console.error("Mesaj gönderme/alma hatası:", chrome.runtime.lastError);
            icerikAlaniDiv.innerHTML = `<p style="color: red; text-align: center;">Defter içeriği yüklenirken bir hata oluştu: ${chrome.runtime.lastError.message}</p>`;
            icerikAlaniDiv.style.display = 'block';
            return;
        }

        if (response && response.success && response.htmlContent) {
            console.log("İçerik başarıyla alındı. Sayfaya ekleniyor...");
            // ÖNEMLİ: Doğrudan innerHTML kullanmak yerine, potansiyel güvenlik risklerini
            // azaltmak için bir DOMParser veya iframe kullanmak daha güvenli olabilir.
            // Ancak, kendi kaydettiğimiz içeriğe güvendiğimiz varsayımıyla şimdilik innerHTML kullanalım.
            // Dikkat: Eğer kaydedilen HTML içinde zararlı scriptler varsa bu risklidir.
            icerikAlaniDiv.innerHTML = response.htmlContent;
            icerikAlaniDiv.style.display = 'block';

            // Gelen HTML içindeki scriptleri çalıştırmayı engellemek için basit bir yöntem
            // (Tamamen güvenli değil ama temel önlem)
            const scripts = icerikAlaniDiv.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            console.log(`${scripts.length} adet script etiketi kaldırıldı.`);

        } else if (response && !response.success) {
            console.error("Arka plan içerik alırken hata bildirdi:", response.error);
            icerikAlaniDiv.innerHTML = `<p style="color: red; text-align: center;">Defter içeriği alınamadı: ${response.error || 'Bilinmeyen Hata'}</p>`;
            icerikAlaniDiv.style.display = 'block';
        } else {
            console.error("Arka plandan beklenmedik veya boş yanıt alındı:", response);
             icerikAlaniDiv.innerHTML = `<p style="color: orange; text-align: center;">Defter içeriği yüklenemedi. Yanıt alınamadı.</p>`;
             icerikAlaniDiv.style.display = 'block';
        }
    });
});