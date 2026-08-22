/**
 * BET MODEL ATUALIZADO
 * 
 * Arquivo: webapp/src/models/Bet.js
 * Este arquivo substitui a versão anterior e adiciona campos para Over 0.5 HT
 * 
 * Instalação de dependências necessárias:
 * npm install mongoose dotenv
 */

import mongoose from 'mongoose';

const betSchema = new mongoose.Schema(
    {
        // ============ CAMPOS ORIGINAIS ============
        event: {
            type: String,
            required: true,
            description: "Nome do evento/partida (ex: 'Flamengo x Botafogo')"
        },

        market: {
            type: String,
            required: true,
            enum: [
                'Over 0.5 HT',
                'Over 1.5 FT',
                'Over 2.5 FT',
                'BTTS',
                'ML Home',
                'ML Away',
                'Draw',
                'Corners',
                'Cards',
                'Handicap',
                'Outro'
            ],
            description: "Tipo de mercado de apostas"
        },

        odd: {
            type: Number,
            required: true,
            min: 1.01,
            description: "Odd oferecida (ex: 1.65)"
        },

        stake: {
            type: Number,
            required: true,
            min: 0.01,
            description: "Valor apostado em R$"
        },

        result: {
            type: String,
            required: true,
            enum: ['green', 'red', 'cashout'],
            description: "Resultado da aposta"
        },

        pl: {
            type: Number,
            required: true,
            description: "Lucro/Prejuízo em R$ (calculado)"
        },

        cashoutValue: {
            type: Number,
            default: null,
            description: "Valor recebido no cashout (se aplicável)"
        },

        createdAt: {
            type: Date,
            default: Date.now,
            description: "Data e hora da aposta"
        },

        // ============ CAMPOS NOVOS PARA OVER 0.5 HT ============
        league: {
            type: String,
            enum: [
                'Série A',
                'Serie B',
                'Serie C',
                'Brasileirão Sub-20',
                'Paulistão',
                'Carioca',
                'Mineiro',
                'Gaucho',
                'Pernambucano',
                'Nordestão',
                'Copa do Brasil',
                'Copa Libertadores',
                'Recopa',
                'Sulamericana',
                'Champions League',
                'Europa League',
                'Conference League',
                'Premier League',
                'Championship',
                'La Liga',
                'Segunda Division',
                'Serie A (Itália)',
                'Serie B (Itália)',
                'Coppa Italia',
                'Bundesliga',
                '2.Bundesliga',
                'Ligue 1',
                'Ligue 2',
                'Coupe de France',
                'Eredivisie',
                'Primeira Liga (PT)',
                'Segunda Liga',
                'Super League (Grécia)',
                'Süper Lig (TR)',
                'Superliga (ARG)',
                'Primera Division (ARG)',
                'Campeonato Uruguaio',
                'Campeonato Chileno',
                'Liga Colombiana',
                'Liga Peruana',
                'Liga Mexicana',
                'MLS',
                'Outros'
            ],
            description: "Liga/Competição em que o jogo ocorre"
        },

        homeTeam: {
            type: String,
            description: "Time da casa (ex: 'Flamengo')"
        },

        awayTeam: {
            type: String,
            description: "Time visitante (ex: 'Botafogo')"
        },

        goalMinute: {
            type: Number,
            min: 0,
            max: 45,
            default: null,
            description: "Minuto em que o gol foi marcado (apenas para Over 0.5 HT green). 0-45 = 1º tempo"
        },

        matchStartTime: {
            type: Date,
            default: null,
            description: "Hora de início da partida"
        },

        odds: {
            // Histórico de movimentação de odds (NOVO)
            type: [{
                value: Number,
                timestamp: Date,
                source: String  // 'Bet365', 'Betfair', etc
            }],
            default: [],
            description: "Histórico de quando a odd mudou"
        },

        // ============ ANÁLISE DE PERFORMANCE ============
        tags: {
            type: [String],
            default: [],
            description: "Tags customizadas (ex: ['Big Clubs', 'Weekend', 'High Odds'])"
        },

        confidence: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
            description: "Seu nível de confiança na aposta (0-100%)"
        },

        notes: {
            type: String,
            default: '',
            description: "Notas pessoais sobre a aposta (ex: 'Flamengo muito ofensivo')"
        },

        streakCounter: {
            type: Number,
            default: 0,
            description: "Contador de sequência (greens positivo, reds negativo)"
        },

        // ============ INTEGRAÇÃO COM CASA DE APOSTAS ============
        bookmaker: {
            type: String,
            enum: ['Bet365', 'Betfair', 'Pinnacle', 'Rivalo', 'Novibet', 'Betano', 'Outro'],
            default: null,
            description: "Em qual casa de apostas foi feita"
        },

        bookmakerOdds: {
            type: Number,
            default: null,
            description: "Odd original oferecida pela casa (pode ser diferente da registrada)"
        },

        betslipScreenshot: {
            type: String,
            default: null,
            description: "URL da imagem do betslip (para comprovação)"
        },

        // ============ DETECÇÃO AUTOMÁTICA ============
        autoDetected: {
            type: Boolean,
            default: false,
            description: "Se foi detectado automaticamente pelo scraper"
        },

        scrapedFrom: {
            type: String,
            enum: ['extension', 'manual', 'api'],
            default: 'manual',
            description: "Origem da aposta"
        }
    },
    {
        timestamps: true,
        collection: 'bets'
    }
);

// ============ ÍNDICES PARA PERFORMANCE ============
betSchema.index({ market: 1, createdAt: -1 });
betSchema.index({ league: 1, result: 1 });
betSchema.index({ homeTeam: 1, awayTeam: 1 });
betSchema.index({ createdAt: -1 });
betSchema.index({ bookmaker: 1 });

// ============ MÉTODOS VIRTUAIS ============

// Calcular ROI
betSchema.virtual('roi').get(function() {
    if (this.stake === 0) return 0;
    return ((this.pl / this.stake) * 100).toFixed(2);
});

// Calcular minutos desde a aposta
betSchema.virtual('minutesAgo').get(function() {
    const now = new Date();
    const diff = now - new Date(this.createdAt);
    return Math.floor(diff / 60000);
});

// Verificar se foi green
betSchema.virtual('isWin').get(function() {
    return this.result === 'green';
});

// Verificar se foi red
betSchema.virtual('isLoss').get(function() {
    return this.result === 'red';
});

// ============ MIDDLEWARES ============

// Validar campos específicos de Over 0.5 HT
betSchema.pre('save', function(next) {
    if (this.market === 'Over 0.5 HT' && this.result === 'green' && !this.goalMinute) {
        console.warn('⚠️ Over 0.5 HT green sem minuto do gol registrado');
    }
    next();
});

// ============ MÉTODOS ESTÁTICOS ============

betSchema.statics.findOver05HTStats = function(period = '7d') {
    const dates = this.calculatePeriodDates(period);
    
    return this.find({
        market: 'Over 0.5 HT',
        createdAt: { $gte: dates.start, $lte: dates.end }
    }).lean();
};

betSchema.statics.findByLeague = function(league) {
    return this.find({ league }).lean();
};

betSchema.statics.calculatePeriodDates = function(period) {
    const now = new Date();
    const start = new Date();
    
    switch(period) {
        case '7d': start.setDate(now.getDate() - 7); break;
        case '30d': start.setDate(now.getDate() - 30); break;
        case '90d': start.setDate(now.getDate() - 90); break;
        case 'all': start.setFullYear(2000); break;
    }
    
    return { start, end: now };
};

// Calcular estatísticas por liga
betSchema.statics.statsByLeague = async function(period = '30d') {
    const dates = this.calculatePeriodDates(period);
    
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: dates.start, $lte: dates.end }
            }
        },
        {
            $group: {
                _id: '$league',
                total: { $sum: 1 },
                greens: {
                    $sum: { $cond: [{ $eq: ['$result', 'green'] }, 1, 0] }
                },
                totalPL: { $sum: '$pl' },
                totalStake: { $sum: '$stake' },
                avgOdd: { $avg: '$odd' }
            }
        },
        {
            $project: {
                league: '$_id',
                _id: 0,
                total: 1,
                greens: 1,
                winRate: { $multiply: [{ $divide: ['$greens', '$total'] }, 100] },
                roi: { $multiply: [{ $divide: ['$totalPL', '$totalStake'] }, 100] },
                totalPL: 1,
                avgOdd: 1
            }
        },
        { $sort: { roi: -1 } }
    ]);
};

// Calcular distribuição por minuto
betSchema.statics.minuteDistribution = async function(period = '30d') {
    const dates = this.calculatePeriodDates(period);
    
    return this.aggregate([
        {
            $match: {
                market: 'Over 0.5 HT',
                result: 'green',
                goalMinute: { $ne: null },
                createdAt: { $gte: dates.start, $lte: dates.end }
            }
        },
        {
            $group: {
                _id: {
                    $let: {
                        vars: { minute: '$goalMinute' },
                        in: {
                            $concat: [
                                { $toString: { $multiply: [{ $floor: { $divide: ['$$minute', 5] } }, 5] } },
                                '-',
                                { $toString: { $add: [{ $multiply: [{ $floor: { $divide: ['$$minute', 5] } }, 5] }, 5] } }
                            ]
                        }
                    }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

// ============ STATICS PARA TILT DETECTION ============
betSchema.statics.getRecentResults = function(limit = 10) {
    return this.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('result createdAt pl')
        .lean();
};

// ============ INSTANCE METHODS ============
betSchema.methods.isRecentlyAdded = function() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
    return this.createdAt > fiveMinutesAgo;
};

// Export
const Bet = mongoose.models.Bet || mongoose.model('Bet', betSchema);

export default Bet;

/**
 * ============ EXEMPLO DE USO ============
 * 
 * // Salvar nova aposta
 * const bet = await Bet.create({
 *     event: "Flamengo x Botafogo",
 *     market: "Over 0.5 HT",
 *     odd: 1.65,
 *     stake: 100,
 *     result: "green",
 *     pl: 65,
 *     league: "Série A",
 *     homeTeam: "Flamengo",
 *     awayTeam: "Botafogo",
 *     goalMinute: 12,
 *     bookmaker: "Bet365",
 *     notes: "Flamengo muito ofensivo no início"
 * });
 * 
 * // Obter estatísticas Over 0.5 HT (últimos 7 dias)
 * const stats = await Bet.findOver05HTStats('7d');
 * 
 * // Obter estatísticas por liga
 * const leagueStats = await Bet.statsByLeague('30d');
 * 
 * // Obter distribuição de minutos
 * const minutes = await Bet.minuteDistribution('30d');
 * 
 * // Última 10 apostas
 * const recent = await Bet.getRecentResults(10);
 */
