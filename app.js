/* ============================================
   CRAQUE DA BANCA — App Logic
   ============================================ */

// ============ STATE ============
const STATE_KEY = 'craque_banca_state';

const defaultState = {
    initialBankroll: 200,
    bankroll: 200,
    bets: [],
    config: {
        stopLoss: 40,
        stopWin: 30,
        tiltThreshold: 3
    }
};

let state = loadState();
let bankrollChart = null;

function loadState() {
    try {
        const saved = localStorage.getItem(STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with defaults for new fields
            return { ...defaultState, ...parsed, config: { ...defaultState.config, ...parsed.config } };
        }
    } catch (e) { console.error('Error loading state:', e); }
    return { ...defaultState };
}

function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// ============ FORMATTERS ============
function formatBRL(value) {
    return 'R$ ' + value.toFixed(2).replace('.', ',');
}

function formatPercent(value) {
    return value.toFixed(1).replace('.', ',') + '%';
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============ CALCULATIONS ============
function recalculateBankroll() {
    let bankroll = state.initialBankroll;
    state.bets.forEach(bet => {
        bankroll += bet.pl;
    });
    state.bankroll = Math.round(bankroll * 100) / 100;
}

function calculatePL(bet) {
    if (bet.result === 'green') {
        return Math.round((bet.stake * (bet.odd - 1)) * 100) / 100;
    } else if (bet.result === 'red') {
        return -bet.stake;
    } else if (bet.result === 'cashout') {
        return Math.round((bet.cashoutValue - bet.stake) * 100) / 100;
    }
    return 0;
}

function getStreak() {
    if (state.bets.length === 0) return { type: null, count: 0 };
    const sorted = [...state.bets].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastResult = sorted[0].result === 'cashout' ? 'cashout' : sorted[0].result;
    let count = 0;
    for (const bet of sorted) {
        const r = bet.result === 'cashout' ? 'cashout' : bet.result;
        if (r === lastResult) count++;
        else break;
    }
    return { type: lastResult, count };
}

function getTodayPL() {
    const today = new Date().toISOString().slice(0, 10);
    return state.bets
        .filter(b => b.date.slice(0, 10) === today)
        .reduce((sum, b) => sum + b.pl, 0);
}

function getConsecutiveReds() {
    const sorted = [...state.bets].sort((a, b) => new Date(b.date) - new Date(a.date));
    let count = 0;
    for (const bet of sorted) {
        if (bet.result === 'red') count++;
        else break;
    }
    return count;
}

// ============ STAKE CALCULATOR ============
function calculateStake() {
    const odd = parseFloat(document.getElementById('calc-odd').value);
    const prob = parseFloat(document.getElementById('calc-prob').value);
    const results = document.getElementById('calc-results');

    if (!odd || !prob || odd <= 1 || prob <= 0 || prob >= 100) {
        results.style.display = 'none';
        return;
    }

    const p = prob / 100;
    const kelly = ((p * odd) - 1) / (odd - 1);
    const edge = (p * odd - 1) * 100;

    const bank = state.bankroll;

    document.getElementById('calc-kelly25').textContent = kelly > 0
        ? formatBRL(bank * kelly * 0.25)
        : 'Sem valor (sem edge)';
    document.getElementById('calc-kelly50').textContent = kelly > 0
        ? formatBRL(bank * kelly * 0.5)
        : 'Sem valor (sem edge)';
    document.getElementById('calc-flat2').textContent = formatBRL(bank * 0.02);
    document.getElementById('calc-flat3').textContent = formatBRL(bank * 0.03);

    const edgeEl = document.getElementById('calc-edge-value');
    edgeEl.textContent = formatPercent(edge);
    edgeEl.className = edge >= 0 ? 'positive' : 'negative';

    results.style.display = 'flex';
}

// ============ BET REGISTRATION ============
function registerBet(e) {
    e.preventDefault();

    // Check stop loss
    const todayPL = getTodayPL();
    if (state.config.stopLoss && todayPL <= -state.config.stopLoss) {
        alert('⛔ STOP LOSS atingido! Você já perdeu R$ ' + Math.abs(todayPL).toFixed(2) + ' hoje. Pare por hoje!');
        return false;
    }
    if (state.config.stopWin && todayPL >= state.config.stopWin) {
        if (!confirm('🎯 STOP WIN atingido! Você já ganhou R$ ' + todayPL.toFixed(2) + ' hoje. Tem certeza que quer continuar?')) {
            return false;
        }
    }

    const result = document.querySelector('input[name="bet-result"]:checked');
    if (!result) { alert('Selecione o resultado da aposta.'); return false; }

    const bet = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: new Date().toISOString(),
        event: document.getElementById('bet-event').value.trim(),
        market: document.getElementById('bet-market').value,
        odd: parseFloat(document.getElementById('bet-odd').value),
        stake: parseFloat(document.getElementById('bet-stake').value),
        result: result.value,
        cashoutValue: result.value === 'cashout'
            ? parseFloat(document.getElementById('bet-cashout-value').value) || 0
            : 0,
        pl: 0
    };

    bet.pl = calculatePL(bet);
    state.bets.push(bet);
    recalculateBankroll();
    saveState();
    refreshUI();

    // Reset form
    document.getElementById('bet-form').reset();
    document.getElementById('cashout-row').style.display = 'none';

    // Check tilt
    checkTilt();

    return false;
}

// Cashout value toggle
document.querySelectorAll('input[name="bet-result"]').forEach(radio => {
    radio.addEventListener('change', () => {
        document.getElementById('cashout-row').style.display =
            document.getElementById('result-cashout').checked ? 'grid' : 'none';
    });
});

// ============ DELETE BET ============
let pendingDeleteId = null;

function confirmDelete(id) {
    pendingDeleteId = id;
    document.getElementById('delete-modal').style.display = 'flex';
    document.getElementById('btn-confirm-delete').onclick = () => {
        state.bets = state.bets.filter(b => b.id !== pendingDeleteId);
        recalculateBankroll();
        saveState();
        refreshUI();
        closeDeleteModal();
    };
}

function closeDeleteModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('delete-modal').style.display = 'none';
    pendingDeleteId = null;
}

// ============ TILT DETECTION ============
function checkTilt() {
    const consecutiveReds = getConsecutiveReds();
    const tiltEl = document.getElementById('tilt-alert');
    const msgEl = document.getElementById('tilt-message');

    if (consecutiveReds >= state.config.tiltThreshold) {
        msgEl.textContent = `Você tem ${consecutiveReds} reds seguidas. Considere parar e reavaliar.`;
        tiltEl.style.display = 'flex';
    }
}

function dismissTilt() {
    document.getElementById('tilt-alert').style.display = 'none';
}

// ============ CONFIG ============
function openConfigModal() {
    document.getElementById('config-initial-bankroll').value = state.initialBankroll;
    document.getElementById('config-stop-loss').value = state.config.stopLoss || '';
    document.getElementById('config-stop-win').value = state.config.stopWin || '';
    document.getElementById('config-tilt-threshold').value = state.config.tiltThreshold;
    document.getElementById('config-modal').style.display = 'flex';
}

function closeConfigModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('config-modal').style.display = 'none';
}

function saveConfig() {
    const newInitial = parseFloat(document.getElementById('config-initial-bankroll').value);
    if (newInitial && newInitial !== state.initialBankroll) {
        state.initialBankroll = newInitial;
        recalculateBankroll();
    }
    state.config.stopLoss = parseFloat(document.getElementById('config-stop-loss').value) || 0;
    state.config.stopWin = parseFloat(document.getElementById('config-stop-win').value) || 0;
    state.config.tiltThreshold = parseInt(document.getElementById('config-tilt-threshold').value) || 3;
    saveState();
    refreshUI();
    closeConfigModal();
}

// ============ EXPORT CSV ============
function exportCSV() {
    if (state.bets.length === 0) { alert('Nenhuma aposta para exportar.'); return; }

    const headers = ['Data', 'Evento', 'Mercado', 'Odd', 'Stake', 'Resultado', 'P&L'];
    const rows = state.bets.map(b => [
        formatDate(b.date),
        b.event,
        b.market,
        b.odd.toFixed(2),
        b.stake.toFixed(2),
        b.result === 'green' ? 'Green' : b.result === 'red' ? 'Red' : 'Cashout',
        b.pl.toFixed(2)
    ]);

    let csv = '\uFEFF' + headers.join(';') + '\n';
    rows.forEach(r => csv += r.join(';') + '\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'historico_apostas_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
}

// ============ RENDER UI ============
function refreshUI() {
    renderKPIs();
    renderChart();
    renderHistory();
    renderMarketStats();
    renderLimitBadges();
    checkTilt();
}

function renderKPIs() {
    const totalBets = state.bets.length;
    const wins = state.bets.filter(b => b.result === 'green').length;
    const profit = state.bankroll - state.initialBankroll;
    const totalStaked = state.bets.reduce((s, b) => s + b.stake, 0);
    const roi = totalStaked > 0 ? (profit / totalStaked) * 100 : 0;
    const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;
    const streak = getStreak();
    const todayPL = getTodayPL();

    // Bankroll
    document.getElementById('kpi-bankroll').textContent = formatBRL(state.bankroll);

    // Profit
    const profitEl = document.getElementById('kpi-profit');
    profitEl.textContent = (profit >= 0 ? '+' : '') + formatBRL(profit);
    profitEl.className = 'kpi-value ' + (profit >= 0 ? 'positive' : 'negative');

    // ROI
    const roiEl = document.getElementById('kpi-roi');
    roiEl.textContent = (roi >= 0 ? '+' : '') + formatPercent(roi);
    roiEl.className = 'kpi-value ' + (roi >= 0 ? 'positive' : 'negative');

    // Win Rate
    document.getElementById('kpi-winrate').textContent = formatPercent(winRate);

    // Streak
    const streakEl = document.getElementById('kpi-streak');
    if (streak.type) {
        const icon = streak.type === 'green' ? '🟢' : streak.type === 'red' ? '🔴' : '🟡';
        streakEl.textContent = `${icon} ${streak.count}x`;
        streakEl.className = 'kpi-value ' + (streak.type === 'green' ? 'positive' : streak.type === 'red' ? 'negative' : '');
    } else {
        streakEl.textContent = '—';
        streakEl.className = 'kpi-value';
    }

    // Today
    const todayEl = document.getElementById('kpi-today');
    todayEl.textContent = (todayPL >= 0 ? '+' : '') + formatBRL(todayPL);
    todayEl.className = 'kpi-value ' + (todayPL >= 0 ? 'positive' : 'negative');
}

function renderLimitBadges() {
    document.getElementById('badge-stop-loss').textContent =
        state.config.stopLoss ? `SL: R$${state.config.stopLoss}` : 'SL: —';
    document.getElementById('badge-stop-win').textContent =
        state.config.stopWin ? `SW: R$${state.config.stopWin}` : 'SW: —';
}

function renderChart() {
    const ctx = document.getElementById('bankroll-chart').getContext('2d');
    const sorted = [...state.bets].sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = ['Início'];
    const data = [state.initialBankroll];
    let running = state.initialBankroll;

    sorted.forEach(bet => {
        running += bet.pl;
        labels.push(formatDate(bet.date).split(' ')[0]);
        data.push(Math.round(running * 100) / 100);
    });

    if (bankrollChart) bankrollChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    const isPositive = data[data.length - 1] >= state.initialBankroll;
    gradient.addColorStop(0, isPositive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    bankrollChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Banca',
                data,
                borderColor: isPositive ? '#10b981' : '#ef4444',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.3,
                pointRadius: data.length > 20 ? 0 : 4,
                pointHoverRadius: 6,
                pointBackgroundColor: isPositive ? '#10b981' : '#ef4444',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a2035',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#94a3b8',
                    bodyColor: '#f1f5f9',
                    bodyFont: { weight: '700' },
                    callbacks: {
                        label: ctx => formatBRL(ctx.parsed.y)
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 10 },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                y: {
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 },
                        callback: v => 'R$' + v
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                }
            }
        }
    });
}

function renderHistory() {
    const body = document.getElementById('history-body');
    const filterMarket = document.getElementById('filter-market').value;
    const filterResult = document.getElementById('filter-result').value;

    let filtered = [...state.bets].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filterMarket !== 'all') filtered = filtered.filter(b => b.market === filterMarket);
    if (filterResult !== 'all') filtered = filtered.filter(b => b.result === filterResult);

    // Update market filter options
    const marketSelect = document.getElementById('filter-market');
    const currentVal = marketSelect.value;
    const markets = [...new Set(state.bets.map(b => b.market))];
    marketSelect.innerHTML = '<option value="all">Todos os mercados</option>';
    markets.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (m === currentVal) opt.selected = true;
        marketSelect.appendChild(opt);
    });

    if (filtered.length === 0) {
        body.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhuma aposta encontrada.</td></tr>';
        return;
    }

    // Calculate running bankroll for display
    const allSorted = [...state.bets].sort((a, b) => new Date(a.date) - new Date(b.date));
    const bankrollMap = {};
    let running = state.initialBankroll;
    allSorted.forEach(b => {
        running += b.pl;
        bankrollMap[b.id] = Math.round(running * 100) / 100;
    });

    body.innerHTML = filtered.map(bet => {
        const resultLabel = bet.result === 'green' ? '✅ Green' : bet.result === 'red' ? '❌ Red' : '💵 Cashout';
        const resultClass = bet.result;
        const plClass = bet.pl >= 0 ? 'pl-positive' : 'pl-negative';
        const plSign = bet.pl >= 0 ? '+' : '';

        return `<tr>
            <td>${formatDate(bet.date)}</td>
            <td>${bet.event}</td>
            <td>${bet.market}</td>
            <td>${bet.odd.toFixed(2)}</td>
            <td>${formatBRL(bet.stake)}</td>
            <td><span class="result-badge ${resultClass}">${resultLabel}</span></td>
            <td class="${plClass}">${plSign}${formatBRL(bet.pl)}</td>
            <td>${formatBRL(bankrollMap[bet.id] || 0)}</td>
            <td><button class="btn-delete-row" onclick="confirmDelete('${bet.id}')" title="Excluir">🗑️</button></td>
        </tr>`;
    }).join('');
}

function renderMarketStats() {
    const container = document.getElementById('market-stats');

    if (state.bets.length === 0) {
        container.innerHTML = '<p class="empty-state">Registre apostas para ver sua performance por mercado.</p>';
        return;
    }

    const marketMap = {};
    state.bets.forEach(bet => {
        if (!marketMap[bet.market]) {
            marketMap[bet.market] = { wins: 0, total: 0, pl: 0, staked: 0 };
        }
        marketMap[bet.market].total++;
        marketMap[bet.market].staked += bet.stake;
        marketMap[bet.market].pl += bet.pl;
        if (bet.result === 'green') marketMap[bet.market].wins++;
    });

    container.innerHTML = Object.entries(marketMap).map(([name, data]) => {
        const wr = data.total > 0 ? (data.wins / data.total) * 100 : 0;
        const roi = data.staked > 0 ? (data.pl / data.staked) * 100 : 0;
        const barColor = data.pl >= 0 ? 'var(--green)' : 'var(--red)';

        return `<div class="market-item">
            <div class="market-name">${name}</div>
            <div class="market-row"><span>Apostas</span><span>${data.total}</span></div>
            <div class="market-row"><span>Win Rate</span><span>${formatPercent(wr)}</span></div>
            <div class="market-row"><span>P&L</span><span class="${data.pl >= 0 ? 'pl-positive' : 'pl-negative'}">${data.pl >= 0 ? '+' : ''}${formatBRL(data.pl)}</span></div>
            <div class="market-row"><span>ROI</span><span>${formatPercent(roi)}</span></div>
            <div class="market-bar"><div class="market-bar-fill" style="width:${Math.min(wr, 100)}%;background:${barColor}"></div></div>
        </div>`;
    }).join('');
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    refreshUI();
});

// ============ EXTENSION LISTENER ============
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'EXTENSION_BETS_SYNC') {
        const incomingBets = event.data.data;
        if (incomingBets && incomingBets.length > 0) {
            let addedCount = 0;
            
            incomingBets.forEach(newBet => {
                // Evita duplicidade simples pelo ID ou checando data+evento
                const exists = state.bets.find(b => b.id === newBet.id || (b.event === newBet.event && b.date === newBet.date));
                if (!exists) {
                    newBet.pl = calculatePL(newBet);
                    state.bets.push(newBet);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                recalculateBankroll();
                saveState();
                refreshUI();
                alert(`✅ Sincronização concluída! ${addedCount} apostas importadas da extensão.`);
            } else {
                alert(`⚠️ Nenhuma aposta nova encontrada (todas já estavam sincronizadas).`);
            }
        }
    }
});
