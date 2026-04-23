/**
 * artigo.js — Lógica da página de leitura de artigo
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Auth header
  if (Auth.isLoggedIn()) {
    document.getElementById('btn-admin').style.display = 'inline-flex';
    const btnLogin = document.getElementById('btn-login');
    btnLogin.textContent = 'Sair';
    btnLogin.href = '#';
    btnLogin.onclick = (e) => { e.preventDefault(); Auth.logout(); };
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) { mostrar404(); return; }

  try {
    const artigo = await ArtigoAPI.buscarPorSlug(slug);
    if (!artigo) { mostrar404(); return; }
    renderArtigo(artigo);
    carregarSidebar(artigo.categoria);

    // Incrementa visualizações — fire-and-forget, não bloqueia
    // Usa sessionStorage para não incrementar múltiplas vezes na mesma sessão
    const chaveVista = `artigo_visto_${artigo.id}`;
    if (!sessionStorage.getItem(chaveVista)) {
      sessionStorage.setItem(chaveVista, '1');
      ArtigoAPI.incrementarVisualizacoes(artigo.id);
    }
  } catch (e) {
    mostrar404();
  }
});

function renderArtigo(a) {
  // Meta
  document.getElementById('page-title').textContent = `${a.titulo} — Entusiasta Tributário`;
  document.getElementById('page-desc').content = a.resumo || a.titulo;

  // Breadcrumb
  document.getElementById('breadcrumb-cat').textContent = a.categoria || 'Artigo';
  document.getElementById('breadcrumb-titulo').textContent = a.titulo.substring(0, 50) + (a.titulo.length > 50 ? '…' : '');

  // Conteúdo
  document.getElementById('artigo-categoria').textContent = a.categoria || 'Geral';
  document.getElementById('artigo-titulo').textContent = a.titulo;
  document.getElementById('artigo-subtitulo').textContent = a.subtitulo || '';
  document.getElementById('artigo-autor').textContent = `✍️ ${a.autor || 'Entusiasta Tributário'}`;
  document.getElementById('artigo-data').textContent = `📅 ${formatarData(a.dataPublicacao)}`;
  document.getElementById('artigo-leitura').textContent = a.tempoLeituraMin ? `⏱️ ${tempoLeitura(a.tempoLeituraMin)}` : '';
  document.getElementById('artigo-views').textContent = a.visualizacoes ? `👁️ ${a.visualizacoes.toLocaleString('pt-BR')} visualizações` : '';

  // Corpo (HTML)
  const corpo = document.getElementById('artigo-corpo');

  // Imagem de capa — usa imagemUrl (campo calculado) ou imagemCapa
  const imgSrc = a.imagemUrl || a.imagemCapa;
  if (imgSrc) {
    const capaEl = document.createElement('img');
    capaEl.src = imgSrc;
    capaEl.alt = a.titulo;
    capaEl.className = 'artigo-capa';
    capaEl.onerror = () => capaEl.remove();
    corpo.parentElement.insertBefore(capaEl, corpo);
  }

  if (a.conteudoCompleto) {
    corpo.innerHTML = a.conteudoCompleto;
  } else if (a.resumo) {
    corpo.innerHTML = `<p>${a.resumo}</p>`;
  } else {
    corpo.innerHTML = '<p style="color:var(--cinza-texto)">Conteúdo não disponível.</p>';
  }

  // Tags
  if (a.tags) {
    const tagsEl = document.getElementById('artigo-tags');
    const tags = a.tags.split(',').map(t => t.trim()).filter(Boolean);
    tagsEl.innerHTML = `<p style="font-size:0.8rem;color:var(--cinza-texto);margin-bottom:8px">Tags:</p>
      ${tags.map(t => `<a href="index.html?titulo=${encodeURIComponent(t)}" class="tag outline" style="margin:2px">${t}</a>`).join('')}`;
  }

  // Fonte
  if (a.fonte || a.linkFonte) {
    const fonteEl = document.getElementById('artigo-fonte');
    fonteEl.innerHTML = `Fonte: ${a.linkFonte
      ? `<a href="${a.linkFonte}" target="_blank" rel="noopener" style="color:var(--laranja)">${a.fonte || a.linkFonte}</a>`
      : a.fonte}`;
  }

  // Mostra conteúdo
  document.getElementById('artigo-loading').style.display = 'none';
  document.getElementById('artigo-content').style.display = 'block';
}

async function carregarSidebar(categoriaAtual) {
  try {
    const [ultimos, cats] = await Promise.all([
      ArtigoAPI.ultimos(5).catch(() => []),
      ArtigoAPI.categorias().catch(() => []),
    ]);

    // Artigos relacionados
    const sidebarArtigos = document.getElementById('sidebar-artigos');
    const slug = new URLSearchParams(window.location.search).get('slug');
    const relacionados = (ultimos || []).filter(a => a.slug !== slug).slice(0, 4);
    sidebarArtigos.innerHTML = relacionados.length
      ? relacionados.map(a => `
          <div class="card-mini" style="padding:10px 0">
            <div class="card-mini-img" style="width:56px;height:44px;font-size:1.2rem">${emojiCategoria(a.categoria)}</div>
            <div class="card-mini-body">
              <h3 style="font-size:0.8rem"><a href="artigo.html?slug=${a.slug}">${a.titulo}</a></h3>
              <div class="card-mini-meta">${formatarDataCurta(a.dataPublicacao)}</div>
            </div>
          </div>
        `).join('')
      : '<p style="font-size:0.8rem;color:var(--cinza-texto)">Nenhum artigo relacionado.</p>';

    // Categorias
    const sidebarCats = document.getElementById('sidebar-cats');
    sidebarCats.innerHTML = (cats || []).length
      ? (cats || []).map(c =>
          `<a href="index.html?cat=${encodeURIComponent(c)}" class="tag outline" style="margin:2px">${emojiCategoria(c)} ${c}</a>`
        ).join('')
      : '<p style="font-size:0.8rem;color:var(--cinza-texto)">Sem categorias.</p>';
  } catch (_) {}
}

function mostrar404() {
  document.getElementById('artigo-loading').style.display = 'none';
  document.getElementById('artigo-404').style.display = 'block';
}

// ── Compartilhar ──────────────────────────────────────────────────────────────
function compartilhar(rede) {
  const url = encodeURIComponent(window.location.href);
  const titulo = encodeURIComponent(document.getElementById('artigo-titulo').textContent);
  const links = {
    whatsapp: `https://wa.me/?text=${titulo}%20${url}`,
    twitter:  `https://twitter.com/intent/tweet?text=${titulo}&url=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  };
  window.open(links[rede], '_blank', 'width=600,height=400');
}

function copiarLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    toast('Link copiado!', 'success');
  }).catch(() => {
    toast('Não foi possível copiar o link.', 'error');
  });
}
