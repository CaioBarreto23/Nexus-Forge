/* ============================ AUTENTICAÇÃO ============================
   Controle de acesso local (localStorage). NÃO é seguro contra usuários
   técnicos — é um controle organizacional. Senhas guardadas como hash simples. */
const AUTH_KEY='nexus_forge_auth_users', SESSION_KEY='nexus_forge_auth_session';
function _hash(s){ // hash simples (djb2) — evita senha em texto puro, sem pretensão de criptografia forte
  s=String(s||''); let h=5381; for(let i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))>>>0; }
  return 'h'+h.toString(16);
}
/* Valida se o e-mail pertence obrigatoriamente ao domínio @gmail.com */
function isValidGmail(email){
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(String(email||'').trim());
}
const auth={
  _load(){ try{ const r=localStorage.getItem(AUTH_KEY); return r?JSON.parse(r):{users:[]}; }catch(e){ return {users:[]}; } },
  _save(d){ try{ localStorage.setItem(AUTH_KEY,JSON.stringify(d)); return true; }catch(e){ return false; } },
  users(){ return this._load().users; },
  count(){ return this.users().length; },
  find(u){ u=String(u||'').trim().toLowerCase(); return this.users().find(x=>x.user.toLowerCase()===u); },
  create(user,pass,name,role){
    user=String(user||'').trim().toLowerCase();
    if(!user||!pass) return {ok:false,err:'Preencha e-mail e senha.'};
    if(!isValidGmail(user)) return {ok:false,err:'O e-mail deve ser obrigatoriamente do domínio @gmail.com.'};
    if(this.find(user)) return {ok:false,err:'Já existe um usuário com esse e-mail.'};
    const db=this._load();
    const u={id:uid(),user:user,name:(name||'').trim(),pass:_hash(pass),role:role||'user',createdAt:Date.now()};
    db.users.push(u); this._save(db); return {ok:true,user:u};
  },
  verify(user,pass){ const u=this.find(user); if(!u) return null; return u.pass===_hash(pass)?u:null; },
  setRole(id,role){ const db=this._load(); const u=db.users.find(x=>x.id===id); if(u){ u.role=role; this._save(db); } },
  setUser(id,newUser){
    newUser=String(newUser||'').trim().toLowerCase();
    if(!newUser)return {ok:false,err:'Informe o novo e-mail/login.'};
    if(!isValidGmail(newUser))return {ok:false,err:'O e-mail deve ser obrigatoriamente do domínio @gmail.com.'};
    const db=this._load(); const dup=db.users.find(x=>x.id!==id && x.user.toLowerCase()===newUser.toLowerCase());
    if(dup)return {ok:false,err:'Já existe um usuário com esse e-mail/login.'};
    const u=db.users.find(x=>x.id===id); if(!u)return {ok:false,err:'Usuário não encontrado.'};
    u.user=newUser; this._save(db);
    // se o usuário editado for o da sessão atual, atualiza a sessão
    const s=this.session(); if(s&&s.id===id){ this.setSession(Object.assign({},u)); }
    return {ok:true};
  },
  remove(id){ const db=this._load(); db.users=db.users.filter(x=>x.id!==id); this._save(db); },
  // sessão
  session(){ try{ const r=localStorage.getItem(SESSION_KEY); return r?JSON.parse(r):null; }catch(e){ return null; } },
  setSession(u){ try{ localStorage.setItem(SESSION_KEY,JSON.stringify({id:u.id,user:u.user,name:u.name,role:u.role})); }catch(e){} },
  clearSession(){ try{ localStorage.removeItem(SESSION_KEY); }catch(e){} },
  current(){ const s=this.session(); if(!s)return null; const u=this.find(s.user); return u||null; } // revalida contra a base
};
let authMode='login';
function authSwitch(m){
  authMode=m;
  const ind=document.getElementById('tab-indicator');
  const tabL=document.getElementById('tab-login'), tabR=document.getElementById('tab-register');
  const fL=document.getElementById('form-login-content'), fR=document.getElementById('form-register-content');
  const title=document.getElementById('form-title'), sub=document.getElementById('form-subtitle');
  const isFirst=auth.count()===0;
  if(m==='login'){
    ind.style.left='6px'; ind.classList.remove('green');
    tabL.classList.add('active'); tabL.classList.remove('active-green');
    tabR.classList.remove('active','active-green');
    fL.style.display='block'; fR.style.display='none';
    title.textContent='Acesse sua conta';
    sub.textContent='Entre com seu e-mail @gmail.com para continuar.';
  } else {
    ind.style.left='calc(50%)'; ind.classList.add('green');
    tabR.classList.add('active-green'); tabR.classList.remove('active');
    tabL.classList.remove('active','active-green');
    fL.style.display='none'; fR.style.display='block';
    title.textContent=isFirst?'Crie o administrador':'Crie sua conta';
    sub.textContent=isFirst?'Use um e-mail @gmail.com — este primeiro acesso será o administrador.':'Preencha seus dados abaixo com um e-mail @gmail.com.';
  }
  authError('');
}
function authError(msg){
  // mostra o erro no formulário ativo
  const id=(authMode==='signup')?'authErrorReg':'authError';
  ['authError','authErrorReg'].forEach(x=>{ const e=document.getElementById(x); if(e){e.style.display='none';} });
  const e=document.getElementById(id); if(!e)return;
  if(msg){ e.textContent=msg; e.style.display='block'; }
}
function agTogglePass(id,btn){
  const inp=document.getElementById(id); if(!inp)return;
  inp.type = inp.type==='password' ? 'text' : 'password';
}
function authSubmit(){
  const isFirst=auth.count()===0;
  if(authMode==='signup'||isFirst){
    const name=document.getElementById('authName').value.trim();
    const email=document.getElementById('authEmail').value.trim().toLowerCase();
    const pass=document.getElementById('authPassReg').value;
    if(!email||!pass){ authError('Preencha e-mail e senha.'); return; }
    if(!isValidGmail(email)){ authError('Use obrigatoriamente um e-mail válido terminando em @gmail.com.'); return; }
    // o e-mail é usado como login (usuário)
    const role=isFirst?'admin':'user';
    const r=auth.create(email,pass,name,role);
    if(!r.ok){ authError(r.err); return; }
    auth.setSession(r.user); enterApp();
  } else {
    const user=document.getElementById('authUser').value.trim().toLowerCase();
    const pass=document.getElementById('authPass').value;
    if(!user||!pass){ authError('Preencha e-mail e senha.'); return; }
    if(!isValidGmail(user)){ authError('O acesso exige um e-mail válido no formato @gmail.com.'); return; }
    const u=auth.verify(user,pass);
    if(!u){ authError('E-mail ou senha incorretos.'); return; }
    auth.setSession(u); enterApp();
  }
}
function refreshAuthGateUI(){
  const isFirst=auth.count()===0;
  document.getElementById('authFirstMsg').style.display=isFirst?'block':'none';
  // As abas Entrar/Criar conta só existiriam para autocadastro. Como o cadastro público
  // foi desativado, as abas ficam sempre escondidas: no primeiro acesso mostra o cadastro
  // (criar admin), depois mostra apenas o login. Novos usuários são criados pelo admin.
  document.getElementById('authTabs').style.display='none';
  // logos (esquerda + mobile) a partir da logo do hub
  const lg=document.querySelector('.hub-logo img');
  if(lg){ ['authLogoLeft','authLogoMobile'].forEach(id=>{ const el=document.getElementById(id); if(el)el.src=lg.src; }); }
  if(isFirst){ authSwitch('signup'); }
  else { authSwitch('login'); }
  authError('');
}
function showAuthGate(){
  document.getElementById('authGate').classList.remove('hidden');
  document.getElementById('hub').classList.remove('show');
  document.body.classList.remove('hub-open');
  ['authUser','authPass','authName','authEmail','authPassReg'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
  refreshAuthGateUI();
  setTimeout(()=>{ const f=document.getElementById(auth.count()===0?'authName':'authUser'); if(f)f.focus(); },40);
}
function enterApp(){
  document.getElementById('authGate').classList.add('hidden');
  logAccess('login');
  state=freshState();
  goHub();
  updateUserBadge();
  // inicializa o histórico de navegação com a tela inicial (clientes)
  _navReady=true;
  try{ history.replaceState({screen:'clients'},''); }catch(e){}
}
function doLogout(){
  _navReady=false;
  auth.clearSession();
  openProject=null;
  showAuthGate();
}
function updateUserBadge(){
  const cur=auth.current();
  // sincroniza a logo da área de scripts com a logo do hub
  const hubLogo=document.querySelector('.hub-logo img'); const sLogo=document.getElementById('scriptsLogo');
  if(hubLogo&&sLogo&&hubLogo.src) sLogo.src=hubLogo.src;
  // o botão "Usuários" só aparece na tela principal (lista de clientes) e para admins
  const onMainScreen = (typeof openProject==='undefined'||!openProject) && (typeof hubView!=='undefined' && hubView.level==='clients');
  const badge=cur=>{
    if(!cur)return '';
    const initials=(cur.name||cur.user).trim().slice(0,2).toUpperCase();
    const roleLbl=cur.role==='admin'?'Administrador':'Usuário';
    return '<div class="user-badge"><span class="ub-avatar">'+esc(initials)+'</span>'+
      '<span><div>'+esc(cur.name||cur.user)+'</div><div class="ub-role">'+roleLbl+'</div></span></div>';
  };
  // Hub (tela de clientes e projetos): badge + (Usuários só na principal) + Sair
  const hubEl=document.getElementById('userBadge');
  if(hubEl){ hubEl.innerHTML = cur ? (badge(cur)+
    ((cur.role==='admin'&&onMainScreen)?'<button class="btn-logout" style="margin-left:4px" onclick="openUserAdmin()">👥 Usuários</button>':'')+
    '<button class="btn-logout" onclick="doLogout()">Sair</button>') : ''; }
  // Área de scripts: badge + Sair (nunca o botão Usuários)
  const scrEl=document.getElementById('userBadgeScripts');
  if(scrEl){ scrEl.innerHTML = cur ? (badge(cur)+'<button class="btn-logout" onclick="doLogout()">Sair</button>') : ''; }
}
/* Registra acesso/edição no histórico do projeto (quem e quando). */
function logAccess(action,clientId,projId){
  const cur=auth.current(); if(!cur)return;
  if(action==='login')return; // login geral não vai pro histórico de projeto
}
/* Painel do admin: listar, promover/rebaixar e deletar usuários. */
function openUserAdmin(){
  const cur=auth.current();
  if(!cur||cur.role!=='admin'){ uiAlert({title:'Acesso restrito',message:'Apenas administradores podem gerenciar usuários.'}); return; }
  const render=()=>{
    const users=auth.users().slice().sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
    const admins=users.filter(u=>u.role==='admin').length;
    const rows=users.map(u=>{
      const isSelf=u.id===cur.id;
      const initials=(u.name||u.user).trim().slice(0,2).toUpperCase();
      const roleLbl=u.role==='admin'?'Administrador':'Usuário';
      // não deixa rebaixar/remover o último admin
      const lastAdmin=(u.role==='admin'&&admins<=1);
      const toggleBtn = u.role==='admin'
        ? '<button class="ua-btn" '+(lastAdmin?'disabled title="É o único administrador"':'onclick="uaSetRole(\''+u.id+'\',\'user\')"')+'>↓ Tornar usuário</button>'
        : '<button class="ua-btn" onclick="uaSetRole(\''+u.id+'\',\'admin\')">↑ Tornar admin</button>';
      const delBtn = (isSelf||lastAdmin) ? '<button class="ua-btn del" disabled title="'+(isSelf?'Você não pode se remover':'É o único administrador')+'">🗑</button>'
        : '<button class="ua-btn del" onclick="uaRemove(\''+u.id+'\',\''+esc(u.user)+'\')">🗑</button>';
      const editBtn = '<button class="ua-btn" title="Editar e-mail/login" onclick="uaEditUser(\''+u.id+'\',\''+esc(u.user)+'\')">✎ E-mail</button>';
      return '<div class="ua-row">'+
        '<div class="ua-id"><span class="ua-avatar">'+esc(initials)+'</span><span class="ua-main">'+
        '<span class="ua-name">'+esc(u.name||u.user)+(isSelf?' <em>(você)</em>':'')+'</span>'+
        '<span class="ua-user">@'+esc(u.user)+' · '+roleLbl+'</span></span></div>'+
        '<div class="ua-actions">'+editBtn+toggleBtn+delBtn+'</div>'+
      '</div>';
    }).join('');
    return '<div class="useradmin-modal">'+
      '<button class="modal-close" title="Fechar">✕</button>'+
      '<h3>👥 Gerenciar usuários</h3>'+
      '<p class="modal-msg">Promova ou rebaixe o nível de acesso e remova usuários. Todos os logins devem utilizar o formato <b>@gmail.com</b>.</p>'+
      '<div class="ua-list">'+rows+'</div>'+
      '<div class="ua-add"><button class="auth-submit" style="width:auto;padding:9px 16px" onclick="uaNewUser()">+ Novo usuário</button></div>'+
    '</div>';
  };
  const ov=_buildModal(render());
  const modalEl=ov.querySelector('.modal'); if(modalEl) modalEl.classList.add('modal-wide');
  _modalOpen=true;
  window._uaRerender=()=>{ ov.querySelector('.modal').innerHTML=render(); bind(); };
  const done=()=>{ document.removeEventListener('keydown',onKey); window._uaRerender=null; _closeModal(ov); updateUserBadge(); };
  function bind(){ ov.querySelector('.modal-close').onclick=done; }
  bind();
  function onKey(e){ if(e.key==='Escape'){e.preventDefault();done();} }
  document.addEventListener('keydown',onKey);
}
function uaSetRole(id,role){ auth.setRole(id,role); if(window._uaRerender)window._uaRerender(); toast(role==='admin'?'Usuário promovido a admin':'Usuário rebaixado'); }
async function uaEditUser(id,current){
  const novo=await uiPrompt({title:'Editar e-mail/login',message:'Novo e-mail (obrigatoriamente @gmail.com):',value:current,placeholder:'usuario@gmail.com',okLabel:'Salvar'});
  if(novo===null)return;
  const r=auth.setUser(id,novo);
  if(!r.ok){ await uiAlert({title:'Não foi possível alterar',message:r.err}); return; }
  if(window._uaRerender)window._uaRerender(); updateUserBadge(); toast('E-mail/login atualizado');
}
async function uaRemove(id,userName){
  const ok=await uiConfirm({title:'Remover usuário',message:'Remover o usuário "'+userName+'"? Esta ação não pode ser desfeita.',okLabel:'Remover',danger:true});
  if(!ok)return; auth.remove(id); if(window._uaRerender)window._uaRerender(); toast('Usuário removido');
}
async function uaNewUser(){
  const user=await uiPrompt({title:'Novo usuário',message:'E-mail do usuário (obrigatoriamente @gmail.com):',placeholder:'usuario@gmail.com',okLabel:'Continuar'});
  if(!user)return;
  if(!isValidGmail(user)){
    await uiAlert({title:'E-mail inválido',message:'O e-mail do usuário deve terminar obrigatoriamente em @gmail.com.'});
    return;
  }
  const pass=await uiPrompt({title:'Senha',message:'Defina uma senha para "'+user.trim().toLowerCase()+'":',okLabel:'Continuar'});
  if(!pass)return;
  const name=await uiPrompt({title:'Nome completo',message:'Nome completo (opcional):',okLabel:'Criar usuário'});
  const r=auth.create(user,pass,name||'','user');
  if(!r.ok){ await uiAlert({title:'Não foi possível criar',message:r.err}); return; }
  if(window._uaRerender)window._uaRerender(); toast('Usuário criado');
}
/* Mostra o histórico de um projeto (quem criou/editou e quando) + versões restauráveis. */
function showProjectHistory(clientId,projId){
  const c=store.client(clientId); if(!c)return;
  const p=(c.projects||[]).find(x=>x.id===projId); if(!p)return;
  const hist=(p.history||[]).slice().reverse();
  const rows=hist.length? hist.map(h=>{
    const ic=h.action==='criou'?'✨':(h.action==='restaurou versão'?'↩️':'✏️');
    return '<div class="ph-row"><span class="ph-ic">'+ic+'</span><span class="ph-main">'+
      '<span class="ph-who">'+esc(h.by||'desconhecido')+'</span> '+esc(h.action)+' o projeto'+
      '<span class="ph-when">'+fmtDateTime(h.at)+'</span></span></div>';
  }).join('') : '<div class="pv-empty">Sem histórico registrado.</div>';

  // Versões restauráveis (fila de até 4), da mais recente para a mais antiga.
  const versions=(p.versions||[]);
  const topIdx=versions.length-1; // a mais recente da fila = "versão atual" (não restaurável)
  const vrows = versions.length ? versions.map((v,idx)=>idx).reverse().map(idx=>{
    const v=versions[idx];
    const isCurrent=(idx===topIdx); // topo da lista sempre marcado como atual
    const num=idx+1; // nº estável na fila (mais recente = maior)
    const right = isCurrent
      ? '<span class="pv-tag-current">Versão atual</span>'
      : '<button class="pv-restore" data-v="'+idx+'">Restaurar</button>';
    return '<div class="pv-row'+(isCurrent?' is-current':'')+'">'+
      '<span class="pv-badge">v'+num+'</span>'+
      '<span class="pv-main">'+
        '<span class="pv-title">'+esc(v.by||'desconhecido')+'</span>'+
        '<span class="pv-meta">'+fmtDateTime(v.at)+'</span>'+
      '</span>'+right+'</div>';
  }).join('') : '<div class="pv-empty">Nenhuma versão anterior salva ainda. As versões aparecem aqui quando o script é alterado — guardamos as 4 últimas.</div>';

  const ov=_buildModal('<div class="history-modal">'+
    '<button class="modal-close" title="Fechar">✕</button>'+
    '<h3>🕘 Histórico do projeto</h3>'+
    '<p class="modal-msg">Projeto <b>'+esc(p.name||'')+'</b>'+(p.createdBy?' · criado por '+esc(p.createdBy):'')+'</p>'+
    '<div class="ph-section-title">Versões anteriores</div>'+
    '<div class="ph-list">'+vrows+'</div>'+
    '<div class="ph-section-title">Registro de alterações</div>'+
    '<div class="ph-list">'+rows+'</div>'+
  '</div>');
  _modalOpen=true;
  const done=()=>{ document.removeEventListener('keydown',onKey); _closeModal(ov); };
  ov.querySelector('.modal-close').onclick=done;
  // botões de restaurar
  ov.querySelectorAll('.pv-restore').forEach(function(btn){
    btn.onclick=async function(){
      const vIdx=+btn.getAttribute('data-v');
      const ok=await uiConfirm({title:'Restaurar versão',message:'Isso vai substituir o conteúdo atual do projeto pela versão selecionada. O estado atual será guardado como uma nova versão, então você pode voltar atrás. Deseja continuar?',okLabel:'Restaurar'});
      if(!ok)return;
      const restored=store.restoreVersion(clientId,projId,vIdx);
      if(!restored){ toast('Não foi possível restaurar'); return; }
      // se o projeto restaurado for o que está aberto, recarrega o estado em tela
      if(openProject&&openProject.clientId===clientId&&openProject.projId===projId){
        state=clone(restored); if(typeof render==='function')render();
      }
      done();
      renderHub&&renderHub();
      toast('Versão restaurada');
    };
  });
  function onKey(e){ if(e.key==='Escape'){e.preventDefault();done();} }
  document.addEventListener('keydown',onKey);
}
/* Formata data+hora para o histórico. */
function fmtDateTime(ts){ if(!ts)return''; const d=new Date(ts);
  return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }