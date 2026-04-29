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
    // Busca direto no backend com filtro: codApp=17 (SITE_JOAO)
    const res = await apiFetch('/api/login?pagina=0&tamanho=500&codApp=17');

    const body = res;
    const usuarios =
      body?.data?.dados ||
      body?.dados ||
      (Array.isArray(body?.data) ? body.data : null) ||
      (Array.isArray(body) ? body : []);
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
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda);font-weight:600;color:#ffffff">${u.nome || u.name || '—'}</td>
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda);color:var(--cinza-texto)">${u.email}</td>
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda);color:var(--cinza-texto)">${u.cpfCnpj || u.cpf || '—'}</td>
        <td style="padding:12px 16px;border-bottom:1px solid var(--preto-borda)">
          <button class="grid-btn grid-btn-edit" onclick="abrirModalEditarUsuario(${u.id}, '${(u.nome||'').replace(/'/g,"\\'")}', '${u.email}', '${u.cpfCnpj||u.cpf||''}')" title="Editar usuário" style="margin-right:6px">
            ✏️ Editar
          </button>
          <button class="grid-btn grid-btn-edit" onclick="abrirModalResetSenha('${u.email}', '${u.nome || u.email}')" title="Resetar senha" style="margin-right:6px">
            🔑 Resetar senha
          </button>
          <button class="grid-btn grid-btn-del" onclick="deletarUsuario(${u.id}, '${u.email}')" title="Deletar usuário">
            🗑️ Deletar
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
  const cpfInput = document.getElementById('u-cpf');
  if (cpfInput) { cpfInput.value = ''; cpfInput.style.borderColor = ''; }
  const cpfErro = document.getElementById('u-cpf-erro');
  if (cpfErro) cpfErro.style.display = 'none';
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

  const nome      = document.getElementById('u-nome').value.trim();
  const cpf       = document.getElementById('u-cpf').value.trim();
  const email     = document.getElementById('u-email').value.trim();
  const senha     = document.getElementById('u-senha').value;
  const confirmar = document.getElementById('u-confirmar').value;

  // Valida CPF
  if (!validarCpf(cpf)) {
    errEl.textContent = 'CPF inválido. Verifique e tente novamente.';
    errEl.style.display = 'block';
    btn.textContent = '✅ Criar Usuário';
    btn.disabled = false;
    return;
  }

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
      body: JSON.stringify({ nome, email, senha, cpfCnpj: cpf }),
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

// ── Deletar Usuário ───────────────────────────────────────────────────────────
async function deletarUsuario(id, email) {
  if (!confirm(`Deletar o usuário "${email}"?\n\nEsta ação não pode ser desfeita.`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/login/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
    });

    if (res.ok || res.status === 204) {
      toast('✅ Usuário deletado com sucesso.', 'success');
      carregarUsuarios();
    } else {
      toast(`Erro ao deletar: ${res.status}`, 'error');
    }
  } catch (err) {
    toast('Erro de conexão: ' + err.message, 'error');
  }
}

// ── Máscara e validação de CPF ────────────────────────────────────────────────
function mascaraCpf(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  input.value = v;

  const erroEl = document.getElementById('u-cpf-erro');
  if (v.length === 14) {
    const valido = validarCpf(v);
    erroEl.style.display = valido ? 'none' : 'block';
    input.style.borderColor = valido ? '' : '#ef4444';
  } else {
    erroEl.style.display = 'none';
    input.style.borderColor = '';
  }
}

function validarCpf(cpf) {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false; // todos iguais

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(nums[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(nums[10]);
}

// ── Modal: Editar Usuário ─────────────────────────────────────────────────────
function abrirModalEditarUsuario(id, nome, email, cpf) {
  document.getElementById('editar-u-id').value = id;
  document.getElementById('editar-u-nome').value = nome;
  document.getElementById('editar-u-email').value = email;
  document.getElementById('editar-u-cpf').value = cpf || '';
  document.getElementById('editar-usuario-error').style.display = 'none';
  document.getElementById('editar-usuario-success').style.display = 'none';
  document.getElementById('editar-u-cpf-erro').style.display = 'none';
  document.getElementById('modal-editar-usuario').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModalEditarUsuario() {
  document.getElementById('modal-editar-usuario').style.display = 'none';
  document.body.style.overflow = '';
}

async function salvarEdicaoUsuario(e) {
  e.preventDefault();
  const btn   = document.getElementById('btn-salvar-edicao');
  const errEl = document.getElementById('editar-usuario-error');
  const okEl  = document.getElementById('editar-usuario-success');
  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  const id    = document.getElementById('editar-u-id').value;
  const nome  = document.getElementById('editar-u-nome').value.trim();
  const email = document.getElementById('editar-u-email').value.trim();
  const cpf   = document.getElementById('editar-u-cpf').value.trim();

  // Valida CPF se preenchido
  if (cpf && !validarCpf(cpf)) {
    document.getElementById('editar-u-cpf-erro').style.display = 'block';
    return;
  }
  document.getElementById('editar-u-cpf-erro').style.display = 'none';

  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    const body = { nome, email };
    if (cpf) body.cpfCnpj = cpf;

    const res = await fetch(`${API_BASE}/api/login/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Auth.getToken()}`
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      errEl.textContent = data?.message || data?.response?.message || 'Erro ao salvar.';
      errEl.style.display = 'block';
      return;
    }

    okEl.textContent = '✅ Usuário atualizado com sucesso!';
    okEl.style.display = 'block';
    setTimeout(() => {
      fecharModalEditarUsuario();
      carregarUsuarios();
    }, 1200);

  } catch (err) {
    errEl.textContent = 'Erro de conexão: ' + err.message;
    errEl.style.display = 'block';
  } finally {
    btn.textContent = '💾 Salvar';
    btn.disabled = false;
  }
}

// ── Editar CPF ────────────────────────────────────────────────────────────────
let _editarCpfId = null;

function abrirModalEditarCpf(id, cpfAtual) {
  _editarCpfId = id;
  const cpfInput = document.getElementById('editar-cpf-input');
  if (cpfInput) cpfInput.value = cpfAtual || '';
  const modal = document.getElementById('modal-editar-cpf');
  if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function fecharModalEditarCpf() {
  document.getElementById('modal-editar-cpf').style.display = 'none';
  document.body.style.overflow = '';
}

async function salvarCpf(e) {
  e.preventDefault();
  const cpf = document.getElementById('editar-cpf-input').value.trim();
  const errEl = document.getElementById('editar-cpf-erro');
  const btn = document.getElementById('btn-salvar-cpf');

  if (!validarCpf(cpf)) {
    errEl.textContent = 'CPF inválido.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/login/${_editarCpfId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.getToken()}` },
      body: JSON.stringify({ cpfCnpj: cpf }),
    });
    if (res.ok) {
      toast('✅ CPF atualizado!', 'success');
      fecharModalEditarCpf();
      carregarUsuarios();
    } else {
      errEl.textContent = 'Erro ao salvar.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = 'Erro: ' + err.message;
    errEl.style.display = 'block';
  } finally {
    btn.textContent = '💾 Salvar';
    btn.disabled = false;
  }
}
