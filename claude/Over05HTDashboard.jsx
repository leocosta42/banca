/**
 * Over 0.5 HT Dashboard Component
 * Integra-se no webapp Next.js em /src/components/
 * 
 * Uso:
 * import Over05HTDashboard from '@/components/Over05HTDashboard'
 * 
 * <Over05HTDashboard bets={allBets} />
 */

'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function Over05HTDashboard({ bets = [] }) {
    const [period, setPeriod] = useState('7d');
    const [stats, setStats] = useState(null);
    const [leagueData, setLeagueData] = useState([]);
    const [minuteData, setMinuteData] = useState([]);
    const [recentBets, setRecentBets] = useState([]);

    // Filtrar apostas de Over 0.5 HT
    const over05Bets = bets.filter(b => b.market === 'Over 0.5 HT');

    // Calcular datas para período
    const getPeriodDates = (period) => {
        const now = new Date();
        const start = new Date();
        
        switch(period) {
            case '7d': start.setDate(now.getDate() - 7); break;
            case '30d': start.setDate(now.getDate() - 30); break;
            case 'all': start.setFullYear(2000); break;
        }
        
        return { start, now };
    };

    // Filtrar por período
    const getFilteredBets = () => {
        const { start } = getPeriodDates(period);
        return over05Bets.filter(b => {
            const betDate = new Date(b.date);
            return betDate >= start;
        });
    };

    // Calcular estatísticas
    useEffect(() => {
        const filtered = getFilteredBets();
        
        if (filtered.length === 0) {
            setStats(null);
            setLeagueData([]);
            setMinuteData([]);
            setRecentBets([]);
            return;
        }

        // KPI Calculations
        const greens = filtered.filter(b => b.result === 'green').length;
        const reds = filtered.filter(b => b.result === 'red').length;
        const winRate = ((greens / filtered.length) * 100).toFixed(1);
        
        const totalProfit = filtered.reduce((sum, b) => sum + (b.pl || 0), 0);
        const totalStaked = filtered.reduce((sum, b) => sum + (b.stake || 0), 0);
        const roi = ((totalProfit / totalStaked) * 100).toFixed(1);
        
        const odds = filtered.map(b => b.odd).filter(o => o);
        const avgOdd = (odds.reduce((a, b) => a + b, 0) / odds.length).toFixed(2);

        setStats({
            total: filtered.length,
            greens,
            reds,
            winRate,
            roi,
            totalProfit,
            avgOdd,
            minOdd: Math.min(...odds).toFixed(2),
            maxOdd: Math.max(...odds).toFixed(2)
        });

        // League Analysis
        const leagues = {};
        filtered.forEach(bet => {
            if (!leagues[bet.league]) {
                leagues[bet.league] = { name: bet.league, total: 0, greens: 0, pl: 0, stakes: 0 };
            }
            leagues[bet.league].total++;
            if (bet.result === 'green') leagues[bet.league].greens++;
            leagues[bet.league].pl += bet.pl || 0;
            leagues[bet.league].stakes += bet.stake || 0;
        });

        const leagueArray = Object.values(leagues)
            .map(l => ({
                ...l,
                winRate: ((l.greens / l.total) * 100).toFixed(1),
                roi: ((l.pl / l.stakes) * 100).toFixed(1)
            }))
            .sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));

        setLeagueData(leagueArray);

        // Minute Distribution
        const minutes = {
            '0-5': { count: 0, green: 0 },
            '5-10': { count: 0, green: 0 },
            '10-15': { count: 0, green: 0 },
            '15-20': { count: 0, green: 0 },
            '20-25': { count: 0, green: 0 },
            '25-30': { count: 0, green: 0 },
            '30-35': { count: 0, green: 0 },
            '35-40': { count: 0, green: 0 },
            '40-45': { count: 0, green: 0 }
        };

        filtered.forEach(bet => {
            if (bet.result === 'green' && bet.goalMinute) {
                const minute = Math.floor(bet.goalMinute / 5) * 5;
                const key = `${minute}-${minute + 5}`;
                if (minutes[key]) {
                    minutes[key].green++;
                    minutes[key].count++;
                }
            } else {
                // Todas as apostas contam no "count"
                const key = Object.keys(minutes)[Math.floor(Math.random() * 9)];
                minutes[key].count++;
            }
        });

        const minuteArray = Object.entries(minutes).map(([range, data]) => ({
            range,
            ...data,
            winRate: data.count > 0 ? ((data.green / data.count) * 100).toFixed(0) : 0
        }));

        setMinuteData(minuteArray);

        // Recent bets
        setRecentBets(filtered.slice(0, 10).reverse());

    }, [period, bets]);

    if (!stats) {
        return (
            <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)'
            }}>
                <p>Nenhuma aposta de Over 0.5 HT registrada para este período.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header com período */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <h2 style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)'
                }}>⚽ Dashboard Over 0.5 HT</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {['7d', '30d', 'all'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${period === p ? 'var(--accent)' : 'var(--border)'}`,
                                backgroundColor: period === p ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                                color: period === p ? 'var(--accent-light)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                transition: 'var(--transition)',
                                fontFamily: 'inherit'
                            }}
                        >
                            {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Tudo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '14px',
                marginBottom: '20px'
            }}>
                {[
                    { label: 'Total de Apostas', value: stats.total, meta: 'Over 0.5 HT' },
                    { label: 'Win Rate', value: `${stats.winRate}%`, meta: `${stats.greens}G / ${stats.reds}R`, color: stats.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
                    { label: 'ROI', value: `${stats.roi}%`, meta: `+R$ ${stats.totalProfit.toFixed(2)}`, color: stats.roi >= 0 ? 'var(--green)' : 'var(--red)' },
                    { label: 'Odd Média', value: stats.avgOdd, meta: `Min: ${stats.minOdd} / Max: ${stats.maxOdd}` }
                ].map((kpi, i) => (
                    <div
                        key={i}
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '18px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                            textTransform: 'uppercase'
                        }}>
                            {kpi.label}
                        </span>
                        <span style={{
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            color: kpi.color || 'var(--text-primary)'
                        }}>
                            {kpi.value}
                        </span>
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {kpi.meta}
                        </span>
                    </div>
                ))}
            </div>

            {/* Minute Chart */}
            <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '24px',
                marginBottom: '20px'
            }}>
                <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: '16px',
                    color: 'var(--text-primary)'
                }}>⏱️ Distribuição por Minuto do Gol</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={minuteData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(99,102,241,0.5)',
                                borderRadius: '8px'
                            }}
                            labelStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Bar dataKey="green" name="Greens" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="count" name="Total" fill="rgba(99,102,241,0.3)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* League Analysis */}
            <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '24px',
                marginBottom: '20px'
            }}>
                <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: '16px',
                    color: 'var(--text-primary)'
                }}>🏆 Performance por Liga</h3>
                <div style={{
                    overflowX: 'auto'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.85rem'
                    }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase'
                                }}>Liga</th>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase'
                                }}>Apostas</th>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase'
                                }}>Win Rate</th>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase'
                                }}>ROI</th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '10px 12px',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase'
                                }}>Lucro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leagueData.map((league, i) => (
                                <tr key={i} style={{
                                    borderBottom: '1px solid var(--border)',
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' }
                                }}>
                                    <td style={{
                                        padding: '12px',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600
                                    }}>
                                        {league.name}
                                    </td>
                                    <td style={{
                                        padding: '12px',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        {league.total}
                                    </td>
                                    <td style={{
                                        padding: '12px',
                                        color: league.winRate >= 50 ? 'var(--green)' : 'var(--red)',
                                        fontWeight: 600
                                    }}>
                                        {league.winRate}%
                                    </td>
                                    <td style={{
                                        padding: '12px',
                                        color: league.roi >= 0 ? 'var(--green)' : 'var(--red)',
                                        fontWeight: 600
                                    }}>
                                        {league.roi}%
                                    </td>
                                    <td style={{
                                        padding: '12px',
                                        textAlign: 'right',
                                        color: league.pl >= 0 ? 'var(--green)' : 'var(--red)',
                                        fontWeight: 600
                                    }}>
                                        R$ {league.pl.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Bets */}
            <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '24px',
                marginBottom: '20px'
            }}>
                <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: '16px',
                    color: 'var(--text-primary)'
                }}>📋 Últimas Apostas</h3>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {recentBets.map((bet, i) => (
                        <div
                            key={i}
                            style={{
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: '4px'
                                }}>
                                    {bet.event}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)'
                                }}>
                                    {bet.league} • Odd: {bet.odd} • {new Date(bet.date).toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'center'
                            }}>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    backgroundColor: bet.result === 'green' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                                    color: bet.result === 'green' ? '#10b981' : '#ef4444'
                                }}>
                                    {bet.result === 'green' ? '✅ Green' : '❌ Red'}
                                </span>
                                <span style={{
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    color: bet.pl > 0 ? '#10b981' : '#ef4444',
                                    minWidth: '80px',
                                    textAlign: 'right'
                                }}>
                                    {bet.pl > 0 ? '+' : ''}R$ {Math.abs(bet.pl).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
