/**
 * cotacoes.js — Página de cotações
 * APIs: mfinance.com.br (ações B3) + AwesomeAPI (câmbio) + CoinGecko (cripto)
 * mfinance.com.br tem CORS nativo e endpoint único para todas as ações
 */

let _stocksCache = null; // cache para evitar múltiplas requisições

async function getStocks() {
  if (_stocksCache) return _stocksCache;
  const res = await fetch('https://mfinance.com.br/api/v1/stocks', { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error('indisponível');
  const data = await res.json();
  _stocksCache = data.stocks || [];
  // Limpa cache após 5 minutos
  setTimeout(() => { _stocksCache = null; }, 5 * 60 * 1000);
  return _stocksCache;
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
  setInterval(() => { _stocksCache = null; carregarTudo(); }, 5 * 60 * 1000);
});

async function carregarTudo() {
  await Promise.allSettled([
    carregarIbovespaEAcoes(),
    carregarMoedas(),
    carregarCripto(),
  ]);
}

// ── Ibovespa + Ações (uma única requisição) ───────────────────────────────────
async function carregarIbovespaEAcoes() {
  try {
    const stocks = await getStocks();

    // Variação média das 5 maiores ações como referência do mercado
    const top5 = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3'];
    const top5Data = stocks.filter(s => top5.includes(s.symbol) && s.lastPrice > 0);
    const ibovVar = top5Data.length
      ? top5Data.reduce((s, a) => s + (a.change || 0), 0) / top5Data.length
      : 0;

    const valEl = document.getElementById('ibov-valor');
    const varEl = document.getElementById('ibov-var');
    if (valEl) valEl.textContent = '—';
    if (varEl) {
      varEl.textContent = `${ibovVar >= 0 ? '▲' : '▼'} ${Math.abs(ibovVar).toFixed(2)}%`;
      varEl.className = `ibov-variacao ${ibovVar >= 0 ? 'up' : 'down'}`;
    }
    document.getElementById('ibov-meta').textContent = 'Dados com defasagem de 15 min';
    document.getElementById('ibov-hora').textContent =
      `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Defasagem de 15 min`;

    // Maiores altas/baixas
    const tickersAB = new Set(['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','RENT3','MGLU3','LREN3','BBAS3']);
    const abData = stocks.filter(s => tickersAB.has(s.symbol) && s.lastPrice > 0);
    const sorted = [...abData].sort((a, b) => (b.change || 0) - (a.change || 0));
    document.getElementById('maiores-altas').innerHTML = sorted.slice(0, 5).map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct up">+${(a.change || 0).toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.lastPrice?.toFixed(2)}</span>
      </div>`).join('') || '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
    document.getElementById('maiores-baixas').innerHTML = [...sorted].reverse().slice(0, 5).map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct down">${(a.change || 0).toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.lastPrice?.toFixed(2)}</span>
      </div>`).join('') || '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';

    // Tabela de ações
    const tickersTabela = new Set(['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','RENT3','MGLU3','LREN3','BBAS3','SUZB3','GGBR4','CSNA3','USIM5','CSAN3']);
    const acoes = stocks.filter(s => tickersTabela.has(s.symbol) && s.lastPrice > 0);
    document.getElementById('acoes-tbody').innerHTML = acoes.length
      ? acoes.map(a => {
          const change = a.change || 0;
          return `<tr>
            <td><span class="ticker-link">${a.symbol}</span>
              <div style="font-size:0.72rem;color:var(--cinza-texto)">${a.name?.substring(0,30) || ''}</div></td>
            <td>R$ ${a.lastPrice?.toFixed(2) || '—'}</td>
            <td class="${change >= 0 ? 'ab-pct up' : 'ab-pct down'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</td>
            <td style="color:var(--cinza-texto)">R$ ${a.low?.toFixed(2) || '—'}</td>
            <td style="color:var(--cinza-texto)">R$ ${a.high?.toFixed(2) || '—'}</td>
            <td style="color:var(--cinza-texto)">${a.volume ? formatarVolume(a.volume) : '—'}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--cinza-texto)">Dados indisponíveis</td></tr>';

  } catch (_) {
    document.getElementById('ibov-valor').textContent = 'Indisponível';
    document.getElementById('ibov-meta').textContent = 'Dados indisponíveis';
    const msg = '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
    document.getElementById('maiores-altas').innerHTML = msg;
    document.getElementById('maiores-baixas').innerHTML = msg;
    document.getElementById('acoes-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--cinza-texto)">Dados indisponíveis</td></tr>';
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

// ── Criptoativos via Binance (sem token, sem rate limit) ─────────────────────
async function carregarCripto() {
  try {
    // Binance API — gratuita, sem CORS, sem token
    const symbols = ['BTCBRL','ETHBRL','SOLBRL','BNBBRL','ADABRL'];
    const names = { BTCBRL: 'Bitcoin', ETHBRL: 'Ethereum', SOLBRL: 'Solana', BNBBRL: 'BNB', ADABRL: 'Cardano' };
    const tickers = symbols.map(s => `"${s}"`).join(',');
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${tickers}]`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('indisponível');
    const data = await res.json();
    document.getElementById('cripto-list').innerHTML = data.map(d => {
      const var_ = parseFloat(d.priceChangePercent) || 0;
      const price = parseFloat(d.lastPrice);
      const symbol = d.symbol.replace('BRL','');
      return `<div class="cripto-item">
        <div>
          <div class="cripto-nome">${symbol}</div>
          <div style="font-size:0.75rem;color:var(--cinza-texto)">${names[d.symbol] || symbol}</div>
        </div>
        <div style="text-align:right">
          <div class="cripto-preco">R$ ${price.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
          <div class="cripto-var ${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</div>
        </div>
      </div>`;
    }).join('') || '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
  } catch (_) {
    document.getElementById('cripto-list').innerHTML = '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
  }
}

// ── Busca de ativo via mfinance.com.br ────────────────────────────────────────
let buscaTimeout;
async function buscarAtivo() {
  clearTimeout(buscaTimeout);
  const q = document.getElementById('busca-input').value.trim().toUpperCase().replace('.SA','');
  const resultEl = document.getElementById('busca-resultado');
  if (!q || q.length < 2) { resultEl.style.display = 'none'; return; }
  buscaTimeout = setTimeout(async () => {
    try {
      // Tenta no cache primeiro
      const stocks = _stocksCache || await getStocks();
      const a = stocks.find(s => s.symbol === q);
      if (!a || !a.lastPrice) { resultEl.style.display = 'none'; return; }
      const var_ = a.change || 0;
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--laranja)">${a.symbol}</div>
            <div style="font-size:0.8rem;color:var(--cinza-texto)">${a.name || ''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.4rem;font-weight:900">R$ ${a.lastPrice?.toFixed(2)}</div>
            <div class="${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;font-size:0.82rem">
          <div><span style="color:var(--cinza-texto)">Abertura</span><br>R$ ${a.priceOpen?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Mín. dia</span><br>R$ ${a.low?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Máx. dia</span><br>R$ ${a.high?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Fech. ant.</span><br>R$ ${a.closingPrice?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Volume</span><br>${a.volume ? formatarVolume(a.volume) : '—'}</div>
          <div><span style="color:var(--cinza-texto)">Setor</span><br>${a.sector?.substring(0,20) || '—'}</div>
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
