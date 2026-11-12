/* ===================== HUB DE CLIENTES =====================
   Camada de dados isolada em `store`: hoje usa localStorage; para plugar um
   backend compartilhado depois, basta trocar o corpo destes métodos por
   chamadas a uma API (a assinatura pode continuar a mesma). */
const DB_KEY='gerador_clientes_v1';
/* Retorna o identificador do usuário logado (para o histórico dos projetos). */
function _whoNow(){ try{ const r=localStorage.getItem('nexus_forge_auth_session'); if(!r)return 'desconhecido'; const s=JSON.parse(r); return s.name||s.user||'desconhecido'; }catch(e){ return 'desconhecido'; } }
const store={
  _load(){ try{ const raw=localStorage.getItem(DB_KEY); return raw?JSON.parse(raw):{clients:[]}; }catch(e){ return {clients:[]}; } },
  _save(db){ try{ localStorage.setItem(DB_KEY,JSON.stringify(db)); return true; }catch(e){ uiAlert({title:'Não foi possível salvar',message:'O armazenamento do navegador pode estar cheio ou bloqueado.'}); return false; } },
  all(){ return this._load().clients; },
  client(id){ return this._load().clients.find(c=>c.id===id)||null; },
  addClient(name){ const db=this._load(); const c={id:uid(),name:name||'Novo cliente',contact:'',notes:'',projects:[]}; db.clients.push(c); this._save(db); return c; },
  updateClient(id,patch){ const db=this._load(); const c=db.clients.find(x=>x.id===id); if(!c)return; Object.assign(c,patch); this._save(db); },
  delClient(id){ const db=this._load(); db.clients=db.clients.filter(c=>c.id!==id); this._save(db); },
  addProject(clientId,name,st){ const db=this._load(); const c=db.clients.find(x=>x.id===clientId); if(!c)return null;
    const who=_whoNow();
    const p={id:uid(),name:name||'Novo projeto',updatedAt:Date.now(),state:st,
      createdBy:who,history:[{action:'criou',by:who,at:Date.now()}]}; c.projects.push(p); this._save(db); return p; },
  updateProject(clientId,projId,patch){ const db=this._load(); const c=db.clients.find(x=>x.id===clientId); if(!c)return; const p=c.projects.find(x=>x.id===projId); if(!p)return;
    const hasState = patch && Object.prototype.hasOwnProperty.call(patch,'state');
    // Só conta como alteração se o conteúdo do state REALMENTE mudou.
    // Apenas visualizar/abrir/fechar o projeto não altera o histórico.
    let realChange=false, prevState=null;
    if(hasState){
      try{ realChange = JSON.stringify(p.state) !== JSON.stringify(patch.state); }
      catch(e){ realChange = true; }
      if(realChange) prevState = p.state; // snapshot do conteúdo ANTERIOR à mudança
    }
    Object.assign(p,patch);
    if(!hasState || realChange){ p.updatedAt=Date.now(); }
    if(hasState && realChange){
      // fila de versões (máx. 4): guarda o estado anterior para permitir voltar
      if(!Array.isArray(p.versions)) p.versions=[];
      const who=_whoNow();
      if(prevState!=null){
        p.versions.push({state:clone(prevState),by:who,at:Date.now()});
        while(p.versions.length>4) p.versions.shift(); // remove a mais antiga (FIFO)
      }
      // histórico textual (quem/quando)
      if(!p.history)p.history=[];
      const last=p.history[p.history.length-1];
      if(last&&last.action==='editou'&&last.by===who&&(Date.now()-last.at)<300000){ last.at=Date.now(); }
      else { p.history.push({action:'editou',by:who,at:Date.now()}); }
      if(p.history.length>50)p.history=p.history.slice(-50);
    }
    this._save(db); },
  /* Restaura o projeto para uma versão anterior (índice na fila p.versions).
     A versão restaurada é aplicada como novo estado; o estado atual (pré-restauração)
     entra na fila como uma nova versão, para que a ação também seja reversível. */
  restoreVersion(clientId,projId,vIdx){ const db=this._load(); const c=db.clients.find(x=>x.id===clientId); if(!c)return null; const p=c.projects.find(x=>x.id===projId); if(!p)return null;
    if(!Array.isArray(p.versions)||vIdx<0||vIdx>=p.versions.length)return null;
    // a versão mais recente da fila é a "atual" e não pode ser restaurada
    if(vIdx===p.versions.length-1)return null;
    const target=p.versions[vIdx];
    const who=_whoNow();
    // guarda o estado atual como versão antes de sobrescrever
    if(!Array.isArray(p.versions))p.versions=[];
    p.versions.push({state:clone(p.state),by:who,at:Date.now()});
    // remove a versão restaurada da fila (ela vira o estado corrente)
    p.versions.splice(vIdx,1);
    while(p.versions.length>4)p.versions.shift();
    p.state=clone(target.state); p.updatedAt=Date.now();
    if(!p.history)p.history=[];
    p.history.push({action:'restaurou versão',by:who,at:Date.now()});
    if(p.history.length>50)p.history=p.history.slice(-50);
    this._save(db); return clone(p.state); },
  delProject(clientId,projId){ const db=this._load(); const c=db.clients.find(x=>x.id===clientId); if(!c)return; c.projects=c.projects.filter(p=>p.id!==projId); this._save(db); },
  replaceAll(db){ if(!db||!Array.isArray(db.clients)) throw new Error('formato inválido'); this._save(db); },
  /* Mescla os projetos de srcProjects[] dentro do cliente destId.
     Projetos cujo nome já existe entram com sufixo "(importado)". Retorna nº importados. */
  mergeProjectsInto(destId,srcProjects){
    const db=this._load(); const c=db.clients.find(x=>x.id===destId); if(!c)return 0;
    let n=0;
    (srcProjects||[]).forEach(sp=>{
      if(!sp||typeof sp!=='object'||!sp.state)return;
      const existing=new Set(c.projects.map(p=>p.name));
      let name=sp.name||'Projeto importado';
      if(existing.has(name)){
        let base=name+' (importado)', cand=base, i=2;
        while(existing.has(cand)){ cand=base+' '+i; i++; }
        name=cand;
      }
      c.projects.push({id:uid(),name:name,updatedAt:Date.now(),state:sp.state});
      n++;
    });
    this._save(db); return n;
  }
};
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}