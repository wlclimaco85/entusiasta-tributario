/**
 * home.js — Lógica da página inicial
 */

let paginaAtual = 0;
let categoriaAtiva = '';
let menuAtivo = '';
let totalPaginas = 0;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Lê menu e categoria da URL
  const params = new URLSearchParams(window.location.search);
  menuAtivo = params.get('menu') || '';
  categoriaAtiva = params.get('cat') || '';

  // Marca link ativo no nav
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (menuAtivo && href && href.includes(`menu=${menuAtivo}`)) a.classList.add('active');
    else if (!menuAtivo && href === 'index.html') a.classList.add('active');
  });

  // Auth header
  atualizarHeader();

  // Carrega dados em paralelo
  await Promise.all([
    carregarHero(),
    carregarCategorias(),
    carregarArtigos(),
  ]);
});

// ── Header auth ───────────────────────────────────────────────────────────────
function atualizarHeader() {
  const btnAdmin = document.getElementById('btn-admin');
  const btnLogin = document.getElementById('btn-login');
  if (Auth.isLoggedIn()) {
    btnAdmin.style.display = 'inline-flex';
    btnLogin.textContent = 'Sair';
    btnLogin.href = '#';
    btnLogin.onclick = (e) => { e.preventDefault(); Auth.logout(); };
  }
}

// ── Hero — Carrossel de destaques ────────────────────────────────────────────
let carrosselDestaques = [];
let carrosselIndex = 0;
let carrosselTimer = null;

async function carregarHero() {
  try {
    const [destaques, ultimos] = await Promise.all([
      ArtigoAPI.destaques().catch(() => []),
      ArtigoAPI.ultimos(5).catch(() => []),
    ]);

    carrosselDestaques = (destaques?.length ? destaques : [ultimos?.[0]]).filter(Boolean);

    if (!carrosselDestaques.length) {
      document.getElementById('hero-main').innerHTML = `
        <div style="background:var(--preto-card);border-radius:var(--radius);padding:40px;text-align:center;min-height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px">
          <div style="font-size:3rem">📰</div>
          <p style="color:var(--cinza-texto)">Nenhum artigo em destaque ainda.</p>
          ${Auth.isLoggedIn() ? '<a href="admin.html" class="btn btn-primary" style="margin-top:8px">+ Criar primeiro artigo</a>' : ''}
        </div>`;
    } else {
      renderCarrossel();
      if (carrosselDestaques.length > 1) {
        carrosselTimer = setInterval(() => {
          carrosselIndex = (carrosselIndex + 1) % carrosselDestaques.length;
          renderCarrossel();
        }, 60000); // 1 minuto
      }
    }

    const sidebar = (ultimos || []).slice(0, 4);
    renderHeroSidebar(sidebar);
  } catch (e) {
    document.getElementById('hero-main').innerHTML =
      '<p style="color:var(--cinza-texto);padding:20px">Erro ao carregar destaques.</p>';
  }
}

function renderCarrossel() {
  const artigo = carrosselDestaques[carrosselIndex];
  const el = document.getElementById('hero-main');
  const total = carrosselDestaques.length;

  const emoji = emojiCategoria(artigo.categoria);
  let imgSrc = artigo.imagemUrl || artigo.imagemCapa;
  if (imgSrc && imgSrc.startsWith('/')) {
    imgSrc = 'https://appacademia-production-be7e.up.railway.app' + imgSrc;
  }
  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${artigo.titulo}" class="hero-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const emojiHtml = `<div class="hero-img-placeholder" style="display:${imgSrc ? 'none' : 'flex'}">${emoji}</div>`;

  // Indicadores de posição (bolinhas)
  const dots = total > 1 ? `
    <div style="position:absolute;bottom:56px;right:16px;display:flex;gap:6px;z-index:2">
      ${carrosselDestaques.map((_, i) => `
        <button onclick="irCarrossel(${i})" style="width:8px;height:8px;border-radius:50%;border:none;cursor:pointer;padding:0;background:${i === carrosselIndex ? '#fff' : 'rgba(255,255,255,0.4)'}"></button>
      `).join('')}
    </div>
    <button onclick="irCarrossel(${(carrosselIndex - 1 + total) % total})" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;z-index:2">‹</button>
    <button onclick="irCarrossel(${(carrosselIndex + 1) % total})" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;z-index:2">›</button>
  ` : '';

  el.innerHTML = `
    <div style="position:relative">
      <a href="artigo.html?slug=${artigo.slug}">
        ${imgHtml}${emojiHtml}
        <div class="hero-content">
          <span class="tag">${artigo.categoria || 'Geral'}</span>
          <h1><a href="artigo.html?slug=${artigo.slug}">${artigo.titulo}</a></h1>
          <div class="hero-meta">
            <span>✍️ ${artigo.autor || 'Entusiasta Tributário'}</span>
            <span>📅 ${formatarData(artigo.dataPublicacao)}</span>
            ${artigo.tempoLeituraMin ? `<span>⏱️ ${tempoLeitura(artigo.tempoLeituraMin)}</span>` : ''}
          </div>
        </div>
      </a>
      ${dots}
    </div>
  `;
}

function irCarrossel(index) {
  clearInterval(carrosselTimer);
  carrosselIndex = index;
  renderCarrossel();
  // Reinicia o timer
  if (carrosselDestaques.length > 1) {
    carrosselTimer = setInterval(() => {
      carrosselIndex = (carrosselIndex + 1) % carrosselDestaques.length;
      renderCarrossel();
    }, 60000);
  }
}

function renderHeroSidebar(artigos) {
  const el = document.getElementById('hero-sidebar-list');
  if (!artigos.length) { el.innerHTML = '<p style="color:var(--cinza-texto);font-size:0.85rem">Nenhum artigo disponível.</p>'; return; }
  el.innerHTML = artigos.map(a => `
    <div class="card-mini">
      <div class="card-mini-img">${emojiCategoria(a.categoria)}</div>
      <div class="card-mini-body">
        <span class="tag" style="font-size:0.65rem">${a.categoria || 'Geral'}</span>
        <h3><a href="artigo.html?slug=${a.slug}">${a.titulo}</a></h3>
        <div class="card-mini-meta">${formatarDataCurta(a.dataPublicacao)}</div>
      </div>
    </div>
  `).join('');
}

// ── Categorias ────────────────────────────────────────────────────────────────
async function carregarCategorias() {
  try {
    const cats = await ArtigoAPI.categorias().catch(() => []);
    if (!cats || !cats.length) return; // Sem categorias ainda — não quebra
    const bar = document.getElementById('categorias-bar');
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (cat === categoriaAtiva ? ' active' : '');
      btn.dataset.cat = cat;
      btn.textContent = `${emojiCategoria(cat)} ${cat}`;
      btn.onclick = () => filtrarCategoria(cat);
      bar.appendChild(btn);
    });
    if (!categoriaAtiva) bar.querySelector('[data-cat=""]').classList.add('active');
  } catch (_) {}
}

function filtrarCategoria(cat) {
  categoriaAtiva = cat;
  menuAtivo = '';
  paginaAtual = 0;
  // Atualiza botões
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  // Atualiza título
  const titulo = document.getElementById('section-titulo');
  titulo.textContent = cat ? `${emojiCategoria(cat)} ${cat}` : 'Últimas Notícias';
  carregarArtigos();
}

// ── Grid de artigos ───────────────────────────────────────────────────────────
async function carregarArtigos() {
  const grid = document.getElementById('artigos-grid');
  grid.innerHTML = Array(4).fill('<div class="skeleton skeleton-card"></div>').join('');

  try {
    let artigos = [];
    let total = 0;

    if (menuAtivo) {
      // Usa endpoint de menu
      const res = await ArtigoAPI.porMenu(menuAtivo, 12);
      artigos = res || [];
      total = artigos.length;
      totalPaginas = 1;
    } else {
      // Listagem geral paginada
      const params = { pagina: paginaAtual, tamanho: 9 };
      if (categoriaAtiva) params.categoria = categoriaAtiva;

      const res = await ArtigoAPI.listarPublicos(params);
      artigos = res?.data?.dados || [];
      total = res?.data?.total || 0;
      totalPaginas = Math.ceil(total / 9);
    }

    document.getElementById('total-artigos').textContent = total ? `${total} artigo${total !== 1 ? 's' : ''}` : '';

    if (!artigos.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--cinza-texto)">
          <div style="font-size:3rem;margin-bottom:16px">📭</div>
          <p>Nenhum artigo encontrado${categoriaAtiva ? ` em "${categoriaAtiva}"` : ''}${menuAtivo ? ` no menu "${menuAtivo}"` : ''}.</p>
        </div>`;
      document.getElementById('paginacao').innerHTML = '';
      return;
    }

    grid.innerHTML = artigos.map(renderCard).join('');
    if (!menuAtivo) renderPaginacao();
  } catch (e) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--cinza-texto)">
      <p>Erro ao carregar artigos. Verifique se o backend está rodando.</p>
      <button class="btn btn-ghost" onclick="carregarArtigos()" style="margin-top:12px">Tentar novamente</button>
    </div>`;
  }
}

function renderCard(a) {
  const emoji = emojiCategoria(a.categoria);
  // Usa imagemUrl (campo calculado pelo backend) ou imagemCapa
  // Se a URL for relativa (começa com /), adiciona o host do backend
  let imgSrc = a.imagemUrl || a.imagemCapa;
  if (imgSrc && imgSrc.startsWith('/')) {
    imgSrc = 'https://appacademia-production-be7e.up.railway.app' + imgSrc;
  }
  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${a.titulo}" class="card-img" style="object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const emojiHtml = `<div class="card-img" style="display:${imgSrc ? 'none' : 'flex'};align-items:center;justify-content:center;font-size:2.5rem">${emoji}</div>`;

  return `
    <article class="card">
      <a href="artigo.html?slug=${a.slug}">
        ${imgHtml}${emojiHtml}
      </a>
      <div class="card-body">
        <span class="tag">${a.categoria || 'Geral'}</span>
        <h2><a href="artigo.html?slug=${a.slug}">${a.titulo}</a></h2>
        <p>${a.resumo || ''}</p>
        <div class="card-footer">
          <span>✍️ ${a.autor || 'Entusiasta Tributário'}</span>
          <span class="leitura">⏱️ ${tempoLeitura(a.tempoLeituraMin) || formatarDataCurta(a.dataPublicacao)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderPaginacao() {
  const el = document.getElementById('paginacao');
  if (totalPaginas <= 1) { el.innerHTML = ''; return; }

  let html = '';
  if (paginaAtual > 0) html += `<button class="pag-btn" onclick="irPagina(${paginaAtual - 1})">‹</button>`;

  for (let i = 0; i < totalPaginas; i++) {
    if (i === 0 || i === totalPaginas - 1 || Math.abs(i - paginaAtual) <= 2) {
      html += `<button class="pag-btn ${i === paginaAtual ? 'active' : ''}" onclick="irPagina(${i})">${i + 1}</button>`;
    } else if (Math.abs(i - paginaAtual) === 3) {
      html += `<span style="color:var(--cinza-texto);padding:0 4px">…</span>`;
    }
  }

  if (paginaAtual < totalPaginas - 1) html += `<button class="pag-btn" onclick="irPagina(${paginaAtual + 1})">›</button>`;
  el.innerHTML = html;
}

function irPagina(p) {
  paginaAtual = p;
  carregarArtigos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
