/**
 * cotacoes_widget.js — Widget de cotações para a sidebar da home
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

// ── Ibovespa — mostra só variação (sem valor do índice) ───────────────────────
async function carregarWidgetIbov() {
  try {
    const res = await fetch('https://mfinance.com.br/api/v1/stocks', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();
    const top5 = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3'];
    const stocks = (data.stocks || []).filter(s => top5.includes(s.symbol) && s.lastPrice > 0);
    if (!stocks.length) throw new Error('sem dados');

    const var_ = stocks.reduce((s, a) => s + (a.change || 0), 0) / stocks.length;

    const valEl = document.getElementById('w-ibov-valor');
    const varEl = document.getElementById('w-ibov-var');
    const metaEl = document.getElementById('w-ibov-meta');

    // Não mostra valor do índice (não disponível sem proxy) — mostra variação média
    if (valEl) valEl.textContent = 'Mercado';
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

// ── Moedas via AwesomeAPI ─────────────────────────────────────────────────────
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
            <span style="color:#ffffff;font-weight:600">R$ ${parseFloat(d.bid).toFixed(3)}</span>
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

// ── Cripto via Binance ────────────────────────────────────────────────────────
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
            <div style="color:#ffffff;font-weight:600">R$ ${price.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
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
