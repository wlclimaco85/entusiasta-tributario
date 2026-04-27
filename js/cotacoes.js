/**
 * cotacoes.js — Página de cotações
 * APIs: allorigins.win/get (proxy CORS) + Yahoo Finance v7 + CoinGecko + AwesomeAPI
 */

// Helper: tenta múltiplos proxies CORS com fallback
async function fetchViaProxy(url, timeout = 10000) {
  const proxies = [
    'https://api.allorigins.win/get?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
  ];
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(timeout) });
      if (!res.ok) continue;
      const text = await res.text();
      // allorigins retorna {contents: "..."}, outros retornam direto
      try {
        const wrapper = JSON.parse(text);
        if (wrapper.contents) return JSON.parse(wrapper.contents);
        return wrapper;
      } catch (_) {
        return JSON.parse(text);
      }
    } catch (_) { continue; }
  }
  throw new Error('todos os proxies falharam');
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

// ── Ibovespa ──────────────────────────────────────────────────────────────────
async function carregarIbovespa() {
  try {
    const data = await fetchViaProxy('https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?interval=1d&range=1d');
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('sem dados');
    const valor = meta.regularMarketPrice;
    const anterior = meta.chartPreviousClose || meta.previousClose || valor;
    const variacao = anterior ? ((valor - anterior) / anterior) * 100 : 0;
    document.getElementById('ibov-valor').textContent = formatarNumero(valor);
    const varEl = document.getElementById('ibov-var');
    varEl.textContent = `${variacao >= 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(2)}%`;
    varEl.className = `ibov-variacao ${variacao >= 0 ? 'up' : 'down'}`;
    document.getElementById('ibov-meta').textContent = 'Atualizado a 15 min';
    document.getElementById('ibov-hora').textContent =
      `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Delay 15 min`;
  } catch (_) {
    document.getElementById('ibov-valor').textContent = 'Indisponível';
    document.getElementById('ibov-meta').textContent = 'Dados indisponíveis';
  }
  await carregarAltasBaixas();
}

// ── Maiores altas/baixas ──────────────────────────────────────────────────────
async function carregarAltasBaixas() {
  const tickers = ['PETR4.SA','VALE3.SA','ITUB4.SA','BBDC4.SA','ABEV3.SA','WEGE3.SA','RENT3.SA','MGLU3.SA','LREN3.SA','BBAS3.SA'];
  try {
    const data = await fetchViaProxy(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`);
    const quotes = data?.quoteResponse?.result || [];
    if (!quotes.length) throw new Error('sem dados');
    const resultados = quotes.map(q => ({
      symbol: q.symbol.replace('.SA', ''),
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent || 0,
    }));
    const sorted = [...resultados].sort((a, b) => b.change - a.change);
    document.getElementById('maiores-altas').innerHTML = sorted.slice(0, 5).map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct up">+${a.change.toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.price?.toFixed(2)}</span>
      </div>`).join('');
    document.getElementById('maiores-baixas').innerHTML = [...sorted].reverse().slice(0, 5).map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct down">${a.change.toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.price?.toFixed(2)}</span>
      </div>`).join('');
  } catch (_) {
    const msg = '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
    document.getElementById('maiores-altas').innerHTML = msg;
    document.getElementById('maiores-baixas').innerHTML = msg;
  }
}

// ── Moedas via AwesomeAPI (CORS nativo) ───────────────────────────────────────
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
      return `<tr>
        <td>${m.emoji} ${m.nome}</td>
        <td>R$ ${parseFloat(d.bid).toFixed(3)}</td>
        <td>R$ ${parseFloat(d.ask).toFixed(3)}</td>
        <td class="${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</td>
      </tr>`;
    }).join('');
  } catch (_) {
    document.getElementById('moedas-tbody').innerHTML =
      '<tr><td colspan="4" style="color:var(--cinza-texto);font-size:0.8rem;padding:12px">Dados indisponíveis</td></tr>';
  }
}

// ── Criptoativos via CoinGecko (CORS nativo) ──────────────────────────────────
async function carregarCripto() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,cardano&vs_currencies=brl&include_24hr_change=true');
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();
    const coins = [
      { id: 'bitcoin', symbol: 'BTC', nome: 'Bitcoin' },
      { id: 'ethereum', symbol: 'ETH', nome: 'Ethereum' },
      { id: 'solana', symbol: 'SOL', nome: 'Solana' },
      { id: 'binancecoin', symbol: 'BNB', nome: 'BNB' },
      { id: 'cardano', symbol: 'ADA', nome: 'Cardano' },
    ];
    document.getElementById('cripto-list').innerHTML = coins.map(c => {
      const d = data[c.id];
      if (!d) return '';
      const var_ = d.brl_24h_change || 0;
      return `<div class="cripto-item">
        <div>
          <div class="cripto-nome">${c.symbol}</div>
          <div style="font-size:0.75rem;color:var(--cinza-texto)">${c.nome}</div>
        </div>
        <div style="text-align:right">
          <div class="cripto-preco">R$ ${formatarNumero(d.brl)}</div>
          <div class="cripto-var ${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</div>
        </div>
      </div>`;
    }).join('') || '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
  } catch (_) {
    document.getElementById('cripto-list').innerHTML = '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
  }
}

// ── Tabela de ações ───────────────────────────────────────────────────────────
async function carregarAcoes() {
  const tickers = ['PETR4.SA','VALE3.SA','ITUB4.SA','BBDC4.SA','ABEV3.SA','WEGE3.SA','RENT3.SA','MGLU3.SA','LREN3.SA','BBAS3.SA','SUZB3.SA','GGBR4.SA','CSNA3.SA','USIM5.SA','CSAN3.SA'];
  try {
    const data = await fetchViaProxy(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`);
    const quotes = data?.quoteResponse?.result || [];
    if (!quotes.length) throw new Error('sem dados');
    document.getElementById('acoes-tbody').innerHTML = quotes.map(q => {
      const change = q.regularMarketChangePercent || 0;
      return `<tr>
        <td><span class="ticker-link">${q.symbol.replace('.SA','')}</span>
          <div style="font-size:0.72rem;color:var(--cinza-texto)">${q.shortName || ''}</div></td>
        <td>R$ ${q.regularMarketPrice?.toFixed(2) || '—'}</td>
        <td class="${change >= 0 ? 'ab-pct up' : 'ab-pct down'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</td>
        <td style="color:var(--cinza-texto)">R$ ${q.regularMarketDayLow?.toFixed(2) || '—'}</td>
        <td style="color:var(--cinza-texto)">R$ ${q.regularMarketDayHigh?.toFixed(2) || '—'}</td>
        <td style="color:var(--cinza-texto)">${q.regularMarketVolume ? formatarVolume(q.regularMarketVolume) : '—'}</td>
      </tr>`;
    }).join('');
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
      const data = await fetchViaProxy(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`);
      const q2 = data?.quoteResponse?.result?.[0];
      if (!q2) { resultEl.style.display = 'none'; return; }
      const var_ = q2.regularMarketChangePercent || 0;
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--laranja)">${q2.symbol.replace('.SA','')}</div>
            <div style="font-size:0.8rem;color:var(--cinza-texto)">${q2.shortName || ''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.4rem;font-weight:900">R$ ${q2.regularMarketPrice?.toFixed(2)}</div>
            <div class="${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</div>
          </div>
        </div>`;
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
