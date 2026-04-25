/**
 * cotacoes.js — Página de cotações
 * APIs usadas (todas gratuitas, sem token):
 *  - AwesomeAPI: câmbio (USD, EUR, GBP, ARS, JPY) — suporta CORS
 *  - CoinGecko: criptoativos — suporta CORS
 *  - Yahoo Finance via proxy CORS: Ibovespa e ações
 */

// Proxies CORS públicos para contornar bloqueio do Yahoo Finance
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
];

async function fetchComProxy(url, timeoutMs = 8000) {
  // Tenta direto primeiro (pode funcionar em alguns ambientes)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return res.json();
  } catch (_) {}

  // Tenta cada proxy
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url), {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res.json();
    } catch (_) { continue; }
  }
  return null;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    document.getElementById('btn-admin').style.display = 'inline-flex';
    const btnLogin = document.getElementById('btn-login');
    btnLogin.textContent = 'Sair';
    btnLogin.href = '#';
    btnLogin.onclick = (e) => { e.preventDefault(); Auth.logout(); };
  }

  carregarTudo();
  setInterval(carregarTudo, 5 * 60 * 1000);
});

async function carregarTudo() {
  await Promise.allSettled([
    carregarIbovespa(),
    carregarMoedas(),
    carregarCripto(),
    carregarAcoes(),
  ]);
}

// ── Ibovespa via Yahoo Finance + corsproxy.io ────────────────────────────────
async function carregarIbovespa() {
  const PROXIES = [
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
  ];
  const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?interval=30m&range=1d';

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
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    if (!meta) throw new Error('sem dados');

    const valor = meta.regularMarketPrice;
    const anterior = meta.chartPreviousClose || meta.previousClose || valor;
    const variacao = anterior ? ((valor - anterior) / anterior) * 100 : 0;

    document.getElementById('ibov-valor').textContent = formatarNumero(valor);
    const varEl = document.getElementById('ibov-var');
    varEl.textContent = `${variacao >= 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(2)}%`;
    varEl.className = `ibov-variacao ${variacao >= 0 ? 'up' : 'down'}`;
    document.getElementById('ibov-meta').textContent =
      `Fechamento anterior: ${formatarNumero(anterior)}`;
    document.getElementById('ibov-hora').textContent =
      `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Delay 15 min`;

    const precos = closes.filter(Boolean);
    if (precos.length > 1) renderMiniChart(precos, variacao < 0);
  } catch (_) {
    document.getElementById('ibov-valor').textContent = 'Indisponível';
    document.getElementById('ibov-meta').textContent = 'Dados do Ibovespa indisponíveis no momento.';
  }

  await carregarAltasBaixas();
}

function renderMiniChart(precos, isDown) {
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const range = max - min || 1;
  const w = 400, h = 60;
  const pts = precos.map((p, i) => {
    const x = (i / (precos.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const color = isDown ? '#ef4444' : '#e07b00';
  const fillColor = isDown ? 'rgba(239,68,68,0.1)' : 'rgba(224,123,0,0.1)';
  const path = `M ${pts.join(' L ')} L ${w},${h} L 0,${h} Z`;
  const pathEl = document.getElementById('ibov-path');
  if (pathEl) {
    pathEl.setAttribute('d', path);
    pathEl.setAttribute('fill', fillColor);
    pathEl.setAttribute('stroke', color);
  }
}

async function carregarAltasBaixas() {
  const tickers = ['PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA',
                   'WEGE3.SA', 'RENT3.SA', 'MGLU3.SA', 'LREN3.SA', 'BBAS3.SA'];
  try {
    const promises = tickers.map(t =>
      fetchComProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=1d`, 5000)
        .then(d => {
          const meta = d?.chart?.result?.[0]?.meta;
          if (!meta) return null;
          const var_ = meta.chartPreviousClose
            ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
            : 0;
          return { symbol: t.replace('.SA', ''), price: meta.regularMarketPrice, change: var_ };
        })
        .catch(() => null)
    );

    const resultados = (await Promise.all(promises)).filter(Boolean);
    if (!resultados.length) throw new Error('sem dados');

    const sorted = [...resultados].sort((a, b) => b.change - a.change);
    const altas = sorted.slice(0, 5);
    const baixas = [...sorted].reverse().slice(0, 5);

    document.getElementById('maiores-altas').innerHTML = altas.map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct up">+${a.change.toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.price?.toFixed(2)}</span>
      </div>
    `).join('');

    document.getElementById('maiores-baixas').innerHTML = baixas.map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct down">${a.change.toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.price?.toFixed(2)}</span>
      </div>
    `).join('');
  } catch (_) {
    const msg = '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
    document.getElementById('maiores-altas').innerHTML = msg;
    document.getElementById('maiores-baixas').innerHTML = msg;
  }
}

// ── Moedas — AwesomeAPI (suporta CORS nativamente) ────────────────────────────
async function carregarMoedas() {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,JPY-BRL');
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();

    const moedas = [
      { key: 'USDBRL', nome: 'Dólar', emoji: '🇺🇸' },
      { key: 'EURBRL', nome: 'Euro', emoji: '🇪🇺' },
      { key: 'GBPBRL', nome: 'Libra', emoji: '🇬🇧' },
      { key: 'ARSBRL', nome: 'Peso Arg.', emoji: '🇦🇷' },
      { key: 'JPYBRL', nome: 'Iene', emoji: '🇯🇵' },
    ];

    document.getElementById('moedas-tbody').innerHTML = moedas.map(m => {
      const d = data[m.key];
      if (!d) return '';
      const var_ = parseFloat(d.pctChange);
      return `
        <tr>
          <td>${m.emoji} ${m.nome}</td>
          <td>R$ ${parseFloat(d.bid).toFixed(3)}</td>
          <td>R$ ${parseFloat(d.ask).toFixed(3)}</td>
          <td class="${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</td>
        </tr>
      `;
    }).join('');
  } catch (_) {
    document.getElementById('moedas-tbody').innerHTML =
      '<tr><td colspan="4" style="color:var(--cinza-texto);font-size:0.8rem;padding:12px">Dados indisponíveis</td></tr>';
  }
}

// ── Criptoativos — CoinGecko (suporta CORS nativamente) ───────────────────────
async function carregarCripto() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,cardano&vs_currencies=brl&include_24hr_change=true'
    );
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();

    const coins = [
      { id: 'bitcoin',     symbol: 'BTC', nome: 'Bitcoin' },
      { id: 'ethereum',    symbol: 'ETH', nome: 'Ethereum' },
      { id: 'solana',      symbol: 'SOL', nome: 'Solana' },
      { id: 'binancecoin', symbol: 'BNB', nome: 'BNB' },
      { id: 'cardano',     symbol: 'ADA', nome: 'Cardano' },
    ];

    document.getElementById('cripto-list').innerHTML = coins.map(c => {
      const d = data[c.id];
      if (!d) return '';
      const var_ = d.brl_24h_change || 0;
      return `
        <div class="cripto-item">
          <div>
            <div class="cripto-nome">${c.symbol}</div>
            <div style="font-size:0.75rem;color:var(--cinza-texto)">${c.nome}</div>
          </div>
          <div style="text-align:right">
            <div class="cripto-preco">R$ ${formatarNumero(d.brl)}</div>
            <div class="cripto-var ${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</div>
          </div>
        </div>
      `;
    }).join('') || '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
  } catch (_) {
    document.getElementById('cripto-list').innerHTML =
      '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
  }
}

// ── Tabela de ações via proxy ─────────────────────────────────────────────────
async function carregarAcoes() {
  const tickers = [
    'PETR4.SA','VALE3.SA','ITUB4.SA','BBDC4.SA','ABEV3.SA',
    'WEGE3.SA','RENT3.SA','MGLU3.SA','LREN3.SA','BBAS3.SA',
    'SUZB3.SA','GGBR4.SA','CSNA3.SA','USIM5.SA','CSAN3.SA'
  ];

  try {
    const promises = tickers.map(t =>
      fetchComProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=1d`, 5000)
        .then(d => {
          const meta = d?.chart?.result?.[0]?.meta;
          if (!meta) return null;
          const var_ = meta.chartPreviousClose
            ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
            : 0;
          return {
            symbol: t.replace('.SA', ''),
            name: meta.shortName || '',
            price: meta.regularMarketPrice,
            change: var_,
            low: meta.regularMarketDayLow,
            high: meta.regularMarketDayHigh,
            volume: meta.regularMarketVolume,
          };
        })
        .catch(() => null)
    );

    const acoes = (await Promise.all(promises)).filter(Boolean);

    if (!acoes.length) throw new Error('sem dados');

    document.getElementById('acoes-tbody').innerHTML = acoes.map(a => `
      <tr>
        <td>
          <span class="ticker-link">${a.symbol}</span>
          <div style="font-size:0.72rem;color:var(--cinza-texto)">${a.name}</div>
        </td>
        <td>R$ ${a.price?.toFixed(2) || '—'}</td>
        <td class="${a.change >= 0 ? 'ab-pct up' : 'ab-pct down'}">${a.change >= 0 ? '+' : ''}${a.change.toFixed(2)}%</td>
        <td style="color:var(--cinza-texto)">R$ ${a.low?.toFixed(2) || '—'}</td>
        <td style="color:var(--cinza-texto)">R$ ${a.high?.toFixed(2) || '—'}</td>
        <td style="color:var(--cinza-texto)">${a.volume ? formatarVolume(a.volume) : '—'}</td>
      </tr>
    `).join('');
  } catch (_) {
    document.getElementById('acoes-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--cinza-texto)">Dados indisponíveis</td></tr>';
  }
}

// ── Busca de ativo ────────────────────────────────────────────────────────────
let buscaTimeout;
async function buscarAtivo() {
  clearTimeout(buscaTimeout);
  const q = document.getElementById('busca-input').value.trim().toUpperCase();
  const resultEl = document.getElementById('busca-resultado');
  if (!q || q.length < 2) { resultEl.style.display = 'none'; return; }

  buscaTimeout = setTimeout(async () => {
    try {
      const ticker = q.endsWith('.SA') ? q : `${q}.SA`;
      const data = await fetchComProxy(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
      );
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) { resultEl.style.display = 'none'; return; }

      const var_ = meta.chartPreviousClose
        ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
        : 0;

      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:1.2rem;font-weight:800;color:var(--laranja)">${q}</div>
            <div style="font-size:0.85rem;color:var(--cinza-texto)">${meta.shortName || meta.longName || ''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.8rem;font-weight:900">R$ ${meta.regularMarketPrice?.toFixed(2)}</div>
            <div class="${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}" style="font-size:1rem">
              ${var_ >= 0 ? '▲' : '▼'} ${Math.abs(var_).toFixed(2)}%
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;font-size:0.82rem">
          <div><span style="color:var(--cinza-texto)">Abertura</span><br>R$ ${meta.regularMarketOpen?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Mín. dia</span><br>R$ ${meta.regularMarketDayLow?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Máx. dia</span><br>R$ ${meta.regularMarketDayHigh?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Fech. ant.</span><br>R$ ${meta.chartPreviousClose?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Volume</span><br>${meta.regularMarketVolume ? formatarVolume(meta.regularMarketVolume) : '—'}</div>
          <div><span style="color:var(--cinza-texto)">Mercado</span><br>${meta.exchangeName || '—'}</div>
        </div>
      `;
    } catch (_) { resultEl.style.display = 'none'; }
  }, 500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatarNumero(n) {
  if (!n && n !== 0) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatarVolume(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toString();
}
