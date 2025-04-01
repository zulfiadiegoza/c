function _getDeviceData() {
    // Poprawione wykrywanie systemu operacyjnego
    const getOS = () => {
        const userAgent = navigator.userAgent;
        if (userAgent.includes("Windows")) return "Windows";
        if (userAgent.includes("Mac")) return "macOS";
        if (userAgent.includes("Linux")) return "Linux";
        if (userAgent.includes("Android")) return "Android";
        if (userAgent.includes("iOS")) return "iOS";
        return navigator.platform || "Nieznany";
    };

    // Poprawione wykrywanie rdzeni CPU
    const cores = navigator.hardwareConcurrency;
    const realCores = cores > 16 ? "Nieznana (>" + cores + ")" : cores; // Ograniczenie do realistycznych wartości

    return {
        // System
        os: getOS(),
        userAgent: navigator.userAgent,
        
        // Ekran
        screen: `${window.screen.width}x${window.screen.height}`,
        colorDepth: `${window.screen.colorDepth}-bit`,
        
        // Urządzenie
        cpuCores: realCores,
        deviceMemory: this._getRealMemory(),
        touchSupport: navigator.maxTouchPoints > 0,
        isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent)
    };
}

function _getRealMemory() {
    if (!navigator.deviceMemory) return "Nieznana";
    const mem = navigator.deviceMemory;
    return mem > 64 ? "Nieznana (>64GB)" : `${mem} GB`; // Ograniczenie do realistycznych wartości
}

function _formatDevice(data) {
    return `
    **System:** ${data.os}
    **Typ:** ${data.isMobile ? 'Mobilne' : 'Desktop'}
    **Ekran:** ${data.screen} (${data.colorDepth})
    **Pamięć RAM:** ${data.deviceMemory}
    **Rdzenie CPU:** ${data.cpuCores}
    **Touch:** ${data.isMobile ? 'Tak' : 'Nie'}
    **Przeglądarka:** ${this._getBrowserName()}
    `;
}

function _getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox")) return "Firefox" + ua.split("Firefox/")[1]?.split(" ")[0];
    if (ua.includes("Chrome")) return "Chrome" + ua.split("Chrome/")[1]?.split(" ")[0];
    if (ua.includes("Safari")) return "Safari" + ua.split("Version/")[1]?.split(" ")[0];
    return "Nieznana";
}
