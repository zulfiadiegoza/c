// Prosty logger - test działania
console.log("Logger działa!");
if (CONFIG.DISCORD_WEBHOOK) {
    fetch(CONFIG.DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: "Test webhooka" })
    });
}
