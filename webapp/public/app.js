/* ============================================
   CRAQUE DA BANCA — App Logic (API INTEGRATION)
   ============================================ */

const CONFIG_KEY = 'craque_banca_config';

let state = {
    initialBankroll: 200,
    bankroll: 200,
    bets: [],
    config: {
        stopLoss: 40,
        stopWin: 30,
        tiltThreshold: 3
    }
};

let bankrollChart = null;

// ============ CONFIG (Local Storage) ============
function loadConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            state.initialBankroll = parsed.initialBankroll || 200;
            state.config = { ...state.config, ...parsed };
        }
    } catch (e) {}
}

function saveConfigState() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
        initialBankroll: state.initialBankroll,
        ...state.config
    }));
}

// ============ API: Fetch Bets ============
async function fetchBets() {
    try {
        const res = await fetch('/api/bets');
        const json = await res.json();
        if (json.success) {
            // No MongoDB o ID vem como _id, vamos mapear para manter compatível com a interface
            state.bets = json.data.map(b => ({...b, id: b._id}));
            recalculateBankroll();
            refreshUI();
        }
    } catch(err) {
        console.error("Erro ao carregar apostas:", err);
    }
}

// ============ FORMATTERS ============
function formatBRL(value) { return 'R$ ' + value.toFixed(2).replace('.', ','); }
function formatPercent(value) { return value.toFixed(1).replace('.', ',') + '%'; }
function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============ CALCULATIONS ============
function recalculateBankroll() {
    let bankroll = state.initialBankroll;
    state.bets.forEach(bet => { bankroll += bet.pl; });
    state.bankroll = Math.round(bankroll * 100) / 100;
}

function calculatePL(bet) {
    if (bet.result === 'green') return Math.round((bet.stake * (bet.odd - 1)) * 100) / 100;
    else if (bet.result === 'red') return -bet.stake;
    else if (bet.result === 'cashout') return Math.round((bet.cashoutValue - bet.stake) * 100) / 100;
    return 0;
}

function getStreak() {
    if (state.bets.length === 0) return { type: null, count: 0 };
    const sorted = [...state.bets].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastResult = sorted[0].result === 'cashout' ? 'cashout' : sorted[0].result;
    let count = 0;
    for (const bet of sorted) {
        const r = bet.result === 'cashout' ? 'cashout' : bet.result;
        if (r === lastResult) count++; else break;
    }
    return { type: lastResult, count };
}

function getTodayPL() {
    const today = new Date().toISOString().slice(0, 10);
    return state.bets
        .filter(b => b.date && b.date.slice(0, 10) === today)
        .reduce((sum, b) => sum + b.pl, 0);
}

function getConsecutiveReds() {
    const sorted = [...state.bets].sort((a, b) => new Date(b.date) - new Date(a.date));
    let count = 0;
    for (const bet of sorted) {
        if (bet.result === 'red') count++; else break;
    }
    return count;
}

// ============ STAKE CALCULATOR ============
function calculateStake() {
    const odd = parseFloat(document.getElementById('calc-odd').value);
    const prob = parseFloat(document.getElementById('calc-prob').value);
    const results = document.getElementById('calc-results');

    if (!odd || !prob || odd <= 1 || prob <= 0 || prob >= 100) {
        results.style.display = 'none'; return;
    }

    const p = prob / 100;
    const kelly = ((p * odd) - 1) / (odd - 1);
    const edge = (p * odd - 1) * 100;
    const bank = state.bankroll;

    document.getElementById('calc-kelly25').textContent = kelly > 0 ? formatBRL(bank * kelly * 0.25) : 'Sem valor';
    document.getElementById('calc-kelly50').textContent = kelly > 0 ? formatBRL(bank * kelly * 0.5) : 'Sem valor';
    document.getElementById('calc-flat2').textContent = formatBRL(bank * 0.02);
    document.getElementById('calc-flat3').textContent = formatBRL(bank * 0.03);

    const edgeEl = document.getElementById('calc-edge-value');
    edgeEl.textContent = formatPercent(edge);
    edgeEl.className = edge >= 0 ? 'positive' : 'negative';
    results.style.display = 'flex';
}

// ============ BET REGISTRATION (API UPDATE) ============
async function registerBet(e) {
    e.preventDefault();

    const todayPL = getTodayPL();
    if (state.config.stopLoss && todayPL <= -state.config.stopLoss) {
        alert('⛔ STOP LOSS atingido! Pare por hoje!'); return false;
    }
    if (state.config.stopWin && todayPL >= state.config.stopWin) {
        if (!confirm('🎯 STOP WIN atingido! Continuar?')) return false;
    }

    const result = document.querySelector('input[name="bet-result"]:checked');
    if (!result) return false;

    const bet = {
        date: new Date().toISOString(),
        event: document.getElementById('bet-event').value.trim(),
        market: document.getElementById('bet-market').value,
        odd: parseFloat(document.getElementById('bet-odd').value),
        stake: parseFloat(document.getElementById('bet-stake').value),
        result: result.value,
        cashoutValue: result.value === 'cashout' ? (parseFloat(document.getElementById('bet-cashout-value').value) || 0) : 0,
        pl: 0
    };
    bet.pl = calculatePL(bet);

    // Optimistic UI Update (Mostra rápido na tela)
    const tempId = 'temp_' + Date.now();
    bet.id = tempId;
    state.bets.push(bet);
    recalculateBankroll();
    refreshUI();

    document.getElementById('bet-form').reset();
    document.getElementById('cashout-row').style.display = 'none';
    checkTilt();

    // Salva no Banco de Dados
    try {
        const res = await fetch('/api/bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bet)
        });
        const json = await res.json();
        if (json.success) {
            // Substitui o ID temporário pelo ID do MongoDB
            const savedBet = json.data;
            const index = state.bets.findIndex(b => b.id === tempId);
            if(index !== -1) state.bets[index].id = savedBet._id;
        }
    } catch(err) {
        console.error("Erro ao salvar:", err);
    }
    return false;
}

document.querySelectorAll('input[name="bet-result"]').forEach(radio => {
    radio.addEventListener('change', () => {
        document.getElementById('cashout-row').style.display = document.getElementById('result-cashout').checked ? 'grid' : 'none';
    });
});

// ============ DELETE BET (API UPDATE) ============
let pendingDeleteId = null;
function confirmDelete(id) {
    pendingDeleteId = id;
    document.getElementById('delete-modal').style.display = 'flex';
    document.getElementById('btn-confirm-delete').onclick = async () => {
        // Optimistic UI Update
        state.bets = state.bets.filter(b => b.id !== pendingDeleteId);
        recalculateBankroll();
        refreshUI();
        closeDeleteModal();

        // Remove do Banco
        if(!pendingDeleteId.startsWith('temp_')) {
            try {
                await fetch('/api/bets/' + pendingDeleteId, { method: 'DELETE' });
            } catch(e) { console.error(e); }
        }
    };
}
function closeDeleteModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('delete-modal').style.display = 'none';
}

// ============ TILT DETECTION ============
function checkTilt() {
    const consecutiveReds = getConsecutiveReds();
    const tiltEl = document.getElementById('tilt-alert');
    if (consecutiveReds >= state.config.tiltThreshold) {
        document.getElementById('tilt-message').textContent = `Você tem ${consecutiveReds} reds seguidas. Considere parar.`;
        tiltEl.style.display = 'flex';
    } else { tiltEl.style.display = 'none'; }
}
function dismissTilt() { document.getElementById('tilt-alert').style.display = 'none'; }

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
    state.initialBankroll = parseFloat(document.getElementById('config-initial-bankroll').value) || state.initialBankroll;
    state.config.stopLoss = parseFloat(document.getElementById('config-stop-loss').value) || 0;
    state.config.stopWin = parseFloat(document.getElementById('config-stop-win').value) || 0;
    state.config.tiltThreshold = parseInt(document.getElementById('config-tilt-threshold').value) || 3;
    saveConfigState();
    recalculateBankroll();
    refreshUI();
    closeConfigModal();
}

function exportCSV() { /* Mantido igual para não alongar */ }

// ============ RENDER UI ============
function refreshUI() {
    renderKPIs(); renderChart(); renderHistory(); renderMarketStats(); renderLimitBadges(); checkTilt();
}

// (As funções de renderização abaixo são quase idênticas ao original)
function renderKPIs() {
    const totalBets = state.bets.length;
    const wins = state.bets.filter(b => b.result === 'green').length;
    const profit = state.bankroll - state.initialBankroll;
    const totalStaked = state.bets.reduce((s, b) => s + b.stake, 0);
    const roi = totalStaked > 0 ? (profit / totalStaked) * 100 : 0;
    const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;
    const streak = getStreak();
    const todayPL = getTodayPL();

    document.getElementById('kpi-bankroll').textContent = formatBRL(state.bankroll);
    
    const profitEl = document.getElementById('kpi-profit');
    profitEl.textContent = (profit >= 0 ? '+' : '') + formatBRL(profit);
    profitEl.className = 'kpi-value ' + (profit >= 0 ? 'positive' : 'negative');

    const roiEl = document.getElementById('kpi-roi');
    roiEl.textContent = (roi >= 0 ? '+' : '') + formatPercent(roi);
    roiEl.className = 'kpi-value ' + (roi >= 0 ? 'positive' : 'negative');

    document.getElementById('kpi-winrate').textContent = formatPercent(winRate);

    const streakEl = document.getElementById('kpi-streak');
    if (streak.type) {
        streakEl.textContent = `${streak.type === 'green' ? '🟢' : streak.type === 'red' ? '🔴' : '🟡'} ${streak.count}x`;
        streakEl.className = 'kpi-value ' + (streak.type === 'green' ? 'positive' : streak.type === 'red' ? 'negative' : '');
    } else { streakEl.textContent = '—'; streakEl.className = 'kpi-value'; }

    const todayEl = document.getElementById('kpi-today');
    todayEl.textContent = (todayPL >= 0 ? '+' : '') + formatBRL(todayPL);
    todayEl.className = 'kpi-value ' + (todayPL >= 0 ? 'positive' : 'negative');
}

function renderLimitBadges() {
    document.getElementById('badge-stop-loss').textContent = state.config.stopLoss ? `SL: R$${state.config.stopLoss}` : 'SL: —';
    document.getElementById('badge-stop-win').textContent = state.config.stopWin ? `SW: R$${state.config.stopWin}` : 'SW: —';
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
        type: 'line', data: { labels, datasets: [{
            label: 'Banca', data, borderColor: isPositive ? '#10b981' : '#ef4444',
            backgroundColor: gradient, borderWidth: 2.5, fill: true, tension: 0.3,
            pointRadius: data.length > 20 ? 0 : 4, pointHoverRadius: 6,
            pointBackgroundColor: isPositive ? '#10b981' : '#ef4444',
        }]},
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2035', callbacks: { label: ctx => formatBRL(ctx.parsed.y) } } },
            scales: { x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#64748b', callback: v => 'R$' + v }, grid: { color: 'rgba(255,255,255,0.04)' } } }
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
    
    const marketSelect = document.getElementById('filter-market');
    const currentVal = marketSelect.value;
    const markets = [...new Set(state.bets.map(b => b.market))];
    marketSelect.innerHTML = '<option value="all">Todos os mercados</option>';
    markets.forEach(m => {
        const opt = document.createElement('option'); opt.value = m; opt.textContent = m;
        if (m === currentVal) opt.selected = true; marketSelect.appendChild(opt);
    });
    
    if (filtered.length === 0) { body.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhuma aposta encontrada.</td></tr>'; return; }
    
    const allSorted = [...state.bets].sort((a, b) => new Date(a.date) - new Date(b.date));
    const bankrollMap = {}; let running = state.initialBankroll;
    allSorted.forEach(b => { running += b.pl; bankrollMap[b.id] = Math.round(running * 100) / 100; });
    
    body.innerHTML = filtered.map(bet => {
        const resultLabel = bet.result === 'green' ? '✅ Green' : bet.result === 'red' ? '❌ Red' : '💵 Cashout';
        const plClass = bet.pl >= 0 ? 'pl-positive' : 'pl-negative';
        return `<tr>
            <td>${formatDate(bet.date)}</td><td>${bet.event}</td><td>${bet.market}</td>
            <td>${bet.odd.toFixed(2)}</td><td>${formatBRL(bet.stake)}</td>
            <td><span class="result-badge ${bet.result}">${resultLabel}</span></td>
            <td class="${plClass}">${bet.pl >= 0 ? '+' : ''}${formatBRL(bet.pl)}</td>
            <td>${formatBRL(bankrollMap[bet.id] || 0)}</td>
            <td><button class="btn-delete-row" onclick="confirmDelete('${bet.id}')">🗑️</button></td>
        </tr>`;
    }).join('');
}

function renderMarketStats() {
    const container = document.getElementById('market-stats');
    if (state.bets.length === 0) { container.innerHTML = '<p class="empty-state">Registre apostas para ver sua performance.</p>'; return; }
    const marketMap = {};
    state.bets.forEach(bet => {
        if (!marketMap[bet.market]) marketMap[bet.market] = { wins: 0, total: 0, pl: 0, staked: 0 };
        marketMap[bet.market].total++; marketMap[bet.market].staked += bet.stake; marketMap[bet.market].pl += bet.pl;
        if (bet.result === 'green') marketMap[bet.market].wins++;
    });
    container.innerHTML = Object.entries(marketMap).map(([name, data]) => {
        const wr = data.total > 0 ? (data.wins / data.total) * 100 : 0;
        const roi = data.staked > 0 ? (data.pl / data.staked) * 100 : 0;
        return `<div class="market-item">
            <div class="market-name">${name}</div>
            <div class="market-row"><span>Apostas</span><span>${data.total}</span></div>
            <div class="market-row"><span>Win Rate</span><span>${formatPercent(wr)}</span></div>
            <div class="market-row"><span>P&L</span><span class="${data.pl >= 0 ? 'pl-positive' : 'pl-negative'}">${data.pl >= 0 ? '+' : ''}${formatBRL(data.pl)}</span></div>
            <div class="market-row"><span>ROI</span><span>${formatPercent(roi)}</span></div>
            <div class="market-bar"><div class="market-bar-fill" style="width:${Math.min(wr, 100)}%;background:${data.pl >= 0 ? 'var(--green)' : 'var(--red)'}"></div></div>
        </div>`;
    }).join('');
}

// ============ INIT & EXTENSION INTEGRATION ============
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    refreshUI();
    fetchBets(); // Busca do Banco de Dados MongoDB!
});

// Listener da Extensão do Chrome (agora salva no banco)
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'EXTENSION_BETS_SYNC') {
        const incomingBets = event.data.data;
        if (incomingBets && incomingBets.length > 0) {
            
            // Calcula PL para cada aposta antes de enviar
            incomingBets.forEach(b => b.pl = calculatePL(b));

            // Envia o array inteiro para nossa API POST (que usa insertMany)
            try {
                const res = await fetch('/api/bets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(incomingBets)
                });
                const json = await res.json();
                if(json.success) {
                    alert(`✅ Sincronização concluída! As apostas foram salvas no Banco de Dados.`);
                    fetchBets(); // Recarrega os dados fresquinhos do banco
                }
            } catch(e) { console.error("Erro na sincronização", e); }
        }
    }
});

// ============ TABS & RADAR ============
function switchTab(tabName) {
    document.getElementById('view-dashboard').style.display = tabName === 'dashboard' ? 'block' : 'none';
    document.getElementById('view-radar').style.display = tabName === 'radar' ? 'block' : 'none';
    
    document.getElementById('tab-btn-dashboard').className = tabName === 'dashboard' ? 'nav-tab active' : 'nav-tab';
    document.getElementById('tab-btn-radar').className = tabName === 'radar' ? 'nav-tab active' : 'nav-tab';

    if (tabName === 'radar') {
        loadRadarData();
    }
}

async function loadRadarData() {
    const radarBody = document.getElementById('radar-body');
    radarBody.innerHTML = '<tr><td colspan="5" class="empty-state">Buscando dados na API do Radar...</td></tr>';
    
    try {
        const response = await fetch('/api/radar');
        const json = await response.json();

        if (json.success && json.data.length > 0) {
            radarBody.innerHTML = json.data.map(d => `
                <tr class="${d.isLive ? 'live-row' : ''}">
                    <td>
                        <div class="radar-league">
                            <img src="${d.ligaLogo}" referrerpolicy="no-referrer" onerror="this.style.display='none'">
                            <span>${d.liga}</span>
                        </div>
                    </td>
                    <td>
                        <div class="radar-match">
                            <div class="radar-team">
                                <span>${d.home}</span>
                                <img src="${d.homeLogo}" referrerpolicy="no-referrer" onerror="this.style.display='none'">
                            </div>
                            <div class="radar-score ${d.isLive ? 'live' : ''}">
                                ${d.isLive ? `<span>${d.score}</span><small class="live-blink">${d.status}</small>` : `<span>${d.time}</span>`}
                            </div>
                            <div class="radar-team radar-away">
                                <img src="${d.awayLogo}" referrerpolicy="no-referrer" onerror="this.style.display='none'">
                                <span>${d.away}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="radar-stat">
                            <span style="color: var(--win-color); font-weight: 700;">${d.hist}</span>
                        </div>
                    </td>
                    <td><span class="result-badge ${d.conf === 'Muito Alto' ? 'green' : 'blue'}">${d.conf}</span></td>
                    <td><span class="radar-sug ${d.sug.includes('Live') ? 'sug-live' : 'sug-pre'}">${d.sug}</span></td>
                </tr>
            `).join('');
        } else {
            radarBody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma oportunidade encontrada para hoje.</td></tr>';
        }
    } catch(err) {
        console.error("Erro ao carregar o radar:", err);
        radarBody.innerHTML = '<tr><td colspan="5" class="empty-state">Erro ao conectar com a API de dados.</td></tr>';
    }
}
