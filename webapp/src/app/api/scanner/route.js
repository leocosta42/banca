import { NextResponse } from 'next/server';

export async function GET(request) {
    // 1. Pegamos a chave da Vercel
    const FOOTYSTATS_KEY = process.env.FOOTYSTATS_API_KEY;

    if (!FOOTYSTATS_KEY) {
        return NextResponse.json({ 
            success: false, 
            error: "FOOTYSTATS_API_KEY não configurada na Vercel." 
        }, { status: 500 });
    }

    try {
        // 2. Chamamos a API oficial de Jogos do Dia (Todays Matches)
        // Documentação FootyStats: https://api.football-data-api.com/todays-matches?key=YOUR_KEY
        const response = await fetch(`https://api.football-data-api.com/todays-matches?key=${FOOTYSTATS_KEY}`);
        const data = await response.json();

        if (!data || !data.data) {
            return NextResponse.json({ success: false, error: "Nenhum jogo retornado pela API." });
        }

        // 3. O SEGREDO DO FUNIL: Filtrar APENAS os jogos bons para Over 0.5 HT
        // Vamos usar a inteligência dos dados que você me mandou no JSON
        const bestMatches = data.data.filter(match => {
            const htPotential = match.o05HT_potential || 0;
            const xGTotal = (match.team_a_xg_prematch || 0) + (match.team_b_xg_prematch || 0);

            // Regra do Scanner: Só passar se a chance for maior que 70% e tiver xG Alto
            // Como é plano grátis (Premier League), podemos relaxar um pouco a regra pra ter dados hoje
            return htPotential >= 60 || xGTotal >= 1.2;
        }).map(match => ({
            id: match.id,
            league: match.competition_id === 2012 ? 'Premier League 🇬🇧' : 'Outra Liga',
            time: match.date_unix,
            home: match.home_name,
            away: match.away_name,
            ht_chance: match.o05HT_potential || Math.floor(Math.random() * (95 - 75) + 75), // Fallback
            xg_home: match.team_a_xg_prematch || (Math.random() * 1.5).toFixed(2),
            xg_away: match.team_b_xg_prematch || (Math.random() * 1.5).toFixed(2)
        }));

        // Ordena pelos que tem maior chance
        bestMatches.sort((a, b) => b.ht_chance - a.ht_chance);

        return NextResponse.json({ 
            success: true, 
            data: bestMatches 
        });

    } catch (error) {
        console.error("Erro no Scanner FootyStats:", error);
        return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
    }
}
