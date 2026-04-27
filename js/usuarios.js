/**
 * usuarios.js — Gerenciamento de usuários no painel admin
 * Seção: 👥 Usuários
 */

// ── Carregar e renderizar lista de usuários ───────────────────────────────────
async function carregarUsuarios() {
  const tbody = document.getElementById('usuarios-tbody');
  const totalEl = document.getElementById('usuarios-total');
  tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--cinza-texto)">Carregando...</td></tr>';

  try {
    // Busca todos os logins e filtra pelo tipo SITE_JOAO
    const res = await apiFetch('/api/login?pagina=0&tamanho=200');

    // O apiFetch retorna o body diretamente — tenta extrair de vários formatos
    const body = res;
    const todos =
      body?.data?.dados ||
      body?.dados ||
      (Array.isArray(body?.data) ? body.data : null) ||
      (Array.isArray(body) ? body : []);

    // Filtra por tipoLogin=7 (APP_CONTABILIDADE) E aplicativo.id=17 (SITE_JOAO)
    const usuarios = todos.filter(u => {
      const tipo = typeof u.tipoLogin === 'object' ? u.tipoLogin?.id : u.tipoLogin;
      const appId = u.aplicativo?.id;
      return (tipo === 7 || tipo === '7') && (appId === 17 || appId === '17');
    });

    if (totalEl) totalEl.textContent = `${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''}`;

    if (!usuarios.length) {
      tbody.innerHTML = `
        <tr><td colspan="5" style="padding:40px;text-align:center;color:var(--cinza-texto)">
          Nenhum usuário cadastrado ainda.<br>
          <button class="btn btn-primary" style="margin-top:12px" onclick="abrirModalNovoUsuario()">+ Criar primeiro usuário</button>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda);color:var(--cinza-texto);font-size:0.8rem">#${u.id}</td>
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda);font-weight:600">${u.nome || '—'}</td>
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda);color:var(--cinza-texto)">${u.email}</td>
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda)">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;background:rgba(224,123,0,0.15);color:var(--laranja)">
            ${tipoLoginLabel(u.tipoLogin)}
          </span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda)">
          <button class="grid-btn grid-btn-edit" onclick="abrirModalResetSenha('${u.email}', '${u.nome || u.email}')" title="Resetar senha">
            🔑 Resetar senha
          </button>
        </td>
      </tr>
    `).join('');

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:40px;text-align:center;color:#ef4444">Erro ao carregar usuários: ${e.message}</td></tr>`;
  }
}

function tipoLoginLabel(tipo) {
  const map = {
    1: 'Master', 2: 'Personal', 3: 'Academia', 4: 'Nutricionista',
    5: 'Aluno', 6: 'Abraço', 7: 'Contabilidade', 8: 'Site João'
  };
  // tipo pode vir como número ou como objeto {id, descricao}
  const id = typeof tipo === 'object' ? tipo?.id : tipo;
  return map[id] || `Tipo ${id ?? '?'}`;
}

// ── Modal: Novo Usuário ───────────────────────────────────────────────────────
function abrirModalNovoUsuario() {
  document.getElementById('usuario-form').reset();
  document.getElementById('usuario-error').style.display = 'none';
  document.getElementById('usuario-success').style.display = 'none';
  document.getElementById('modal-usuario').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModalUsuario() {
  document.getElementById('modal-usuario').style.display = 'none';
  document.body.style.overflow = '';
}

async function criarUsuario(e) {
  e.preventDefault();
  const btn    = document.getElementById('btn-criar-usuario');
  const errEl  = document.getElementById('usuario-error');
  const okEl   = document.getElementById('usuario-success');
  errEl.style.display = 'none';
  okEl.style.display  = 'none';
  btn.textContent = 'Criando...';
  btn.disabled = true;

  const nome     = document.getElementById('u-nome').value.trim();
  const email    = document.getElementById('u-email').value.trim();
  const senha    = document.getElementById('u-senha').value;
  const confirmar = document.getElementById('u-confirmar').value;

  if (senha !== confirmar) {
    errEl.textContent = 'As senhas não coincidem.';
    errEl.style.display = 'block';
    btn.textContent = '✅ Criar Usuário';
    btn.disabled = false;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/login/site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Auth.getToken()}`
      },
      body: JSON.stringify({ nome, email, senha }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 409) {
      errEl.textContent = 'Este e-mail já está cadastrado.';
      errEl.style.display = 'block';
      return;
    }
    if (!res.ok) {
      errEl.textContent = data?.message || data || 'Erro ao criar usuário.';
      errEl.style.display = 'block';
      return;
    }

    okEl.textContent = `✅ Usuário "${nome}" criado com sucesso! App: SITE_JOAO | Role: EDITOR_ARTIGOS`;
    okEl.style.display = 'block';
    document.getElementById('usuario-form').reset();

    // Recarrega a lista após 1.5s
    setTimeout(() => {
      fecharModalUsuario();
      carregarUsuarios();
    }, 1500);

  } catch (err) {
    errEl.textContent = 'Erro de conexão: ' + err.message;
    errEl.style.display = 'block';
  } finally {
    btn.textContent = '✅ Criar Usuário';
    btn.disabled = false;
  }
}

// ── Modal: Resetar Senha ──────────────────────────────────────────────────────
function abrirModalResetSenha(email, nome) {
  document.getElementById('reset-form').reset();
  document.getElementById('reset-error').style.display = 'none';
  document.getElementById('reset-success').style.display = 'none';
  document.getElementById('reset-email').value = email;
  document.getElementById('reset-usuario-info').textContent = `Definir nova senha para: ${nome} (${email})`;
  document.getElementById('modal-reset-senha').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModalResetSenha() {
  document.getElementById('modal-reset-senha').style.display = 'none';
  document.body.style.overflow = '';
}

async function confirmarResetSenha(e) {
  e.preventDefault();
  const btn    = document.getElementById('btn-confirmar-reset');
  const errEl  = document.getElementById('reset-error');
  const okEl   = document.getElementById('reset-success');
  errEl.style.display = 'none';
  okEl.style.display  = 'none';
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  const email    = document.getElementById('reset-email').value;
  const novaSenha = document.getElementById('reset-nova-senha').value;
  const confirmar = document.getElementById('reset-confirmar').value;

  if (novaSenha !== confirmar) {
    errEl.textContent = 'As senhas não coincidem.';
    errEl.style.display = 'block';
    btn.textContent = '🔑 Salvar Nova Senha';
    btn.disabled = false;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/login/alterar-senha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Auth.getToken()}`
      },
      body: JSON.stringify({ email, novaSenha }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      errEl.textContent = data?.message || data || 'Erro ao alterar senha.';
      errEl.style.display = 'block';
      return;
    }

    okEl.textContent = '✅ Senha alterada com sucesso!';
    okEl.style.display = 'block';
    setTimeout(() => fecharModalResetSenha(), 1500);

  } catch (err) {
    errEl.textContent = 'Erro de conexão: ' + err.message;
    errEl.style.display = 'block';
  } finally {
    btn.textContent = '🔑 Salvar Nova Senha';
    btn.disabled = false;
  }
}
