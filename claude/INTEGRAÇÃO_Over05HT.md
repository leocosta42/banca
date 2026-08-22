# 🚀 Guia de Integração: Dashboard Over 0.5 HT

## 📋 O que você recebeu

3 arquivos para adicionar dashboard especializado de Over 0.5 HT ao seu app:

1. **over05ht-dashboard.html** → Versão standalone (abra no navegador para testar)
2. **Over05HTDashboard.jsx** → Componente React para integrar ao webapp Next.js
3. **INTEGRAÇÃO_Over05HT.md** → Este arquivo

---

## 🎯 Opção 1: Usar Versão Standalone (Rápido)

### Passo 1: Abrir no Navegador
```bash
# Copie over05ht-dashboard.html para uma pasta
# Abra em seu navegador: file:///caminho/para/over05ht-dashboard.html
```

✅ Pronto! Você verá o dashboard com dados de exemplo (mock).

**Vantagens:**
- Não precisa integrar ao webapp
- Funciona offline
- Ótimo para apresentações/prototipagem

**Limitações:**
- Dados são estáticos (mock)
- Não sincroniza com seu app

---

## 🔧 Opção 2: Integrar ao Webapp Next.js (Completo)

### Passo 1: Copiar Componente
```bash
# Copie Over05HTDashboard.jsx para:
cp Over05HTDashboard.jsx webapp/src/components/Over05HTDashboard.jsx
```

### Passo 2: Adicionar Abas no App

No arquivo `webapp/src/app/page.js`, adicione tabs para o novo dashboard:

```javascript
'use client';

import { useState } from 'react';
import Over05HTDashboard from '@/components/Over05HTDashboard';
import { loadState } from '@/lib/appState'; // ou seu próprio gerenciador de estado

export default function Home() {
    const [activeTab, setActiveTab] = useState('main'); // 'main' ou 'over05ht'
    const [state] = useState(() => loadState());

    return (
        <div>
            {/* Abas */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '20px',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '12px'
            }}>
                <button 
                    onClick={() => setActiveTab('main')}
                    style={{
                        padding: '8px 16px',
                        background: activeTab === 'main' ? 'var(--accent-glow)' : 'transparent',
                        border: activeTab === 'main' ? '1px solid var(--accent)' : 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: activeTab === 'main' ? 'var(--accent-light)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    📊 Dashboard Principal
                </button>
                <button 
                    onClick={() => setActiveTab('over05ht')}
                    style={{
                        padding: '8px 16px',
                        background: activeTab === 'over05ht' ? 'var(--accent-glow)' : 'transparent',
                        border: activeTab === 'over05ht' ? '1px solid var(--accent)' : 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: activeTab === 'over05ht' ? 'var(--accent-light)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    ⚽ Over 0.5 HT
                </button>
            </div>

            {/* Conteúdo da Aba */}
            {activeTab === 'main' && (
                /* Seu dashboard original aqui */
            )}

            {activeTab === 'over05ht' && (
                <Over05HTDashboard bets={state.bets} />
            )}
        </div>
    );
}
```

### Passo 3: Adicionar Campos de Dados

No seu modelo de Bet (`webapp/src/models/Bet.js`), adicione:

```javascript
// Adicione estes campos ao schema:
goalMinute: Number,        // Minuto em que o gol foi marcado (0-90)
league: String,            // Liga (Série A, Serie B, Champions, etc)
homeTeam: String,          // Time da casa (para análise)
awayTeam: String,          // Time visitante
matchTime: Date            // Hora que a partida começou
```

### Passo 4: Atualizar Form de Registro

No seu `index.html` (ou webapp), adicione campos para liga e minuto:

```html
<!-- Adicione ao formulário de registro de aposta -->

<div class="form-group">
    <label>Liga</label>
    <select id="bet-league" required>
        <option value="">Selecione a liga...</option>
        <option value="Série A">Série A</option>
        <option value="Serie B">Serie B</option>
        <option value="Champions League">Champions League</option>
        <option value="Coppa Italia">Coppa Italia</option>
        <option value="La Liga">La Liga</option>
        <option value="Premier League">Premier League</option>
        <option value="Bundesliga">Bundesliga</option>
        <option value="Ligue 1">Ligue 1</option>
    </select>
</div>

<!-- Se resultado é Green: -->
<div id="goal-minute-row" style="display: none;">
    <div class="form-group">
        <label>Em qual minuto saiu o gol?</label>
        <input type="number" id="bet-goal-minute" min="0" max="45" placeholder="Ex: 12">
    </div>
</div>
```

### Passo 5: Atualizar app.js

No seu `app.js`, ao registrar aposta, capture os novos dados:

```javascript
// Na função registerBet():
function registerBet(event) {
    event.preventDefault();

    const bet = {
        id: Date.now(),
        date: new Date().toISOString(),
        event: document.getElementById('bet-event').value,
        market: document.getElementById('bet-market').value,
        odd: parseFloat(document.getElementById('bet-odd').value),
        stake: parseFloat(document.getElementById('bet-stake').value),
        result: document.querySelector('input[name="bet-result"]:checked').value,
        
        // ✨ NOVOS CAMPOS:
        league: document.getElementById('bet-league')?.value || 'Sem Liga',
        goalMinute: document.getElementById('bet-goal-minute')?.value ? 
                    parseInt(document.getElementById('bet-goal-minute').value) : null,
        homeTeam: document.getElementById('bet-home-team')?.value || '',
        awayTeam: document.getElementById('bet-away-team')?.value || '',
        
        // Campo existente:
        pl: 0
    };

    // Calcular P&L
    if (bet.result === 'green') {
        bet.pl = Math.round((bet.stake * (bet.odd - 1)) * 100) / 100;
    } else if (bet.result === 'red') {
        bet.pl = -bet.stake;
    } else if (bet.result === 'cashout') {
        bet.cashoutValue = parseFloat(document.getElementById('bet-cashout-value').value);
        bet.pl = Math.round((bet.cashoutValue - bet.stake) * 100) / 100;
    }

    state.bets.push(bet);
    recalculateBankroll();
    saveState();
    
    resetBetForm();
    renderHistory();
    
    return false;
}
```

---

## 📊 Funcionalidades do Dashboard

### 1. KPI Cards
- **Total de Apostas:** Quantas apostas de Over 0.5 HT você fez
- **Win Rate:** Percentual de greens
- **ROI:** Retorno sobre investimento
- **Odd Média:** Odds médias apostadas

### 2. Gráfico de Minuto
Mostra em qual intervalo de minutos (0-5, 5-10, etc) os gols foram marcados.

**Por que importa:**
- Over 0.5 HT marcado aos 3min = muito mais valioso que aos 44min
- Ajuda identificar seu "sweet spot"
- Se você tem 70% de taxa em gols antes dos 15min, foque nisso!

### 3. Performance por Liga
Tabela comparando ROI entre ligas:
- Série A pode ter +18% ROI
- Serie B pode ter -3% ROI
- Isso significa: **foque em Série A!**

### 4. Últimas Apostas
Lista dos 10 últimos registros com:
- Resultado (Green/Red)
- Lucro/Prejuízo
- Data e hora
- Liga

---

## 🔄 Sincronização de Dados

### Como os dados fluem

```
app.js (localStorage)
    ↓
state.bets[] → Array com todas as apostas
    ↓
Over05HTDashboard.jsx
    ↓
.filter(b => b.market === 'Over 0.5 HT')
    ↓
Análise + Cálculos
    ↓
Renderização
```

**Automático!** Qualquer vez que você registra uma aposta Over 0.5 HT:
1. Salva em localStorage
2. Over05HTDashboard detecta mudança
3. Recalcula todas as estatísticas
4. Atualiza gráficos em tempo real

---

## 🎨 Customização

### Mudar cores

No arquivo `Over05HTDashboard.jsx`, procure por:

```javascript
// Altere as cores CSS:
color: 'var(--green)'    // Mude para qualquer hex: '#10b981'
backgroundColor: 'var(--bg-card)'
```

### Adicionar mais ligas

No arquivo `index.html`:

```html
<option value="Eredivisie">Eredivisie</option>
<option value="Série C">Série C</option>
<option value="Paulistão">Paulistão</option>
```

Pronto! O dashboard detecta automaticamente.

### Mudar período padrão

No `Over05HTDashboard.jsx`:

```javascript
const [period, setPeriod] = useState('30d'); // Era '7d', agora 30 dias
```

---

## 🐛 Troubleshooting

### "Dados de Over 0.5 HT não aparecem"
✅ Verifique se você registrou apostas com `market: 'Over 0.5 HT'` exatamente (case-sensitive)

### "Gráfico de minuto está vazio"
✅ Certifique-se de que está preenchendo `goalMinute` ao registrar apostas green

### "Componente React quebrado"
✅ Verifique se tem `recharts` instalado:
```bash
npm install recharts
```

### "Cores estão erradas"
✅ Certifique-se de que `style.css` está carregado (mesmas variáveis CSS)

---

## 📈 Próximos Passos Recomendados

### Curto Prazo (1 semana)
1. ✅ Integrar Dashboard Over 0.5 HT
2. Começar a registrar `league` + `goalMinute`
3. Analisar padrões em seus dados históricos

### Médio Prazo (2-4 semanas)
4. Adicionar scraper de odds automático na extensão
5. Alertas de movimento de odds
6. Análise de "tempo ótimo para apostar"

### Longo Prazo (1-3 meses)
7. Integração com APIs de odds ao vivo
8. Recomendações baseadas em ML
9. Bot Telegram com notificações

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique o console do navegador** (F12 → Console)
2. **Valide os dados** (abra DevTools → Application → LocalStorage)
3. **Teste com dados mock** antes de usar dados reais

---

## ✨ Exemplo de Dados Completos

```javascript
const betExample = {
    id: 1234567890,
    date: "2024-01-15T19:35:00.000Z",
    event: "Flamengo x Botafogo",
    market: "Over 0.5 HT",           // ← Importante!
    odd: 1.65,
    stake: 100,
    result: "green",
    league: "Série A",               // ← Novo!
    goalMinute: 12,                  // ← Novo! (0-45)
    homeTeam: "Flamengo",            // ← Novo
    awayTeam: "Botafogo",            // ← Novo
    pl: 65,
    cashoutValue: null
};
```

---

**Happy betting! 🎯**
