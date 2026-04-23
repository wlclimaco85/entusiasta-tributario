/**
 * admin.js — Painel de administração completo
 * Dashboard com gráficos Chart.js + Grid.js paginado com busca
 */

// ── Estado global ─────────────────────────────────────────────────────────────
let gridInstance = null;
let todosArtigos = [];
let slugAtual = null;
let chartsInstancias = {};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  // Exibe nome do usuário
  const user = Auth.getUser();
  const nomeEl = document.getElementById('user-nome');
  if (nomeEl && user) nomeEl.textContent = user.nome || user.email || 'Admin';

  // Carrega dados e inicia na seção lista
  await carregarTodosArtigos();
  mostrarSecao('lista');
});

// ── Navegação ─────────────────────────────────────────────────────────────────
function mostrarSecao(secao) {
  // 'form' é um alias para abrir o modal de novo artigo
  if (secao === 'form') {
    mostrarSecao('lista');
    abrirModalNovo();
    return;
  }

  ['dashboard', 'lista'].forEach(s => {
    const el = document.getElementById(`secao-${s}`);
    if (el) el.style.display = s === secao ? 'block' : 'none';
  });
  // Esconde a seção form (não usada diretamente)
  const formEl = document.getElementById('secao-form');
  if (formEl) formEl.style.display = 'none';

  // Marca nav ativo
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById(`nav-${secao}`);
  if (navEl) navEl.classList.add('active');

  if (secao === 'dashboard') renderDashboard();
  if (secao === 'lista') renderGrid();
}

// ── Carrega todos os artigos (para dashboard e grid) ──────────────────────────
async function carregarTodosArtigos() {
  try {
    const res = await ArtigoAPI.listar({ pagina: 0, tamanho: 500 });
    todosArtigos = res?.data?.dados || [];
    const totalEl = document.getElementById('grid-total');
    if (totalEl) totalEl.textContent =
      `${todosArtigos.length} artigo${todosArtigos.length !== 1 ? 's' : ''}`;
  } catch (e) {
    // Tabela pode não existir no Railway ainda
    todosArtigos = [];
    const totalEl = document.getElementById('grid-total');
    if (totalEl) totalEl.textContent = 'Backend indisponível';
    console.warn('Erro ao carregar artigos:', e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function renderDashboard() {
  const publicados = todosArtigos.filter(a => a.publicado);
  const rascunhos  = todosArtigos.filter(a => !a.publicado);
  const destaques  = todosArtigos.filter(a => a.destaque);
  const totalViews = todosArtigos.reduce((s, a) => s + (a.visualizacoes || 0), 0);

  // KPIs
  setText('kpi-total',     todosArtigos.length);
  setText('kpi-views',     totalViews.toLocaleString('pt-BR'));
  setText('kpi-destaques', destaques.length);
  setText('kpi-rascunhos', rascunhos.length);
  setText('kpi-pub-sub',   `${publicados.length} publicados`);

  // Gráficos
  renderChartMaisClicados();
  renderChartAcessosMes();
  renderChartCategorias();
  renderChartStatus(publicados.length, rascunhos.length);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function destroyChart(id) {
  if (chartsInstancias[id]) {
    chartsInstancias[id].destroy();
    delete chartsInstancias[id];
  }
}

// Gráfico: Top 10 mais visualizados (barras horizontais)
function renderChartMaisClicados() {
  destroyChart('mais-clicados');
  const top = [...todosArtigos]
    .filter(a => a.publicado)
    .sort((a, b) => (b.visualizacoes || 0) - (a.visualizacoes || 0))
    .slice(0, 10);

  const ctx = document.getElementById('chart-mais-clicados');
  if (!ctx) return;

  chartsInstancias['mais-clicados'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(a => truncar(a.titulo, 30)),
      datasets: [{
        label: 'Visualizações',
        data: top.map(a => a.visualizacoes || 0),
        backgroundColor: 'rgba(224,123,0,0.7)',
        borderColor: '#e07b00',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw.toLocaleString('pt-BR')} views`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#b0b0b0', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: '#e0e0e0', font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

// Gráfico: Acessos por mês (linha)
function renderChartAcessosMes() {
  destroyChart('acessos-mes');

  // Agrupa visualizações por mês de publicação
  const porMes = {};
  todosArtigos.forEach(a => {
    if (!a.dataPublicacao) return;
    const d = new Date(a.dataPublicacao);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    porMes[chave] = (porMes[chave] || 0) + (a.visualizacoes || 0);
  });

  // Últimos 12 meses
  const meses = [];
  const agora = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    meses.push({ chave, label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) });
  }

  const ctx = document.getElementById('chart-acessos-mes');
  if (!ctx) return;

  chartsInstancias['acessos-mes'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses.map(m => m.label),
      datasets: [{
        label: 'Visualizações',
        data: meses.map(m => porMes[m.chave] || 0),
        borderColor: '#e07b00',
        backgroundColor: 'rgba(224,123,0,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#e07b00',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.raw.toLocaleString('pt-BR')} views` }
        }
      },
      scales: {
        x: { ticks: { color: '#b0b0b0', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#b0b0b0', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// Gráfico: Artigos por categoria (rosca)
function renderChartCategorias() {
  destroyChart('categorias');
  const cats = {};
  todosArtigos.forEach(a => {
    const c = a.categoria || 'Sem categoria';
    cats[c] = (cats[c] || 0) + 1;
  });

  const cores = ['#e07b00','#f08c10','#ffa040','#ffb870','#ffd0a0','#22c55e','#3b82f6','#a855f7','#ef4444','#64748b'];
  const labels = Object.keys(cats);
  const ctx = document.getElementById('chart-categorias');
  if (!ctx) return;

  chartsInstancias['categorias'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: labels.map(l => cats[l]),
        backgroundColor: cores.slice(0, labels.length),
        borderColor: '#141414',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#b0b0b0', font: { size: 11 }, padding: 12 }
        }
      }
    }
  });
}

// Gráfico: Publicados vs Rascunhos (pizza)
function renderChartStatus(pub, ras) {
  destroyChart('status');
  const ctx = document.getElementById('chart-status');
  if (!ctx) return;

  chartsInstancias['status'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Publicados', 'Rascunhos'],
      datasets: [{
        data: [pub, ras],
        backgroundColor: ['rgba(34,197,94,0.7)', 'rgba(234,179,8,0.7)'],
        borderColor: ['#22c55e', '#eab308'],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#b0b0b0', font: { size: 12 }, padding: 16 }
        }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// GRID.JS
// ══════════════════════════════════════════════════════════════════════════════
function renderGrid() {
  const container = document.getElementById('gridjs-container');
  if (!container) return;

  // Destrói instância anterior
  if (gridInstance) {
    gridInstance.destroy();
    gridInstance = null;
    container.innerHTML = '';
  }

  // Se não há artigos, mostra aviso de setup
  if (todosArtigos.length === 0) {
    container.innerHTML = `
      <div style="background:rgba(224,123,0,0.08);border:1px solid rgba(224,123,0,0.3);border-radius:var(--radius);padding:24px;margin-bottom:16px">
        <h3 style="color:var(--laranja);margin-bottom:8px">⚠️ Tabela de artigos não encontrada no banco</h3>
        <p style="color:var(--cinza-texto);font-size:0.9rem;margin-bottom:12px">
          A tabela <code style="background:#1a1a1a;padding:2px 6px;border-radius:4px">artigo</code> não existe no banco de dados do Railway.
          Execute o script SQL abaixo no console do Railway para criar a tabela e inserir artigos de exemplo.
        </p>
        <details style="margin-bottom:12px">
          <summary style="cursor:pointer;color:var(--laranja);font-weight:600">📋 Ver script SQL (clique para expandir)</summary>
          <pre style="background:#0a0a0a;border:1px solid var(--preto-borda);border-radius:6px;padding:16px;margin-top:12px;font-size:0.75rem;overflow-x:auto;color:#e0e0e0;white-space:pre-wrap">-- Execute no Railway → seu banco → Query
-- Ou baixe o arquivo setup_railway.sql do projeto

CREATE TABLE IF NOT EXISTS public.artigo (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(300) NOT NULL,
    subtitulo VARCHAR(500),
    resumo TEXT,
    conteudo_completo TEXT,
    autor VARCHAR(150),
    categoria VARCHAR(100),
    tags VARCHAR(500),
    imagem_capa VARCHAR(500),
    slug VARCHAR(300) UNIQUE,
    fonte VARCHAR(300),
    link_fonte VARCHAR(500),
    ordem_exibicao INTEGER NOT NULL DEFAULT 0,
    destaque BOOLEAN NOT NULL DEFAULT FALSE,
    publicado BOOLEAN NOT NULL DEFAULT FALSE,
    tempo_leitura_min INTEGER,
    visualizacoes BIGINT NOT NULL DEFAULT 0,
    data_publicacao TIMESTAMP WITHOUT TIME ZONE,
    cod_app INTEGER,
    menu_categorias VARCHAR(300) DEFAULT 'home',
    empresa_id INTEGER,
    parceiro_id INTEGER,
    app_id INTEGER,
    user_logado_id INTEGER,
    dh_created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    dh_updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);</pre>
        </details>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="carregarTodosArtigos().then(renderGrid)">🔄 Tentar novamente</button>
          <button class="btn btn-ghost" onclick="abrirModalNovo()">✏️ Criar artigo manualmente</button>
        </div>
      </div>
    `;
    return;
  }

  gridInstance = new gridjs.Grid({
    columns: [
      {
        id: 'ordem',
        name: 'Ordem',
        width: '70px',
        formatter: (cell, row) => {
          const id = row.cells[7]?.data; // id está na col 7 (hidden)
          return gridjs.html(`
            <div style="display:flex;align-items:center;gap:2px">
              <button class="grid-btn grid-btn-edit" style="padding:2px 6px" onclick="alterarOrdemGrid(${id},${cell - 1})" title="Subir">↑</button>
              <span style="min-width:20px;text-align:center;font-size:0.8rem">${cell}</span>
              <button class="grid-btn grid-btn-edit" style="padding:2px 6px" onclick="alterarOrdemGrid(${id},${cell + 1})" title="Descer">↓</button>
            </div>
          `);
        }
      },
      {
        id: 'titulo',
        name: 'Título',
        formatter: (cell, row) => {
          const slug = row.cells[8]?.data;
          return gridjs.html(`
            <div>
              <div style="font-weight:600;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cell}</div>
              ${slug ? `<div style="font-size:0.72rem;color:#888">${slug}</div>` : ''}
            </div>
          `);
        }
      },
      {
        id: 'categoria',
        name: 'Categoria',
        width: '130px',
        formatter: cell => cell
          ? gridjs.html(`<span class="tag outline" style="font-size:0.7rem">${cell}</span>`)
          : '—'
      },
      {
        id: 'publicado',
        name: 'Status',
        width: '100px',
        formatter: cell => gridjs.html(
          cell
            ? '<span class="status-pub">✅ Publicado</span>'
            : '<span class="status-ras">📝 Rascunho</span>'
        )
      },
      {
        id: 'destaque',
        name: 'Destaque',
        width: '80px',
        formatter: cell => cell ? '⭐' : '—'
      },
      {
        id: 'visualizacoes',
        name: 'Views',
        width: '70px',
        formatter: cell => (cell || 0).toLocaleString('pt-BR')
      },
      {
        id: 'dataPublicacao',
        name: 'Publicado em',
        width: '110px',
        formatter: cell => cell ? formatarDataCurta(cell) : '—'
      },
      // Colunas ocultas (usadas nos formatters)
      { id: 'id',   name: 'id',   hidden: true },
      { id: 'slug', name: 'slug', hidden: true },
      {
        id: 'acoes',
        name: 'Ações',
        width: '160px',
        sort: false,
        formatter: (cell, row) => {
          const id  = row.cells[7]?.data;
          const pub = row.cells[3]?.data;
          const dest = row.cells[4]?.data;
          const slug = row.cells[8]?.data;
          return gridjs.html(`
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="grid-btn grid-btn-edit" onclick="editarArtigoGrid(${id})" title="Editar">✏️</button>
              <button class="grid-btn grid-btn-pub" onclick="togglePublicarGrid(${id},${pub})" title="${pub ? 'Despublicar' : 'Publicar'}">
                ${pub ? '🔒' : '🚀'}
              </button>
              <button class="grid-btn grid-btn-edit" onclick="toggleDestaqueGrid(${id},${dest})" title="${dest ? 'Remover destaque' : 'Destacar'}">
                ${dest ? '⭐' : '☆'}
              </button>
              ${slug ? `<a href="artigo.html?slug=${slug}" target="_blank" class="grid-btn grid-btn-edit" title="Ver no site">🌐</a>` : ''}
              <button class="grid-btn grid-btn-del" onclick="excluirArtigoGrid(${id})" title="Excluir">🗑️</button>
            </div>
          `);
        }
      }
    ],
    data: () => todosArtigos.map(a => [
      a.ordemExibicao ?? 0,
      a.titulo || '',
      a.categoria || '',
      a.publicado,
      a.destaque,
      a.visualizacoes || 0,
      a.dataPublicacao,
      a.id,
      a.slug || '',
      null // acoes placeholder
    ]),
    search: {
      enabled: true,
      placeholder: '🔍 Buscar por título, categoria...',
      debounceTimeout: 300,
    },
    sort: true,
    pagination: {
      enabled: true,
      limit: 15,
      summary: true,
    },
    language: {
      search: { placeholder: '🔍 Buscar artigos...' },
      pagination: {
        previous: '‹ Anterior',
        next: 'Próximo ›',
        showing: 'Mostrando',
        results: () => 'artigos',
        of: 'de',
        to: 'a',
      },
      loading: 'Carregando...',
      noRecordsFound: 'Nenhum artigo encontrado',
      error: 'Erro ao carregar dados',
    },
    style: {
      table: { 'border-collapse': 'collapse', 'width': '100%' },
    },
    className: {
      container: 'gridjs-dark',
    }
  }).render(container);
}

// ── Ações da grid ─────────────────────────────────────────────────────────────
async function editarArtigoGrid(id) {
  try {
    const a = await ArtigoAPI.buscarPorId(id);
    if (!a) { toast('Artigo não encontrado', 'error'); return; }
    preencherForm(a);
    abrirModal(`✏️ Editar: ${truncar(a.titulo, 40)}`);
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

async function togglePublicarGrid(id, publicadoAtual) {
  try {
    await ArtigoAPI.publicar(id, !publicadoAtual);
    toast(publicadoAtual ? 'Artigo despublicado.' : '🚀 Artigo publicado!', 'success');
    await carregarTodosArtigos();
    renderGrid();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

async function toggleDestaqueGrid(id, destaqueAtual) {
  try {
    await ArtigoAPI.alterarDestaque(id, !destaqueAtual);
    toast(destaqueAtual ? 'Destaque removido.' : '⭐ Artigo destacado!', 'success');
    await carregarTodosArtigos();
    renderGrid();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

async function alterarOrdemGrid(id, novaOrdem) {
  if (novaOrdem < 0) return;
  try {
    await ArtigoAPI.alterarOrdem(id, novaOrdem);
    await carregarTodosArtigos();
    renderGrid();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

async function excluirArtigoGrid(id) {
  const artigo = todosArtigos.find(a => a.id === id);
  const titulo = artigo?.titulo || `ID ${id}`;
  if (!confirm(`Excluir "${truncar(titulo, 60)}"?\n\nEsta ação não pode ser desfeita.`)) return;
  try {
    await ArtigoAPI.excluir(id);
    toast('Artigo excluído.', 'info');
    await carregarTodosArtigos();
    renderGrid();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════════════════════════════
function abrirModal(titulo = '✏️ Novo Artigo') {
  document.getElementById('modal-titulo-header').textContent = titulo;
  document.getElementById('modal-artigo').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('modal-artigo').style.display = 'none';
  document.body.style.overflow = '';
  limparForm();
}

function fecharModalFora(e) {
  if (e.target === document.getElementById('modal-artigo')) fecharModal();
}

function abrirModalNovo() {
  limparForm();
  abrirModal('✏️ Novo Artigo');
}

// ── Formulário ────────────────────────────────────────────────────────────────
function limparForm() {
  document.getElementById('artigo-id').value = '';
  document.getElementById('artigo-form').reset();
  document.getElementById('f-autor').value = 'Entusiasta Tributário';
  document.getElementById('f-ordem').value = '0';
  document.getElementById('f-menus').value = 'home';
  document.getElementById('btn-preview-site').style.display = 'none';
  slugAtual = null;
  // Fecha preview se aberto
  document.getElementById('preview-area').style.display = 'none';
  document.getElementById('f-conteudo').style.display = 'block';
  // Limpa imagem
  limparPreview();
}

function preencherForm(a) {
  document.getElementById('artigo-id').value = a.id;
  document.getElementById('f-titulo').value = a.titulo || '';
  document.getElementById('f-subtitulo').value = a.subtitulo || '';
  document.getElementById('f-slug').value = a.slug || '';
  document.getElementById('f-categoria').value = a.categoria || '';
  document.getElementById('f-menus').value = a.menuCategorias || 'home';
  document.getElementById('f-resumo').value = a.resumo || '';
  document.getElementById('f-conteudo').value = a.conteudoCompleto || '';
  document.getElementById('f-autor').value = a.autor || 'Entusiasta Tributário';
  document.getElementById('f-tags').value = a.tags || '';
  document.getElementById('f-imagem').value = a.imagemCapa || '';
  // Limpa fileId anterior
  delete document.getElementById('f-imagem').dataset.fileId;

  // Mostra preview — prioridade: fileAttachment > imagemCapa > imagemUrl
  const imgSrc = a.imagemUrl || a.imagemCapa ||
    (a.fileAttachment?.id ? `${API_BASE}/api/files/download/${a.fileAttachment.id}` : null);
  if (imgSrc) {
    mostrarPreview(imgSrc);
  } else {
    limparPreview();
  }
  document.getElementById('f-ordem').value = a.ordemExibicao ?? 0;
  document.getElementById('f-fonte').value = a.fonte || '';
  document.getElementById('f-publicado').checked = a.publicado;
  document.getElementById('f-destaque').checked = a.destaque;
  slugAtual = a.slug;
  document.getElementById('btn-preview-site').style.display = a.slug ? 'inline-flex' : 'none';
}

function gerarSlugAuto() {
  const id = document.getElementById('artigo-id').value;
  if (id) return; // Não sobrescreve em edição
  const titulo = document.getElementById('f-titulo').value;
  document.getElementById('f-slug').value = slugify(titulo);
}

async function salvarArtigo(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-salvar');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  const id = document.getElementById('artigo-id').value;
  const imagemCapaRaw = document.getElementById('f-imagem').value;
  const fileId = document.getElementById('f-imagem').dataset?.fileId;
  // Nunca envia base64 para o backend
  const imagemCapa = imagemCapaRaw && !imagemCapaRaw.startsWith('data:')
    ? imagemCapaRaw
    : '';

  const artigo = {
    titulo:           document.getElementById('f-titulo').value,
    subtitulo:        document.getElementById('f-subtitulo').value,
    slug:             document.getElementById('f-slug').value,
    categoria:        document.getElementById('f-categoria').value,
    menuCategorias:   document.getElementById('f-menus').value,
    resumo:           document.getElementById('f-resumo').value,
    conteudoCompleto: document.getElementById('f-conteudo').value,
    autor:            document.getElementById('f-autor').value,
    tags:             document.getElementById('f-tags').value,
    imagemCapa,
    // Envia fileAttachment se houve upload com sucesso
    fileAttachment:   fileId ? { id: parseInt(fileId) } : undefined,
    ordemExibicao:    parseInt(document.getElementById('f-ordem').value) || 0,
    fonte:            document.getElementById('f-fonte').value,
    publicado:        document.getElementById('f-publicado').checked,
    destaque:         document.getElementById('f-destaque').checked,
  };

  try {
    let salvo;
    if (id) {
      salvo = await ArtigoAPI.atualizar(parseInt(id), artigo);
      toast('✅ Artigo atualizado!', 'success');
    } else {
      salvo = await ArtigoAPI.criar(artigo);
      toast('✅ Artigo criado!', 'success');
    }
    slugAtual = salvo?.slug;
    document.getElementById('artigo-id').value = salvo?.id || '';
    document.getElementById('f-slug').value = salvo?.slug || '';
    document.getElementById('btn-preview-site').style.display = salvo?.slug ? 'inline-flex' : 'none';

    // Recarrega grid
    await carregarTodosArtigos();
    renderGrid();
    fecharModal();
  } catch (err) {
    // Mensagem específica para 500 (tabela não existe no Railway)
    const msg = err.message?.includes('500')
      ? '❌ Erro 500: A tabela "artigo" não existe no banco do Railway. Execute o setup_railway.sql primeiro.'
      : 'Erro ao salvar: ' + err.message;
    toast(msg, 'error');
    console.error('Erro ao salvar artigo:', err);
  } finally {
    btn.textContent = '💾 Salvar Artigo';
    btn.disabled = false;
  }
}

function abrirPreview() {
  if (slugAtual) window.open(`artigo.html?slug=${slugAtual}`, '_blank');
}

// ── Editor ────────────────────────────────────────────────────────────────────
function inserirTag(tag) {
  const ta = document.getElementById('f-conteudo');
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const sel = ta.value.substring(start, end);

  let insert;
  if (tag === 'a') {
    const url = prompt('URL do link:');
    if (!url) return;
    insert = `<a href="${url}">${sel || 'texto do link'}</a>`;
  } else if (tag === 'ul') {
    insert = `<ul>\n  <li>${sel || 'item 1'}</li>\n  <li>item 2</li>\n</ul>`;
  } else {
    insert = `<${tag}>${sel || 'conteúdo'}</${tag}>`;
  }

  ta.value = ta.value.substring(0, start) + insert + ta.value.substring(end);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = start + insert.length;
}

let previewAberto = false;
function togglePreview() {
  previewAberto = !previewAberto;
  const ta = document.getElementById('f-conteudo');
  const prev = document.getElementById('preview-area');
  if (previewAberto) {
    prev.innerHTML = ta.value;
    prev.style.display = 'block';
    ta.style.display = 'none';
  } else {
    prev.style.display = 'none';
    ta.style.display = 'block';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function truncar(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '…' : str;
}

// ══════════════════════════════════════════════════════════════════════════════
// UPLOAD DE IMAGEM LOCAL
// Converte para Base64 e salva no campo f-imagem como data URL,
// OU faz upload para o backend e salva a URL retornada.
// ══════════════════════════════════════════════════════════════════════════════

/** Drag over — destaca a área */
function imgDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('img-drop-area').classList.add('drag-over');
}

/** Drag leave — remove destaque */
function imgDragLeave(e) {
  e.preventDefault();
  document.getElementById('img-drop-area').classList.remove('drag-over');
}

/** Drop de arquivo */
function imgDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('img-drop-area').classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) processarImagem(file);
}

/** Seleção via input file */
function imgFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) processarImagem(file);
}

/** URL digitada — mostra preview se for imagem válida */
function imgUrlChanged(url) {
  if (!url) { limparPreview(); return; }
  mostrarPreview(url);
}

/** Processa o arquivo: valida, converte para base64 e tenta upload */
async function processarImagem(file) {
  // Valida tipo
  if (!file.type.startsWith('image/')) {
    toast('Selecione um arquivo de imagem (JPG, PNG, WebP)', 'error');
    return;
  }
  // Valida tamanho (5 MB)
  if (file.size > 5 * 1024 * 1024) {
    toast('Imagem muito grande. Máximo 5 MB.', 'error');
    return;
  }

  // Tenta fazer upload para o backend
  const uploadUrl = await uploadImagemBackend(file);
  if (uploadUrl) {
    document.getElementById('f-imagem').value = uploadUrl;
    mostrarPreview(uploadUrl);
    toast('Imagem enviada com sucesso!', 'success');
    return;
  }

  // Fallback: converte para Base64 apenas para PREVIEW local
  // NÃO salva base64 no campo f-imagem (coluna VARCHAR(500) não suporta)
  // O artigo será salvo sem imagem de capa
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    // Mostra preview mas NÃO coloca no campo de texto
    mostrarPreview(dataUrl);
    // Guarda temporariamente para referência visual
    document.getElementById('f-imagem').dataset.base64 = dataUrl;
    document.getElementById('f-imagem').placeholder = '📷 Imagem carregada localmente (upload falhou)';
    toast('Upload falhou. Imagem visível apenas localmente.', 'info');
  };
  reader.readAsDataURL(file);
}

/** Tenta fazer upload para o endpoint de arquivos do backend */
async function uploadImagemBackend(file) {
  const token = Auth.getToken();
  if (!token) return null;

  try {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('fileName', file.name);
    formData.append('fileType', file.type || 'image/jpeg');
    formData.append('diretorio', '{"id":1}');
    formData.append('empresa',   '{"id":1}');
    formData.append('parceiro',  '{"id":1}');

    const res = await fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const fileId = data?.fileId || data?.id || data?.data?.id;
    if (fileId) {
      // Guarda o fileId para enviar no artigo
      document.getElementById('f-imagem').dataset.fileId = fileId;
      return `${API_BASE}/api/files/download/${fileId}`;
    }
    return data?.url || data?.fileUrl || null;
  } catch (_) {
    return null;
  }
}

/** Mostra o preview da imagem */
function mostrarPreview(src) {
  const wrap = document.getElementById('img-preview-wrap');
  const hint = document.getElementById('img-drop-hint');
  const img  = document.getElementById('img-preview');
  if (!wrap || !hint || !img) return;

  img.src = src;
  img.onerror = () => { limparPreview(); };
  wrap.style.display = 'block';
  hint.style.display = 'none';
}

/** Limpa o preview e o campo */
function limparPreview() {
  const wrap = document.getElementById('img-preview-wrap');
  const hint = document.getElementById('img-drop-hint');
  const img  = document.getElementById('img-preview');
  const input = document.getElementById('f-imagem');
  const fileInput = document.getElementById('f-imagem-file');
  if (wrap) wrap.style.display = 'none';
  if (hint) hint.style.display = 'block';
  if (img)  img.src = '';
  if (input) input.value = '';
  if (fileInput) fileInput.value = '';
}

/** Botão ✕ — limpa imagem */
function limparImagem(e) {
  e.stopPropagation(); // não abre o file picker
  limparPreview();
}
