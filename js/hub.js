let hubView={level:'clients',clientId:null}; // 'clients' | 'client'
let openProject=null;

let clientQuery='', projectQuery='';

/* Ícones SVG reutilizáveis (estilo Lucide) */
const ICONS={
  folder:`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  terminal:`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  search:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  copy:`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  history:`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  trash:`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  users:`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  layers:`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  award:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
  shieldCheck:`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
  alertTriangle:`<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  user:`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  refresh:`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  download:`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload:`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`
};

function goHub(){
  if(openProject){ store.updateProject(openProject.clientId,openProject.projId,{state:clone(state)}); }
  openProject=null; updateOpenProjLabel(); clientQuery=''; projectQuery='';
  document.getElementById('hub').classList.add('show'); document.body.classList.add('hub-open'); renderHub();
}
function logoHome(){
  if(!auth.current()) return;
  if(openProject){ store.updateProject(openProject.clientId,openProject.projId,{state:clone(state)}); }
  openProject=null; updateOpenProjLabel(); clientQuery=''; projectQuery='';
  hubView={level:'clients',clientId:null};
  document.getElementById('hub').classList.add('show'); document.body.classList.add('hub-open');
  renderHub(); navPush();
}
function goProjects(){
  const backTo = openProject ? openProject.clientId : null;
  if(openProject){ store.updateProject(openProject.clientId,openProject.projId,{state:clone(state)}); }
  openProject=null; updateOpenProjLabel(); projectQuery='';
  if(backTo && store.client(backTo)) hubView={level:'client',clientId:backTo};
  else hubView={level:'clients',clientId:null};
  document.getElementById('hub').classList.add('show'); document.body.classList.add('hub-open'); renderHub();
}
function hideHub(){ document.getElementById('hub').classList.remove('show'); document.body.classList.remove('hub-open'); }

function modeLabel(st){
  st=st||{};
  if(st.mode==='exos')return'EXOS'; if(st.mode==='ruckus')return'Ruckus'; if(st.mode==='fabric')return'Fabric';
  return 'Ansible';
}
function brandCounts(projects){
  const map={};
  (projects||[]).forEach(p=>{ const l=modeLabel(p.state||{}); map[l]=(map[l]||0)+1; });
  return Object.keys(map).map(k=>({label:k,n:map[k]})).sort((a,b)=>b.n-a.n||a.label.localeCompare(b.label));
}
function brandCountsText(projects){
  const bc=brandCounts(projects);
  if(!bc.length) return '';
  return bc.map(b=>b.n+' '+b.label).join(' · ');
}
function fmtDate(ts){ if(!ts)return''; const d=new Date(ts); return d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR').slice(0,5); }

function clientCardHTML(c){
  const countLbl = c.projects.length+' '+(c.projects.length===1?'projeto':'projetos');
  return `
      <div class="folder" onclick="openClient('${c.id}')">
        <div class="folder-top">
          <div class="folder-icon">${ICONS.folder}</div>
          <div class="folder-tools">
            <button title="Renomear cliente" onclick="event.stopPropagation();renameClient('${c.id}')">${ICONS.edit}</button>
            <button class="del" title="Excluir cliente" onclick="event.stopPropagation();removeClient('${c.id}')">${ICONS.trash}</button>
          </div>
        </div>
        <div class="folder-name">${esc(c.name)}</div>
        <div class="folder-meta">
          <span>${countLbl}</span>
          ${c.contact?`<span class="folder-contact">${ICONS.user} ${esc(c.contact)}</span>`:''}
        </div>
        ${c.projects.length?`<div class="folder-brands">${esc(brandCountsText(c.projects))}</div>`:''}
      </div>`;
}

function projectCardHTML(clientId,p){
  const mLabel = modeLabel(p.state);
  const mClass = brandClass(mLabel);
  return `
      <div class="folder project" onclick="openProjectById('${clientId}','${p.id}')">
        <div class="folder-top">
          <div class="folder-icon">${ICONS.terminal}</div>
          <div class="folder-tools">
            <button title="Histórico de versões" onclick="event.stopPropagation();showProjectHistory('${clientId}','${p.id}')">${ICONS.history}</button>
            <button title="Renomear projeto" onclick="event.stopPropagation();renameProject('${clientId}','${p.id}')">${ICONS.edit}</button>
            <button title="Duplicar projeto" onclick="event.stopPropagation();duplicateProject('${clientId}','${p.id}')">${ICONS.copy}</button>
            <button class="del" title="Excluir projeto" onclick="event.stopPropagation();removeProject('${clientId}','${p.id}')">${ICONS.trash}</button>
          </div>
        </div>
        <div class="folder-name">${esc(p.name)}</div>
        <div class="folder-meta">
          <div><span class="tag-mode ${mClass}">${esc(mLabel)}</span></div>
          <span style="font-size:11.5px;color:#64748B;margin-top:4px">Atualizado em ${fmtDate(p.updatedAt)}</span>
        </div>
      </div>`;
}

function searchBarHTML(kind,value,placeholder){
  const sugg = kind==='clients' ? '<div class="search-suggest" id="searchSuggest_clients" style="display:none"></div>' : '';
  return `<div class="hub-search${value?' has-text':''}" id="searchWrap_${kind}">
      <span class="search-ic">${ICONS.search}</span>
      <input type="text" id="search_${kind}" placeholder="${placeholder}" value="${esc(value)}" autocomplete="off"
        oninput="${kind==='clients'?'onClientSearch':'onProjectSearch'}(this.value)"${kind==='clients'?' onblur="setTimeout(function(){var b=document.getElementById(\'searchSuggest_clients\');if(b)b.style.display=\'none\';},150)" onfocus="if(this.value)onClientSearch(this.value)"':''}>
      <button class="search-clear" title="Limpar busca" onclick="${kind==='clients'?'clearClientSearch':'clearProjectSearch'}()">✕</button>
      ${sugg}
    </div>`;
}

function brandClass(label){
  const l=(label||'').toLowerCase();
  if(l==='exos')return'exos'; if(l==='ruckus')return'ruckus'; if(l==='fabric')return'fabric';
  return 'ansible';
}
function brandColor(label){
  const c=brandClass(label);
  return c==='exos'?'#7C3AED':c==='ruckus'?'#F59E0B':c==='fabric'?'#10B981':'#E5484D';
}

function pieSVG(bc,total){
  const size=136, cx=size/2, cy=size/2, r=54, rin=36, C=2*Math.PI*r;
  if(!total){ return ''; }
  if(bc.length===1){
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Distribuição por marca">
      <circle cx="${cx}" cy="${cy}" r="${(r+rin)/2}" fill="none" stroke="${brandColor(bc[0].label)}" stroke-width="${r-rin}"></circle>
      <text x="${cx}" y="${cy}" text-anchor="middle" font-size="22" font-weight="800" fill="#F8FAFC">${total}</text>
      <text x="${cx}" y="${cy+15}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748B">${total===1?'PROJETO':'PROJETOS'}</text>
    </svg>`;
  }
  let acc=0, segs='';
  bc.forEach(b=>{
    const frac=b.n/total, len=frac*C, gap=C-len;
    const off=C*0.25 - acc*C;
    segs+=`<circle cx="${cx}" cy="${cy}" r="${(r+rin)/2}" fill="none" stroke="${brandColor(b.label)}" stroke-width="${r-rin}"
      stroke-dasharray="${len.toFixed(2)} ${gap.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})"></circle>`;
    acc+=frac;
  });
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Distribuição por marca">
      ${segs}
      <text x="${cx}" y="${cy}" text-anchor="middle" font-size="22" font-weight="800" fill="#F8FAFC">${total}</text>
      <text x="${cx}" y="${cy+15}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748B">${total===1?'PROJETO':'PROJETOS'}</text>
    </svg>`;
}

function dashboardHTML(clients){
  const totalClients=clients.length;
  const allProjects=clients.reduce((acc,c)=>acc.concat(c.projects||[]),[]);
  const totalProjects=allProjects.length;
  const bc=brandCounts(allProjects);
  const chips=bc.length
    ? bc.map(b=>{
        const pct=totalProjects?Math.round((b.n/totalProjects)*100):0;
        return `<div class="brand-chip ${brandClass(b.label)}"><span class="bc-dot"></span><b>${b.n}</b> <span>${esc(b.label)}</span><span class="bc-pct">${pct}%</span></div>`;
      }).join('')
    : '<span style="color:var(--muted);font-size:13px">Nenhum projeto cadastrado ainda.</span>';
  const chart = totalProjects ? `<div class="dash-pie">${pieSVG(bc,totalProjects)}</div>` : '';
  return `<div class="dash">
      <div class="dash-stats-col">
        <div class="dash-card mini">
          <div class="kpi-info">
            <div class="dash-lbl">${totalClients===1?'Cliente ativo':'Clientes ativos'}</div>
            <div class="dash-num">${totalClients}</div>
          </div>
          <div class="kpi-icon purple">${ICONS.users}</div>
        </div>
        <div class="dash-card mini">
          <div class="kpi-info">
            <div class="dash-lbl">${totalProjects===1?'Projeto criado':'Projetos criados'}</div>
            <div class="dash-num">${totalProjects}</div>
          </div>
          <div class="kpi-icon emerald">${ICONS.layers}</div>
        </div>
      </div>
      <div class="dash-card brands">
        <div class="dash-card-head">
          <div class="dash-lbl-top">Distribuição por Tecnologia</div>
        </div>
        <div class="dash-brands-row">${chart}<div class="brand-chips">${chips}</div></div>
      </div>
    </div>
    ${dashLowerHTML(clients,allProjects)}`;
}

function dashLowerHTML(clients,allProjects){
  if(!allProjects.length) return '';

  const ranked=clients.map(c=>({id:c.id,name:c.name,n:(c.projects||[]).length}))
    .filter(x=>x.n>0).sort((a,b)=>b.n-a.n).slice(0,3);
  const maxN = ranked.length ? ranked[0].n : 1;
  const podiumCards=ranked.map((x,i)=>{
    const pct = Math.max(12, Math.round((x.n / maxN) * 100));
    return `<button class="podium-card pos${i+1}" onclick="openClient('${x.id}')">
        <div class="pod-rank">#${i+1}</div>
        <div class="pod-main">
          <div class="pod-name">${esc(x.name)}</div>
          <div class="pod-bar-wrap"><div class="pod-bar" style="width:${pct}%"></div></div>
        </div>
        <div class="pod-right">
          <span class="pod-n">${x.n}</span>
          <span class="pod-lbl">${x.n===1?'proj':'projs'}</span>
        </div>
      </button>`;
  }).join('');

  const alerts=[];
  clients.forEach(c=>(c.projects||[]).forEach(p=>{
    try{
      const issues=analyzeProject(migrateState(clone(p.state||{})));
      issues.forEach(it=>alerts.push({clientId:c.id,projId:p.id,client:c.name,proj:p.name||'Projeto',type:it.type,msg:it.msg}));
    }catch(e){}
  }));

  const alertRows=alerts.length? alerts.slice(0,40).map(a=>{
    return `<button class="alert-item" onclick="openProjectById('${a.clientId}','${a.projId}')">
        <span class="al-ic">${ICONS.alertTriangle}</span>
        <span class="al-main"><span class="al-msg">${esc(a.msg)}</span>
        <span class="al-sub">${esc(a.client)} · ${esc(a.proj)}</span></span>
      </button>`;
  }).join('')
  : `<div class="alert-ok"><span class="ok-ic">${ICONS.shieldCheck}</span><span>Todas as validações preliminares estão em conformidade.</span></div>`;

  return `<div class="dash-lower">
      <div class="dash-panel">
        <div class="dash-lbl-top"><span class="panel-ic">${ICONS.award}</span> Principais Clientes</div>
        <div class="podium">${podiumCards||'<span style="color:var(--muted);font-size:12.5px">Sem projetos ainda</span>'}</div>
      </div>
      <div class="dash-panel">
        <div class="dash-lbl-top"><span class="panel-ic emerald">${ICONS.shieldCheck}</span> Auditoria de Conferência${alerts.length?(' <span class="al-count">'+alerts.length+'</span>'):''}</div>
        <div class="alert-list">${alertRows}</div>
        <div class="alert-foot">Inspeção automática de VLANs, portas, IPs duplicados e ordem de execução nos scripts salvos.</div>
      </div>
    </div>`;
}

function analyzeProject(st){
  st=st||{};
  const mode=st.mode||'exos';
  let cmds=[];
  if(mode==='ansible'){ cmds=(st.net&&st.net.cmds)||[]; }
  else { const slice=(mode==='exos')?st.cli&&st.cli.exos:(mode==='ruckus')?st.cli&&st.cli.ruckus:st.cli&&st.cli.fabric; cmds=(slice&&slice.cmds)||[]; }
  const g=(c,k)=>((c&&c[k])!=null?String(c[k]).trim():'');
  const created={};
  const createdAt={};
  const usedAt={};
  const usedInPort={};
  const portUntagged={};
  const ipSeen={};
  let seq=0;
  const addUsed=(tag,port,idx)=>{ if(!tag)return; if(!usedInPort[tag])usedInPort[tag]=[]; if(usedInPort[tag].indexOf(port||'?')<0)usedInPort[tag].push(port||'?'); if(usedAt[tag]==null)usedAt[tag]=idx; };
  const markCreated=(t,idx)=>{ t=String(t||'').trim(); if(t){ created[t]=true; if(createdAt[t]==null)createdAt[t]=idx; } };
  const untaggedModes={untagged:1,access:1,native:1,'':1};
  const addPortVlan=(port,tag,md,idx)=>{
    if(!port||!tag)return;
    addUsed(tag,port,idx);
    if(untaggedModes[md]!==undefined){ if(!portUntagged[port])portUntagged[port]=new Set(); portUntagged[port].add(tag); }
  };
  const addIp=(ip,ctx)=>{ ip=(ip||'').split('/')[0].trim(); if(!ip)return; if(!ipSeen[ip])ipSeen[ip]=[]; if(ipSeen[ip].indexOf(ctx)<0)ipSeen[ip].push(ctx); };

  const validIp=ip=>{ const o=String(ip||'').split('.'); return o.length===4 && o.every(x=>/^\d+$/.test(x)&&+x>=0&&+x<=255); };
  const validPfx=p=>{ p=String(p||'').replace('/',''); return /^\d+$/.test(p)&&+p>=0&&+p<=32; };
  const validVlanId=t=>{ return /^\d+$/.test(String(t))&&+t>=1&&+t<=4094; };

  const issues=[];
  const required={ vlan_create:['tag'], vlan_ports:['tag','ports'], svi_ip:['tag'], vint:['tag'],
    static_route:['dest','nexthop'], user_create:['user'], speed:['ports'], port_desc:['ports'],
    icx_register:['ip'], dns:['server'], ntp:['server'], hostname:['name'] };
  const fieldLbl={tag:'VLAN/tag',ports:'portas',dest:'destino',nexthop:'next-hop',user:'usuário',
    ip:'IP',server:'servidor',name:'nome'};

  cmds.forEach(c=>{
    const k=c.kind; const idx=seq++;
    if(required[k]){ required[k].forEach(f=>{ if(!g(c,f)){ issues.push({type:'field',msg:'Comando "'+(NET_KINDS[k]?NET_KINDS[k].label:k)+'" com campo obrigatório vazio: '+(fieldLbl[f]||f)}); } }); }
    if(k==='vlan_create'){
      const t=g(c,'tag'); markCreated(t,idx);
      if(t&&!validVlanId(t)) issues.push({type:'value',msg:'VLAN '+t+' fora da faixa válida (1–4094)'});
      (c.extra||[]).forEach(e=>{ if(e&&e.tag){ markCreated(e.tag,idx); if(!validVlanId(e.tag))issues.push({type:'value',msg:'VLAN '+e.tag+' fora da faixa válida (1–4094)'}); } });
    }
    else if(k==='vlan_ports'){ const t=g(c,'tag'); addPortVlan(g(c,'ports'),t,g(c,'mode'),idx); if(t&&!validVlanId(t))issues.push({type:'value',msg:'VLAN '+t+' fora da faixa válida (1–4094)'}); }
    else if(k==='svi_ip'||k==='vint'){
      const cidr=(g(c,'ipmask')||g(c,'ip')); addIp(cidr,'VLAN '+g(c,'tag'));
      const ip=cidr.split('/')[0].trim(), pfx=cidr.split('/')[1];
      if(ip&&!validIp(ip)) issues.push({type:'value',msg:'IP inválido em VLAN '+g(c,'tag')+': '+ip});
      if(pfx!=null&&pfx!==''&&!validPfx(pfx)) issues.push({type:'value',msg:'Prefixo de máscara inválido em VLAN '+g(c,'tag')+': /'+pfx});
    }
    else if(k==='static_route'){
      const d=g(c,'dest'), nh=g(c,'nexthop');
      const dip=d.split('/')[0], dpfx=d.split('/')[1];
      if(dip&&!validIp(dip)) issues.push({type:'value',msg:'Destino de rota inválido: '+d});
      if(dpfx!=null&&dpfx!==''&&!validPfx(dpfx)) issues.push({type:'value',msg:'Prefixo de rota inválido: '+d});
      if(nh&&!validIp(nh)) issues.push({type:'value',msg:'Next-hop de rota inválido: '+nh});
    }
    else if(k==='raw'){ lines(g(c,'cmds')).forEach(function(ln){ scanRawForAnalysis(ln,{markCreated:function(t){markCreated(t,idx);},addPortVlan:function(p,t,m){addPortVlan(p,t,m,idx);},addIp:addIp}); }); }
  });

  Object.keys(usedInPort).forEach(tag=>{
    if(!created[tag]){
      const ports=usedInPort[tag].slice(0,3).join(', ')+(usedInPort[tag].length>3?'…':'');
      issues.push({type:'vlan',msg:'VLAN '+tag+' usada na(s) porta(s) '+ports+' mas não foi criada'});
    }
  });
  Object.keys(usedAt).forEach(tag=>{
    if(created[tag] && createdAt[tag]!=null && usedAt[tag]<createdAt[tag]){
      issues.push({type:'order',msg:'VLAN '+tag+' é usada em porta antes de ser criada no script (ajuste a ordem)'});
    }
  });
  Object.keys(portUntagged).forEach(port=>{
    const set=portUntagged[port];
    if(set.size>1){ issues.push({type:'port',msg:'Porta '+port+' com VLANs de acesso/untagged conflitantes ('+[...set].join(', ')+')'}); }
  });
  Object.keys(ipSeen).forEach(ip=>{
    if(ipSeen[ip].length>1){ issues.push({type:'ip',msg:'IP '+ip+' repetido em '+ipSeen[ip].join(' e ')}); }
  });
  return issues;
}

function scanRawForAnalysis(line,ctx){
  let s=String(line||'').trim().replace(/^[!#]\s?/,'').trim(); if(!s)return;
  let m;
  if(m=s.match(/^create vlan\s+\S+\s+tag\s+(\d+)/i)){ ctx.markCreated(m[1]); return; }
  if(m=s.match(/^vlan\s+(\d+)\b/i)){ ctx.markCreated(m[1]); }
  if(m=s.match(/^vlan create\s+(\d+)/i)){ ctx.markCreated(m[1]); return; }
  if(m=s.match(/^interface ve\s+(\d+).*?ip address\s+(\d+\.\d+\.\d+\.\d+)/i)){ ctx.addIp(m[2],'ve '+m[1]); return; }
  if(m=s.match(/^configure vlan\s+(\S+)\s+ipaddress\s+(\d+\.\d+\.\d+\.\d+)/i)){ ctx.addIp(m[2],'VLAN '+m[1]); return; }
  if(m=s.match(/^interface vlan\s+(\d+).*?ip address\s+(\d+\.\d+\.\d+\.\d+)/i)){ ctx.addIp(m[2],'VLAN '+m[1]); return; }
  if(m=s.match(/^configure vlan\s+(\S+)\s+add ports\s+(.+?)\s+(untagged|tagged)/i)){ ctx.addPortVlan(m[2].trim(),m[1],m[3].toLowerCase()); return; }
  if(m=s.match(/^(tagged|untagged)\s+eth(?:e|ernet)?\s+(.+)$/i)){ return; }
  if(m=s.match(/^vlan members add\s+(\d+)\s+(.+)$/i)){ ctx.addPortVlan(m[2].trim(),m[1],'untagged'); return; }
}

function renderHub(){
  const body=document.getElementById('hubBody');
  const backupActs=document.getElementById('hubBackupActions'); if(backupActs)backupActs.style.display=(hubView.level==='clients')?'flex':'none';
  updateUserBadge();
  if(hubView.level==='clients'){
    const clients=store.all();
    const filtered=filterClients(clients,clientQuery);
    const cards=filtered.map(clientCardHTML).join('');
    body.innerHTML=`
      ${clients.length?`<div class="hub-topbar">
        ${searchBarHTML('clients',clientQuery,'Pesquisar cliente por nome ou contato…')}
        <button class="btn-primary hub-newclient" onclick="createClient()">+ Novo cliente</button>
      </div>`:''}
      ${clients.length?dashboardHTML(clients):''}
      <div class="section-head"><h2>Workspaces de Clientes (${filtered.length})</h2></div>
      <div class="hub-grid" id="clientsGrid">
        <div class="folder new-card" onclick="createClient()">
          <div class="big-plus">+</div><div class="np-label">Novo cliente</div>
        </div>
        ${cards|| ''}
      </div>
      ${clientsEmptyHTML(clients.length,filtered.length,clientQuery)}`;
    focusSearch('clients');
  } else {
    const c=store.client(hubView.clientId);
    if(!c){ hubView={level:'clients',clientId:null}; return renderHub(); }
    const sorted=c.projects.slice().sort((a,b)=>b.updatedAt-a.updatedAt);
    const filtered=filterProjects(sorted,projectQuery);
    const projs=filtered.map(p=>projectCardHTML(c.id,p)).join('');
    body.innerHTML=`
      <div class="client-nav">
        <button class="back-link" onclick="backToClients()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Clientes
        </button>
        <span class="crumb-sep">/</span>
        <span class="crumb-cur">Workspace do Cliente</span>
      </div>

      <div class="client-header-card">
        <div class="client-title-row">
          <div class="client-title-ic">${ICONS.folder}</div>
          <div>
            <h1 class="client-title" id="clientTitle"><span id="clientTitleName">${esc(c.name)}</span></h1>
            <div class="client-sub">${c.projects.length} ${c.projects.length===1?'projeto configurado':'projetos configurados'} neste workspace</div>
          </div>
        </div>
        <div class="client-info">
          <div class="grid2">
            <div><label>Nome do cliente</label><input type="text" value="${esc(c.name)}" oninput="editClient('${c.id}','name',this.value)"></div>
            <div><label>Contato / Responsável</label><input type="text" placeholder="e-mail, telefone ou analista responsável" value="${esc(c.contact||'')}" oninput="editClient('${c.id}','contact',this.value)"></div>
          </div>
          <div style="margin-top:14px"><label>Notas &amp; Observações da Infraestrutura</label><textarea placeholder="Informações da topologia, faixas de gerência, janelas de manutenção ou observações da implementação…" oninput="editClient('${c.id}','notes',this.value)">${esc(c.notes||'')}</textarea></div>
        </div>
      </div>

      <div class="section-head">
        <h2>Projetos &amp; Scripts (${filtered.length})</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-ghost" onclick="openLegacyTranslate()" title="Gerar um prompt para traduzir um running-config de qualquer fabricante via IA">${ICONS.refresh} Traduzir legado</button>
          <button class="btn-ghost" onclick="exportClient('${c.id}')">${ICONS.download} Exportar cliente</button>
          <button class="btn-ghost" onclick="document.getElementById('clientimp').click()">${ICONS.upload} Importar projetos</button>
          <input type="file" id="clientimp" accept=".json,.txt,.yml,.yaml" style="display:none" onchange="importClientProjects(event,'${c.id}')">
        </div>
      </div>

      ${c.projects.length?`<div class="client-filter-bar">
        ${searchBarHTML('projects',projectQuery,'Pesquisar projeto por nome…')}
        <div class="brand-chips">${brandCounts(c.projects).map(b=>'<span class="brand-chip '+brandClass(b.label)+'"><span class="bc-dot"></span><b>'+b.n+'</b> '+esc(b.label)+'</span>').join('')}</div>
      </div>`:''}

      <div class="hub-grid" id="projectsGrid">
        <div class="folder new-card" onclick="newProjectForClient('${c.id}')">
          <div class="big-plus">+</div><div class="np-label">Novo projeto</div>
        </div>
        ${projs||''}
      </div>
      ${projectsEmptyHTML(c.projects.length,filtered.length,projectQuery)}`;
    focusSearch('projects');
  }
}

/* --- Busca: estado, filtros e handlers --- */
function norm(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function filterClients(list,q){ q=norm(q).trim(); if(!q)return list; return list.filter(c=>norm(c.name).includes(q)||norm(c.contact).includes(q)); }
function filterProjects(list,q){ q=norm(q).trim(); if(!q)return list; return list.filter(p=>norm(p.name).includes(q)); }
function clientsEmptyHTML(total,shown,q){
  if(total===0) return '<div class="hub-empty" id="emptyMsg_clients" style="margin-top:16px">Nenhum cliente cadastrado ainda. Clique em "+ Novo cliente" para criar o primeiro workspace.</div>';
  if(shown===0) return '<div class="hub-empty" id="emptyMsg_clients" style="margin-top:16px">Nenhum cliente encontrado para «'+esc(q)+'».</div>';
  return '';
}
function projectsEmptyHTML(total,shown,q){
  if(total===0) return '<div class="hub-empty" id="emptyMsg_projects" style="margin-top:16px">Nenhum projeto salvo para este cliente. Clique em "+ Novo projeto" para iniciar um script.</div>';
  if(shown===0) return '<div class="hub-empty" id="emptyMsg_projects" style="margin-top:16px">Nenhum projeto encontrado para «'+esc(q)+'».</div>';
  return '';
}

function refreshClientCards(){
  const grid=document.getElementById('clientsGrid'); if(!grid)return;
  const filtered=filterClients(store.all(),clientQuery);
  grid.innerHTML=`<div class="folder new-card" onclick="createClient()"><div class="big-plus">+</div><div class="np-label">Novo cliente</div></div>`+filtered.map(clientCardHTML).join('');
  const wrap=document.getElementById('searchWrap_clients'); if(wrap)wrap.classList.toggle('has-text',!!clientQuery);
  syncEmpty('clients',store.all().length,filtered.length,clientQuery);
}
function refreshProjectCards(){
  const c=store.client(hubView.clientId); if(!c)return;
  const grid=document.getElementById('projectsGrid'); if(!grid)return;
  const sorted=c.projects.slice().sort((a,b)=>b.updatedAt-a.updatedAt);
  const filtered=filterProjects(sorted,projectQuery);
  grid.innerHTML=`<div class="folder new-card" onclick="newProjectForClient('${c.id}')"><div class="big-plus">+</div><div class="np-label">Novo projeto</div></div>`+filtered.map(p=>projectCardHTML(c.id,p)).join('');
  const wrap=document.getElementById('searchWrap_projects'); if(wrap)wrap.classList.toggle('has-text',!!projectQuery);
  syncEmpty('projects',c.projects.length,filtered.length,projectQuery);
}

function syncEmpty(kind,total,shown,q){
  const grid=document.getElementById(kind==='clients'?'clientsGrid':'projectsGrid'); if(!grid)return;
  const existing=document.getElementById('emptyMsg_'+kind); if(existing)existing.remove();
  const html=(kind==='clients')?clientsEmptyHTML(total,shown,q):projectsEmptyHTML(total,shown,q);
  if(html){ const tmp=document.createElement('div'); tmp.innerHTML=html.trim(); const node=tmp.firstElementChild;
    if(node){ node.id='emptyMsg_'+kind; grid.after(node); } }
}
function onClientSearch(v){ clientQuery=v; refreshClientCards(); renderClientSuggest(v); }
function renderClientSuggest(v){
  const box=document.getElementById('searchSuggest_clients'); if(!box)return;
  const q=norm(v).trim();
  if(!q){ box.style.display='none'; box.innerHTML=''; return; }
  const matches=filterClients(store.all(),v).slice(0,8);
  if(!matches.length){
    box.innerHTML='<div class="ss-empty">Nenhum cliente encontrado</div>';
    box.style.display='block'; return;
  }
  box.innerHTML=matches.map(c=>{
    const np=(c.projects||[]).length;
    return '<button class="ss-item" onmousedown="event.preventDefault()" onclick="pickClientSuggest(\''+c.id+'\')">'+
      '<span class="ss-ic">'+ICONS.folder+'</span>'+
      '<span class="ss-main"><span class="ss-name">'+esc(c.name)+'</span>'+
      (c.contact?'<span class="ss-sub">'+esc(c.contact)+'</span>':'')+'</span>'+
      '<span class="ss-count">'+np+' '+(np===1?'projeto':'projetos')+'</span>'+
    '</button>';
  }).join('');
  box.style.display='block';
}
function pickClientSuggest(id){ const box=document.getElementById('searchSuggest_clients'); if(box){box.style.display='none';} openClient(id); }
function onProjectSearch(v){ projectQuery=v; refreshProjectCards(); }
function clearClientSearch(){ clientQuery=''; const i=document.getElementById('search_clients'); if(i)i.value=''; refreshClientCards(); const w=document.getElementById('searchWrap_clients'); if(w)w.classList.remove('has-text'); const box=document.getElementById('searchSuggest_clients'); if(box){box.style.display='none';box.innerHTML='';} if(i)i.focus(); }
function clearProjectSearch(){ projectQuery=''; const i=document.getElementById('search_projects'); if(i)i.value=''; refreshProjectCards(); const w=document.getElementById('searchWrap_projects'); if(w)w.classList.remove('has-text'); if(i)i.focus(); }
function focusSearch(kind){
  const q=kind==='clients'?clientQuery:projectQuery; if(!q)return;
  const i=document.getElementById('search_'+kind); if(i){ i.focus(); const n=i.value.length; try{i.setSelectionRange(n,n);}catch(e){} }
}

/* --- Ações: clientes --- */
async function createClient(){ const name=await uiPrompt({title:'Novo cliente',placeholder:'Nome do cliente',okLabel:'Criar'}); if(name===null)return; const c=store.addClient(name.trim()||'Novo cliente'); openClient(c.id); }
async function renameClient(id){ const c=store.client(id); if(!c)return; const name=await uiPrompt({title:'Renomear cliente',value:c.name,okLabel:'Salvar'}); if(name===null)return; store.updateClient(id,{name:name.trim()||c.name}); renderHub(); }
async function removeClient(id){ const c=store.client(id); if(!c)return; const ok=await uiConfirm({title:'Excluir cliente',message:'Excluir o cliente «'+c.name+'» e todos os seus projetos? Isso não pode ser desfeito.',okLabel:'Excluir',danger:true}); if(!ok)return; store.delClient(id); renderHub(); }
function editClient(id,field,val){ store.updateClient(id,{[field]:val});
  if(field==='name'){ const t=document.getElementById('clientTitleName'); if(t)t.textContent=val; }
}
function openClient(id){ hubView={level:'client',clientId:id}; projectQuery=''; renderHub(); navPush(); }
function backToClients(){ hubView={level:'clients',clientId:null}; clientQuery=''; renderHub(); navPush(); }

/* --- Ações: projetos --- */
async function newProjectForClient(clientId){
  const name=await uiPrompt({title:'Novo projeto',placeholder:'Nome do projeto/script',okLabel:'Criar'}); if(name===null)return;
  state=freshState();
  const p=store.addProject(clientId,name.trim()||'Novo projeto',clone(state));
  if(!p)return;
  openProject={clientId,projId:p.id};
  enterGenerator();
}
function openProjectById(clientId,projId){
  const c=store.client(clientId); if(!c)return; const p=c.projects.find(x=>x.id===projId); if(!p)return;
  state=migrateState(clone(p.state));
  activeTab=0;
  openProject={clientId,projId};
  enterGenerator();
  navPush();
}
async function renameProject(clientId,projId){ const c=store.client(clientId); if(!c)return; const p=c.projects.find(x=>x.id===projId); if(!p)return; const name=await uiPrompt({title:'Renomear projeto',value:p.name,okLabel:'Salvar'}); if(name===null)return; store.updateProject(clientId,projId,{name:name.trim()||p.name}); renderHub(); }
function duplicateProject(clientId,projId){ const c=store.client(clientId); if(!c)return; const p=c.projects.find(x=>x.id===projId); if(!p)return; store.addProject(clientId,p.name+' (cópia)',clone(p.state)); renderHub(); }
async function removeProject(clientId,projId){ const c=store.client(clientId); if(!c)return; const p=c.projects.find(x=>x.id===projId); if(!p)return; const ok=await uiConfirm({title:'Excluir projeto',message:'Excluir o projeto «'+p.name+'»?',okLabel:'Excluir',danger:true}); if(!ok)return; store.delProject(clientId,projId); if(openProject&&openProject.projId===projId)openProject=null; renderHub(); }

function enterGenerator(){ hideHub(); updateOpenProjLabel(); render(); updateUserBadge(); }

/* ===== Navegação pelo botão voltar do navegador ===== */
let _navReady=false, _navApplying=false;
function navState(){
  if(typeof openProject!=='undefined' && openProject){ return {screen:'scripts',clientId:openProject.clientId,projId:openProject.projId}; }
  if(typeof hubView!=='undefined' && hubView.level==='client'){ return {screen:'client',clientId:hubView.clientId}; }
  return {screen:'clients'};
}
function navPush(){
  if(_navApplying||!_navReady)return;
  try{ history.pushState(navState(),''); }catch(e){}
}
function navApply(st){
  _navApplying=true;
  try{
    if(!auth.current()){ showAuthGate(); return; }
    if(!st||st.screen==='clients'){
      openProject=null; hubView={level:'clients',clientId:null};
      document.getElementById('hub').classList.add('show'); document.body.classList.add('hub-open'); renderHub();
    } else if(st.screen==='client'){
      if(openProject){ store.updateProject(openProject.clientId,openProject.projId,{state:clone(state)}); openProject=null; updateOpenProjLabel(); }
      hubView={level:'client',clientId:st.clientId};
      if(!store.client(st.clientId)){ hubView={level:'clients',clientId:null}; }
      document.getElementById('hub').classList.add('show'); document.body.classList.add('hub-open'); renderHub();
    } else if(st.screen==='scripts'){
      const c=store.client(st.clientId); const p=c&&c.projects.find(x=>x.id===st.projId);
      if(c&&p){ state=migrateState(clone(p.state)); activeTab=0; openProject={clientId:st.clientId,projId:st.projId}; enterGenerator(); }
      else { openProject=null; hubView={level:'clients',clientId:null}; document.getElementById('hub').classList.add('show'); document.body.classList.add('hub-open'); renderHub(); }
    }
  } finally { _navApplying=false; }
}
window.addEventListener('popstate', function(ev){
  if(!_navReady)return;
  if(!auth.current()){ showAuthGate(); return; }
  navApply(ev.state||{screen:'clients'});
});
function updateOpenProjLabel(){
  const el=document.getElementById('openProjLabel'); if(!el)return;
  if(openProject){ const c=store.client(openProject.clientId); const p=c&&c.projects.find(x=>x.id===openProject.projId);
    if(c&&p){ el.innerHTML='<span style="color:#A78BFA;display:inline-flex">'+ICONS.folder+'</span>'
      +'<b style="color:var(--text);font-weight:650">'+esc(c.name)+'</b>'
      +'<span style="color:var(--muted)">/</span>'
      +'<span style="color:var(--muted)">'+esc(p.name)+'</span>'; }
    else el.textContent=''; }
  else el.textContent='';
}
async function saveToClient(){
  if(!openProject){
    const clients=store.all();
    if(!clients.length){ const ok=await uiConfirm({title:'Nenhum cliente ainda',message:'Você ainda não tem clientes. Criar um agora para salvar este script?',okLabel:'Criar cliente'}); if(!ok)return; goHub(); createClient(); return; }
    await uiAlert({title:'Salvar no cliente',message:'Abra ou crie um projeto pela tela de Clientes para salvar aqui. Use o botão voltar no topo.'});
    return;
  }
  store.updateProject(openProject.clientId,openProject.projId,{state:clone(state)});
  updateOpenProjLabel();
  toast('Script salvo no cliente');
}
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function migrateState(st){ const base=freshState(); return Object.assign(base,st); }

/* --- Backup --- */
function _downloadJSON(obj,filename){
  const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(b);
  a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function _slug(s){ return norm(s).trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'cliente'; }
function exportDB(){
  _downloadJSON(store._load(),'clientes-backup-'+new Date().toISOString().slice(0,10)+'.json');
  toast('Backup exportado');
}
function exportClient(clientId){
  const c=store.client(clientId); if(!c)return;
  _downloadJSON({clients:[c]}, 'cliente-'+_slug(c.name)+'-'+new Date().toISOString().slice(0,10)+'.json');
  toast('Cliente exportado');
}
function buildStateFromText(text,kind,cliMode){
  const saved=state, savedTab=(typeof activeTab!=='undefined'?activeTab:0);
  let built=null;
  try{
    if(kind==='yaml') importAnsible(text);
    else importCli(text,cliMode);
    built=clone(state);
  } finally {
    state=saved; if(typeof activeTab!=='undefined') activeTab=savedTab;
  }
  return built;
}
function detectFormat(text){
  const t=(text||'').trim();
  if(!t) return 'empty';
  if(/^[\{\[]/.test(t)){ try{ JSON.parse(t); return 'json'; }catch(e){} }
  const lines=t.split('\n');
  const hasDocMarker=/^---\s*$/.test(lines[0]||'');
  const hasPlaybookKeys=/^\s*-?\s*(hosts|tasks|gather_facts|become|vars|roles)\s*:/m.test(t);
  const hasNameItem=/^\s*-\s+name\s*:/m.test(t);
  const hasModule=/^\s+[a-z0-9_]+\.[a-z0-9_]+\.[a-z0-9_]+\s*:/m.test(t);
  if(hasDocMarker || hasModule || (hasPlaybookKeys && hasNameItem)) return 'yaml';
  return 'txt';
}
function fmtNome(f){ return f==='json'?'JSON':(f==='yaml'?'YAML (playbook Ansible)':(f==='txt'?'TXT (script de CLI)':'vazio')); }

function importClientProjects(ev,destId){
  const f=ev.target.files[0]; if(!f)return;
  const fname=f.name||'projeto';
  const r=new FileReader();
  r.onload=async()=>{
    const reset=()=>{ ev.target.value=''; };
    const text=String(r.result||'');
    const fmt=await uiChoice({title:'Importar projeto',message:'Qual é o formato do arquivo «'+fname+'»?',
      choices:[
        {value:'json',label:'JSON',sub:'Exportação de cliente/projeto desta ferramenta',icon:'🗂'},
        {value:'txt', label:'TXT', sub:'Script de CLI (EXOS, Ruckus ou Fabric)',icon:'📄'},
        {value:'yaml',label:'YAML',sub:'Playbook Ansible (.yml)',icon:'📘'}
      ]});
    if(!fmt) return reset();

    const detected=detectFormat(text);
    if(detected==='empty'){ await uiAlert({title:'Arquivo vazio',message:'O arquivo selecionado está vazio.'}); return reset(); }
    if(detected!==fmt){
      await uiAlert({title:'Formato diferente do afirmado',
        message:'Você indicou '+fmtNome(fmt)+', mas o conteúdo do arquivo «'+fname+'» parece ser '+fmtNome(detected)+'. Confira o arquivo ou selecione o formato correto ao importar novamente.'});
      return reset();
    }

    if(fmt==='json'){
      let data; try{ data=JSON.parse(text); }
      catch(e){ await uiAlert({title:'Arquivo inválido',message:'O arquivo selecionado não é um JSON válido.'}); return reset(); }
      if(!data||!Array.isArray(data.clients)||data.clients.length===0){
        await uiAlert({title:'Arquivo inválido',message:'Este arquivo não parece ser uma exportação de cliente válida.'}); return reset(); }
      if(data.clients.length>1){
        await uiAlert({title:'Backup completo detectado',
          message:'Este arquivo contém vários clientes, então é um backup completo e não pode ser importado aqui. Para restaurá-lo, volte à tela de lista de clientes e use "Importar backup".'}); return reset(); }
      const src=data.clients[0];
      const projs=Array.isArray(src.projects)?src.projects:[];
      if(!projs.length){ await uiAlert({title:'Nada para importar',message:'O cliente neste arquivo não tem projetos.'}); return reset(); }
      const dest=store.client(destId); const destName=dest?dest.name:'este cliente';
      const ok=await uiConfirm({title:'Importar projetos',
        message:'Trazer '+projs.length+' '+(projs.length===1?'projeto':'projetos')+' de «'+(src.name||'cliente')+'» para «'+destName+'»? Projetos com nome repetido serão adicionados com o sufixo "(importado)", sem sobrescrever os existentes.',
        okLabel:'Importar'});
      if(!ok) return reset();
      const n=store.mergeProjectsInto(destId,projs);
      renderHub(); toast(n+' '+(n===1?'projeto importado':'projetos importados')); return reset();
    }

    if(fmt==='txt'){
      const alvo=await uiChoice({title:'Alvo do script TXT',message:'De qual equipamento é este script de CLI?',
        choices:[
          {value:'exos',   label:'EXOS',   sub:'Extreme EXOS',icon:'🔷'},
          {value:'ruckus', label:'Ruckus', sub:'Ruckus ICX (FastIron)',icon:'🔶'},
          {value:'fabric', label:'Fabric', sub:'Extreme VOSS / Fabric Engine',icon:'🟣'}
        ]});
      if(!alvo) return reset();
      let built; try{ built=buildStateFromText(text,'cli',alvo); }
      catch(e){ await uiAlert({title:'Falha ao importar',message:'Não foi possível interpretar o script: '+(e&&e.message?e.message:e)}); return reset(); }
      if(!built){ await uiAlert({title:'Falha ao importar',message:'Não foi possível interpretar o script.'}); return reset(); }
      finishTextImport(destId,fname,built); return reset();
    }

    if(fmt==='yaml'){
      let built; try{ built=buildStateFromText(text,'yaml'); }
      catch(e){ await uiAlert({title:'Falha ao importar',message:'Não foi possível interpretar o playbook: '+(e&&e.message?e.message:e)}); return reset(); }
      if(!built){ await uiAlert({title:'Falha ao importar',message:'Não foi possível interpretar o playbook.'}); return reset(); }
      finishTextImport(destId,fname,built); return reset();
    }
    reset();
  };
  r.readAsText(f);
}

function finishTextImport(destId,fname,built){
  const base=(fname||'projeto').replace(/\.(txt|ya?ml|json)$/i,'').trim()||'Projeto importado';
  const c=store.client(destId); const existing=new Set((c&&c.projects||[]).map(p=>p.name));
  let name=base; if(existing.has(name)){ let b=base+' (importado)',cand=b,i=2; while(existing.has(cand)){cand=b+' '+i;i++;} name=cand; }
  store.addProject(destId,name,built);
  renderHub(); toast('Projeto importado');
}
function importDB(ev){
  const f=ev.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=async()=>{ try{ const db=JSON.parse(r.result);
    const ok=await uiConfirm({title:'Importar backup',message:'Isto substitui todos os clientes atuais pelos do backup. Continuar?',okLabel:'Substituir',danger:true});
    if(!ok){ev.target.value='';return;}
    store.replaceAll(db); hubView={level:'clients',clientId:null}; renderHub(); toast('Backup importado');
  }catch(e){ await uiAlert({title:'Backup inválido',message:'O arquivo selecionado não é um backup válido.'}); } ev.target.value=''; };
  r.readAsText(f);
}