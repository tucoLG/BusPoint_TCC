/* BusPoint — cliente da API + telas (JS puro). Cada página HTML chama BP.admin.* / BP.mobile.* / BP.access.* */
/* ALTERAÇÃO (adequação ao backend "projeto-corrigido-v2"): este arquivo mantém o visual do buspoint-frontend e passou a
   cobrir TODOS os endpoints do backend. Cada trecho novo está marcado com "ALTERAÇÃO" (busque por esse termo):
     1. BP.svc ............ catálogo com todos os endpoints do backend (auth, administradores, alunos, motoristas,
                            ônibus, pontos, rotas, rota-pontos, matrículas, viagens e registros).
     2. Resetar senha ..... botão na lista e nos detalhes (PATCH /api/administradores/resetar-senha/{id}) + modal
                            que exibe a senha temporária gerada pelo backend.
     3. Alterar senha ..... formulário no "Meu perfil" (PATCH /api/auth/alterar-senha).
     4. Administradores ... telas novas (listar, cadastrar, editar, detalhes, aprovar/inativar) sobre
                            /api/administradores/*, que existiam no backend mas não tinham tela. */
(function () {
  'use strict';
  const ROOT = new URL('..', document.currentScript.src).href;
  const ICONS = window.BP_ICONS || {};
  const I = (n, c) => `<svg class="icon${c ? ' ' + c : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const url = (p, q) => ROOT + p + (q ? '?' + new URLSearchParams(q) : '');
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const hm = (t) => (t ? String(t).slice(0, 5) : '—');
  const dmy = (d) => (d ? String(d).split('T')[0].split('-').reverse().join('/') : '—');
  const today = () => new Date().toLocaleDateString('sv');
  const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const $app = () => document.getElementById('app');
  
  /* ---------- Sessão (JWT: POST /auth/login → { token, tipoLogin }) ---------- */
  const DEV = !!window.BP_SEM_AUTH;
  const devSess = () => { const role = sessionStorage.getItem('bp-dev-role') || 'admin'; return { role, id: Number(localStorage.getItem('bp-dev-id')) || 1, nome: 'Usuário de teste', me: { nomeUsuario: 'Usuário de teste' } }; };
  const S = { get: () => { if (DEV) return devSess(); try { return JSON.parse(sessionStorage.getItem('bp-auth')); } catch (e) { return null; } }, set: (v) => sessionStorage.setItem('bp-auth', JSON.stringify(v)), clear: () => sessionStorage.removeItem('bp-auth') };
  const ROLE = { ADMINISTRADOR: 'admin', MOTORISTA: 'motorista', ALUNO: 'aluno' };
  const RES = { admin: 'administradores', motorista: 'motoristas', aluno: 'alunos' };
  const HOME = { admin: 'admin/dashboard.html', motorista: 'motorista/inicio.html', aluno: 'aluno/inicio.html' };
  const go = (p, q) => { location.href = url(p, q); };
  const jwtPayload = (t) => { try { return JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return {}; } };
  const expired = (s) => !!(s && s.exp && Date.now() / 1000 > s.exp);
  function guard(role) {
    if (DEV) { if (role) sessionStorage.setItem('bp-dev-role', role); return devSess(); }
    const s = S.get();
    if (!s || expired(s)) { S.clear(); return go('login.html'); }
    if (role && s.role !== role) return go('estado.html', { c: 403 });
    return s;
  }
  
  /* ---------- API ---------- */
  async function api(path, { method = 'GET', body } = {}) {
    const s = S.get();
    if (expired(s)) { S.clear(); go('login.html'); throw new Error('Sessão expirada.'); }
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (s && s.token) headers.Authorization = 'Bearer ' + s.token;
    let res;
    try { res = await fetch(window.BP_API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch (e) { throw new Error('Não foi possível conectar à API em ' + window.BP_API + '. Verifique se o servidor está no ar e se o CORS permite este método.'); }
    const txt = await res.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { /* sem corpo JSON */ }
    if (res.status === 401 && s) { S.clear(); go('login.html'); throw new Error('Sessão expirada.'); }
    if (!res.ok) {
      const campos = data && data.campos ? Object.values(data.campos).join(' ') : '';
      const err = new Error(campos || (data && (data.mensagem || data.erro)) || (res.status === 403 ? 'Você não tem permissão para esta ação.' : `Erro ${res.status}`));
      err.status = res.status; throw err;
    }
    return data;
  }
  const get = (p) => api(p), post = (p, b) => api(p, { method: 'POST', body: b ?? {} }), put = (p, b) => api(p, { method: 'PUT', body: b }), patch = (p, b) => api(p, { method: 'PATCH', body: b }), del = (p) => api(p, { method: 'DELETE' });

  /* ALTERAÇÃO: catálogo com TODOS os endpoints do backend (um método por endpoint, mesmo verbo e caminho dos controllers).
     Fica exposto como BP.svc. As telas novas usam este catálogo; as telas que já existiam continuam chamando
     get/post/put/patch/del diretamente (mesmos caminhos), para não alterar o que já funcionava. */
  const svc = {
    auth: {
      login: (d) => post('/api/auth/login', d),                                        // POST  público
      alterarSenha: (d) => patch('/api/auth/alterar-senha', d),                        // PATCH { senhaAtual, novaSenha }
    },
    administradores: {
      listar: () => get('/api/administradores/listar'),                                // GET   ADMIN
      buscar: (id) => get(`/api/administradores/listarPorId/${id}`),                   // GET   ADMIN
      cadastrar: (d) => post('/api/administradores/cadastrar', d),                     // POST  { nome, email, senha, telefone }
      atualizar: (id, d) => put(`/api/administradores/atualizar/${id}`, d),            // PUT   ADMIN
      desativar: (id) => patch(`/api/administradores/desativar/${id}`),                // PATCH ADMIN
      alterarStatus: (id, st) => put(`/api/administradores/alterar-status/${id}?statusDto=${encodeURIComponent(st)}`), // PUT ATIVO|INATIVO|PENDENTE (vale p/ qualquer usuário)
      resetarSenha: (id) => patch(`/api/administradores/resetar-senha/${id}`),         // PATCH → { senhaTemporaria, ... } (vale p/ qualquer usuário ATIVO)
    },
    alunos: {
      listar: () => get('/api/alunos/listar'), buscar: (id) => get(`/api/alunos/listarPorId/${id}`),
      cadastrar: (d) => post('/api/alunos/cadastrar', d), atualizar: (id, d) => put(`/api/alunos/atualizar/${id}`, d),
      desativar: (id) => patch(`/api/alunos/desativar/${id}`),
    },
    motoristas: {
      listar: () => get('/api/motoristas/listar'), buscar: (id) => get(`/api/motoristas/listarPorId/${id}`),
      cadastrar: (d) => post('/api/motoristas/cadastrar', d), atualizar: (id, d) => put(`/api/motoristas/atualizar/${id}`, d),
      desativar: (id) => patch(`/api/motoristas/desativar/${id}`),
    },
    onibus: {
      listar: () => get('/api/onibus/listar'), ativos: () => get('/api/onibus/ativos'), buscar: (id) => get(`/api/onibus/${id}`),
      cadastrar: (d) => post('/api/onibus/cadastrar', d), atualizar: (id, d) => put(`/api/onibus/atualizar/${id}`, d),
      desativar: (id) => patch(`/api/onibus/${id}/desativar`), ativar: (id) => patch(`/api/onibus/${id}/ativar`),
    },
    pontos: {
      listar: () => get('/api/pontos-parada/listar'), buscar: (id) => get(`/api/pontos-parada/${id}`),
      cadastrar: (d) => post('/api/pontos-parada/cadastrar', d), atualizar: (id, d) => put(`/api/pontos-parada/${id}`, d),
      excluir: (id) => del(`/api/pontos-parada/${id}`),
    },
    rotas: {
      listar: () => get('/api/rotas/listar'), ativas: () => get('/api/rotas/ativas'), buscar: (id) => get(`/api/rotas/${id}`),
      cadastrar: (d) => post('/api/rotas', d), atualizar: (id, d) => put(`/api/rotas/alterar/${id}`, d),
      desativar: (id) => patch(`/api/rotas/${id}/desativar`),
    },
    rotaPontos: {
      listar: (idRota) => get(`/api/rotas/${idRota}/pontos/listar`),
      adicionar: (idRota, d) => post(`/api/rotas/${idRota}/pontos/cadastrar`, d),      // { idPonto, ordem }
      remover: (idRota, idPonto) => del(`/api/rotas/${idRota}/pontos/${idPonto}`),
    },
    matriculas: {
      cadastrar: (d) => post('/api/matriculas', d),                                    // { idAluno, idRota }
      listar: () => get('/api/matriculas/listar'), buscar: (id) => get(`/api/matriculas/${id}`),
      porRota: (idRota) => get(`/api/matriculas/rota/${idRota}`), porAluno: (idAluno) => get(`/api/matriculas/aluno/${idAluno}`),
      remover: (id) => del(`/api/matriculas/${id}`),
    },
    viagens: {
      cadastrar: (d) => post('/api/viagens/cadastrar', d), listar: () => get('/api/viagens/listar'), minhas: () => get('/api/viagens/minhas'),
      buscar: (id) => get(`/api/viagens/${id}`), iniciar: (id) => patch(`/api/viagens/${id}/iniciar`),
      finalizar: (id, observacaoFinalizacao) => put(`/api/viagens/${id}/finalizar`, observacaoFinalizacao ? { observacaoFinalizacao } : {}), // PUT
    },
    registros: {
      cadastrar: (d) => post('/api/registros-transporte/cadastrar', d),               // { idAluno, idViagem, tipoRegistro }
      invalidar: (idAluno, idViagem, tipo, justificativa) => patch(`/api/registros-transporte/${idAluno}/${idViagem}/${tipo}/invalidar`, { justificativa }),
      listar: () => get('/api/registros-transporte'), porAluno: (idAluno) => get(`/api/registros-transporte/aluno/${idAluno}`),
      porViagem: (idViagem) => get(`/api/registros-transporte/viagem/${idViagem}`),
    },
  };
  
  /* ---------- Componentes ---------- */
  let tt;
  function toast(text, err) {
    let el = document.getElementById('bp-toast');
    if (!el) { el = document.createElement('div'); el.id = 'bp-toast'; el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.innerHTML = `<div role="status" class="toast" style="${err ? 'background:var(--destructive)' : ''}">${I(err ? 'lock' : 'circle-check')}${esc(text)}</div>`;
    clearTimeout(tt); tt = setTimeout(() => { el.innerHTML = ''; }, 4500);
  }
  const fail = (e) => toast(e.message || String(e), true);
  const badge = (v) => { const t = /Ativ|andamento|Embarc|Concl|Finaliz/.test(v) ? ' badge--green' : /Pendente|Aguard/.test(v) ? ' badge--yellow' : /Inativ|Invalid|Ausente/.test(v) ? ' badge--red' : ''; return `<span class="badge${t}${/andamento/i.test(v) ? ' badge--live' : ''}">${esc(v)}</span>`; };
  const avatar = (n, lg) => `<span class="avatar${lg ? ' avatar--lg' : ''}">${esc(initials(n))}</span>`;
  const logo = (v, cls) => `<img class="brand-img${cls ? ' ' + cls : ''}" src="${ROOT}assets/logo-${v}.png" alt="BusPoint">`;
  /* brand(true): fundo que muda com o tema (logo p/ fundo claro + logo p/ fundo escuro, o CSS mostra um).
     brand(false): fundo sempre navy (sidebar e painel do login), logo p/ fundo escuro. */
  const brand = (l) => l ? logo('clara', 'brand-img--for-light') + logo('escura', 'brand-img--for-dark') : logo('escura');
  const themeBtn = () => `<button type="button" class="btn btn--ghost btn--icon theme-btn" data-theme-toggle aria-label="Alternar entre tema claro e escuro" title="Alternar tema"><span class="theme-ico theme-ico--moon">${I('moon')}</span><span class="theme-ico theme-ico--sun">${I('sun')}</span></button>`;
  const empty = (t) => `<div class="empty">${I('search')}<p>${esc(t || 'Nenhum resultado encontrado.')}</p></div>`;
  const loading = () => '<div class="sk-stack" role="status" aria-label="Carregando"><div class="sk sk--title"></div><div class="sk sk--mid"></div><div class="sk"></div><div class="sk sk--short"></div></div>';
  const headline = (o) => `<div class="headline"><div>${o.eyebrow && o.keep ? `<p class="kicker">${esc(o.eyebrow)}</p>` : ''}<h1>${esc(o.title)}</h1>${o.desc ? `<p class="desc">${esc(o.desc)}</p>` : ''}</div>${o.action || ''}</div>`;
  const section = (t, body, aside) => `<section class="card section"><div class="section__head"><h2 class="section-title">${esc(t)}</h2>${aside || ''}</div>${body}</section>`;
  const stView = (v) => ({ PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em andamento', FINALIZADA: 'Finalizada' }[v] || v);
  function confirmModal(title, text, ok, danger) {
    return new Promise((res) => {
      const m = document.createElement('div'); m.className = 'modal-backdrop';
      m.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="form-actions"><button class="btn btn--outline" data-v="0">Cancelar</button><button class="btn${danger ? ' btn--destructive' : ''}" data-v="1">${esc(ok)}</button></div></div>`;
      m.onclick = (e) => { const b = e.target.closest('[data-v]'); if (b || e.target === m) { m.remove(); res(b && b.dataset.v === '1'); } };
      document.body.appendChild(m);
    });
  }
  /* ALTERAÇÃO: modal que mostra a senha temporária devolvida por PATCH /api/administradores/resetar-senha/{id}.
     A senha só aparece uma vez (no banco fica criptografada), então o modal NÃO fecha ao clicar fora: só no botão
     "Fechar". Assim ela não se perde por um clique acidental. */
  function tempPasswordModal(info) {
    const m = document.createElement('div'); m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="max-width:440px">
      <h2>Nova senha temporária</h2>
      <p>Senha redefinida para <strong>${esc(info.nomeUsuario)}</strong> (${esc(info.emailUsuario)}). A senha anterior não pode ser visualizada por estar criptografada; repasse a senha temporária abaixo ao usuário:</p>
      <div style="margin-top:16px;display:flex;gap:8px;align-items:center">
        <input class="input" id="bp-tmp-pass" type="text" readonly value="${esc(info.senhaTemporaria)}" style="font-family:monospace;font-weight:700;letter-spacing:.04em">
        <button class="btn btn--outline" type="button" id="bp-copy-pass">Copiar</button>
      </div>
      <div class="form-actions"><button class="btn" type="button" data-close="1">Fechar</button></div>
    </div>`;
    m.onclick = async (e) => {
      if (e.target.closest('#bp-copy-pass')) {
        const inp = document.getElementById('bp-tmp-pass');
        try { await navigator.clipboard.writeText(inp.value); } catch (err) { inp.select(); document.execCommand('copy'); }
        toast('Senha copiada para a área de transferência.');
      }
      if (e.target.closest('[data-close]')) m.remove();
    };
    document.body.appendChild(m);
  }
  /* ALTERAÇÃO: pede confirmação, chama o reset e exibe o modal. Usado pela lista e pelos detalhes. */
  async function resetarSenha(id, nome) {
    if (!(await confirmModal('Resetar senha', `Deseja gerar uma nova senha temporária para ${nome || 'este usuário'}? A senha anterior não pode ser visualizada e será substituída imediatamente.`, 'Resetar senha'))) return;
    const resp = await run(() => svc.administradores.resetarSenha(id));
    if (resp && resp.senhaTemporaria) tempPasswordModal(resp);
  }
  async function run(fn, okMsg) { try { const r = await fn(); if (okMsg) toast(okMsg); return r ?? true; } catch (e) { fail(e); } }
  
  /* ---------- Shells ---------- */
  const ADMIN_NAV = [['Visão geral', 'dashboard', 'layout-dashboard'], ['Alunos', 'alunos', 'graduation-cap'], ['Motoristas', 'motoristas', 'users'], ['Administradores', 'administradores', 'shield-check'] /* ALTERAÇÃO: nova tela */, ['Ônibus', 'onibus', 'bus-front'], ['Pontos de parada', 'pontos', 'map-pin'], ['Rotas', 'rotas', 'route'], ['Viagens', 'viagens', 'calendar-days'], ['Embarques', 'embarques', 'arrow-up-right'], ['Desembarques', 'desembarques', 'arrow-down-right'], ['Histórico', 'historico', 'file-clock']];
  function adminShell(active, crumb, content, s) {
    $app().innerHTML = `<div class="admin"><aside class="sidebar" id="bp-side"><div class="sidebar__brand">${brand(false)}</div><p class="sidebar__label">Menu</p>
    <nav>${ADMIN_NAV.map(([l, p, ic]) => `<a class="navlink${active === p ? ' active' : ''}" href="${url('admin/' + p + '.html')}">${I(ic)}${l}</a>`).join('')}</nav>
    <div class="sidebar__foot"><a class="navlink" href="${url('perfil.html')}">${I('user-round')}Meu perfil</a><button class="navlink" id="bp-out">${I('log-out')}Sair</button></div>
    <div class="sidebar__user">${avatar(s.nome)}<div><p class="name">${esc(s.nome)}</p><p class="role">Administrador</p></div></div></aside>
    <div class="overlay" id="bp-ov" hidden></div>
    <div class="admin__main"><header class="topbar"><div class="topbar__left"><button class="btn btn--ghost btn--icon only-mobile" aria-label="Abrir menu" id="bp-menu">${I('menu')}</button><span class="topbar__crumb">Painel administrativo ${I('chevron-right')} <b>${esc(crumb)}</b></span></div><div class="topbar__right">${themeBtn()}${avatar(s.nome)}</div></header>
    <main class="admin__content" id="bp-main">${content}</main></div></div>`;
    const side = document.getElementById('bp-side'), ov = document.getElementById('bp-ov');
    const close = () => { side.classList.remove('open'); ov.hidden = true; };
    document.getElementById('bp-menu').onclick = () => { side.classList.add('open'); ov.hidden = false; };
    ov.onclick = close;
    document.getElementById('bp-out').onclick = () => { S.clear(); go('login.html'); };
  }
  const setMain = (html) => { document.getElementById('bp-main').innerHTML = html; };
  
  const MNAV = {
    motorista: [['Início', 'inicio', 'layout-dashboard'], ['Minha rota', 'minha-rota', 'route'], ['Meus horários', 'horarios', 'clock-3'], ['Meus alunos', 'alunos', 'graduation-cap'], ['Meu ônibus', 'onibus', 'bus-front'], ['Viagem atual', 'viagem', 'map-pin']],
    aluno: [['Início', 'inicio', 'layout-dashboard'], ['Minha matrícula', 'matricula', 'book-open'], ['Minha rota', 'minha-rota', 'route'], ['Meus horários', 'horarios', 'clock-3'], ['Meu ônibus', 'onibus', 'bus-front'], ['Histórico', 'historico', 'file-clock']],
  };
  function mobileShell(role, slug, title, s) {
    const items = MNAV[role], bottom = [items[0], items[1], items[2], items[items.length - 1]];
    $app().innerHTML = `<div class="mobile"><header class="appbar"><div class="appbar__inner">${brand(true)}<div class="appbar__right">${themeBtn()}<span class="appbar__role">${role === 'motorista' ? 'Motorista' : 'Aluno'}</span><a href="${url('perfil.html')}" title="Meu perfil">${avatar(s.nome)}</a></div></div></header>
    <div class="mobile__body"><aside class="side-menu"><p class="kicker">Menu</p><nav>${items.map(([l, p, ic]) => `<a class="side-link${slug === p ? ' active' : ''}" href="${url(role + '/' + p + '.html')}">${I(ic)}${l}</a>`).join('')}<a class="side-link side-link--plain" href="${url('perfil.html')}">${I('user-round')}Meu perfil</a><button class="side-link side-link--plain" id="bp-out">${I('log-out')}Sair</button></nav></aside>
    <main class="mobile__main"><div class="mobile__title"><p class="kicker">${role === 'motorista' ? 'Área do motorista' : 'Área do aluno'}</p>${slug !== 'inicio' ? `<h1>${esc(title)}</h1>` : ''}</div><div class="stack" id="bp-main">${loading()}</div></main></div>
    <nav class="bottom-nav">${bottom.map(([l, p, ic]) => `<a class="${slug === p ? 'active' : ''}" href="${url(role + '/' + p + '.html')}">${I(ic)}${l}</a>`).join('')}<a href="${url('perfil.html')}">${I('user-round')}Perfil</a></nav></div>`;
    document.getElementById('bp-out').onclick = () => { S.clear(); go('login.html'); };
  }
  
  /* =========================================================
     LOGIN  (POST /api/auth/login com JWT)
     ========================================================= */
  const access = {
    login() {
      if (DEV) {
        const areas = [['admin', 'Administrador', 'Painel de gestão: alunos, rotas, viagens…', 'layout-dashboard'], ['motorista', 'Motorista', 'Rota, alunos e controle da viagem', 'bus-front'], ['aluno', 'Aluno', 'Matrícula, rota, horários e histórico', 'graduation-cap']];
        $app().innerHTML = `<div class="system"><header>${brand(true)}</header><main style="max-width:520px;margin:0 auto;padding:24px"><p class="kicker primary">Modo sem autenticação</p><h1 style="margin:8px 0">Escolha uma área para visualizar</h1><p class="muted" style="font-size:14px;margin-bottom:24px">O login está desativado (<code>BP_SEM_AUTH</code> em <code>assets/config.js</code>). As telas leem os dados reais da API.</p>
        <div class="stack">${areas.map(([r, t, d, ic]) => `<a class="card card--pad link-card" href="${url(HOME[r])}"><span class="icon-tile">${I(ic)}</span><span class="grow"><strong>${t}</strong><br><span class="small muted">${d}</span></span>${I('chevron-right')}</a>`).join('')}</div></main></div>`;
        return;
      }
      if (S.get()) return go(HOME[S.get().role]);
      $app().innerHTML = `<div class="access"><div class="access__aside">${brand(false)}<div><h1>O transporte escolar em movimento.</h1><p class="lead">Uma experiência conectada para quem organiza, conduz e vive cada trajeto.</p><div class="access__art"><svg viewBox="0 0 520 230" role="img" aria-label="Rota com quatro paradas e um ônibus em movimento"><path id="rt-login" d="M30 190 C 30 120, 170 160, 190 110 S 330 60, 360 90 S 460 40, 490 36" fill="none" stroke="oklch(0.62 0.16 257)" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 13"/><g fill="oklch(0.19 0.048 250)" stroke="#fff" stroke-width="3"><circle cx="30" cy="190" r="10"/><circle cx="190" cy="110" r="10"/><circle cx="360" cy="90" r="10"/><circle cx="490" cy="36" r="10" fill="oklch(0.85 0.165 88)" stroke="oklch(0.85 0.165 88)"/></g><circle cx="490" cy="36" r="10" fill="none" stroke="oklch(0.85 0.165 88)" stroke-width="2"><animate attributeName="r" from="10" to="30" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" from=".8" to="0" dur="2.4s" repeatCount="indefinite"/></circle><g font-family="DM Sans, system-ui, sans-serif" font-size="13" font-weight="600" fill="oklch(0.88 0.02 250)"><text x="14" y="216">Terminal</text><text x="168" y="140">Centro</text><text x="332" y="122">Biblioteca</text><text x="470" y="20" text-anchor="end">Campus</text></g><g><rect x="-17" y="-11" width="34" height="22" rx="6" fill="oklch(0.85 0.165 88)"/><path d="M-12-5h8v7h-8zM-2-5h8v7h-8zM8-5h6v7H8z" fill="oklch(0.19 0.048 250)"/><animateMotion dur="14s" repeatCount="indefinite" rotate="0"><mpath href="#rt-login"/></animateMotion></g></svg></div></div><p class="copy">© 2026 BusPoint</p></div>
      <main class="access__main"><div class="access__theme">${themeBtn()}</div><div class="access__card"><div class="access__mobile-brand">${brand(true)}</div><h1>Bem-vindo de volta</h1><p class="access__sub">Entre com o e-mail e a senha da sua conta.</p>
      <form class="access__form" id="f"><label class="field"><span class="label">E-mail</span><span class="campo-ico">${I('user-round')}<input class="input" name="email" type="email" required autocomplete="username" inputmode="email" placeholder="nome@email.com"></span></label>
      <label class="field"><span class="label">Senha</span><span class="campo-ico">${I('lock')}<input class="input" name="senha" type="password" required autocomplete="current-password"><button type="button" class="campo-ico__ver" id="ver" aria-pressed="false" aria-label="Mostrar senha">Mostrar</button></span></label>
      <p class="small" role="alert" id="err" style="color:var(--destructive)"></p><button class="btn btn--block btn--tall" type="submit" id="entrar">Entrar</button></form>
      <div class="access__rodape"><p>Esqueceu a senha? A administração gera uma nova para você.</p><p>Aluno e ainda não tem conta? <a href="${url('cadastro.html')}">Cadastre-se</a></p></div></div></main></div>`;
      const ver = document.getElementById('ver'); ver.onclick = () => { const c = document.querySelector('[name=senha]'), mostrar = c.type === 'password'; c.type = mostrar ? 'text' : 'password'; ver.textContent = mostrar ? 'Ocultar' : 'Mostrar'; ver.setAttribute('aria-pressed', mostrar); ver.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha'); };
      document.getElementById('f').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target), err = document.getElementById('err'); err.textContent = ''; S.clear(); const bt = document.getElementById('entrar'); bt.disabled = true; bt.textContent = 'Entrando…';
        try {
          const r = await post('/api/auth/login', { email: f.get('email').trim(), senha: f.get('senha') });
          const p = jwtPayload(r.token);
          const role = ROLE[String(r.tipoLogin || p.perfil || '').toUpperCase()];
          if (!role) throw new Error('Perfil de usuário desconhecido.');
          const base = { token: r.token, role, id: p.id, exp: p.exp, email: p.sub };
          S.set({ ...base, nome: String(p.sub || '').split('@')[0] });
          let me = {}; try { me = await get(`/api/${RES[role]}/listarPorId/${p.id}`); } catch (x) { /* sem permissão para ler o próprio cadastro */ }
          S.set({ ...base, nome: me.nomeUsuario || String(p.sub || '').split('@')[0], me });
          go(HOME[role]);
        } catch (x) {
          S.clear();
          err.textContent = x.message; bt.disabled = false; bt.textContent = 'Entrar';
        }
      };
    },
    estado() {
      const c = qs('c') || '404';
      const T = { 403: ['Acesso não autorizado', 'Você não possui permissão para acessar esta página.'], 404: ['Página não encontrada', 'A página que você procura não existe ou foi movida.'], 500: ['Erro interno', 'Algo deu errado. Tente novamente em instantes.'] }[c] || ['Algo deu errado', 'Tente novamente.'];
      const s = S.get();
      $app().innerHTML = `<div class="system"><header>${brand(true)}</header><main><span class="code">${esc(c)}</span><h1>${T[0]}</h1><p>${T[1]}</p><div class="lost-route"><svg viewBox="0 0 360 120" aria-hidden="true"><path d="M10 90 C 70 90, 90 40, 150 40 S 210 70, 230 62" fill="none" stroke="oklch(0.62 0.16 257)" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 13"/><circle cx="10" cy="90" r="9" fill="var(--card)" stroke="var(--primary)" stroke-width="3"/><circle cx="150" cy="40" r="9" fill="var(--card)" stroke="var(--primary)" stroke-width="3"/><g transform="translate(262 52)"><rect x="-17" y="-11" width="34" height="22" rx="6" fill="oklch(0.85 0.165 88)"/><path d="M-12-5h8v7h-8zM-2-5h8v7h-8zM8-5h6v7H8z" fill="oklch(0.19 0.048 250)"/><animateTransform attributeName="transform" type="translate" values="262 52;262 48;262 52" dur="2.2s" repeatCount="indefinite"/></g><text x="320" y="68" font-family="Sora, system-ui" font-size="30" font-weight="700" fill="var(--muted-foreground)">?</text></svg></div><a class="back-primary" style="margin-top:28px;font-weight:700" href="${url(s ? HOME[s.role] : 'login.html')}">${I('arrow-left')} Voltar ao início</a></main></div>`;
    },
    perfil() {
      const s = guard(); if (!s) return;
      const m = s.me || {}, L = { admin: 'Administrador', motorista: 'Motorista', aluno: 'Aluno' }[s.role];
      const podeAlterarSenha = !m.statusUsuario || m.statusUsuario === 'ATIVO'; /* ALTERAÇÃO: backend só aceita troca de senha de usuário ATIVO */
      const rows = [['Nome', m.nomeUsuario], ['E-mail', m.emailUsuario], ['Telefone', m.telefoneUsuario], ['Login', m.loginUsuario], ['Tipo de usuário', L]];
      if (s.role === 'aluno') rows.push(['Matrícula', m.matricula], ['Período', m.periodo]);
      if (s.role === 'motorista') rows.push(['CNH', m.numeroCnh], ['Categoria', m.categoriaCnh], ['Validade da CNH', dmy(m.validadeCnh)]);
      $app().innerHTML = `<div style="min-height:100vh"><header class="simple-header"><div class="simple-header__inner">${brand(true)}<div class="simple-header__actions">${themeBtn()}<a class="back-primary" href="${url(HOME[s.role])}">${I('arrow-left')} Voltar</a></div></div></header>
      <main class="profile-main">${headline({ eyebrow: 'CONTA / DADOS PESSOAIS', title: 'Meu perfil', desc: 'Seus dados de acesso e contato. Para alterar dados cadastrais, fale com a administração.' })}
      <div class="card card--pad-lg"><div class="profile-head">${avatar(m.nomeUsuario, true)}<div><h2 class="display" style="font-size:18px">${esc(m.nomeUsuario)}</h2><p class="muted" style="font-size:14px">${L}</p></div></div>
      <div class="profile-grid">${rows.map(([a, b]) => `<div><p class="kicker" style="margin-bottom:4px">${a}</p><p class="semibold" style="font-size:14px">${esc(b ?? '—')}</p></div>`).join('')}</div>
      <div class="profile-actions"><button class="btn btn--outline" id="bp-out">${I('log-out')} Sair</button></div></div>
      ${/* ALTERAÇÃO: card "Alterar senha" (PATCH /api/auth/alterar-senha). O backend só permite a usuários com status ATIVO. */ podeAlterarSenha ? `<div class="card card--pad-lg" style="margin-top:20px">
        <h2 class="section-title" style="margin-bottom:4px">Alterar senha</h2>
        <p class="small muted" style="margin-bottom:20px">Informe sua senha atual e escolha uma nova senha com pelo menos 6 caracteres.</p>
        <form class="stack" id="f-senha" novalidate>
          <label class="field"><span class="label">Senha atual</span><input class="input" name="senhaAtual" type="password" required autocomplete="current-password"></label>
          <div class="profile-form">
            <label class="field"><span class="label">Nova senha</span><input class="input" name="novaSenha" type="password" required minlength="6" maxlength="72" autocomplete="new-password"></label>
            <label class="field"><span class="label">Confirmar nova senha</span><input class="input" name="confirmarSenha" type="password" required minlength="6" maxlength="72" autocomplete="new-password"></label>
          </div>
          <p class="small" role="alert" id="err-senha" style="color:var(--destructive)"></p>
          <div class="form-actions" style="margin-top:8px"><button class="btn" type="submit" id="btn-senha">${I('lock-keyhole')} Atualizar senha</button></div>
        </form>
      </div>` : ''}</main></div>`;
      /* ALTERAÇÃO: validações iguais às do backend (6–72 caracteres e diferente da senha atual) antes de chamar a API. */
      const fSenha = document.getElementById('f-senha');
      if (fSenha) fSenha.onsubmit = async (ev) => {
        ev.preventDefault();
        const err = document.getElementById('err-senha'), btn = document.getElementById('btn-senha'), fd = new FormData(fSenha);
        const senhaAtual = String(fd.get('senhaAtual') || ''), novaSenha = String(fd.get('novaSenha') || ''), confirmarSenha = String(fd.get('confirmarSenha') || '');
        err.textContent = '';
        if (!senhaAtual || !novaSenha || !confirmarSenha) { err.textContent = 'Preencha todos os campos de senha.'; return; }
        if (novaSenha.length < 6) { err.textContent = 'A nova senha deve ter pelo menos 6 caracteres.'; return; }
        if (novaSenha !== confirmarSenha) { err.textContent = 'A confirmação da nova senha não confere.'; return; }
        if (novaSenha === senhaAtual) { err.textContent = 'A nova senha deve ser diferente da senha atual.'; return; }
        btn.disabled = true;
        try { await svc.auth.alterarSenha({ senhaAtual, novaSenha }); fSenha.reset(); toast('Senha alterada com sucesso.'); }
        catch (x) { err.textContent = x.message; }
        finally { btn.disabled = false; }
      };
      document.getElementById('bp-out').onclick = () => { S.clear(); go('login.html'); };
    },
  };
  
  /* =========================================================
     ADMIN — recursos genéricos (lista / formulário / detalhes)
     ========================================================= */
  const ativo = (b) => (b ? 'Ativo' : 'Inativo');
  const statusUsr = (s) => ({ ATIVO: 'Ativo', PENDENTE: 'Pendente', INATIVO: 'Inativo' }[s] || s);
  const R = {
    alunos: { api: '/api/alunos', p: { list: '/listar', one: (i) => `/listarPorId/${i}`, create: '/cadastrar', update: (i) => `/atualizar/${i}` }, map: { nomeUsuario: 'nome', emailUsuario: 'email', telefoneUsuario: 'telefone', senhaUsuario: 'senha' }, id: 'idUsuario', one: 'aluno', title: 'Alunos', off: 'patch', usr: true, st: (r) => statusUsr(r.statusUsuario), name: (r) => r.nomeUsuario,
      cols: [['Aluno', 'nomeUsuario', 'name'], ['Matrícula', 'matricula'], ['Período', 'periodo'], ['E-mail', 'emailUsuario'], ['Status', null, 'st']],
      fields: [['nomeUsuario', 'Nome'], ['emailUsuario', 'E-mail', 'email'], ['telefoneUsuario', 'Telefone (só números, até 13)', 'tel'], ['matricula', 'Número da matrícula', 'number'], ['periodo', 'Período', 'select', ['Manhã', 'Tarde', 'Noite']], ['senhaUsuario', 'Senha inicial', 'password', null, 'create']] },
    motoristas: { api: '/api/motoristas', p: { list: '/listar', one: (i) => `/listarPorId/${i}`, create: '/cadastrar', update: (i) => `/atualizar/${i}` }, map: { nomeUsuario: 'nome', emailUsuario: 'email', telefoneUsuario: 'telefone', senhaUsuario: 'senha' }, id: 'idUsuario', one: 'motorista', title: 'Motoristas', off: 'patch', usr: true, st: (r) => statusUsr(r.statusUsuario), name: (r) => r.nomeUsuario,
      cols: [['Motorista', 'nomeUsuario', 'name'], ['CNH', 'numeroCnh'], ['Categoria', 'categoriaCnh'], ['Validade', 'validadeCnh', 'date'], ['Status', null, 'st']],
      fields: [['nomeUsuario', 'Nome'], ['emailUsuario', 'E-mail', 'email'], ['telefoneUsuario', 'Telefone (só números, até 13)', 'tel'], ['numeroCnh', 'Número da CNH'], ['categoriaCnh', 'Categoria da CNH', 'select', ['D', 'E']], ['validadeCnh', 'Validade da CNH', 'date'], ['senhaUsuario', 'Senha inicial', 'password', null, 'create']] },
    /* ALTERAÇÃO: administradores usam o mesmo CRUD genérico de alunos/motoristas (lista, formulário, detalhes).
       Regras do backend (CadastrarAdminDTO): nome 3–50, e-mail válido, senha 5–15 (só no cadastro), telefone 12–15
       (a coluna do banco aceita 13). O cadastro nasce PENDENTE e é liberado pelo botão "Aprovar" (alterar-status).
       O 6º item de cada campo são atributos HTML extras (minlength/maxlength) para validar antes de enviar. */
    administradores: { api: '/api/administradores', p: { list: '/listar', one: (i) => `/listarPorId/${i}`, create: '/cadastrar', update: (i) => `/atualizar/${i}` }, map: { nomeUsuario: 'nome', emailUsuario: 'email', telefoneUsuario: 'telefone', senhaUsuario: 'senha' }, id: 'idUsuario', one: 'administrador', title: 'Administradores', off: 'patch', usr: true, st: (r) => statusUsr(r.statusUsuario), name: (r) => r.nomeUsuario,
      cols: [['Administrador', 'nomeUsuario', 'name'], ['E-mail', 'emailUsuario'], ['Status', null, 'st']],
      fields: [['nomeUsuario', 'Nome (3 a 50 caracteres)', null, null, null, 'minlength="3" maxlength="50"'], ['emailUsuario', 'E-mail', 'email'], ['telefoneUsuario', 'Telefone com DDI e DDD (12 ou 13 dígitos)', 'tel', null, null, 'minlength="12" maxlength="13"'], ['senhaUsuario', 'Senha inicial (5 a 15 caracteres)', 'password', null, 'create', 'minlength="5" maxlength="15"']] },
    onibus: { api: '/api/onibus', p: { list: '/listar', one: (i) => `/${i}`, create: '/cadastrar', update: (i) => `/atualizar/${i}` }, id: 'idOnibus', one: 'ônibus', title: 'Ônibus', off: 'patch', on: true, st: (r) => ativo(r.statusOnibus), name: (r) => r.placaOnibus,
      cols: [['Placa', 'placaOnibus', 'name'], ['Capacidade', 'capacidadeOnibus', 'cap'], ['Status', null, 'st']],
      fields: [['placaOnibus', 'Placa'], ['capacidadeOnibus', 'Capacidade', 'number']] },
    rotas: { api: '/api/rotas', p: { list: '/listar', one: (i) => `/${i}`, create: '', update: (i) => `/alterar/${i}` }, id: 'idRota', one: 'rota', title: 'Rotas', off: 'patch', st: (r) => ativo(r.statusRota), name: (r) => r.nomeRota,
      cols: [['Rota', 'nomeRota', 'name'], ['Tipo', 'tipo'], ['Início', 'horarioInicio', 'time'], ['Fim', 'horarioFim', 'time'], ['Status', null, 'st']],
      fields: [['nomeRota', 'Nome da rota'], ['tipo', 'Tipo', 'select', ['Ida e volta', 'Ida', 'Volta']], ['horarioInicio', 'Horário de início', 'time'], ['horarioFim', 'Horário de fim', 'time']] },
    pontos: { api: '/api/pontos-parada', p: { list: '/listar', one: (i) => `/${i}`, create: '/cadastrar', update: (i) => `/${i}` }, id: 'idPonto', one: 'ponto de parada', title: 'Pontos de parada', off: 'delete', st: () => 'Ativo', name: (r) => r.nomePonto,
      cols: [['Ponto', 'nomePonto', 'name'], ['Endereço', 'endereco'], ['Latitude', 'latitude'], ['Longitude', 'longitude']],
      fields: [['nomePonto', 'Nome do ponto'], ['endereco', 'Endereço'], ['latitude', 'Latitude', 'number'], ['longitude', 'Longitude', 'number']] },
  };
  const P = (res, op, id) => res.api + (typeof res.p[op] === 'function' ? res.p[op](id) : res.p[op]);
  const cell = (r, [lab, key, kind], res) => {
    if (kind === 'name') return `<td><div class="cell-person">${avatar(res.name(r))}<span class="semibold">${esc(res.name(r))}</span></div></td>`;
    if (kind === 'st') return `<td>${badge(res.st(r))}</td>`;
    const v = r[key];
    return `<td><span class="muted">${esc(kind === 'time' ? hm(v) : kind === 'date' ? dmy(v) : kind === 'cap' ? v + ' lugares' : v ?? '—')}</span></td>`;
  };
  const SEC = (k) => `admin/${k}.html`;
  
  const admin = {
    list(key) {
      const s = guard('admin'); if (!s) return; const res = R[key];
      adminShell(key, res.title, headline({ eyebrow: 'GESTÃO / CADASTROS', title: res.title, desc: `Gerencie ${res.title.toLowerCase()} do transporte escolar.`, action: `<a class="btn" href="${url('admin/' + key + '-form.html')}">${I('plus')} Novo ${res.one}</a>` }) + section('Todos', '<div id="bx">' + loading() + '</div>'), s);
      let rows = [], q = '', f = 'Todos';
      const draw = () => {
        const list = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q) && (f === 'Todos' || res.st(r) === f));
        document.getElementById('bx').innerHTML = `<div class="toolbar"><label class="input-wrap search">${I('search')}<input class="input" id="q" placeholder="Buscar ${esc(res.one)}…" value="${esc(q)}"></label>${res.off !== 'delete' ? `<label class="input-wrap">${I('filter')}<select class="input" id="fl">${['Todos', 'Ativo', 'Pendente', 'Inativo'].map((o) => `<option${o === f ? ' selected' : ''}>${o}</option>`).join('')}</select></label>` : ''}</div>
        <div class="table-scroll">${list.length ? `<table class="table"><thead><tr>${res.cols.map((c) => `<th>${c[0]}</th>`).join('')}<th>Ações</th></tr></thead><tbody>${list.map((r) => `<tr>${res.cols.map((c) => cell(r, c, res)).join('')}<td><div class="row-actions">
          <a class="btn btn--ghost btn--icon" title="Visualizar" aria-label="Ver ${esc(res.name(r))}" href="${url('admin/' + key + '-detalhes.html', { id: r[res.id] })}">${I('eye')}</a>
          <a class="btn btn--ghost btn--icon" title="Editar" aria-label="Editar ${esc(res.name(r))}" href="${url('admin/' + key + '-form.html', { id: r[res.id] })}">${I('square-pen')}</a>
          ${/* ALTERAÇÃO: "Resetar senha" só p/ usuário ATIVO (regra do backend) e nunca na própria conta (use "Meu perfil") */ res.usr && r.statusUsuario === 'ATIVO' && r[res.id] !== s.id ? `<button class="btn btn--ghost btn--icon" title="Resetar senha" aria-label="Resetar senha de ${esc(res.name(r))}" data-rst="${r[res.id]}" data-nome="${esc(res.name(r))}">${I('lock-keyhole')}</button>` : ''}
          ${res.off === 'delete' ? `<button class="btn btn--ghost btn--icon" title="Excluir" data-del="${r[res.id]}">${I('trash-2')}</button>` : res.st(r) === 'Ativo' ? (res.usr && r[res.id] === s.id ? '' /* ALTERAÇÃO: o admin não pode inativar a própria conta (ficaria sem acesso) */ : `<button class="btn btn--ghost btn--icon" title="Inativar" data-off="${r[res.id]}">${I('ellipsis')}</button>`) : res.on || res.usr ? `<button class="btn btn--ghost btn--sm" data-on="${r[res.id]}">${res.st(r) === 'Pendente' ? 'Aprovar' : 'Ativar'}</button>` : ''}</div></td></tr>`).join('')}</tbody></table>` : empty(`Nenhum ${res.one} encontrado.`)}</div><div class="table-foot"><span>Mostrando ${list.length} de ${rows.length} registros</span></div>`;
        document.getElementById('q').oninput = (e) => { q = e.target.value.toLowerCase(); draw(); document.getElementById('q').focus(); };
        const fl = document.getElementById('fl'); if (fl) fl.onchange = (e) => { f = e.target.value; draw(); };
      };
      const load = async () => { try { rows = await get(P(res, 'list')); draw(); } catch (e) { document.getElementById('bx').innerHTML = empty(e.message); } };
      document.getElementById('bp-main').onclick = async (e) => {
        const b = e.target.closest('[data-off],[data-on],[data-del],[data-rst]'); if (!b) return; /* ALTERAÇÃO: + data-rst (resetar senha) */
        const id = b.dataset.off || b.dataset.on || b.dataset.del || b.dataset.rst;
        if (b.dataset.rst) { await resetarSenha(id, b.dataset.nome); return; } /* ALTERAÇÃO */
        if (b.dataset.on) { await run(() => (res.usr ? put(`/api/administradores/alterar-status/${id}?statusDto=ATIVO`) : patch(`${res.api}/${id}/ativar`)), 'Registro ativado.'); return load(); }
        const word = b.dataset.del ? 'excluir' : 'inativar';
        if (await confirmModal(`Confirmar ${word === 'excluir' ? 'exclusão' : 'inativação'}`, `Deseja realmente ${word} este ${res.one}?`, word === 'excluir' ? 'Excluir' : 'Inativar', true)) {
          await run(() => (b.dataset.del ? del(`${res.api}/${id}`) : res.usr ? put(`/api/administradores/alterar-status/${id}?statusDto=INATIVO`) : patch(`${res.api}/${id}/desativar`)), 'Registro atualizado com sucesso.'); load();
        }
      };
      load();
    },
  
    form(key) {
      const s = guard('admin'); if (!s) return; const res = R[key], id = qs('id'), edit = !!id;
      adminShell(key, res.title, loading(), s);
      (async () => {
        let e = {}; try { if (edit) e = await get(P(res, 'one', id)); } catch (x) { return setMain(empty(x.message)); }
        const fields = res.fields.filter((f) => !(f[4] === 'create' && edit)).map(([k, l, t, o, , a]) => { /* ALTERAÇÃO: "a" = atributos HTML extras do campo */
          const v = e[k] ?? '';
          const c = t === 'select' ? `<select class="input" name="${k}">${o.map((x) => `<option${x === v ? ' selected' : ''}>${x}</option>`).join('')}</select>` : `<input class="input" name="${k}" required type="${t === 'tel' ? 'tel' : t || 'text'}"${t === 'number' ? ' step="any"' : ''}${a ? ' ' + a : ''} value="${esc(t === 'time' ? hm(v) : v)}">`;
          return `<label class="field"><span class="label">${l}</span>${c}</label>`;
        }).join('');
        setMain(headline({ eyebrow: `${res.title} / ${edit ? 'EDITAR' : 'CADASTRAR'}`, title: `${edit ? 'Editar' : 'Cadastrar'} ${res.one}` }) + `<form class="form-max" id="f">${section('Informações gerais', `<div class="form-grid">${fields}</div>`)}<div class="form-actions"><a class="btn btn--outline" href="${url(SEC(key))}">Cancelar</a><button class="btn" type="submit">${edit ? 'Salvar alterações' : 'Cadastrar ' + res.one}</button></div></form>`);
        document.getElementById('f').onsubmit = async (ev) => {
          ev.preventDefault(); const d = {};
          res.fields.forEach(([k, , t]) => { const x = ev.target.elements[k]; if (!x) return; let v = x.value.trim(); if (t === 'tel') v = v.replace(/\D/g, ''); if (t === 'number') v = Number(v); if (t === 'time' && v.length === 5) v += ':00'; d[(res.map && res.map[k]) || k] = v; });
          const r = await run(() => (edit ? put(P(res, 'update', id), d) : post(P(res, 'create'), d)));
          if (r) { sessionStorage.setItem('bp-flash', `${res.one[0].toUpperCase() + res.one.slice(1)} ${edit ? 'atualizado' : 'cadastrado'} com sucesso.`); go(SEC(key)); }
        };
      })();
    },
  
    detail(key) {
      const s = guard('admin'); if (!s) return; const res = R[key], id = qs('id');
      adminShell(key, res.title, loading(), s);
      get(P(res, 'one', id)).then((e) => {
        const keys = res.cols.filter((c) => c[2] !== 'name');
        /* ALTERAÇÃO: botão "Resetar senha" nos detalhes (só usuário ATIVO e que não seja o próprio admin logado) */
        const btnReset = res.usr && e.statusUsuario === 'ATIVO' && e[res.id] !== s.id ? `<button class="btn btn--outline" type="button" id="bp-detail-rst">${I('lock-keyhole')} Resetar senha</button>` : '';
        setMain(`<a class="back-link" href="${url(SEC(key))}">${I('arrow-left')} Voltar para ${res.title.toLowerCase()}</a>` + headline({ eyebrow: `${res.title} / DETALHES`, title: res.name(e), action: `<div class="headline__actions">${btnReset}<a class="btn btn--outline" href="${url('admin/' + key + '-form.html', { id })}">${I('square-pen')} Editar</a></div>` })
          + section('Informações gerais', `<div class="section__body--lg"><div class="kv-grid">${keys.map((c) => `<div><p class="kicker">${c[0]}</p>${c[2] === 'st' ? badge(res.st(e)) : `<p class="semibold" style="font-size:14px">${esc(c[2] === 'time' ? hm(e[c[1]]) : c[2] === 'date' ? dmy(e[c[1]]) : e[c[1]] ?? '—')}</p>`}</div>`).join('')}${e.telefoneUsuario ? `<div><p class="kicker">Telefone</p><p class="semibold" style="font-size:14px">${esc(e.telefoneUsuario)}</p></div><div><p class="kicker">Login</p><p class="semibold" style="font-size:14px">${esc(e.loginUsuario)}</p></div>` : ''}</div></div>`)
          + (key === 'rotas' ? `<div class="mt-5"><a class="btn" href="${url('admin/rota-gerenciar.html', { id })}">${I('route')} Gerenciar pontos e alunos</a></div>` : ''));
        const br = document.getElementById('bp-detail-rst'); /* ALTERAÇÃO */
        if (br) br.onclick = () => resetarSenha(id, res.name(e));
      }).catch((x) => setMain(empty(x.message)));
    },
  
    /* Rota: pontos de parada (ordem) + alunos matriculados */
    rota() {
      const s = guard('admin'); if (!s) return; const id = qs('id');
      adminShell('rotas', 'Rotas', loading(), s);
      const pt = (x) => x.pontoParada || x;
      const load = async () => {
        try {
          const [rota, rp, todosPontos, mats, alunos] = await Promise.all([get(`/api/rotas/${id}`), get(`/api/rotas/${id}/pontos/listar`), get('/api/pontos-parada/listar'), get('/api/matriculas/listar'), get('/api/alunos/listar')]);
          const mine = mats.filter((m) => String(m.idRota) === String(id)), usados = new Set(rp.map((x) => pt(x).idPonto)), livres = todosPontos.filter((p) => !usados.has(p.idPonto)), matric = new Set(mine.filter((m) => m.statusAluno === 'ATIVO').map((m) => m.idAluno));
          const next = rp.reduce((a, x) => Math.max(a, x.ordem), 0) + 1;
          setMain(`<a class="back-link" href="${url('admin/rotas.html')}">${I('arrow-left')} Voltar para rotas</a>` + headline({ eyebrow: 'ROTAS / VINCULAÇÕES', title: rota.nomeRota, desc: `${rota.tipo} · ${hm(rota.horarioInicio)} às ${hm(rota.horarioFim)}`, action: `<div class="headline__actions">${badge(ativo(rota.statusRota))}<a class="btn" href="${url('admin/viagens-form.html', { rota: id })}">${I('calendar-days')} Agendar viagem</a></div>` })
            + `<div class="layout-c">` + section('Pontos de parada', `<div class="section__body"><p class="small muted" style="margin-bottom:16px">Os pontos aparecem na ordem percorrida pelo ônibus.</p>${rp.length ? rp.map((x) => `<div class="stop-edit"><span class="stop__num">${x.ordem}</span><span class="grow">${esc(pt(x).nomePonto)}<span class="small muted"> · ${esc(pt(x).endereco || '')}</span></span><button class="btn btn--ghost btn--icon" aria-label="Remover ${esc(pt(x).nomePonto)}" data-rm="${pt(x).idPonto}">${I('x')}</button></div>`).join('') : empty('Esta rota ainda não tem pontos.')}
              <form class="inline-form" id="fp"><select class="input" name="p" required aria-label="Ponto"><option value="">Selecione um ponto…</option>${livres.map((p) => `<option value="${p.idPonto}">${esc(p.nomePonto)}</option>`).join('')}</select><input class="input" name="o" type="number" min="1" value="${next}" style="max-width:90px" aria-label="Ordem"><button class="btn btn--outline" type="submit">${I('plus')} Adicionar</button></form>
              <p class="small muted" style="margin-top:8px">Precisa de um ponto novo? <a class="text-primary strong" href="${url('admin/pontos-form.html')}">Cadastre um ponto de parada</a>.</p></div>`)
            + section('Alunos matriculados', `<div class="divide">${mine.length ? mine.map((m) => `<div class="list-item">${avatar(m.nomeAluno)}<div class="list-item__main"><p class="list-item__title">${esc(m.nomeAluno)}</p><p class="small muted">Desde ${dmy(m.dataMatricula)}</p></div>${badge(statusUsr(m.statusAluno))}<button class="btn btn--sm btn--outline" data-mrm="${m.idMatricula}">Remover</button></div>`).join('') : empty('Nenhum aluno matriculado.')}</div>
              <form class="inline-form" id="fm" style="padding:16px"><select class="input" name="a" required aria-label="Aluno"><option value="">Selecione um aluno…</option>${alunos.filter((a) => a.statusUsuario === 'ATIVO' && !mine.some((m) => m.idAluno === a.idUsuario)).map((a) => `<option value="${a.idUsuario}">${esc(a.nomeUsuario)} (${a.matricula})</option>`).join('')}</select><button class="btn btn--outline" type="submit">${I('plus')} Vincular aluno</button></form>`) + `</div>`);
          document.getElementById('fp').onsubmit = async (e) => { e.preventDefault(); if (await run(() => post(`/api/rotas/${id}/pontos/cadastrar`, { idPonto: Number(e.target.p.value), ordem: Number(e.target.o.value) }), 'Ponto adicionado.')) load(); };
          document.getElementById('fm').onsubmit = async (e) => { e.preventDefault(); if (await run(() => post('/api/matriculas', { idAluno: Number(e.target.a.value), idRota: Number(id) }), 'Aluno vinculado com sucesso.')) load(); };
          document.getElementById('bp-main').onclick = async (e) => {
            const r = e.target.closest('[data-rm]'), m = e.target.closest('[data-mrm]');
            if (r && await confirmModal('Remover ponto', 'Remover este ponto da rota?', 'Remover', true)) { await run(() => del(`/api/rotas/${id}/pontos/${r.dataset.rm}`), 'Ponto removido.'); load(); }
            if (m && await confirmModal('Remover matrícula', 'Remover este aluno da rota?', 'Remover', true)) { await run(() => del(`/api/matriculas/${m.dataset.mrm}`), 'Matrícula removida.'); load(); }
          };
        } catch (x) { setMain(empty(x.message)); }
      };
      load();
    },
  
    /* Agendar viagem = vincular motorista + ônibus a uma rota */
    viagemForm() {
      const s = guard('admin'); if (!s) return; adminShell('viagens', 'Viagens', loading(), s);
      Promise.all([get('/api/rotas/ativas'), get('/api/motoristas/listar'), get('/api/onibus/ativos')]).then(([rotas, mots, bus]) => {
        const opt = (a, v, l, sel) => a.map((x) => `<option value="${x[v]}"${String(x[v]) === sel ? ' selected' : ''}>${esc(l(x))}</option>`).join('');
        const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], limite = new Date(); limite.setDate(limite.getDate() + 27);
        const isoLimite = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}-${String(limite.getDate()).padStart(2, '0')}`;
        setMain(headline({ eyebrow: 'VIAGENS / AGENDAR', title: 'Agendar viagens', desc: 'Programe vários dias de uma vez: escolha o período e os dias da semana.' }) + `<form class="form-max" id="f">${section('Rota, motorista e ônibus', `<div class="form-grid">
          <label class="field"><span class="label">Rota</span><select class="input" name="idRota" required>${opt(rotas, 'idRota', (r) => `${r.nomeRota} (${hm(r.horarioInicio)})`, qs('rota'))}</select></label>
          <label class="field"><span class="label">Horário de início</span><input class="input" type="time" name="horaInicio" required></label>
          <label class="field"><span class="label">Motorista</span><select class="input" name="idMotorista" required>${opt(mots.filter((m) => m.statusUsuario === 'ATIVO'), 'idUsuario', (m) => m.nomeUsuario)}</select></label>
          <label class="field"><span class="label">Ônibus</span><select class="input" name="idOnibus" required>${opt(bus, 'idOnibus', (b) => `${b.placaOnibus} · ${b.capacidadeOnibus} lugares`)}</select></label></div>`)}
          ${section('Período', `<div class="form-grid">
          <label class="field"><span class="label">De</span><input class="input" type="date" name="de" required value="${today()}"></label>
          <label class="field"><span class="label">Até</span><input class="input" type="date" name="ate" required value="${isoLimite}"></label></div>
          <div class="section__body"><p class="label" style="margin-bottom:8px">Dias da semana</p><div class="dias">${nomes.map((n, i) => `<label class="dia"><input type="checkbox" name="dia" value="${i}"${i >= 1 && i <= 5 ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div><p class="small muted" id="resumo" role="status" style="margin-top:14px"></p></div>`)}
          <div id="andamento" class="small" role="status" style="margin-bottom:12px"></div>
          <div class="form-actions"><a class="btn btn--outline" href="${url('admin/viagens.html')}">Cancelar</a><button class="btn" type="submit" id="enviar">Agendar</button></div></form>`);
        const f = document.getElementById('f'), el = (id) => document.getElementById(id);
        const r0 = rotas.find((r) => String(r.idRota) === qs('rota')) || rotas[0]; if (r0) f.elements.horaInicio.value = hm(r0.horarioInicio);
        const calcular = () => datasDoLote(f.elements.de.value, f.elements.ate.value, [...f.querySelectorAll('[name=dia]:checked')].map((x) => Number(x.value)));
        const atualizar = () => {
          const d = calcular(), muitas = d.length > 120;
          el('resumo').textContent = muitas ? 'O limite é de 120 viagens por vez. Reduza o período.' : d.length ? `${d.length} ${d.length === 1 ? 'viagem' : 'viagens'}, de ${dmy(d[0])} a ${dmy(d[d.length - 1])}.` : 'Nenhuma data no período com esses dias da semana.';
          el('enviar').disabled = !d.length || muitas; el('enviar').textContent = d.length && !muitas ? `Agendar ${d.length} ${d.length === 1 ? 'viagem' : 'viagens'}` : 'Agendar';
        };
        f.addEventListener('input', atualizar); atualizar();
        f.onsubmit = async (e) => {
          e.preventDefault(); const datas = calcular(); if (!datas.length || datas.length > 120) return;
          const base = { idRota: Number(f.elements.idRota.value), idMotorista: Number(f.elements.idMotorista.value), idOnibus: Number(f.elements.idOnibus.value), horaInicio: f.elements.horaInicio.value + ':00' };
          const existentes = await tentar(() => get('/api/viagens/listar'), []);
          const ja = new Set(existentes.filter((v) => v.idRota === base.idRota && String(v.horaInicio).slice(0, 5) === base.horaInicio.slice(0, 5)).map((v) => v.dataViagem));
          const novas = datas.filter((d) => !ja.has(d)), repetidas = datas.length - novas.length;
          if (!novas.length) return toast('Todas essas datas já têm viagem nesta rota e horário.', true);
          if (!(await confirmModal('Agendar viagens?', `${novas.length} ${novas.length === 1 ? 'viagem será criada' : 'viagens serão criadas'}, de ${dmy(novas[0])} a ${dmy(novas[novas.length - 1])}.${repetidas ? ` ${repetidas} já existia(m) e será(ão) ignorada(s).` : ''}`, 'Agendar'))) return;
          el('enviar').disabled = true; const falhas = []; let feitas = 0;
          for (const dia of novas) {
            el('andamento').textContent = `Agendando ${feitas + falhas.length + 1} de ${novas.length}…`;
            try { await post('/api/viagens/cadastrar', { ...base, dataViagem: dia }); feitas++; } catch (x) { falhas.push(`${dmy(dia)}: ${x.message}`); if (x.status === 403) break; }
          }
          if (!falhas.length) { sessionStorage.setItem('bp-flash', `${feitas} ${feitas === 1 ? 'viagem agendada' : 'viagens agendadas'} com sucesso.`); return go('admin/viagens.html'); }
          el('andamento').innerHTML = `<p class="strong">${feitas} agendada(s). ${falhas.length} não puderam ser criadas:</p><ul>${falhas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`; el('enviar').disabled = false;
        };
      }).catch((x) => setMain(empty(x.message)));
    },
    viagens(modo) { // modo: 'todas' | 'historico'
      const s = guard('admin'); if (!s) return; const h = modo === 'historico';
      adminShell(h ? 'historico' : 'viagens', h ? 'Histórico de viagens' : 'Viagens', headline({ eyebrow: h ? 'OPERAÇÃO / CONSULTA' : 'OPERAÇÃO', title: h ? 'Histórico de viagens' : 'Viagens', desc: h ? 'Consulte as viagens finalizadas.' : 'Acompanhe e inicie as viagens programadas.', action: h ? '' : `<a class="btn" href="${url('admin/viagens-form.html')}">${I('plus')} Agendar viagem</a>` }) + section(h ? 'Viagens finalizadas' : 'Todas as viagens', '<div id="bx">' + loading() + '</div>'), s);
      get('/api/viagens/listar').then((v) => {
        v = v.filter((x) => !h || x.status === 'FINALIZADA').sort((a, b) => (b.dataViagem + b.horaInicio).localeCompare(a.dataViagem + a.horaInicio));
        document.getElementById('bx').innerHTML = `<div class="table-scroll">${v.length ? `<table class="table"><thead><tr><th>Viagem</th><th>Data</th><th>Rota</th><th>Motorista</th><th>Ônibus</th><th>Início</th><th>Fim</th><th>Status</th><th>Ações</th></tr></thead><tbody>${v.map((x) => `<tr><td class="semibold">VG-${x.idViagem}</td><td>${dmy(x.dataViagem)}</td><td>${esc(x.nomeRota)}</td><td>${esc(x.nomeMotorista)}</td><td>${esc(x.placaOnibus)}</td><td>${hm(x.horaInicio)}</td><td>${hm(x.horaFim)}</td><td>${badge(stView(x.status))}</td><td><a class="btn btn--ghost btn--icon" aria-label="Ver viagem VG-${x.idViagem}" href="${url('admin/viagens-detalhes.html', { id: x.idViagem })}">${I('eye')}</a></td></tr>`).join('')}</tbody></table>` : empty('Nenhuma viagem encontrada.')}</div>`;
      }).catch((x) => { document.getElementById('bx').innerHTML = empty(x.message); });
    },
  
    viagemDetail() {
      const s = guard('admin'); if (!s) return; const id = qs('id'); adminShell('viagens', 'Viagens', loading(), s);
      Promise.all([get(`/api/viagens/${id}`), get(`/api/registros-transporte/viagem/${id}`)]).then(([v, regs]) => {
        setMain(`<a class="back-link" href="${url('admin/viagens.html')}">${I('arrow-left')} Voltar para viagens</a>` + headline({ eyebrow: 'VIAGENS / DETALHES', title: `VG-${v.idViagem} · ${v.nomeRota}`, action: `<div class="headline__actions">${badge(stView(v.status))}</div>` })
          + `<div class="layout-c">` + section('Informações gerais', `<div class="section__body--lg"><div class="kv-grid">${[['Data', dmy(v.dataViagem)], ['Início', hm(v.horaInicio)], ['Fim', hm(v.horaFim)], ['Motorista', v.nomeMotorista], ['Ônibus', v.placaOnibus], ['Observação', v.observacaoFinalizacao || '—']].map(([a, b]) => `<div><p class="kicker">${a}</p><p class="semibold" style="font-size:14px">${esc(b)}</p></div>`).join('')}</div></div>`)
          + section('Controle de passageiros', `<div class="section__body">${regs.length ? regs.map((r) => `<div class="kv-row"><span>${esc(r.nomeAluno)} · ${r.tipoRegistro === 'EMBARQUE' ? 'Embarque' : 'Desembarque'} ${hm(String(r.dataHora).split('T')[1])}</span>${badge(r.status ? 'Ativo' : 'Invalidado')}</div>`).join('') : '<p class="small muted">Nenhum registro nesta viagem.</p>'}</div>`) + `</div>`);
      }).catch((x) => setMain(empty(x.message)));
    },
  
    monitor(tipo) { // 'EMBARQUE' | 'DESEMBARQUE'
      const s = guard('admin'); if (!s) return; const emb = tipo === 'EMBARQUE';
      adminShell(emb ? 'embarques' : 'desembarques', emb ? 'Embarques' : 'Desembarques', headline({ eyebrow: 'OPERAÇÃO / REGISTROS', title: emb ? 'Registros de embarque' : 'Registros de desembarque', desc: 'Veja os registros e invalide os feitos por engano.' }) + section('Registros', '<div id="bx">' + loading() + '</div>'), s);
      const load = () => get('/api/registros-transporte').then((r) => {
        r = r.filter((x) => x.tipoRegistro === tipo).sort((a, b) => String(b.dataHora).localeCompare(String(a.dataHora)));
        document.getElementById('bx').innerHTML = `<div class="table-scroll">${r.length ? `<table class="table"><thead><tr><th>Aluno</th><th>Rota</th><th>Viagem</th><th>Data e hora</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${r.map((x) => `<tr><td class="semibold">${esc(x.nomeAluno)}</td><td>${esc(x.nomeRota)}</td><td>VG-${x.idViagem}</td><td>${dmy(x.dataHora)} ${hm(String(x.dataHora).split('T')[1])}</td><td>${badge(x.status ? (emb ? 'Embarcado' : 'Desembarcado') : 'Invalidado')}</td><td>${x.status ? `<button class="btn btn--outline btn--sm" data-inv='${x.idAluno}/${x.idViagem}'>Invalidar</button>` : `<span class="small muted">${esc(x.justificativa || '')}</span>`}</td></tr>`).join('')}</tbody></table>` : empty('Nenhum registro.')}</div>`;
      }).catch((x) => { document.getElementById('bx').innerHTML = empty(x.message); });
      document.getElementById('bp-main').onclick = async (e) => {
        const b = e.target.closest('[data-inv]'); if (!b) return;
        const j = prompt('Justificativa para invalidar este registro:'); if (!j) return;
        await run(() => patch(`/api/registros-transporte/${b.dataset.inv}/${tipo}/invalidar`, { justificativa: j }), 'Registro invalidado.'); load();
      };
      load();
    },
  
    dashboard() {
      const s = guard('admin'); if (!s) return; adminShell('dashboard', 'Visão geral', loading(), s);
      Promise.all([get('/api/alunos/listar'), get('/api/motoristas/listar'), get('/api/onibus/listar'), get('/api/rotas/listar'), get('/api/viagens/listar')]).then(async ([al, mo, on, ro, vi]) => {
        const iso = today(), d1 = new Date(); d1.setDate(d1.getDate() + 1);
        const hoje = vi.filter((v) => v.dataViagem === iso).sort(porData), nAmanha = vi.filter((v) => v.dataViagem === d1.toLocaleDateString('sv')).length;
        const por = (st) => hoje.filter((v) => v.status === st).length, ativos = (l, k, val) => l.filter((x) => x[k] === val).length;
        const pendA = ativos(al, 'statusUsuario', 'PENDENTE'), pendM = ativos(mo, 'statusUsuario', 'PENDENTE');
        const mats = await tentar(() => get('/api/matriculas/listar'), null); const bordo = {}; await Promise.all(hoje.filter((v) => v.status === 'EM_ANDAMENTO').map(async (v) => { bordo[v.idViagem] = Math.max(0, aBordo(await tentar(() => get(`/api/registros-transporte/viagem/${v.idViagem}`), []))); }));
        const h = new Date().getHours(), saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
        const resumo = hoje.length ? `${hoje.length} ${hoje.length === 1 ? 'viagem' : 'viagens'} hoje: ${por('EM_ANDAMENTO')} em andamento, ${por('PENDENTE')} aguardando e ${por('FINALIZADA')} ${por('FINALIZADA') === 1 ? 'finalizada' : 'finalizadas'}.` : 'Nenhuma viagem programada para hoje.';
        const pistas = hoje.length ? hoje.map((v) => `<a class="pista" href="${url('admin/viagens-detalhes.html', { id: v.idViagem })}"><span class="pista__hora">${hm(v.horaInicio)}</span><span class="pista__meio"><span class="pista__rota">${esc(v.nomeRota)}</span><span class="pista__sub">${esc(v.nomeMotorista)} · ${esc(v.placaOnibus)}</span>${trilha(v.status)}</span><span class="pista__fim">${badge(stView(v.status))}${v.status === 'EM_ANDAMENTO' ? `<span class="pista__bordo">${bordo[v.idViagem] ?? 0} a bordo</span>` : ''}</span></a>`).join('')
          : `<div class="pistas__vazio"><p class="strong">Nenhuma viagem hoje</p><p class="small muted">Agende as viagens da semana de uma vez.</p><a class="btn btn--outline btn--sm" href="${url('admin/viagens-form.html')}">Agendar viagens</a></div>`;
        const atencao = [];
        if (pendA) atencao.push(['alunos', `${pendA} ${pendA === 1 ? 'aluno aguarda' : 'alunos aguardam'} aprovação`, true]);
        if (pendM) atencao.push(['motoristas', `${pendM} ${pendM === 1 ? 'motorista aguarda' : 'motoristas aguardam'} aprovação`, true]);
        atencao.push([nAmanha ? 'viagens' : 'viagens-form', nAmanha ? `${nAmanha} ${nAmanha === 1 ? 'viagem agendada' : 'viagens agendadas'} para amanhã` : 'Nenhuma viagem agendada para amanhã', !nAmanha]);
        const quadro = [['Alunos', ativos(al, 'statusUsuario', 'ATIVO'), 'alunos'], ['Motoristas', ativos(mo, 'statusUsuario', 'ATIVO'), 'motoristas'], ['Ônibus', on.filter((x) => x.statusOnibus).length, 'onibus'], ['Rotas', ro.filter((x) => x.statusRota).length, 'rotas']];
        const porRota = {}; (mats || []).filter((m) => m.statusAluno === 'ATIVO').forEach((m) => { porRota[m.nomeRota] = (porRota[m.nomeRota] || 0) + 1; });
        const rotasOrd = Object.entries(porRota).sort((x, y) => y[1] - x[1]), coresRota = ['var(--primary)', 'var(--signal)', 'var(--success)', 'oklch(0.62 0.13 305)'];
        const fatiasRota = rotasOrd.slice(0, 4).map(([nome, valor], i) => ({ nome, valor, cor: coresRota[i] })), resto = rotasOrd.slice(4).reduce((n, [, q]) => n + q, 0); if (resto) fatiasRota.push({ nome: 'Outras rotas', valor: resto, cor: 'var(--muted-foreground)' });
        const graficos = `<div class="graficos">${pizza('Hoje por status', [{ nome: 'Aguardando', valor: por('PENDENTE'), cor: 'var(--warning)' }, { nome: 'Em andamento', valor: por('EM_ANDAMENTO'), cor: 'var(--primary)' }, { nome: 'Finalizadas', valor: por('FINALIZADA'), cor: 'var(--success)' }])}${pizza('Alunos por situação', [{ nome: 'Ativos', valor: ativos(al, 'statusUsuario', 'ATIVO'), cor: 'var(--success)' }, { nome: 'Aguardando aprovação', valor: pendA, cor: 'var(--warning)' }, { nome: 'Inativos', valor: ativos(al, 'statusUsuario', 'INATIVO'), cor: 'var(--muted-foreground)' }])}${mats ? pizza('Alunos por rota', fatiasRota) : ''}</div>`;
        setMain(`<div class="painel-topo"><div><p class="painel-data">${esc(diaSemana())}</p><h1>${saudacao}, ${esc(nomeCurto(s))}</h1><p class="painel-resumo">${resumo}</p></div><a class="btn" href="${url('admin/viagens-form.html')}">${I('plus')} Agendar viagens</a></div>
          <div class="painel-grade"><section class="pistas" aria-label="Viagens de hoje"><div class="pistas__topo"><h2 class="section-title">Viagens de hoje</h2><a class="link-more" href="${url('admin/viagens.html')}">Ver todas</a></div>${pistas}</section>
          <div class="painel-lado"><section class="lado"><h2 class="section-title">Precisa de atenção</h2><ul class="atencao">${atencao.map(([pg, t, alerta]) => `<li><a href="${url('admin/' + pg + '.html')}"><span class="atencao__marca${alerta ? ' atencao__marca--alerta' : ''}"></span>${esc(t)}</a></li>`).join('')}</ul></section>
          <section class="lado"><h2 class="section-title">Em operação</h2><ul class="quadro">${quadro.map(([n, q, pg]) => `<li><a href="${url('admin/' + pg + '.html')}"><span>${n}</span><strong>${q}</strong></a></li>`).join('')}</ul></section></div></div>${graficos}`);
      }).catch((x) => setMain(empty(x.message)));
    },
  };
  
  /* =========================================================
     MOTORISTA / ALUNO
     ========================================================= */
  const card = (inner) => `<div class="card card--pad">${inner}</div>`;
  const facts = (a) => `<div class="facts">${a.map(([k, v]) => `<div><p class="k">${k}</p><p class="v">${esc(v)}</p></div>`).join('')}</div>`;
  const stopsHtml = (rp, pt) => `<div class="card card--pad"><h2 class="section-title" style="margin-bottom:20px">Pontos de parada</h2>${rp.length ? `<div class="stops">${rp.map((x, i) => `<div class="stop"><div class="stop__rail"><span class="stop__num">${x.ordem}</span>${i < rp.length - 1 ? '<span class="stop__line"></span>' : ''}</div><div class="stop__text">${esc(pt(x).nomePonto)}<p class="xsmall muted" style="font-weight:400">${esc(pt(x).endereco || '')}</p></div></div>`).join('')}</div>` : empty('Esta rota ainda não tem pontos.')}</div>`;
  const ptOf = (x) => x.pontoParada || x;
  const mine = (v, s) => v.filter((x) => x.idMotorista === s.id).sort((a, b) => (a.dataViagem + a.horaInicio).localeCompare(b.dataViagem + b.horaInicio));
  const pickTrip = (v) => v.find((x) => x.status === 'EM_ANDAMENTO') || v.find((x) => x.status === 'PENDENTE' && x.dataViagem >= today()) || v.filter((x) => x.status === 'FINALIZADA').pop();
  
  /* ---- Início de aluno e motorista: cada bloco secundário falha sozinho, sem derrubar a tela ---- */
  const tentar = async (fn, padrao) => { try { return await fn(); } catch (e) { return padrao; } };
  const porData = (a, b) => (a.dataViagem + a.horaInicio).localeCompare(b.dataViagem + b.horaInicio);
  const aBordo = (regs) => regs.filter((r) => r.status).reduce((n, r) => n + (r.tipoRegistro === 'EMBARQUE' ? 1 : -1), 0);
  const horaDe = (iso) => hm(String(iso).split('T')[1]);
  const diaSemana = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase());
  const heroInicio = (s, frase, rota) => `<div class="hero"><p class="hero__date">${esc(diaSemana())}</p><h1>Olá, ${esc(s.nome.split(' ')[0])}!</h1><p class="hero__sub">${esc(frase)}</p>${rota ? `<div class="hero__route"><p class="label-sm">${rota.rotulo}</p><div class="hero__route-row"><div><p class="name">${esc(rota.nome)}</p><p class="meta">${esc(rota.meta)}</p></div><span class="hero__icon">${I('route')}</span></div></div>` : ''}</div>`;
  const quando = (v) => (v.dataViagem === today() ? `hoje às ${hm(v.horaInicio)}` : `${dmy(v.dataViagem)} às ${hm(v.horaInicio)}`);
  /* ---- Início redesenhado: nome, trilha, ônibus que enche ---- */
  const nomeCurto = (s) => { const n = String(s.nome || '').split(/[\s.@_]/)[0]; return n ? n[0].toUpperCase() + n.slice(1).toLowerCase() : ''; };
  const MINI_BUS = '<svg viewBox="0 0 34 20" aria-hidden="true"><rect x="1" y="1" width="32" height="14" rx="4" fill="currentColor" stroke="var(--signal-ink)" stroke-opacity=".55"/><rect x="5" y="4" width="6" height="5" rx="1.2" fill="var(--navy)"/><rect x="13" y="4" width="6" height="5" rx="1.2" fill="var(--navy)"/><rect x="21" y="4" width="6" height="5" rx="1.2" fill="var(--navy)"/><circle cx="9" cy="16" r="3" fill="var(--navy)"/><circle cx="25" cy="16" r="3" fill="var(--navy)"/></svg>';
  const POS = { PENDENTE: 4, EM_ANDAMENTO: 50, FINALIZADA: 96 };
  const trilha = (st) => `<div class="trilha trilha--${String(st).toLowerCase()}" style="--pos:${POS[st] ?? 4}%" role="img" aria-label="${esc(stView(st))}"><span class="trilha__ponto"></span><span class="trilha__ponto trilha__ponto--fim"></span><span class="trilha__bus">${MINI_BUS}</span></div>`;
  const JAN = [[124, 86, 398, 259], [435, 86, 708, 259], [747, 86, 1023, 259], [1063, 86, 1334, 259], [1372, 86, 1681, 259]], JANELAS = JAN.length;
  const onibusSvg = (n, rodando) => `<div class="onibus${rodando ? ' onibus--rodando' : ''}" role="img" aria-label="Ônibus escolar"><div class="onibus__carro"><img class="onibus__arte" src="${url('assets/onibus.webp')}" alt="" width="760" height="253"><svg class="onibus__alunos" viewBox="0 0 2172 724" aria-hidden="true">${JAN.map(([x0, y0, x1, y1], i) => { const cx = (x0 + x1) / 2; return `<g class="al${i < n ? ' on' : ''}"><circle cx="${cx}" cy="${y0 + 78}" r="30"/><path d="M${cx - 58} ${y1}a58 60 0 0 1 116 0z"/></g>`; }).join('')}</svg></div><span class="onibus__estrada"></span></div>`;
  const janelasCheias = (bordo, base) => (bordo > 0 ? Math.max(1, Math.min(JANELAS, Math.round((JANELAS * bordo) / Math.max(1, base)))) : 0);
  const urlMapa = (p) => { const la = Number(p.latitude), lo = Number(p.longitude); const q = p.latitude != null && p.longitude != null && Number.isFinite(la) && Number.isFinite(lo) ? `${la},${lo}` : p.endereco ? encodeURIComponent(p.endereco) : ''; return q ? `https://www.google.com/maps/search/?api=1&query=${q}` : ''; };
  const pizza = (titulo, fatias) => {
    const itens = fatias.filter((f) => f.valor > 0), total = itens.reduce((n, f) => n + f.valor, 0), R = 54, C = 60; let ang = -Math.PI / 2;
    const pt = (a) => `${(C + R * Math.cos(a)).toFixed(2)} ${(C + R * Math.sin(a)).toFixed(2)}`;
    const desenho = !total ? `<circle cx="${C}" cy="${C}" r="${R}" class="pizza__vazia"/>` : itens.length === 1 ? `<circle cx="${C}" cy="${C}" r="${R}" fill="${itens[0].cor}"/>`
      : itens.map((f) => { const a2 = ang + (f.valor / total) * 2 * Math.PI, d = `M${C} ${C}L${pt(ang)}A${R} ${R} 0 ${a2 - ang > Math.PI ? 1 : 0} 1 ${pt(a2)}Z`; ang = a2; return `<path d="${d}" fill="${f.cor}"/>`; }).join('');
    const resumo = total ? itens.map((f) => `${f.nome} ${f.valor}`).join(', ') : 'sem dados';
    return `<section class="pizza"><h2 class="section-title">${esc(titulo)}</h2><div class="pizza__corpo"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(titulo)}: ${esc(resumo)}">${desenho}</svg><ul class="pizza__legenda">${fatias.map((f) => `<li><span class="pizza__cor" style="background:${f.cor}"></span><span class="pizza__nome">${esc(f.nome)}</span><strong>${f.valor}</strong>${total ? `<small>${Math.round((f.valor / total) * 100)}%</small>` : ''}</li>`).join('')}</ul></div>${total ? '' : '<p class="small muted">Sem dados ainda.</p>'}</section>`;
  };
  /* ---- Situação do aluno na viagem, tolerância de embarque e agendamento em lote ---- */
  const TOLERANCIA_MIN = 10;
  const limiteEmbarque = (v) => (v.iniciadaEm ? new Date(v.iniciadaEm).getTime() + TOLERANCIA_MIN * 60000 : null);
  const prazoAberto = (v) => { const l = limiteEmbarque(v); return l === null || Date.now() <= l; };
  const rotuloSit = { AGUARDANDO: 'Aguardando', EMBARCADO: 'Embarcado', DESEMBARCADO: 'Desembarcado', AUSENTE: 'Ausente' };
  const situacao = (v, regs, idAluno) => {
    const tem = (t) => regs.some((r) => r.idAluno === idAluno && r.idViagem === v.idViagem && r.tipoRegistro === t && r.status);
    if (tem('DESEMBARQUE')) return 'DESEMBARCADO';
    if (tem('EMBARQUE')) return 'EMBARCADO';
    return v.status === 'FINALIZADA' || (v.status === 'EM_ANDAMENTO' && !prazoAberto(v)) ? 'AUSENTE' : 'AGUARDANDO';
  };
  const acoesAluno = (sit, id) => sit === 'DESEMBARCADO' ? '' : `<div class="passenger__actions"><button class="btn btn--sm btn--outline" data-a="reg" data-t="${sit === 'EMBARCADO' ? 'DESEMBARQUE' : 'EMBARQUE'}" data-id="${id}">${sit === 'EMBARCADO' ? 'Desembarcou' : 'Embarcou'}</button></div>`;
  const botaoIniciar = (v) => v.dataViagem === today() ? `<button class="btn btn--xl btn--block" data-a="ini">Iniciar viagem ${I('arrow-right')}</button>`
    : `<button class="btn btn--xl btn--block" disabled>${v.dataViagem > today() ? `Disponível em ${dmy(v.dataViagem)}` : 'A data desta viagem já passou'}</button>`;
  const mmss = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const datasDoLote = (de, ate, dias) => {
    const out = []; if (!de || !ate || de > ate) return out;
    const [a, m, d] = de.split('-').map(Number), c = new Date(a, m - 1, d);
    for (let i = 0; i < 366; i++) {
      const iso = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
      if (iso > ate) break; if (dias.includes(c.getDay())) out.push(iso); c.setDate(c.getDate() + 1);
    }
    return out;
  };
  
  /* GET /api/rotas/{id} é exclusivo do administrador. Para aluno e motorista, cai nos dados que já temos (nome da rota). */
  const rotaOuBasica = (id, nome) => tentar(() => get(`/api/rotas/${id}`), { idRota: id, nomeRota: nome, tipo: '', horarioInicio: null, horarioFim: null, statusRota: true });
  
  const mobile = {
    async page(role, slug, title, render) {
      const s = guard(role); if (!s) return;
      mobileShell(role, slug, title, s);
      try { document.getElementById('bp-main').innerHTML = await render(s); mobile.bind && mobile.bind(); } catch (e) { document.getElementById('bp-main').innerHTML = empty(e.message); }
    },
    /* contexto do motorista: viagem em foco + rota/ônibus */
    async dctx(s) { const v = pickTrip(mine(await get('/api/viagens/minhas'), s)); return { v }; },
    /* contexto do aluno: matrículas ativas → rotas */
    async actx(s) { const ms = (await get(`/api/matriculas/aluno/${s.id}`)).filter((m) => m.statusAluno === 'ATIVO'); const rotas = await Promise.all(ms.map((m) => rotaOuBasica(m.idRota, m.nomeRota))); return { ms, rotas, vs: await tentar(() => get('/api/viagens/minhas'), []) }; },
  
    motorista: {
      inicio: () => mobile.page('motorista', 'inicio', 'Início', async (s) => {
        const todas = mine(await get('/api/viagens/minhas'), s), hoje = today(), doDia = todas.filter((x) => x.dataViagem === hoje);
        const v = doDia.find((x) => x.status === 'EM_ANDAMENTO') || doDia.find((x) => x.status === 'PENDENTE') || doDia.filter((x) => x.status === 'FINALIZADA').pop() || null;
        const prox = todas.find((x) => x.status === 'PENDENTE' && x.dataViagem > hoje) || null;
        const topo = `<div class="topo-inicio"><p>${esc(diaSemana())}</p><h1>Olá, ${esc(nomeCurto(s))}</h1></div>`;
        const proxLinha = prox ? `<p class="inicio-prox">Próxima viagem: ${dmy(prox.dataViagem)} às ${hm(prox.horaInicio)}</p>` : '';
        if (!v) return `<div class="inicio">${topo}<section class="cena">${onibusSvg(0, false)}<p class="cena__vazio">Sem viagem hoje</p>${prox ? '' : '<p class="cena__sub">Quando a administração agendar, ela aparece aqui.</p>'}</section>${proxLinha}</div>`;
        const [alunos, regs, onibus, pontos] = await Promise.all([
          tentar(async () => (await get(`/api/matriculas/rota/${v.idRota}`)).filter((m) => m.statusAluno === 'ATIVO'), null),
          tentar(() => get(`/api/registros-transporte/viagem/${v.idViagem}`), []),
          tentar(() => get(`/api/onibus/${v.idOnibus}`), null),
          tentar(() => get(`/api/rotas/${v.idRota}/pontos/listar`), [])]);
        const total = alunos ? alunos.length : 0, base = total || (onibus && onibus.capacidadeOnibus) || 1, andando = v.status === 'EM_ANDAMENTO';
        const bordo = Math.max(0, aBordo(regs)), levados = regs.filter((r) => r.status && r.tipoRegistro === 'EMBARQUE').length;
        const contagem = (b) => andando ? `<strong>${b}</strong> de ${total || base} a bordo` : v.status === 'FINALIZADA' ? `<strong>${levados}</strong> ${levados === 1 ? 'aluno transportado' : 'alunos transportados'}` : `${total} ${total === 1 ? 'aluno esperado' : 'alunos esperados'}`;
        const acao = { PENDENTE: v.dataViagem === hoje ? 'Iniciar viagem' : 'Ver viagem', EM_ANDAMENTO: 'Controlar embarques', FINALIZADA: 'Ver resumo' }[v.status];
        const lista = [...pontos].sort((x, y) => x.ordem - y.ordem);
        const pontosMot = lista.length ? `<details class="pontos pontos--motorista" open><summary>Pontos de parada (${lista.length})</summary><ol>${lista.map((x, i) => { const p = ptOf(x), u = urlMapa(p); return `<li><span class="ponto__num">${i + 1}</span><span class="ponto__txt">${esc(p.nomePonto)}<small>${esc(p.endereco || '')}</small></span>${u ? `<a class="ponto__mapa" href="${u}" target="_blank" rel="noopener" aria-label="Abrir ${esc(p.nomePonto)} no Google Maps" title="Abrir no Google Maps">${I('map-pin')}</a>` : ''}</li>`; }).join('')}</ol></details>` : '';
        mobile.bind = () => {
          clearInterval(mobile.timer); if (!andando) return;
          mobile.timer = setInterval(async () => {
            const r = await tentar(() => get(`/api/registros-transporte/viagem/${v.idViagem}`), null); if (!r) return;
            const b = Math.max(0, aBordo(r)), n = janelasCheias(b, base);
            document.querySelectorAll('.onibus .al').forEach((el, i) => el.classList.toggle('on', i < n));
            const c = document.getElementById('bp-contagem'); if (c) c.innerHTML = contagem(b);
          }, 8000);
        };
        return `<div class="inicio">${topo}<section class="cena"><div class="cena__topo"><div><p class="cena__hora">${hm(v.horaInicio)}</p><p class="cena__rota">${esc(v.nomeRota)}</p></div>${badge(stView(v.status))}</div>${onibusSvg(janelasCheias(andando ? bordo : 0, base), andando)}<p class="cena__contagem" id="bp-contagem" aria-live="polite">${contagem(bordo)}</p><p class="cena__sub">Ônibus ${esc(v.placaOnibus)}${onibus ? ` · ${onibus.capacidadeOnibus} lugares` : ''}</p></section><a class="btn btn--xl btn--block" style="margin-top:14px" href="${url('motorista/viagem.html')}">${acao}</a>${pontosMot}${v.status === 'FINALIZADA' ? proxLinha : ''}</div>`;
      }),
      'minha-rota': () => {
        const draw = (s) => mobile.page('motorista', 'minha-rota', 'Minha rota', async () => {
          const { v } = await mobile.dctx(s); if (!v) return empty('Nenhuma viagem vinculada a você.');
          const [r, rp, todos] = await Promise.all([rotaOuBasica(v.idRota, v.nomeRota), tentar(() => get(`/api/rotas/${v.idRota}/pontos/listar`), []), tentar(() => get('/api/pontos-parada/listar'), [])]);
          const lista = [...rp].sort((a, b) => a.ordem - b.ordem), usados = new Set(lista.map((x) => ptOf(x).idPonto)), livres = todos.filter((p) => !usados.has(p.idPonto));
          const prox = lista.reduce((n, x) => Math.max(n, x.ordem), 0) + 1;
          mobile.bind = () => {
            document.getElementById('bp-main').onclick = async (e) => {
              const b = e.target.closest('[data-rm]'); if (!b) return;
              if (await confirmModal('Remover parada', 'Remover esta parada da rota?', 'Remover', true) && await run(() => del(`/api/rotas/${v.idRota}/pontos/${b.dataset.rm}`), 'Parada removida.')) draw(S.get());
            };
            document.getElementById('fp').onsubmit = async (e) => {
              e.preventDefault(); const f = e.target;
              if (await run(() => post(`/api/rotas/${v.idRota}/pontos/cadastrar`, { idPonto: Number(f.p.value), ordem: Number(f.o.value) }), 'Parada adicionada.')) draw(S.get());
            };
            document.getElementById('fn').onsubmit = async (e) => {
              e.preventDefault(); const f = e.target;
              if (await run(async () => {
                const novo = await post('/api/pontos-parada/cadastrar', { nomePonto: f.nome.value.trim(), endereco: f.endereco.value.trim(), latitude: Number(f.lat.value), longitude: Number(f.lng.value) });
                await post(`/api/rotas/${v.idRota}/pontos/cadastrar`, { idPonto: novo.idPonto, ordem: Number(f.ordem.value) });
              }, 'Parada criada e adicionada à rota.')) draw(S.get());
            };
          };
          const stops = lista.length ? lista.map((x) => `<div class="stop-edit"><span class="stop__num">${x.ordem}</span><span class="grow">${esc(ptOf(x).nomePonto)}<span class="small muted"> · ${esc(ptOf(x).endereco || '')}</span></span><button class="btn btn--ghost btn--icon" aria-label="Remover ${esc(ptOf(x).nomePonto)}" data-rm="${ptOf(x).idPonto}">${I('x')}</button></div>`).join('') : empty('Esta rota ainda não tem paradas.');
          return card(`<div class="split-top"><div><p class="kicker" style="margin-bottom:8px">Rota vinculada</p><h2 class="display" style="font-size:20px">${esc(r.nomeRota)}</h2><p class="muted" style="margin-top:4px;font-size:14px">${esc(r.tipo)}</p></div>${badge(ativo(r.statusRota))}</div>${facts([['Saída', hm(r.horarioInicio)], ['Retorno', hm(r.horarioFim)], ['Motorista', s.nome], ['Ônibus', v.placaOnibus]])}`)
            + card(`<h2 class="section-title" style="margin-bottom:4px">Paradas da rota</h2><p class="small muted" style="margin-bottom:16px">Na ordem em que o ônibus passa. Você pode adicionar ou remover paradas.</p>${stops}`)
            + card(`<h2 class="section-title" style="margin-bottom:4px">Adicionar parada existente</h2><form class="stack" id="fp" style="margin-top:12px"><label class="field"><span class="label">Parada</span><select class="input" name="p" required><option value="">${livres.length ? 'Selecione uma parada…' : 'Nenhuma parada disponível'}</option>${livres.map((p) => `<option value="${p.idPonto}">${esc(p.nomePonto)}${p.endereco ? ' — ' + esc(p.endereco) : ''}</option>`).join('')}</select></label><label class="field"><span class="label">Posição na rota</span><input class="input" name="o" type="number" min="1" value="${prox}" required></label><button class="btn btn--outline btn--block" type="submit">${I('plus')} Adicionar à rota</button></form>`)
            + card(`<h2 class="section-title" style="margin-bottom:4px">Criar nova parada</h2><p class="small muted">Cadastra o ponto e já o inclui nesta rota.</p><form class="stack" id="fn" style="margin-top:12px"><label class="field"><span class="label">Nome da parada</span><input class="input" name="nome" required maxlength="100"></label><label class="field"><span class="label">Endereço</span><input class="input" name="endereco" required maxlength="255"></label><div class="form-grid"><label class="field"><span class="label">Latitude</span><input class="input" name="lat" type="number" step="any" required></label><label class="field"><span class="label">Longitude</span><input class="input" name="lng" type="number" step="any" required></label></div><label class="field"><span class="label">Posição na rota</span><input class="input" name="ordem" type="number" min="1" value="${prox}" required></label><button class="btn btn--block" type="submit">${I('plus')} Criar e adicionar</button></form>`);
        });
        const s = guard('motorista'); if (s) draw(s);
      },
      horarios: () => mobile.page('motorista', 'horarios', 'Meus horários', async (s) => {
        const vs = mine(await get('/api/viagens/minhas'), s).filter((x) => x.dataViagem >= today() && x.status !== 'FINALIZADA');
        return card(`<h2 class="section-title" style="margin-bottom:4px">Próximas viagens</h2><p class="small muted">Viagens agendadas para você</p><div style="margin-top:20px">${vs.length ? vs.map((x) => `<div class="schedule"><div class="schedule__time">${hm(x.horaInicio)}</div><div><p class="strong" style="font-size:14px">${esc(x.nomeRota)}</p><p class="small muted">${dmy(x.dataViagem)} · ${esc(x.placaOnibus)} · ${stView(x.status)}</p></div></div>`).join('') : empty('Nenhuma viagem agendada.')}</div>`);
      }),
      alunos: () => mobile.page('motorista', 'alunos', 'Meus alunos', async (s) => {
        const { v } = await mobile.dctx(s); if (!v) return empty('Nenhuma viagem vinculada a você.');
        const ms = (await get(`/api/matriculas/rota/${v.idRota}`)).filter((m) => m.statusAluno === 'ATIVO');
        return `<div class="card divide">${ms.length ? ms.map((m) => `<div class="list-item" style="padding:16px">${avatar(m.nomeAluno)}<div class="list-item__main"><p class="strong" style="font-size:14px">${esc(m.nomeAluno)}</p><p class="small muted">${esc(v.nomeRota)}</p></div></div>`).join('') : empty('Nenhum aluno matriculado nesta rota.')}</div>`;
      }),
      onibus: () => mobile.page('motorista', 'onibus', 'Meu ônibus', async (s) => {
        const vs = mine(await get('/api/viagens/minhas'), s), v = pickTrip(vs);
        if (!v) return empty('Nenhum ônibus vinculado a você. A administração vincula o ônibus ao agendar a sua viagem.');
        const abertas = vs.filter((x) => x.status !== 'FINALIZADA'), ids = [...new Set([v.idOnibus, ...abertas.map((x) => x.idOnibus)])];
        const buses = await Promise.all(ids.map((id) => get(`/api/onibus/${id}`)));
        return buses.map((b, i) => {
          const viagens = (i === 0 ? [v, ...abertas.filter((x) => x.idViagem !== v.idViagem)] : abertas).filter((x) => x.idOnibus === b.idOnibus);
          return `<div class="card card--pad-lg"><div class="icon-tile icon-tile--xl" style="margin-bottom:20px">${I('bus-front')}</div><p class="kicker">${i === 0 ? 'VEÍCULO VINCULADO' : 'OUTRO VEÍCULO NAS SUAS VIAGENS'}</p><h2 class="display" style="margin-top:8px;font-size:24px">${esc(b.placaOnibus)}</h2><div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border)">${[['Capacidade', b.capacidadeOnibus + ' passageiros'], ['Status', ativo(b.statusOnibus)], ...viagens.map((x) => [`${dmy(x.dataViagem)} · ${hm(x.horaInicio)}`, x.nomeRota])].map(([a, c]) => `<div class="kv-row" style="padding:8px 0"><span class="muted">${esc(a)}</span><strong>${esc(c)}</strong></div>`).join('')}</div></div>`;
        }).join('');
      }),
      viagem: () => {
        const draw = (s) => mobile.page('motorista', 'viagem', 'Viagem atual', async () => {
          const { v } = await mobile.dctx(s); if (!v) return empty('Nenhuma viagem programada para você.');
          const [ms, regs] = await Promise.all([get(`/api/matriculas/rota/${v.idRota}`), get(`/api/registros-transporte/viagem/${v.idViagem}`)]);
          const alunos = ms.filter((m) => m.statusAluno === 'ATIVO'), on = v.status === 'EM_ANDAMENTO';
          const st = (id) => { const ok = (t) => regs.some((r) => r.idAluno === id && r.tipoRegistro === t && r.status); return ok('DESEMBARQUE') ? 'Desembarcado' : ok('EMBARQUE') ? 'Embarcado' : 'Aguardando'; };
          mobile.bind = () => {
            const m = document.getElementById('bp-main');
            m.onclick = async (e) => {
              const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
              if (a === 'ini') { if (await confirmModal('Iniciar viagem?', `Rota ${v.nomeRota} com o ônibus ${v.placaOnibus}.`, 'Iniciar viagem')) { if (await run(() => patch(`/api/viagens/${v.idViagem}/iniciar`), 'Viagem iniciada.')) draw(S.get()); } }
              if (a === 'fim') { const ab = alunos.filter((x) => situacao(v, regs, x.idAluno) === 'EMBARCADO').length; let obs; if (ab) { obs = prompt(`${ab} aluno(s) ainda a bordo e serão desembarcados automaticamente. Informe uma observação para encerrar:`); if (!obs) return; } if (await run(() => put(`/api/viagens/${v.idViagem}/finalizar`, obs ? { observacaoFinalizacao: obs } : {}), 'Viagem finalizada.')) draw(S.get()); }
              if (a === 'reg') { if (await run(() => post('/api/registros-transporte/cadastrar', { idAluno: Number(b.dataset.id), idViagem: v.idViagem, tipoRegistro: b.dataset.t }), b.dataset.t === 'EMBARQUE' ? 'Embarque registrado.' : 'Desembarque registrado.')) draw(S.get()); }
            };
          };
          return card(`<div class="split-top"><div><p class="kicker" style="margin-bottom:8px">VIAGEM VG-${v.idViagem}</p><h2 class="display" style="font-size:20px">${esc(v.nomeRota)}</h2></div>${badge(stView(v.status))}</div>${facts([['Data', dmy(v.dataViagem)], ['Horário', hm(v.horaInicio)], ['Ônibus', v.placaOnibus], ['Motorista', v.nomeMotorista]])}`)
            + (v.status === 'PENDENTE' ? botaoIniciar(v) : '')
            + (v.status !== 'PENDENTE' ? `<div class="card"><div style="padding:16px;border-bottom:1px solid var(--border)"><h2 class="section-title">Controle de passageiros</h2><p class="small muted" style="margin-top:4px">Registre embarques e desembarques durante o percurso.</p></div><div class="divide">${alunos.length ? alunos.map((x) => `<div class="passenger"><div class="row" style="gap:12px;flex-wrap:nowrap">${avatar(x.nomeAluno)}<div style="flex:1"><p class="strong" style="font-size:14px">${esc(x.nomeAluno)}</p></div>${badge(rotuloSit[situacao(v, regs, x.idAluno)])}</div>${on ? acoesAluno(situacao(v, regs, x.idAluno), x.idAluno) : ''}</div>`).join('') : empty('Nenhum aluno matriculado.')}</div></div>` : '')
            + (on ? `<button class="btn btn--outline btn--block" style="height:48px" data-a="fim">Encerrar viagem</button>` : '')
            + (v.status === 'FINALIZADA' ? card(`<div class="row text-success" style="gap:8px">${I('circle-check')}<strong>Viagem finalizada</strong></div><p class="muted" style="margin-top:8px;font-size:14px">${esc(v.nomeRota)} · ${dmy(v.dataViagem)} · ${hm(v.horaInicio)}–${hm(v.horaFim)}</p>${v.observacaoFinalizacao ? `<p style="margin-top:8px;font-size:14px">${esc(v.observacaoFinalizacao)}</p>` : ''}`) : '');
        });
        const s = guard('motorista'); if (s) draw(s);
      },
    },
  
    aluno: {
      inicio: () => mobile.page('aluno', 'inicio', 'Início', async (s) => {
        const ms = (await get(`/api/matriculas/aluno/${s.id}`)).filter((m) => m.statusAluno === 'ATIVO'), m = ms[0];
        const topo = `<div class="topo-inicio"><p>${esc(diaSemana())}</p><h1>Olá, ${esc(nomeCurto(s))}</h1></div>`;
        if (!m) return `<div class="inicio">` + topo + card(`<p class="strong" style="font-size:15px">Sem rota por enquanto</p><p class="small muted" style="margin-top:6px">Escolha uma das rotas disponíveis para se vincular e acompanhar horários e viagens.</p>`) + `<a class="btn btn--xl btn--block" href="${url('aluno/minha-rota.html')}">Escolher minha rota ${I('arrow-right')}</a>` + `</div>`;
        const [vs, regs, pontos] = await Promise.all([
          tentar(() => get('/api/viagens/minhas'), []),
          tentar(() => get(`/api/registros-transporte/aluno/${s.id}`), []),
          tentar(() => get(`/api/rotas/${m.idRota}/pontos/listar`), [])]);
        const minhas = vs.filter((v) => ms.some((x) => x.idRota === v.idRota)), hoje = today(), doDia = minhas.filter((v) => v.dataViagem === hoje).sort(porData);
        const foco = doDia.find((v) => v.status === 'EM_ANDAMENTO') || doDia.find((v) => v.status === 'PENDENTE') || doDia[doDia.length - 1] || null;
        const prox = minhas.filter((v) => v.status === 'PENDENTE' && v.dataViagem > hoje).sort(porData)[0] || null;
        const proxTexto = prox ? new Date(prox.dataViagem + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' às ' + hm(prox.horaInicio) : '';
        const meus = foco ? regs.filter((r) => r.status && r.idViagem === foco.idViagem) : [];
        const emb = meus.find((r) => r.tipoRegistro === 'EMBARQUE'), des = meus.find((r) => r.tipoRegistro === 'DESEMBARQUE');
        const sit = foco ? situacao(foco, regs, s.id) : null, lim = foco ? limiteEmbarque(foco) : null;
        const horas = `<div class="hoje__horas"><span>Embarcou <strong>${emb ? horaDe(emb.dataHora) : '—'}</strong></span><span>Desembarcou <strong>${des ? horaDe(des.dataHora) : '—'}</strong></span></div>`;
        const acao = !foco ? '' : sit === 'DESEMBARCADO' ? `<p class="hoje__estado">Viagem concluída</p>${horas}`
          : sit === 'EMBARCADO' ? `${horas}<button class="btn btn--xl btn--block" data-a="aluno-reg" data-t="DESEMBARQUE">Desembarcar</button>`
          : sit === 'AUSENTE' ? `<p class="small muted">O prazo de ${TOLERANCIA_MIN} minutos para embarcar terminou. Se você estava no ônibus, peça ao motorista para registrar o seu embarque.</p>`
          : foco.status === 'EM_ANDAMENTO' ? `<p class="hoje__estado">${lim ? `Embarque aberto, restam <strong id="bp-restante">${mmss(lim - Date.now())}</strong>` : 'Embarque aberto'}</p><button class="btn btn--xl btn--block" data-a="aluno-reg" data-t="EMBARQUE">Embarcar</button>`
          : `<p class="small muted">O embarque abre quando o motorista iniciar a viagem.</p>`;
        mobile.bind = () => {
          clearInterval(mobile.timer);
          document.getElementById('bp-main').onclick = async (e) => {
            const b = e.target.closest('[data-a="aluno-reg"]'); if (!b) return; const embarcar = b.dataset.t === 'EMBARQUE';
            if (!embarcar && !(await confirmModal('Desembarcar?', 'Confirme que você já saiu do ônibus.', 'Desembarcar'))) return;
            if (await run(() => post('/api/registros-transporte/cadastrar', { idAluno: s.id, idViagem: foco.idViagem, tipoRegistro: b.dataset.t }), embarcar ? 'Embarque registrado.' : 'Desembarque registrado.')) mobile.aluno.inicio();
          };
          if (sit === 'AGUARDANDO' && foco && foco.status === 'EM_ANDAMENTO' && lim) {
            mobile.timer = setInterval(() => { const r = lim - Date.now(); if (r <= 0) { clearInterval(mobile.timer); mobile.aluno.inicio(); } else { const el = document.getElementById('bp-restante'); if (el) el.textContent = mmss(r); } }, 1000);
          }
        };
        const cartao = foco ? `<section class="hoje"><div class="hoje__topo"><div><p class="hoje__hora">${hm(foco.horaInicio)}</p><p class="hoje__rota">${esc(foco.nomeRota)}</p></div>${badge(rotuloSit[sit])}</div>${trilha(foco.status)}<p class="hoje__linha">Ônibus ${esc(foco.placaOnibus)} · ${esc(foco.nomeMotorista)}</p>${acao ? `<div class="hoje__acao">${acao}</div>` : ''}</section>`
          : `<section class="hoje"><p class="hoje__vazio">Sem viagem hoje</p><p class="hoje__linha">${prox ? `Próxima viagem: ${esc(proxTexto)}.` : 'Quando a administração agendar uma viagem para a sua rota, ela aparece aqui.'}</p></section>`;
        const lista = [...pontos].sort((x, y) => x.ordem - y.ordem);
        return `<div class="inicio">${topo}${cartao}${foco && prox && (foco.status === 'FINALIZADA' || sit === 'DESEMBARCADO' || sit === 'AUSENTE') ? `<p class="inicio-prox">Próxima viagem: ${esc(proxTexto)}</p>` : ''}${lista.length ? `<details class="pontos"><summary>Pontos de parada (${lista.length})</summary><ol>${lista.map((x) => `<li>${esc(ptOf(x).nomePonto)}<small>${esc(ptOf(x).endereco || '')}</small></li>`).join('')}</ol></details>` : ''}</div>`;
      }),
      matricula: () => mobile.page('aluno', 'matricula', 'Minha matrícula', async (s) => {
        const [ms, m] = await Promise.all([get(`/api/matriculas/aluno/${s.id}`), tentar(() => get(`/api/alunos/listarPorId/${s.id}`), s.me || {})]);
        const ativas = ms.filter((x) => x.statusAluno === 'ATIVO');
        const dados = [['Nome', m.nomeUsuario || s.nome], ['E-mail', m.emailUsuario], ['Número da matrícula', m.matricula], ['Período', m.periodo], ['Situação do cadastro', statusUsr(m.statusUsuario || ms[0]?.statusAluno)]];
        return card(`<div class="profile-head" style="padding-bottom:20px">${avatar(m.nomeUsuario || s.nome, true)}<div><h2 class="display" style="font-size:18px">${esc(m.nomeUsuario || s.nome)}</h2><p class="small muted">Aluno</p></div></div><div class="kv-list" style="margin-top:16px">${dados.map(([a, b]) => `<div class="kv-row"><span class="muted">${a}</span><strong>${esc(b ?? '—')}</strong></div>`).join('')}</div>`)
          + card(`<h2 class="section-title" style="margin-bottom:4px">Rotas vinculadas</h2><p class="small muted">Rotas em que você está matriculado.</p><div class="kv-list" style="margin-top:12px">${ativas.length ? ativas.map((x) => `<div class="kv-row"><span>${esc(x.nomeRota)}</span><span class="small muted">desde ${dmy(x.dataMatricula)}</span></div>`).join('') : '<p class="small muted">Você ainda não está vinculado a nenhuma rota.</p>'}</div>`)
          + `<a class="card card--pad link-card" href="${url('aluno/minha-rota.html')}">${ativas.length ? 'Gerenciar minhas rotas' : 'Escolher minha rota'} ${I('chevron-right')}</a>`;
      }),
      'minha-rota': () => {
        const draw = (s) => mobile.page('aluno', 'minha-rota', 'Minha rota', async () => {
          const [ms, ativas] = await Promise.all([get(`/api/matriculas/aluno/${s.id}`), tentar(() => get('/api/rotas/ativas'), [])]);
          const minhas = ms.filter((m) => m.statusAluno === 'ATIVO'), meusIds = new Set(minhas.map((m) => m.idRota));
          const rotas = await Promise.all(minhas.map((m) => rotaOuBasica(m.idRota, m.nomeRota)));
          const disp = ativas.filter((r) => !meusIds.has(r.idRota));
          mobile.bind = () => {
            document.getElementById('bp-main').onclick = async (e) => {
              const v = e.target.closest('[data-vinc]'), d = e.target.closest('[data-desv]');
              if (v && await confirmModal('Vincular à rota?', `Você será matriculado na rota ${v.dataset.nome}.`, 'Vincular-me') && await run(() => post('/api/matriculas', { idAluno: s.id, idRota: Number(v.dataset.vinc) }), 'Você foi vinculado à rota.')) draw(S.get());
              if (d && await confirmModal('Desvincular da rota?', `Você deixará de fazer parte da rota ${d.dataset.nome}.`, 'Desvincular', true) && await run(() => del(`/api/matriculas/${d.dataset.desv}`), 'Você foi desvinculado da rota.')) draw(S.get());
            };
          };
          let out = '';
          for (const r of rotas) {
            const rp = await tentar(() => get(`/api/rotas/${r.idRota}/pontos/listar`), []), mat = minhas.find((m) => m.idRota === r.idRota);
            out += card(`<div class="split-top"><div><p class="kicker" style="margin-bottom:8px">Rota vinculada</p><h2 class="display" style="font-size:20px">${esc(r.nomeRota)}</h2><p class="muted" style="margin-top:4px;font-size:14px">${esc(r.tipo)}</p></div>${badge(ativo(r.statusRota))}</div>${facts([['Saída', hm(r.horarioInicio)], ['Retorno', hm(r.horarioFim)]])}<button class="btn btn--outline btn--block" style="margin-top:16px" data-desv="${mat.idMatricula}" data-nome="${esc(r.nomeRota)}">Desvincular desta rota</button>`) + stopsHtml([...rp].sort((a, b) => a.ordem - b.ordem), ptOf);
          }
          if (!rotas.length) out += card(`<p class="strong" style="font-size:15px">Você ainda não está vinculado a uma rota</p><p class="small muted" style="margin-top:6px">Escolha uma rota abaixo para se vincular.</p>`);
          out += card(`<h2 class="section-title" style="margin-bottom:4px">Rotas disponíveis</h2><p class="small muted">Vincule-se a uma rota para ver horários, ônibus e viagens.</p><div style="margin-top:16px">${disp.length ? disp.map((r) => `<div class="schedule"><div class="schedule__time">${hm(r.horarioInicio)}</div><div class="grow" style="flex:1"><p class="strong" style="font-size:14px">${esc(r.nomeRota)}</p><p class="small muted">${esc(r.tipo)} · até ${hm(r.horarioFim)}</p></div><button class="btn btn--sm" data-vinc="${r.idRota}" data-nome="${esc(r.nomeRota)}">Vincular-me</button></div>`).join('') : '<p class="small muted">Nenhuma outra rota disponível no momento.</p>'}</div>`);
          return out;
        });
        const s = guard('aluno'); if (s) draw(s);
      },
      horarios: () => mobile.page('aluno', 'horarios', 'Meus horários', async (s) => {
        const { rotas, vs } = await mobile.actx(s), ids = rotas.map((r) => r.idRota);
        const prox = vs.filter((x) => ids.includes(x.idRota) && x.status !== 'FINALIZADA' && x.dataViagem >= today()).sort((a, b) => (a.dataViagem + a.horaInicio).localeCompare(b.dataViagem + b.horaInicio));
        return card(`<h2 class="section-title" style="margin-bottom:4px">Programação</h2><p class="small muted">Horários das suas rotas</p><div style="margin-top:20px">${rotas.length ? rotas.map((r) => `<div class="schedule"><div class="schedule__time">${hm(r.horarioInicio)}</div><div><p class="strong" style="font-size:14px">${esc(r.nomeRota)}</p><p class="small muted">${esc(r.tipo)} · até ${hm(r.horarioFim)}</p></div></div>`).join('') : empty('Sem rotas vinculadas.')}</div>`) + (prox[0] ? card(`<div class="row semibold" style="gap:8px;font-size:14px"><span class="text-primary">${I('calendar-days')}</span> Próxima viagem</div><p class="small muted" style="margin-top:8px">${dmy(prox[0].dataViagem)} · ${hm(prox[0].horaInicio)} · ${esc(prox[0].nomeRota)}</p>`) : '');
      }),
      onibus: () => mobile.page('aluno', 'onibus', 'Meu ônibus', async (s) => {
        const { rotas, vs } = await mobile.actx(s), ids = rotas.map((r) => r.idRota);
        const v = vs.filter((x) => ids.includes(x.idRota) && x.status !== 'FINALIZADA').sort((a, b) => (a.dataViagem + a.horaInicio).localeCompare(b.dataViagem + b.horaInicio))[0];
        if (!v) return empty('Nenhum ônibus programado para as suas rotas.');
        const b = await get(`/api/onibus/${v.idOnibus}`);
        return `<div class="card card--pad-lg"><div class="icon-tile icon-tile--xl" style="margin-bottom:20px">${I('bus-front')}</div><p class="kicker">Próxima viagem</p><h2 class="display" style="margin-top:8px;font-size:24px">${esc(b.placaOnibus)}</h2><div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border)">${[['Capacidade', b.capacidadeOnibus + ' passageiros'], ['Motorista', v.nomeMotorista], ['Rota', v.nomeRota]].map(([a, c]) => `<div class="kv-row" style="padding:8px 0"><span class="muted">${a}</span><strong>${esc(c)}</strong></div>`).join('')}</div></div>`;
      }),
      historico: () => mobile.page('aluno', 'historico', 'Histórico de transporte', async (s) => {
        const regs = (await get(`/api/registros-transporte/aluno/${s.id}`)).sort((a, b) => String(b.dataHora).localeCompare(String(a.dataHora)));
        return `<div class="card"><div style="padding:16px;border-bottom:1px solid var(--border)"><h2 class="section-title">Registros de transporte</h2><p class="small muted" style="margin-top:4px">Seus embarques e desembarques.</p></div><div class="divide">${regs.length ? regs.map((r) => `<div class="list-item" style="padding:16px"><span class="icon-tile">${I('bus-front')}</span><div class="list-item__main"><p class="strong" style="font-size:14px">${esc(r.nomeRota)}</p><p class="small muted">${dmy(r.dataHora)} · ${hm(String(r.dataHora).split('T')[1])} · VG-${r.idViagem}</p></div>${badge(r.status ? (r.tipoRegistro === 'EMBARQUE' ? 'Embarcado' : 'Desembarcado') : 'Invalidado')}</div>`).join('') : empty('Você ainda não tem viagens registradas.')}</div></div>`;
      }),
    },
  };
  
  window.BP = { util: { datasDoLote, situacao },  api, svc /* ALTERAÇÃO: catálogo de endpoints */, access, admin, mobile, R, S, toast };
  if (DEV) document.addEventListener('DOMContentLoaded', () => {
    const r = devSess().role, b = document.createElement('div');
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:76px;z-index:60;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;padding:6px 12px;border-radius:999px;background:var(--navy);color:#fff;font:600 12px var(--font-body, sans-serif);box-shadow:0 4px 16px rgba(0,0,0,.25);max-width:94vw';
    const lk = (k, l) => `<a href="${url(HOME[k])}" style="color:${k === r ? '#7db4ff' : '#fff'};text-decoration:${k === r ? 'underline' : 'none'}">${l}</a>`;
    b.innerHTML = `<span style="opacity:.7">Sem login</span>${lk('admin', 'Admin')}${lk('motorista', 'Motorista')}${lk('aluno', 'Aluno')}<label style="display:flex;gap:4px;align-items:center;opacity:.9">ID<input id="bp-dev-id" type="number" min="1" value="${devSess().id}" style="width:56px;border-radius:6px;border:0;padding:2px 4px"></label>`;
    document.body.appendChild(b);
    document.getElementById('bp-dev-id').onchange = (e) => { localStorage.setItem('bp-dev-id', e.target.value || 1); location.reload(); };
  });
  // aviso vindo de outra página (após salvar)
  document.addEventListener('DOMContentLoaded', () => { const f = sessionStorage.getItem('bp-flash'); if (f) { sessionStorage.removeItem('bp-flash'); setTimeout(() => toast(f), 300); } });
  })();