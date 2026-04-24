/**
 * cotacoes.js — Página de cotações
 * Usa a API pública do Brapi (https://brapi.dev) — gratuita, sem chave necessária
 * para dados básicos. Dados com delay de 15 minutos.
 */

const BRAPI = 'https://brapi.dev/api';

// Ações para exibir na tabela
const ACOES_LISTA = [
  'PETR4','VALE3','ITUB4','BBDC4','ABEV3',
  'WEGE3','RENT3','MGLU3','LREN3','BBAS3',
  'SUZB3','GGBR4','CSNA3','USIM5','CSAN3'
];

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
  // Atualiza a cada 5 minutos
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
    const res = await fetch(`${BRAPI}/quote/%5EBVSP?range=1d&interval=30m`);
    const data = await res.json();
    const q = data?.results?.[0];
    if (!q) return;

    const valor = q.regularMarketPrice;
    const variacao = q.regularMarketChangePercent;
    const anterior = q.regularMarketPreviousClose;
    const abertura = q.regularMarketOpen;

    document.getElementById('ibov-valor').textContent = formatarNumero(valor);
    const varEl = document.getElementById('ibov-var');
    varEl.textContent = `${variacao >= 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(2)}%`;
    varEl.className = `ibov-variacao ${variacao >= 0 ? 'up' : 'down'}`;
    document.getElementById('ibov-meta').textContent =
      `Fechamento anterior: ${formatarNumero(anterior)} · Abertura: ${formatarNumero(abertura)}`;
    document.getElementById('ibov-hora').textContent =
      `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})} · Delay 15 min`;

    // Mini gráfico
    const historico = q.historicalDataPrice || [];
    if (historico.length > 1) {
      renderMiniChart(historico.map(h => h.close || h.regularMarketPrice));
    }

    // Maiores altas e baixas (simulado com dados reais do Ibovespa)
    await carregarAltasBaixas();
  } catch (e) {
    document.getElementById('ibov-valor').textContent = 'Indisponível';
    document.getElementById('ibov-meta').textContent = 'Erro ao carregar dados. Tente novamente.';
  }
}

function renderMiniChart(precos) {
  if (!precos || precos.length < 2) return;
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const range = max - min || 1;
  const w = 400;
  const h = 60;
  const pts = precos.map((p, i) => {
    const x = (i / (precos.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const isDown = precos[precos.length - 1] < precos[0];
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
  try {
    // Busca as principais ações do Ibovespa
    const tickers = 'PETR4,VALE3,ITUB4,BBDC4,ABEV3,WEGE3,RENT3,MGLU3,LREN3,BBAS3';
    const res = await fetch(`${BRAPI}/quote/${tickers}`);
    const data = await res.json();
    const acoes = (data?.results || [])
      .filter(a => a.regularMarketChangePercent != null)
      .sort((a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent);

    const altas = acoes.slice(0, 5);
    const baixas = [...acoes].sort((a, b) => a.regularMarketChangePercent - b.regularMarketChangePercent).slice(0, 5);

    document.getElementById('maiores-altas').innerHTML = altas.map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct up">+${a.regularMarketChangePercent.toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.regularMarketPrice?.toFixed(2)}</span>
      </div>
    `).join('') || '<p style="color:var(--cinza-texto);font-size:0.8rem">Sem dados</p>';

    document.getElementById('maiores-baixas').innerHTML = baixas.map(a => `
      <div class="ab-item">
        <span class="ab-ticker">${a.symbol}</span>
        <span class="ab-pct down">${a.regularMarketChangePercent.toFixed(2)}%</span>
        <span class="ab-preco">R$ ${a.regularMarketPrice?.toFixed(2)}</span>
      </div>
    `).join('') || '<p style="color:var(--cinza-texto);font-size:0.8rem">Sem dados</p>';
  } catch (_) {}
}

// ── Moedas ────────────────────────────────────────────────────────────────────
async function carregarMoedas() {
  try {
    const pares = 'USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,JPY-BRL';
    const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${pares}`);
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
  } catch (e) {
    document.getElementById('moedas-tbody').innerHTML =
      '<tr><td colspan="4" style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</td></tr>';
  }
}

// ── Criptoativos ──────────────────────────────────────────────────────────────
async function carregarCripto() {
  try {
    const res = await fetch(`${BRAPI}/v2/crypto?coin=BTC,ETH,SOL,BNB,ADA&currency=BRL`);
    const data = await res.json();
    const coins = data?.coins || [];

    document.getElementById('cripto-list').innerHTML = coins.map(c => {
      const var_ = c.regularMarketChangePercent || 0;
      return `
        <div class="cripto-item">
          <div>
            <div class="cripto-nome">${c.coin}</div>
            <div style="font-size:0.75rem;color:var(--cinza-texto)">${c.coinName || ''}</div>
          </div>
          <div style="text-align:right">
            <div class="cripto-preco">R$ ${formatarNumero(c.regularMarketPrice)}</div>
            <div class="cripto-var ${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</div>
          </div>
        </div>
      `;
    }).join('') || '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
  } catch (e) {
    document.getElementById('cripto-list').innerHTML =
      '<p style="color:var(--cinza-texto);font-size:0.8rem">Dados indisponíveis</p>';
  }
}

// ── Tabela de ações ───────────────────────────────────────────────────────────
async function carregarAcoes() {
  try {
    const tickers = ACOES_LISTA.join(',');
    const res = await fetch(`${BRAPI}/quote/${tickers}`);
    const data = await res.json();
    const acoes = data?.results || [];

    if (!acoes.length) {
      document.getElementById('acoes-tbody').innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--cinza-texto)">Dados indisponíveis</td></tr>';
      return;
    }

    document.getElementById('acoes-tbody').innerHTML = acoes.map(a => {
      const var_ = a.regularMarketChangePercent || 0;
      const vol = a.regularMarketVolume;
      return `
        <tr>
          <td>
            <a href="https://www.infomoney.com.br/cotacoes/b3/acao/${a.symbol.toLowerCase()}/" target="_blank" rel="noopener" class="ticker-link">${a.symbol}</a>
            <div style="font-size:0.72rem;color:var(--cinza-texto)">${a.shortName || ''}</div>
          </td>
          <td>R$ ${a.regularMarketPrice?.toFixed(2) || '—'}</td>
          <td class="${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}">${var_ >= 0 ? '+' : ''}${var_.toFixed(2)}%</td>
          <td style="color:var(--cinza-texto)">R$ ${a.regularMarketDayLow?.toFixed(2) || '—'}</td>
          <td style="color:var(--cinza-texto)">R$ ${a.regularMarketDayHigh?.toFixed(2) || '—'}</td>
          <td style="color:var(--cinza-texto)">${vol ? formatarVolume(vol) : '—'}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    document.getElementById('acoes-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--cinza-texto)">Erro ao carregar dados</td></tr>';
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
      const res = await fetch(`${BRAPI}/quote/${q}`);
      const data = await res.json();
      const a = data?.results?.[0];
      if (!a) { resultEl.style.display = 'none'; return; }

      const var_ = a.regularMarketChangePercent || 0;
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:1.2rem;font-weight:800;color:var(--laranja)">${a.symbol}</div>
            <div style="font-size:0.85rem;color:var(--cinza-texto)">${a.longName || a.shortName || ''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.8rem;font-weight:900">R$ ${a.regularMarketPrice?.toFixed(2)}</div>
            <div class="${var_ >= 0 ? 'ab-pct up' : 'ab-pct down'}" style="font-size:1rem">
              ${var_ >= 0 ? '▲' : '▼'} ${Math.abs(var_).toFixed(2)}%
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;font-size:0.82rem">
          <div><span style="color:var(--cinza-texto)">Abertura</span><br>R$ ${a.regularMarketOpen?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Mín. dia</span><br>R$ ${a.regularMarketDayLow?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Máx. dia</span><br>R$ ${a.regularMarketDayHigh?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Fech. ant.</span><br>R$ ${a.regularMarketPreviousClose?.toFixed(2) || '—'}</div>
          <div><span style="color:var(--cinza-texto)">Volume</span><br>${a.regularMarketVolume ? formatarVolume(a.regularMarketVolume) : '—'}</div>
          <div><span style="color:var(--cinza-texto)">Mercado</span><br>${a.exchange || '—'}</div>
        </div>
      `;
    } catch (_) { resultEl.style.display = 'none'; }
  }, 500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatarNumero(n) {
  if (!n) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatarVolume(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toString();
}
