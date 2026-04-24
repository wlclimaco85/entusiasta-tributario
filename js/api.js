/**
 * api.js — Camada de comunicação com o backend AppAcademia
 * Todos os endpoints de artigos passam por aqui.
 */

// ── Configuração ──────────────────────────────────────────────────────────────
// Produção: Railway | Dev: localhost
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8088/boletobancos'
  : 'https://appacademia-production-be7e.up.railway.app/boletobancos';

// ── Auth helpers ──────────────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('et_token'),
  setToken: (t) => localStorage.setItem('et_token', t),
  removeToken: () => localStorage.removeItem('et_token'),
  isLoggedIn: () => !!localStorage.getItem('et_token'),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('et_user') || 'null'); } catch { return null; }
  },
  setUser: (u) => localStorage.setItem('et_user', JSON.stringify(u)),
  logout: () => {
    localStorage.removeItem('et_token');
    localStorage.removeItem('et_user');
    window.location.href = 'login.html';
  }
};

// ── Fetch wrapper ─────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      // Só faz logout se for rota autenticada (não pública)
      if (!path.includes('/publicos') && !path.includes('/destaques') &&
          !path.includes('/ultimos') && !path.includes('/categorias') &&
          !path.includes('/menu/') && !path.includes('/rest/auth/')) {
        Auth.logout();
      }
      return null;
    }

    if (res.status === 204) return null;

    // Tenta parsear JSON — se falhar, retorna null graciosamente
    const text = await res.text();
    if (!text || text.trim() === '') return null;

    try {
      const json = JSON.parse(text);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${json?.message || json?.error || text.substring(0, 100)}`);
      }
      return json;
    } catch (parseErr) {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
      return null;
    }
  } catch (networkErr) {
    // Erro de rede (CORS, offline, etc.)
    if (networkErr.message?.includes('HTTP ')) throw networkErr;
    throw new Error(`Erro de conexão: ${networkErr.message}`);
  }
}

// ── API de Artigos ────────────────────────────────────────────────────────────
const ArtigoAPI = {

  /** Listagem pública paginada */
  listarPublicos: (params = {}) => {
    const q = new URLSearchParams({ pagina: 0, tamanho: 12, ...params }).toString();
    return apiFetch(`/api/artigos/publicos?${q}`);
  },

  /** Artigo público por slug */
  buscarPorSlug: (slug) => apiFetch(`/api/artigos/publicos/${slug}`),

  /** Incrementa visualizações (fire-and-forget, não bloqueia) */
  incrementarVisualizacoes: (id) => {
    // Tenta o endpoint dedicado primeiro; se 404, usa o GET /publicos/{slug} que já incrementa
    apiFetch(`/api/artigos/${id}/visualizacoes`, { method: 'PATCH' }).catch(() => {
      // Endpoint novo não existe ainda no Railway — silencia o erro
      // O incremento já acontece automaticamente no GET /publicos/{slug}
    });
  },

  /** Artigos em destaque */
  destaques: () => apiFetch('/api/artigos/destaques'),

  /** Últimos N artigos */
  ultimos: (quantidade = 6) => apiFetch(`/api/artigos/ultimos?quantidade=${quantidade}`),

  /** Categorias disponíveis */
  categorias: () => apiFetch('/api/artigos/categorias'),

  /** Artigos por menu (home, tributario, mei, empresarial, reforma) */
  porMenu: (menu, quantidade = 12) => apiFetch(`/api/artigos/menu/${menu}?quantidade=${quantidade}`),

  // ── Admin ──────────────────────────────────────────────────────────────────

  /** Listagem admin com filtros */
  listar: (params = {}) => {
    const q = new URLSearchParams({ pagina: 0, tamanho: 25, ...params }).toString();
    return apiFetch(`/api/artigos?${q}`);
  },

  /** Buscar por ID */
  buscarPorId: (id) => apiFetch(`/api/artigos/${id}`),

  /** Criar artigo */
  criar: (artigo) => apiFetch('/api/artigos', {
    method: 'POST',
    body: JSON.stringify(artigo)
  }),

  /** Atualizar artigo */
  atualizar: (id, artigo) => apiFetch(`/api/artigos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(artigo)
  }),

  /** Excluir artigo */
  excluir: (id) => apiFetch(`/api/artigos/${id}`, { method: 'DELETE' }),

  /** Publicar / despublicar */
  publicar: (id, publicado) => apiFetch(`/api/artigos/${id}/publicar?publicado=${publicado}`, {
    method: 'PATCH'
  }),

  /** Alterar ordem */
  alterarOrdem: (id, ordemExibicao) => apiFetch(`/api/artigos/${id}/ordem`, {
    method: 'PATCH',
    body: JSON.stringify({ ordemExibicao })
  }),

  /** Alterar destaque */
  alterarDestaque: (id, destaque) => apiFetch(`/api/artigos/${id}/destaque?destaque=${destaque}`, {
    method: 'PATCH'
  }),
};

// ── API de Auth ───────────────────────────────────────────────────────────────
const AuthAPI = {
  // Railway backend usa { email, senha } no body
  // Resposta: { access_token, token_type, status, login, permissoes }
  login: async (email, senha) => {
    const res = await fetch(`${API_BASE}/rest/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
    }
    return res.json();
  }
};

// ── Utilitários de UI ─────────────────────────────────────────────────────────
function toast(msg, tipo = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function formatarData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatarDataCurta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function tempoLeitura(min) {
  if (!min) return '';
  return `${min} min de leitura`;
}

function slugify(texto) {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Emoji por categoria
function emojiCategoria(cat) {
  const map = {
    'tributário': '📊', 'tributario': '📊',
    'mei': '🏪',
    'simples nacional': '📋',
    'reforma tributária': '⚖️', 'reforma tributaria': '⚖️',
    'empresarial': '🏢',
    'contabilidade': '🧮',
    'fiscal': '📑',
    'trabalhista': '👷',
  };
  return map[(cat || '').toLowerCase()] || '📰';
}
