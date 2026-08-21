// Este script será injetado na página da casa de apostas quando clicar em "Extrair"
function scrapeBets() {
    console.log("Craque da Banca: Iniciando extração inteligente...");
    
    const extractedBets = [];
    
    // Heurística: A maioria dos cards de aposta da Bet365 resolvida
    // ficam dentro de divs específicas. Como as classes mudam, vamos procurar
    // todos os elementos que possuem a palavra "Aposta" ou "Stake" e "Retorno" ou "Ganhos"
    
    // Pega todos os spans e divs que têm "R$" 
    // Em vez de seletores exatos, vamos varrer a página buscando os containers de aposta.
    // Dica de extração genérica:
    
    const possibleCards = document.querySelectorAll('div');
    const betCards = [];
    
    possibleCards.forEach(div => {
        const text = div.innerText || "";
        // Verifica se é um card de aposta resolvida buscando palavras chave num mesmo container
        if(text.includes('Aposta') && (text.includes('Retorno') || text.includes('Ganhos')) && text.includes('R$')) {
            // Garante que não é a página inteira, e sim um card isolado (tamanho do texto limitado)
            if(text.length < 500 && text.length > 30) {
                // Checa se já não temos esse card (ou um parente/filho próximo)
                const alreadyExists = betCards.some(existing => existing.contains(div) || div.contains(existing));
                if(!alreadyExists) {
                    betCards.push(div);
                }
            }
        }
    });

    console.log(`Encontrados ${betCards.length} possíveis cards de aposta.`);

    betCards.forEach((card, index) => {
        try {
            const textLines = card.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            // Lógica de parsing de texto:
            // Geralmente a primeira ou segunda linha é o mercado/evento
            const eventInfo = textLines[0]; 
            
            // Buscar valores financeiros:
            let stake = 0;
            let returns = 0;
            let result = "red";
            
            textLines.forEach(line => {
                if(line.toLowerCase().includes('aposta') || line.toLowerCase().includes('stake')) {
                    const val = extractMoney(line);
                    if(val) stake = val;
                }
                if(line.toLowerCase().includes('retorno') || line.toLowerCase().includes('ganhos')) {
                    const val = extractMoney(line);
                    if(val) returns = val;
                }
            });

            // Determinar Red/Green
            if(returns > stake) result = "green";
            else if(returns > 0 && returns < stake) result = "cashout";

            // Tentar extrair a odd (Stake * Odd = Retorno -> Odd = Retorno/Stake)
            // Ou procurar "Odd" / "@" na string
            let odd = 1.00;
            if(stake > 0 && returns > 0 && result === 'green') {
                odd = (returns / stake);
            }

            extractedBets.push({
                id: "scraped_" + Date.now() + "_" + index,
                date: new Date().toISOString(),
                event: eventInfo + " (Scraped)",
                market: "Bet365 Market",
                odd: parseFloat(odd.toFixed(2)),
                stake: stake,
                result: result,
                cashoutValue: result === 'cashout' ? returns : 0,
                pl: returns - stake
            });

        } catch (e) {
            console.error("Erro ao analisar card de aposta", e);
        }
    });

    // Se a extração automática não achar nada (devido a alguma atualização agressiva do site),
    // retornamos dados fictícios apenas para mostrar que a comunicação funciona.
    if(extractedBets.length === 0) {
        alert("Craque da Banca: Não foi possível ler as apostas pelo layout atual. Usando dados de teste.");
        extractedBets.push({
            id: "teste_" + Date.now(),
            date: new Date().toISOString(),
            event: "Teste Conexão Bet365",
            market: "ML Teste",
            odd: 2.00,
            stake: 10.00,
            result: "green",
            cashoutValue: 0
        });
    }

    return extractedBets;
}

function extractMoney(str) {
    // Procura por "R$ 50,00" ou "50.00"
    const match = str.match(/(?:R\$)?\s*(\d+[.,]\d{2})/);
    if(match) {
        return parseFloat(match[1].replace(',', '.'));
    }
    return 0;
}

window.craqueDaBancaScraper = scrapeBets;
