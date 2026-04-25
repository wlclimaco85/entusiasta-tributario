/**
 * cotacoes_widget.js — Widget de cotações para a sidebar da home
 * APIs: AwesomeAPI (câmbio) + CoinGecko (cripto) + Yahoo Finance (Ibovespa)
 * Todas gratuitas, sem token necessário.
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

// ── Ibovespa via Yahoo Finance + corsproxy.io ────────────────────────────────
async function carregarWidgetIbov() {
  const PROXIES = [
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
  ];
  const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?interval=1d&range=1d';

  let data = null;
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(YAHOO_URL), {
        signal: AbortSignal.timeout(7000)
      });
      if (res.ok) { data = await res.json(); break; }
    } catch (_) { continue; }
  }

  try {
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('sem dados');

    const valor = meta.regularMarketPrice;
    const anterior = meta.chartPreviousClose || meta.previousClose || valor;
    const var_ = anterior ? ((valor - anterior) / anterior) * 100 : 0;

    const valEl = document.getElementById('w-ibov-valor');
    const varEl = document.getElementById('w-ibov-var');
    const metaEl = document.getElementById('w-ibov-meta');

    if (valEl) valEl.textContent = valor?.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) || '—';
    if (varEl) {
      varEl.textContent = `${var_ >= 0 ? '▲' : '▼'} ${Math.abs(var_).toFixed(2)}%`;
      varEl.style.background = var_ >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
      varEl.style.color = var_ >= 0 ? '#22c55e' : '#ef4444';
    }
    if (metaEl) metaEl.textContent = `Atualizado a 15 min`;
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

// ── Cripto via CoinGecko (sem token) ──────────────────────────────────────────
async function carregarWidgetCripto() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true'
    );
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();

    const coins = [
      { id: 'bitcoin',  symbol: 'BTC' },
      { id: 'ethereum', symbol: 'ETH' },
    ];

    const el = document.getElementById('w-cripto');
    if (!el) return;

    el.innerHTML = coins.map(c => {
      const d = data[c.id];
      if (!d) return '';
      const var_ = d.brl_24h_change || 0;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--preto-borda);font-size:0.82rem">
          <span style="font-weight:700;color:var(--laranja)">${c.symbol}</span>
          <div style="text-align:right">
            <div>R$ ${d.brl?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
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
