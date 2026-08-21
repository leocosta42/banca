import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Para funcionar com a API-Sports (Football Data), você precisará de uma chave (API_KEY)
    // Se a chave não estiver no .env, usamos os dados simulados que geramos para não quebrar a interface
    const API_KEY = process.env.API_SPORTS_KEY;
    
    if (!API_KEY) {
        // Fallback: Dados Inteligentes Baseados nos algoritmos discutidos (Mock)
        // Quando você colocar a API_KEY no .env, ele passará a puxar os dados reais abaixo.
        const mockData = [
            { liga: "🇩🇪 DFB-Pokal", jogo: "St. Tönis x Frankfurt", hist: "92%", just: "Frankfurt projeta 1.15 xG no 1ºT.", conf: "Muito Alto", sug: "Pré-Jogo (Asiático)" },
            { liga: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier", jogo: "Arsenal x Coventry", hist: "85%", just: "Blitz inicial absurda do Arsenal.", conf: "Muito Alto", sug: "Live > 10 min" },
            { liga: "🇹🇷 Super Lig", jogo: "Erzurumspor x Galatasaray", hist: "81%", just: "Galatasaray marca/sofre no HT.", conf: "Alto", sug: "Live > 15 min" },
            { liga: "🇫🇷 Ligue 1", jogo: "Marseille x Strasbourg", hist: "79%", just: "Jogos abertos antes dos 35'.", conf: "Alto", sug: "Live > 20 min" },
            { liga: "🇸🇦 Pro League", jogo: "Al Qadsiah x Al Ittihad", hist: "77%", just: "Ittihad agressivo, defesa exposta.", conf: "Alto", sug: "Pré-Jogo" }
        ];
        return NextResponse.json({ success: true, source: 'mock', data: mockData });
    }

    // ==========================================
    // LOGICA REAL DE INGESTÃO (API-SPORTS)
    // ==========================================
    
    // Puxa os jogos do dia (fixtures)
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
        headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io'
        }
    });

    const apiData = await response.json();
    
    // Algoritmo de Triagem de Dados (Pipeline)
    const opportunities = [];
    
    // Varre os jogos recebidos
    if(apiData.response) {
        for(let match of apiData.response) {
            // Regra 1: Filtro de Ligas Ofensivas (IDs fictícios para o exemplo)
            const allowedLeagues = [39, 140, 61, 78, 307]; // Ex: Premier League, La Liga, Ligue 1, Bundesliga, Pro League
            if(!allowedLeagues.includes(match.league.id)) continue;
            
            // Na API real, precisaríamos fazer uma segunda chamada para puxar estatísticas
            // Aqui estamos montando o objeto para o Frontend
            opportunities.push({
                liga: match.league.name,
                jogo: `${match.teams.home.name} x ${match.teams.away.name}`,
                hist: "Calculando...", // Requereria endpoint /fixtures/statistics
                just: "Filtro de Liga Ofensiva ativado",
                conf: "Em análise",
                sug: "Live"
            });

            // Limite de 20 jogos para não estourar a tela
            if(opportunities.length >= 20) break;
        }
    }

    return NextResponse.json({ success: true, source: 'api', data: opportunities });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
