# 🎯 Dashboard Over 0.5 HT — Guia Completo

## 📦 O que você recebeu

Prototipo completo de Dashboard especializado em **Over 0.5 HT** com 4 arquivos prontos para usar:

| Arquivo | Tipo | Para Quem | Como Usar |
|---------|------|----------|----------|
| `over05ht-dashboard.html` | Standalone HTML | Desenvolvedores / Apresentações | Abra no navegador (F5 para testar) |
| `Over05HTDashboard.jsx` | Componente React | Webapp Next.js | Copie para `/src/components/` |
| `BetModel.updated.js` | Schema MongoDB | Backend Node/Express | Copie para `/src/models/` |
| `INTEGRAÇÃO_Over05HT.md` | Documentação | Integradores | Siga passo a passo |

---

## 🚀 Início Rápido (5 minutos)

### Opção A: Ver Prototipo Agora (Sem Código)

```bash
# 1. Localize over05ht-dashboard.html
# 2. Arraste para o navegador
# 3. Veja o dashboard com dados de exemplo
```

✅ **Pronto!** Você verá:
- 6 KPI cards com dados de apostas Over 0.5 HT
- Gráfico de "Minuto do Gol" mostrando quando gols foram marcados
- Tabela de Performance por Liga (Série A, Serie B, etc)
- Lista de últimas 8 apostas

---

## 🔧 Integração Completa (30 minutos)

### Passo 1: Copiar Componente React
```bash
cp Over05HTDashboard.jsx webapp/src/components/
```

### Passo 2: Copiar Model Atualizado
```bash
# Faça backup do modelo antigo
cp webapp/src/models/Bet.js webapp/src/models/Bet.js.bak

# Copie o novo
cp BetModel.updated.js webapp/src/models/Bet.js
```

### Passo 3: Atualizar HTML Principal
No seu `index.html`, adicione campos para liga e minuto do gol:

```html
<!-- Campo de Liga -->
<div class="form-group">
    <label>Liga</label>
    <select id="bet-league" required>
        <option value="">Selecione...</option>
        <option value="Série A">Série A</option>
        <option value="Serie B">Serie B</option>
        <option value="Champions League">Champions League</option>
        <!-- + outras ligas -->
    </select>
</div>

<!-- Campo de Minuto (aparece quando resultado é Green) -->
<div id="goal-minute-row" style="display: none;">
    <div class="form-group">
        <label>Minuto do Gol (0-45)</label>
        <input type="number" id="bet-goal-minute" min="0" max="45" placeholder="Ex: 12">
    </div>
</div>
```

### Passo 4: Atualizar app.js
Capture os novos campos ao registrar aposta:

```javascript
const bet = {
    // Campos existentes...
    
    // ✨ NOVOS CAMPOS:
    league: document.getElementById('bet-league').value,
    goalMinute: parseInt(document.getElementById('bet-goal-minute').value) || null,
    homeTeam: 'Flamengo',  // Extrair do campo evento
    awayTeam: 'Botafogo'   // Extrair do campo evento
};
```

### Passo 5: Usar Componente
No seu `page.js`:

```javascript
import Over05HTDashboard from '@/components/Over05HTDashboard';

export default function Home() {
    const [state] = useState(() => loadState());
    
    return (
        <div>
            {/* Seu dashboard original */}
            {/* + novo dashboard: */}
            <Over05HTDashboard bets={state.bets} />
        </div>
    );
}
```

---

## 📊 O que o Dashboard Mostra

### 1. KPI Cards (6 métricas principais)

```
┌──────────────────┐
│  Total Apostas   │  24
│  Over 0.5 HT     │     🎯
└──────────────────┘

┌──────────────────┐
│   Win Rate       │  58.3%
│  14G / 10R       │  📈 Acima de 50%!
└──────────────────┘

┌──────────────────┐
│   ROI            │  +12.4%
│  +R$ 186,00      │  💰 Lucrativo
└──────────────────┘

[+ 3 outros cards com Odd Média, Melhor Liga, Sequência]
```

### 2. Gráfico de Minuto do Gol

Mostra em qual intervalo de tempo (0-5min, 5-10min, etc) você fez gols:

```
MINUTE DISTRIBUTION

Green Goals: ███████░░░░░░  (gols marcados = greens)
Total Bets:  █████████████░ (total de apostas)
            0-5  5-10 10-15 15-20 20-25...45
            
Sweet Spot: 10-20 min (62% de acerto!)
```

**Por que importante:**
- Gol aos 5min = ótimo (muito tempo de jogo)
- Gol aos 44min = ruim (quase acaba)
- Nenhum gol = perdeu o dinheiro

### 3. Tabela de Liga

Ranking de suas ligas por lucratividade:

```
Liga              Apostas  Win Rate  ROI      Lucro
─────────────────────────────────────────────────
✅ Série A           8      62.5%    +18.2%   +R$ 145
✅ Series B          6      50.0%    +4.1%    +R$ 26
⚠️  Coppa Italia     3      66.7%    -3.5%    -R$ 34
```

**Insight:** Foque em Série A! Melhor ROI!

### 4. Últimas Apostas

Lista as 10 apostas mais recentes:

```
Flamengo x Botafogo (Série A)
✅ Green  +R$ 65  📅 15 jan 19:35

Palmeiras x Santos (Série A)
✅ Green  +R$ 44  📅 15 jan 18:10

Atlético MG x Cruzeiro (Série A)
❌ Red   -R$ 150 📅 15 jan 17:05
```

---

## 🎯 Exemplo de Dados Completos

Quando você registra uma aposta Over 0.5 HT, ela fica assim:

```javascript
{
    id: 1234567890,
    event: "Flamengo x Botafogo",
    market: "Over 0.5 HT",
    odd: 1.65,
    stake: 100,
    result: "green",
    pl: 65,
    
    // ✨ NOVOS CAMPOS:
    league: "Série A",
    homeTeam: "Flamengo",
    awayTeam: "Botafogo",
    goalMinute: 12,              // ← Crucial! (0-45)
    
    date: "2024-01-15T19:35:00Z",
    bookmaker: "Bet365"
}
```

---

## 💡 Como Aproveitar Melhor

### 1. Descobrir Seu "Sweet Spot"

Olhe o gráfico de minuto e encontre quando você tem MAIS TAXA DE ACERTO:

```
Se você faz 65% de acerto em gols 10-20min:
  → Foque APENAS nesse intervalo
  → Aumento de lucro garantido
```

### 2. Escolher Ligas Rentáveis

Veja qual liga tem melhor ROI:

```
Série A:  +18.2% ROI → APOSTE MAIS
Serie B:  +4.1%  ROI → APOSTE MENOS
La Liga: -3.5%   ROI → EVITE POR ENQUANTO
```

### 3. Monitorar Sequências

Veja quando você está em sequências:

```
✅ +3 Greens seguidos
❌ -2 Reds seguidos → Cuidado! Risco de tilt!
```

---

## 🔄 Dados em Tempo Real

Toda vez que você registra uma aposta:

```
1. Você clica "Registrar Aposta" ✅
       ↓
2. Dados salvam em localStorage (seu navegador)
       ↓
3. Dashboard detecta automaticamente
       ↓
4. Gráficos se atualizam em TEMPO REAL
       ↓
5. Você vê novas estatísticas instantaneamente
```

**Sem delay!** Tudo automático.

---

## 🎨 Customizar Cores

Se quiser mudar as cores (verde para outro tom, por exemplo):

### No arquivo HTML:
```css
/* Mude estas variáveis */
--green: #10b981;      /* Verde */
--red: #ef4444;        /* Vermelho */
--accent: #6366f1;     /* Roxo/Azul */
```

### No React:
```jsx
// Procure por color: 'var(--green)'
// Mude para: color: '#YOUR_HEX_COLOR'
```

---

## 🚨 Checklist de Implementação

- [ ] Extrair `over05ht-dashboard.html` e abrir no navegador
- [ ] Testar com dados de exemplo (você verá logo)
- [ ] Copiar `Over05HTDashboard.jsx` para `src/components/`
- [ ] Copiar `BetModel.updated.js` para `src/models/`
- [ ] Adicionar campos `league` e `goalMinute` ao formulário
- [ ] Atualizar `app.js` para capturar novos campos
- [ ] Integrar componente React no `page.js`
- [ ] Testar registrando uma aposta Over 0.5 HT
- [ ] Verificar se os gráficos atualizam
- [ ] Analisar seus padrões históricos

---

## 📞 FAQ

**P: Os dados desaparecem quando fecho o navegador?**
R: Não! Ficam salvos em `localStorage` do navegador. Próxima vez que abre, estão lá.

**P: Posso usar no meu celular?**
R: Sim! Dashboard é responsivo. Funciona em mobile/tablet.

**P: E se eu quiser mudar de navegador?**
R: Exporte seus dados como CSV (botão no dashboard) e importe em outro navegador.

**P: Como faço backup dos dados?**
R: `localStorage` → DevTools (F12) → Application → LocalStorage → Copie tudo

**P: Quero um banco de dados de verdade (MongoDB/PostgreSQL)?**
R: Use `BetModel.updated.js` como referência e adapte para seu banco.

**P: E se o minuto do gol for depois dos 45min (2º tempo)?**
R: Preencha com 46+ e o dashboard automaticamente muda para "Over 1.5 FT".

---

## 🚀 Próximas Features Sugeridas

### v1.1 (Próximas 2 semanas)
- [ ] Exportar relatório em PDF
- [ ] Gráfico de evolução ao longo do tempo
- [ ] Alertas de mudança de odd

### v1.2 (Próximo mês)
- [ ] Integração com Bet365 (scraper automático)
- [ ] Bot Telegram de notificações
- [ ] Recomendações baseadas em padrões

### v2.0 (2-3 meses)
- [ ] API própria de odds em tempo real
- [ ] Machine Learning de previsões
- [ ] Integração com todas as casas de apostas

---

## 📧 Suporte Técnico

Se encontrar erros:

1. **Abra DevTools** (F12)
2. **Vá para "Console"**
3. **Cole aqui qualquer mensagem de erro vermelha**

Erros comuns:
- `"market is not defined"` → Verifique o campo `id="bet-market"`
- `"undefined goalMinute"` → Adicione o campo `id="bet-goal-minute"`
- `"Cannot read property 'filter'"` → Verifique se `bets` é um array

---

## ✅ Conclusão

Você agora tem um **dashboard profissional de Over 0.5 HT** que:

✅ Mostra suas stats em tempo real  
✅ Identifica padrões de rentabilidade  
✅ Analisa performance por liga  
✅ Rastreia minuto do gol  
✅ É 100% responsivo (desktop/mobile)  
✅ Sincroniza automaticamente  

**Próximo passo:** Use os insights para ganhar mais! 🎯

---

**Desenvolvido com ❤️ para apostadores profissionais**

Versão: 1.0 | Data: Jan 2025
