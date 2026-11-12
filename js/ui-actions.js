/* ===================== PREVIEW / TABS ===================== */
function renderOutput(){
  const files=generatedFiles();
  if(activeTab>=files.length) activeTab=0;
  const tabs=document.getElementById('tabs');
  tabs.innerHTML=files.map((f,i)=>`<div class="tab ${i===activeTab?'active':''}" onclick="selTab(${i})">${f.name}</div>`).join('');
  document.getElementById('output').innerHTML=highlight(files[activeTab].content,files[activeTab].lang);
}
function selTab(i){activeTab=i;renderOutput();}
function syncOut(){renderOutput();}

function highlight(text,lang){return lang==='ini'?hlIni(text):lang==='cli'?hlCli(text):hlYaml(text);}
function hlCli(t){return t.split('\n').map(line=>{
  if(/^\s*[#!]/.test(line)) return '<span class="cmt">'+esc(line)+'</span>';
  const m=line.match(/^(\s*)(\S+)(.*)$/);
  if(m) return m[1]+'<span class="yml-key">'+esc(m[2])+'</span><span class="yml-str">'+esc(m[3])+'</span>';
  return esc(line);}).join('\n');}
function hlYaml(t){return t.split('\n').map(line=>{
  if(/^\s*#/.test(line)) return '<span class="cmt">'+esc(line)+'</span>';
  let h=esc(line);
  h=h.replace(/^(\s*)(- )?([A-Za-z0-9_.\-]+)(:)/,(m,sp,dash,key,col)=>sp+(dash?'<span class="yml-dash">- </span>':'')+'<span class="yml-key">'+key+'</span>'+col);
  h=h.replace(/(:\s)(.+)$/,(m,c,rest)=>c+colorVal(rest));
  h=h.replace(/^(\s*)(- )([^<].*)$/,(m,sp,dash,rest)=>sp+'<span class="yml-dash">- </span>'+colorVal(rest));
  return h;}).join('\n');}
function colorVal(v){const raw=v.replace(/<[^>]+>/g,'');
  if(/^(true|false)$/.test(raw)) return '<span class="yml-bool">'+v+'</span>';
  if(/^-?\d+(\.\d+)?$/.test(raw)) return '<span class="yml-num">'+v+'</span>';
  return '<span class="yml-str">'+v+'</span>';}
function hlIni(t){return t.split('\n').map(line=>{
  if(/^\s*#/.test(line)) return '<span class="cmt">'+esc(line)+'</span>';
  if(/^\[.*\]$/.test(line)) return '<span class="ini-sec">'+esc(line)+'</span>';
  const m=line.match(/^([^=]+)(=)(.*)$/);
  if(m) return '<span class="ini-key">'+esc(m[1])+'</span>='+'<span class="yml-str">'+esc(m[3])+'</span>';
  return esc(line);}).join('\n');}

/* ===================== AÇÕES (mutações) ===================== */
function setMode(m){state.mode=m;activeTab=0;render();}
function setTarget(v){state.target=v;activeTab=0;render();}
// linux
function a_play(f,v){state.linux.play[f]=v;syncOut();}
function a_addVar(){state.linux.vars.push({k:'',val:''});render();}
function a_addGroup(){state.linux.groups.push({name:'',hosts:[{name:'',ip:''}],vars:[]});render();}
function a_delGroup(i){state.linux.groups.splice(i,1);render();}
function a_grp(i,f,v){state.linux.groups[i][f]=v;syncOut();}
function a_addHost(gi){state.linux.groups[gi].hosts.push({name:'',ip:''});render();}
function a_delHost(gi,hi){state.linux.groups[gi].hosts.splice(hi,1);render();}
function a_host(gi,hi,f,v){state.linux.groups[gi].hosts[hi][f]=v;syncOut();}
function a_addGVar(gi){state.linux.groups[gi].vars.push({k:'',val:''});render();}
function a_task(i,f,v){state.linux.tasks[i][f]=v;syncOut();}
function a_addTask(){state.linux.tasks.push({name:'',module:'',params:[{k:'',val:'',type:'str'}],when:'',loop:'',register:'',tags:'',notify:''});render();}
function a_delTask(i){state.linux.tasks.splice(i,1);render();}
function a_moveTask(i,d){const j=i+d,t=state.linux.tasks;if(j<0||j>=t.length)return;[t[i],t[j]]=[t[j],t[i]];render();}
function a_addParam(ti){state.linux.tasks[ti].params.push({k:'',val:'',type:'str'});render();}
function a_delParam(ti,pi){state.linux.tasks[ti].params.splice(pi,1);render();}
function a_param(ti,pi,f,v){state.linux.tasks[ti].params[pi][f]=v;f==='type'?render():syncOut();}
// rede
function n_meta(f,v){state.net.meta[f]=v;syncOut();}
function n_root(f,v){state.net[f]=v;syncOut();}
function n_conn(f,v){state.net.conn[f]=v;syncOut();}
function n_addDev(){state.net.devices.push({name:'',ip:''});render();}
function n_delDev(i){state.net.devices.splice(i,1);render();}
function n_dev(i,f,v){state.net.devices[i][f]=v;syncOut();}
function n_addCmd(){state.net.cmds.push({kind:state.target==='generic'?'raw':'vlan_create',comment:''});render();}
function n_del(i){state.net.cmds.splice(i,1);render();}
function n_move(i,d){const j=i+d,c=state.net.cmds;if(j<0||j>=c.length)return;[c[i],c[j]]=[c[j],c[i]];render();}
function n_setKind(i,k){state.net.cmds[i]={kind:k,comment:state.net.cmds[i].comment||''};render();}
function n_cmd(i,f,v){state.net.cmds[i][f]=v;
  const blocks=document.querySelectorAll('#n_cmds .block');
  if(blocks[i]){const pv=blocks[i].querySelector('.preview-cmd');if(pv)pv.textContent=netPreview(state.net.cmds[i]).join('\n')||'—';
    if(f==='cmds') updateLint(blocks[i],v,TARGETS[state.target].dialect);}
  syncOut();}

/* ===================== VLANs múltiplas (vlan_create) ===================== */
/* Retorna a lista completa de VLANs de uma task: a primária (tag/name/isid do próprio comando)
   seguida das extras em c.extra[]. Mantém retrocompatibilidade: arquivos antigos não têm c.extra. */
function vlanList(c){
  const list=[{tag:c.tag||'',name:c.name||'',isid:c.isid||''}];
  (c.extra||[]).forEach(e=>list.push({tag:e.tag||'',name:e.name||'',isid:e.isid||''}));
  return list;
}
/* Acessa o comando alvo em qualquer contexto (net ou cli). */
function cmdRef(ctx,i){return ctx==='net'?state.net.cmds[i]:cliSlice().cmds[i];}
function vlan_add(ctx,i){const c=cmdRef(ctx,i);if(!c.extra)c.extra=[];c.extra.push({tag:'',name:'',isid:''});render();}
function vlan_del(ctx,i,ei){const c=cmdRef(ctx,i);if(c.extra){c.extra.splice(ei,1);if(!c.extra.length)delete c.extra;}render();}
/* ei = -1 edita a VLAN primária (campos no próprio comando); ei>=0 edita c.extra[ei]. */
function vlan_set(ctx,i,ei,f,v){
  const c=cmdRef(ctx,i);
  if(ei<0){c[f]=v;} else {if(!c.extra)c.extra=[];c.extra[ei][f]=v;}
  const sel='#'+(ctx==='net'?'n_cmds':'c_cmds')+' .block';
  const blocks=document.querySelectorAll(sel);
  if(blocks[i]){const pv=blocks[i].querySelector('.preview-cmd');
    if(pv)pv.textContent=(ctx==='net'?netPreview(c):cliPreview(c,state.mode)).join('\n')||'—';}
  syncOut();}
/* Monta o HTML do bloco de VLANs (várias linhas + botão +) para vlan_create. */
function vlanFieldsHTML(ctx,ci,c,dialect){
  const showIsid=(dialect==='voss');
  const rows=vlanList(c).map((v,ei)=>{
    const delBtn = ei===0 ? '' : `<button class="icon-btn" title="remover VLAN" onclick="vlan_del('${ctx}',${ci},${ei-1})">✕</button>`;
    const isidInp = showIsid ? `<input type="text" placeholder="I-SID (10100)" value="${esc(v.isid)}" oninput="vlan_set('${ctx}',${ci},${ei-1},'isid',this.value)">` : '';
    return `<div class="vlan-row" style="display:grid;grid-template-columns:${showIsid?'0.8fr 1fr 0.9fr 30px':'0.9fr 1.4fr 30px'};gap:7px;margin-bottom:7px;align-items:center">
      <input type="text" placeholder="tag (100)" value="${esc(v.tag)}" oninput="vlan_set('${ctx}',${ci},${ei-1},'tag',this.value)">
      <input type="text" placeholder="nome (Vendas)" value="${esc(v.name)}" oninput="vlan_set('${ctx}',${ci},${ei-1},'name',this.value)">
      ${isidInp}
      ${delBtn||'<span></span>'}
    </div>`;
  }).join('');
  return `<div class="field" style="grid-column:1/-1">
      <label>VLANs (tag + nome${showIsid?' + I-SID':''})</label>
      ${rows}
      <button class="btn-add" style="margin-top:2px" onclick="vlan_add('${ctx}',${ci})">+ VLAN</button>
    </div>`;
}

/* ===================== UI helpers ===================== */
function kvRow(k,val,phk,phv,onk,onv,ondel){
  const d=document.createElement('div');d.className='param-row';d.style.gridTemplateColumns='1fr 22px 1.4fr 30px';
  const ik=document.createElement('input');ik.type='text';ik.placeholder=phk;ik.value=k;ik.oninput=e=>onk(e.target.value);
  const eq=document.createElement('div');eq.className='eq';eq.textContent='=';
  const iv=document.createElement('input');iv.type='text';iv.placeholder=phv;iv.value=val;iv.oninput=e=>onv(e.target.value);
  const b=document.createElement('button');b.className='icon-btn';b.textContent='✕';b.title='remover';b.onclick=ondel;
  d.append(ik,eq,iv,b);return d;
}
function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ===================== COMBOBOX de tipo (busca) ===================== */
function kindCombo(ctx,ci,curKind,kinds){
  const label=(NET_KINDS[curKind]||NET_KINDS.raw).label;
  const opts=kinds.map(k=>`<div class="combo-opt" data-kind="${k}" data-label="${esc(NET_KINDS[k].label.toLowerCase())}" onmousedown="comboPick(event,'${ctx}',${ci},'${k}')">${esc(NET_KINDS[k].label)}</div>`).join('');
  return `<div class="combo">
    <input class="combo-input" type="text" value="${esc(label)}" data-cur="${esc(label)}" data-ctx="${ctx}" data-ci="${ci}" placeholder="buscar tipo (ex.: NTP)…" autocomplete="off" onfocus="comboOpen(this)" oninput="comboFilter(this)" onblur="comboBlur(this)" onkeydown="comboKey(event,this)">
    <div class="combo-list">${opts}<div class="combo-empty" style="display:none">nenhum tipo encontrado</div></div>
  </div>`;
}
function comboOpen(inp){const c=inp.closest('.combo');c.classList.add('open');c.querySelectorAll('.combo-opt').forEach(o=>{o.style.display='';o.classList.remove('hl');});const e=c.querySelector('.combo-empty');if(e)e.style.display='none';inp.select();}
function comboFilter(inp){const c=inp.closest('.combo');c.classList.add('open');const q=inp.value.trim().toLowerCase();let vis=0;
  c.querySelectorAll('.combo-opt').forEach(o=>{const on=(!q||o.dataset.label.indexOf(q)>=0);o.style.display=on?'':'none';o.classList.remove('hl');if(on)vis++;});
  const e=c.querySelector('.combo-empty');if(e)e.style.display=vis?'none':'';}
function comboBlur(inp){const c=inp.closest('.combo');setTimeout(()=>{c.classList.remove('open');inp.value=inp.dataset.cur||inp.value;},150);}
function comboPick(e,ctx,ci,kind){e.preventDefault();if(ctx==='net')n_setKind(ci,kind);else c_setKind(ci,kind);}
function comboKey(e,inp){
  const c=inp.closest('.combo');const vis=[...c.querySelectorAll('.combo-opt')].filter(o=>o.style.display!=='none');
  if(e.key==='Escape'){inp.value=inp.dataset.cur||'';inp.blur();return;}
  let i=vis.findIndex(o=>o.classList.contains('hl'));
  if(e.key==='ArrowDown'){e.preventDefault();if(vis.length){if(i>=0)vis[i].classList.remove('hl');i=(i+1)%vis.length;vis[i].classList.add('hl');vis[i].scrollIntoView({block:'nearest'});}}
  else if(e.key==='ArrowUp'){e.preventDefault();if(vis.length){if(i>=0)vis[i].classList.remove('hl');i=(i<=0?vis.length-1:i-1);vis[i].classList.add('hl');vis[i].scrollIntoView({block:'nearest'});}}
  else if(e.key==='Enter'){const pick=(i>=0?vis[i]:vis[0]);if(pick){e.preventDefault();const k=pick.dataset.kind;if(inp.dataset.ctx==='net')n_setKind(+inp.dataset.ci,k);else c_setKind(+inp.dataset.ci,k);}}
}

/* ===================== DOWNLOAD / COPY ===================== */
function activeFile(){return generatedFiles()[activeTab];}
function copyActive(){const f=activeFile();navigator.clipboard.writeText(f.content).then(()=>{
  const b=document.getElementById('copyBtn');b.classList.add('copy-ok');b.textContent='✓ Copiado';
  setTimeout(()=>{b.classList.remove('copy-ok');b.textContent='📋 Copiar'},1500);},()=>toast('Falha ao copiar'));}
function dl(name,content){const b=new Blob([content],{type:'text/plain'});const a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href);}
function downloadActive(){const f=activeFile();dl(f.name,f.content);toast(f.name+' baixado');}
function downloadAll(){const files=generatedFiles();files.forEach((f,i)=>setTimeout(()=>dl(f.name,f.content),i*250));
  toast(files.length+' arquivo(s) baixado(s)');}

