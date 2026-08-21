// Este script roda na aba do seu painel (localhost:8080)
// Ele escuta mensagens vindas do popup da extensão e repassa para a página (app.js)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SYNC_BETS") {
        console.log("Craque da Banca: Recebendo apostas da extensão!", message.payload);
        
        // Dispara um evento customizado na window para o app.js pegar
        window.postMessage({
            type: "EXTENSION_BETS_SYNC",
            data: message.payload
        }, "*");

        sendResponse({ status: "success" });
    }
});
