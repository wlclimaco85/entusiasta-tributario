/**
 * cotacoes.js — Página de cotações
 * APIs: mfinance.com.br (ações B3, sem CORS) + AwesomeAPI (câmbio) + CoinGecko (cripto)
 */

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

// ── Ibovespa via mfinance.com.br ──────────────────────────────────────────────
async function carregarIbovespa() {
  try {
    const res = await fetch('https://mfinance.com.br/api/v1/indexes/IBOV', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('indisponível');
    const d = await res.json();

    const valor = d.lastPrice || d.value;
    const variacao = d.change || 0;

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

// ── Maiores altas/baixas via mfinance.com.br ──────────────────────────────────
async function carregarAltasBaixas() {
  const tickers = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','RENT3','MGLU3','LREN3','BBAS3'];
  try {
    const promises = tickers.map(t =>
      fetch(`https://mfinance.com.br/api/v1/stocks/${t}`, { signal: AbortSignal.timeout(6000) })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );
    const results = (await Promise.all(promises)).filter(Boolean);
    if (!results.length) throw new Error('sem dados');

    const sorted = [...results].sort((a, b) => (b.change || 0) - (a.change || 0));
    document.getElementById('maiores-altas').innerHTML = sorted.slice(0, 5).map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct up">+${(a.change || 0).toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.lastPrice?.toFixed(2)}</span>
      </div>`).join('');
    document.getElementById('maiores-baixas').innerHTML = [...sorted].reverse().slice(0, 5).map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct down">${(a.change || 0).toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.lastPrice?.toFixed(2)}</span>
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

// ── Tabela de ações via mfinance.com.br ───────────────────────────────────────
async function carregarAcoes() {
  const tickers = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','RENT3','MGLU3','LREN3','BBAS3','SUZB3','GGBR4','CSNA3','USIM5','CSAN3'];
  try {
    const promises = tickers.map(t =>
      fetch(`https://mfinance.com.br/api/v1/stocks/${t}`, { signal: AbortSignal.timeout(6000) })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );
    const acoes = (await Promise.all(promises)).filter(Boolean);
    if (!acoes.length) throw new Error('sem dados');
    document.getElementById('acoes-tbody').innerHTML = acoes.map(a => {
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
    }).join('');
  } catch (_) {
    document.getElementById('acoes-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--cinza-texto)">Dados indisponíveis</td></tr>';
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
      const res = await fetch(`https://mfinance.com.br/api/v1/stocks/${q}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) { resultEl.style.display = 'none'; return; }
      const a = await res.json();
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
