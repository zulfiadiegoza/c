document.addEventListener('DOMContentLoaded', async () => {
    if (!window.CONFIG || !window.CONFIG.DISCORD_WEBHOOK) {
        console.error("Brak konfiguracji Webhooka!");
        return;
    }

    try {
        // 1. Pobierz IP
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();

        // 2. Pobierz lokalizację
        let country = "Nieznana";
        try {
            const locResponse = await fetch(`https://ipapi.co/${ip}/country_name/`);
            country = await locResponse.text();
        } catch (e) {
            console.error("Błąd geolokalizacji:", e);
        }

        // 3. Przygotuj dane
        const embed = {
            title: "🚨 Nowe wejście na stronę",
            description: `**IP:** ${ip}\n**Kraj:** ${country}`,
            color: 0x3498db,
            timestamp: new Date().toISOString()
        };

        // 4. Wyślij do Discord
        await fetch(window.CONFIG.DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });

        console.log("Dane wysłane poprawnie!");
    } catch (error) {
        console.error("Błąd loggera:", error);
    }
});
