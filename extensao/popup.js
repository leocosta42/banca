let extractedData = [];

document.getElementById('btn-extract').addEventListener('click', async () => {
    const status = document.getElementById('status');
    status.innerText = "Extraindo dados...";

    try {
        // 1. Pega a aba ativa
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 2. Injeta e executa o script de extração (content-scraper.js)
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-scraper.js']
        });

        // 3. Pega o retorno da função via eval() ou chamando diretamente
        const runScraper = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                if (window.craqueDaBancaScraper) return window.craqueDaBancaScraper();
                return [];
            }
        });

        extractedData = runScraper[0].result;

        if (extractedData && extractedData.length > 0) {
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('btn-sync').style.display = 'block';
            document.getElementById('bet-count').innerText = extractedData.length;
            status.innerText = "Extração concluída!";
        } else {
            status.innerText = "Nenhuma aposta encontrada nesta página.";
        }
    } catch (err) {
        console.error(err);
        status.innerText = "Erro ao extrair. Você está na aba da Bet365?";
        
        // MOCKUP PARA TESTE LOCAL: Se falhar (pq não está na Bet365), vamos simular que achou pra você testar
        setTimeout(() => {
            extractedData = [
                { id: "bet_test1", date: new Date().toISOString(), event: "Simulação de Scraper - Green", market: "Over 1.5 FT", odd: 1.80, stake: 20, result: "green", cashoutValue: 0 },
                { id: "bet_test2", date: new Date().toISOString(), event: "Simulação de Scraper - Red", market: "Ambas Marcam", odd: 1.95, stake: 10, result: "red", cashoutValue: 0 }
            ];
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('btn-sync').style.display = 'block';
            document.getElementById('bet-count').innerText = "2 (Simuladas)";
            status.innerText = "Aba errada, usando dados de teste.";
        }, 1500);
    }
});

document.getElementById('btn-sync').addEventListener('click', async () => {
    const status = document.getElementById('status');
    status.innerText = "Procurando painel Craque da Banca...";

    try {
        // Encontra a aba onde o painel (localhost:8080) está aberto
        const tabs = await chrome.tabs.query({ url: "http://localhost:8080/*" });
        
        if (tabs.length === 0) {
            status.innerText = "Erro: Abra o painel no localhost:8080 primeiro!";
            return;
        }

        const dashboardTab = tabs[0];
        
        // Envia as apostas para o dashboard-connector.js que está rodando lá
        chrome.tabs.sendMessage(dashboardTab.id, {
            type: "SYNC_BETS",
            payload: extractedData
        }, (response) => {
            if (chrome.runtime.lastError) {
                status.innerText = "Erro na comunicação com o painel.";
            } else {
                status.innerText = "✅ Apostas enviadas com sucesso!";
                document.getElementById('btn-sync').disabled = true;
                setTimeout(() => window.close(), 2000);
            }
        });
    } catch (err) {
        console.error(err);
        status.innerText = "Erro inesperado ao sincronizar.";
    }
});
