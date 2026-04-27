/**
 * cotacoes_widget.js — Widget de cotações para a sidebar da home
 * APIs: mfinance.com.br (ações) + AwesomeAPI (câmbio) + CoinGecko (cripto)
 */

document.addEventListener('DOMContentLoaded', () => {
  carregarWidgetCotacoes();
  setInterval(carregarWidgetCotacoes, 5 * 60 * 1000);
});

async function carregarWidgetCotacoes() {
  await Promise.allSettled([
    carregarWidgetIbov(),
    carregarWidgetMoedas(),
    carregarWidgetCripto(),
  ]);
}

// ── Ibovespa via mfinance.com.br (variação média das principais ações) ────────
async function carregarWidgetIbov() {
  try {
    const res = await fetch('https://mfinance.com.br/api/v1/stocks', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();
    const top5 = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3'];
    const stocks = (data.stocks || []).filter(s => top5.includes(s.symbol) && s.lastPrice > 0);
    if (!stocks.length) throw new Error('sem dados');

    const var_ = stocks.reduce((s, a) => s + (a.change || 0), 0) / stocks.length;
    // Usa PETR4 como referência de preço
    const petr4 = stocks.find(s => s.symbol === 'PETR4');

    const valEl = document.getElementById('w-ibov-valor');
    const varEl = document.getElementById('w-ibov-var');
    const metaEl = document.getElementById('w-ibov-meta');

    if (valEl) valEl.textContent = petr4 ? `PETR4 R$${petr4.lastPrice?.toFixed(2)}` : '—';
    if (varEl) {
      varEl.textContent = `${var_ >= 0 ? '▲' : '▼'} ${Math.abs(var_).toFixed(2)}%`;
      varEl.style.background = var_ >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
      varEl.style.color = var_ >= 0 ? '#22c55e' : '#ef4444';
    }
    if (metaEl) metaEl.textContent = 'Atualizado a 15 min';
  } catch (_) {
    const valEl = document.getElementById('w-ibov-valor');
    const metaEl = document.getElementById('w-ibov-meta');
    if (valEl) valEl.textContent = '—';
    if (metaEl) metaEl.textContent = 'Dados indisponíveis';
  }
}

// ── Moedas via AwesomeAPI (sem token) ─────────────────────────────────────────
async function carregarWidgetMoedas() {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL');
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();

    const moedas = [
      { key: 'USDBRL', nome: 'Dólar 🇺🇸' },
      { key: 'EURBRL', nome: 'Euro 🇪🇺' },
      { key: 'GBPBRL', nome: 'Libra 🇬🇧' },
    ];

    const el = document.getElementById('w-moedas');
    if (!el) return;

    el.innerHTML = moedas.map(m => {
      const d = data[m.key];
      if (!d) return '';
      const var_ = parseFloat(d.pctChange);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--preto-borda);font-size:0.82rem">
          <span style="font-weight:600;color:var(--laranja)">${m.nome}</span>
          <div style="text-align:right">
            <span>R$ ${parseFloat(d.bid).toFixed(3)}</span>
            <span style="margin-left:6px;font-size:0.72rem;color:${var_ >= 0 ? '#22c55e' : '#ef4444'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (_) {
    const el = document.getElementById('w-moedas');
    if (el) el.innerHTML = '<p style="font-size:0.8rem;color:var(--cinza-texto)">Indisponível</p>';
  }
}

// ── Cripto via Binance (sem token, sem rate limit) ────────────────────────────
async function carregarWidgetCripto() {
  try {
    const symbols = ['BTCBRL','ETHBRL'];
    const tickers = symbols.map(s => `"${s}"`).join(',');
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${tickers}]`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();

    const el = document.getElementById('w-cripto');
    if (!el) return;

    el.innerHTML = data.map(d => {
      const var_ = parseFloat(d.priceChangePercent) || 0;
      const price = parseFloat(d.lastPrice);
      const symbol = d.symbol.replace('BRL','');
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--preto-borda);font-size:0.82rem">
          <span style="font-weight:700;color:var(--laranja)">${symbol}</span>
          <div style="text-align:right">
            <div>R$ ${price.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
            <div style="font-size:0.72rem;color:${var_ >= 0 ? '#22c55e' : '#ef4444'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</div>
          </div>
        </div>
      `;
    }).join('') || '<p style="font-size:0.8rem;color:var(--cinza-texto)">Indisponível</p>';
  } catch (_) {
    const el = document.getElementById('w-cripto');
    if (el) el.innerHTML = '<p style="font-size:0.8rem;color:var(--cinza-texto)">Indisponível</p>';
  }
}
