/**
 * admin.js — Painel de administração de artigos
 */

let paginaAdmin = 0;
let slugAtual = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  carregarCatsAdmin();
  carregarArtigosAdmin();
});

// ── Navegação entre seções ────────────────────────────────────────────────────
function mostrarSecao(secao) {
  document.getElementById('secao-lista').style.display = secao === 'lista' ? 'block' : 'none';
  document.getElementById('secao-form').style.display  = secao === 'form'  ? 'block' : 'none';

  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));

  if (secao === 'lista') {
    document.querySelectorAll('.admin-nav a')[0].classList.add('active');
    carregarArtigosAdmin();
  } else if (secao === 'novo') {
    document.querySelectorAll('.admin-nav a')[1].classList.add('active');
    limparForm();
    document.getElementById('secao-form').style.display = 'block';
    document.getElementById('secao-lista').style.display = 'none';
    document.getElementById('form-titulo-header').textContent = 'Novo Artigo';
    document.getElementById('btn-preview-site').style.display = 'none';
  }
}

// ── Categorias ────────────────────────────────────────────────────────────────
async function carregarCatsAdmin() {
  try {
    const cats = await ArtigoAPI.categorias();
    const sel = document.getElementById('filtro-cat');
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  } catch (_) {}
}

// ── Lista de artigos ──────────────────────────────────────────────────────────
async function carregarArtigosAdmin() {
  const tbody = document.getElementById('tabela-artigos');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--cinza-texto)">Carregando...</td></tr>';

  try {
    const params = {
      pagina: paginaAdmin,
      tamanho: 20,
      titulo: document.getElementById('filtro-titulo')?.value || undefined,
      publicado: document.getElementById('filtro-publicado')?.value || undefined,
      categoria: document.getElementById('filtro-cat')?.value || undefined,
    };
    // Remove params vazios
    Object.keys(params).forEach(k => !params[k] && delete params[k]);

    const res = await ArtigoAPI.listar(params);
    const artigos = res?.data?.dados || [];
    const total = res?.data?.total || 0;

    if (!artigos.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--cinza-texto)">Nenhum artigo encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = artigos.map(a => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:4px">
            <button onclick="alterarOrdem(${a.id}, ${a.ordemExibicao - 1})" class="editor-btn" title="Subir" style="padding:2px 6px">↑</button>
            <span style="min-width:24px;text-align:center">${a.ordemExibicao}</span>
            <button onclick="alterarOrdem(${a.id}, ${a.ordemExibicao + 1})" class="editor-btn" title="Descer" style="padding:2px 6px">↓</button>
          </div>
        </td>
        <td>
          <div style="font-weight:600;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.titulo}</div>
          <div style="font-size:0.75rem;color:var(--cinza-texto)">${a.slug || ''}</div>
        </td>
        <td><span class="tag outline" style="font-size:0.7rem">${a.categoria || '—'}</span></td>
        <td>
          <span class="badge ${a.publicado ? 'badge-success' : 'badge-warning'}">
            ${a.publicado ? '✅ Publicado' : '📝 Rascunho'}
          </span>
        </td>
        <td>${a.destaque ? '⭐ Sim' : '—'}</td>
        <td style="font-size:0.8rem;color:var(--cinza-texto)">${formatarDataCurta(a.dataPublicacao) || '—'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="editor-btn" onclick="editarArtigo(${a.id})" title="Editar">✏️</button>
            <button class="editor-btn" onclick="togglePublicar(${a.id}, ${a.publicado})" title="${a.publicado ? 'Despublicar' : 'Publicar'}">
              ${a.publicado ? '🔒' : '🚀'}
            </button>
            <button class="editor-btn" onclick="toggleDestaque(${a.id}, ${a.destaque})" title="${a.destaque ? 'Remover destaque' : 'Destacar'}">
              ${a.destaque ? '⭐' : '☆'}
            </button>
            ${a.slug ? `<a href="artigo.html?slug=${a.slug}" target="_blank" class="editor-btn" title="Ver no site">🌐</a>` : ''}
            <button class="editor-btn" onclick="excluirArtigo(${a.id}, '${a.titulo.replace(/'/g, "\\'")}')" title="Excluir" style="color:#ef4444">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Paginação
    const totalPags = Math.ceil(total / 20);
    const pagEl = document.getElementById('paginacao-admin');
    if (totalPags > 1) {
      let html = '';
      for (let i = 0; i < totalPags; i++) {
        html += `<button class="pag-btn ${i === paginaAdmin ? 'active' : ''}" onclick="irPaginaAdmin(${i})">${i + 1}</button>`;
      }
      pagEl.innerHTML = html;
    } else {
      pagEl.innerHTML = '';
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444">Erro: ${e.message}</td></tr>`;
  }
}

function irPaginaAdmin(p) { paginaAdmin = p; carregarArtigosAdmin(); }

let filtroTimeout;
function filtrarArtigos() {
  clearTimeout(filtroTimeout);
  filtroTimeout = setTimeout(() => { paginaAdmin = 0; carregarArtigosAdmin(); }, 400);
}

// ── Editar artigo ─────────────────────────────────────────────────────────────
async function editarArtigo(id) {
  try {
    const a = await ArtigoAPI.buscarPorId(id);
    if (!a) { toast('Artigo não encontrado', 'error'); return; }

    document.getElementById('artigo-id').value = a.id;
    document.getElementById('f-titulo').value = a.titulo || '';
    document.getElementById('f-subtitulo').value = a.subtitulo || '';
    document.getElementById('f-slug').value = a.slug || '';
    document.getElementById('f-categoria').value = a.categoria || '';
    document.getElementById('f-resumo').value = a.resumo || '';
    document.getElementById('f-conteudo').value = a.conteudoCompleto || '';
    document.getElementById('f-autor').value = a.autor || '';
    document.getElementById('f-tags').value = a.tags || '';
    document.getElementById('f-imagem').value = a.imagemCapa || '';
    document.getElementById('f-ordem').value = a.ordemExibicao ?? 0;
    document.getElementById('f-fonte').value = a.fonte || '';
    document.getElementById('f-link-fonte').value = a.linkFonte || '';
    document.getElementById('f-publicado').checked = a.publicado;
    document.getElementById('f-destaque').checked = a.destaque;

    slugAtual = a.slug;
    document.getElementById('form-titulo-header').textContent = 'Editar Artigo';
    document.getElementById('btn-preview-site').style.display = a.slug ? 'inline-flex' : 'none';

    document.getElementById('secao-lista').style.display = 'none';
    document.getElementById('secao-form').style.display = 'block';
  } catch (e) {
    toast('Erro ao carregar artigo: ' + e.message, 'error');
  }
}

// ── Salvar artigo ─────────────────────────────────────────────────────────────
async function salvarArtigo(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-salvar');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  const id = document.getElementById('artigo-id').value;
  const artigo = {
    titulo:           document.getElementById('f-titulo').value,
    subtitulo:        document.getElementById('f-subtitulo').value,
    slug:             document.getElementById('f-slug').value,
    categoria:        document.getElementById('f-categoria').value,
    resumo:           document.getElementById('f-resumo').value,
    conteudoCompleto: document.getElementById('f-conteudo').value,
    autor:            document.getElementById('f-autor').value,
    tags:             document.getElementById('f-tags').value,
    imagemCapa:       document.getElementById('f-imagem').value,
    ordemExibicao:    parseInt(document.getElementById('f-ordem').value) || 0,
    fonte:            document.getElementById('f-fonte').value,
    linkFonte:        document.getElementById('f-link-fonte').value,
    publicado:        document.getElementById('f-publicado').checked,
    destaque:         document.getElementById('f-destaque').checked,
  };

  try {
    let salvo;
    if (id) {
      salvo = await ArtigoAPI.atualizar(parseInt(id), artigo);
      toast('Artigo atualizado com sucesso!', 'success');
    } else {
      salvo = await ArtigoAPI.criar(artigo);
      toast('Artigo criado com sucesso!', 'success');
    }
    slugAtual = salvo?.slug;
    document.getElementById('artigo-id').value = salvo?.id || '';
    document.getElementById('f-slug').value = salvo?.slug || '';
    document.getElementById('btn-preview-site').style.display = salvo?.slug ? 'inline-flex' : 'none';
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'error');
  } finally {
    btn.textContent = '💾 Salvar Artigo';
    btn.disabled = false;
  }
}

// ── Ações rápidas ─────────────────────────────────────────────────────────────
async function togglePublicar(id, publicadoAtual) {
  try {
    await ArtigoAPI.publicar(id, !publicadoAtual);
    toast(publicadoAtual ? 'Artigo despublicado.' : 'Artigo publicado!', 'success');
    carregarArtigosAdmin();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

async function toggleDestaque(id, destaqueAtual) {
  try {
    await ArtigoAPI.alterarDestaque(id, !destaqueAtual);
    toast(destaqueAtual ? 'Destaque removido.' : 'Artigo destacado!', 'success');
    carregarArtigosAdmin();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

async function alterarOrdem(id, novaOrdem) {
  if (novaOrdem < 0) return;
  try {
    await ArtigoAPI.alterarOrdem(id, novaOrdem);
    carregarArtigosAdmin();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

async function excluirArtigo(id, titulo) {
  if (!confirm(`Excluir o artigo "${titulo}"?\n\nEsta ação não pode ser desfeita.`)) return;
  try {
    await ArtigoAPI.excluir(id);
    toast('Artigo excluído.', 'info');
    carregarArtigosAdmin();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

// ── Formulário helpers ────────────────────────────────────────────────────────
function limparForm() {
  document.getElementById('artigo-id').value = '';
  document.getElementById('artigo-form').reset();
  document.getElementById('f-autor').value = 'Entusiasta Tributário';
  document.getElementById('f-ordem').value = '0';
  slugAtual = null;
}

function gerarSlugAuto() {
  const id = document.getElementById('artigo-id').value;
  if (id) return; // Não sobrescreve slug em edição
  const titulo = document.getElementById('f-titulo').value;
  document.getElementById('f-slug').value = slugify(titulo);
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
    insert = `<${tag}>${sel || `conteúdo`}</${tag}>`;
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
