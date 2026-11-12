/* ===================== RENDER ===================== */
function isNet(){return TARGETS[state.target].net;}

function render(){
  updateModeUI();
  if(state.mode!=='ansible'){
    document.getElementById('target-card').style.display='none';
    document.getElementById('panel-linux').style.display='none';
    document.getElementById('panel-net').style.display='none';
    document.getElementById('panel-cli').style.display='';
    renderCli();
    renderOutput();
    return;
  }
  document.getElementById('target-card').style.display='';
  document.getElementById('panel-cli').style.display='none';
  renderTarget();
  document.getElementById('panel-linux').style.display = isNet()?'none':'';
  document.getElementById('panel-net').style.display = isNet()?'':'none';
  if(isNet()) renderNet(); else renderLinux();
  renderOutput();
}
function updateModeUI(){
  document.querySelectorAll('#modeSwitch button').forEach(b=>{
    const on=b.dataset.mode===state.mode;
    b.className=on?('active '+b.dataset.mode):'';
  });
  const T={ansible:['Gerador de Playbooks Ansible','Rede multivendor + servidores · saída Ansible'],
    exos:['Gerador de Script — Extreme EXOS','Comandos CLI nativos para colar no console'],
    ruckus:['Gerador de Script — Ruckus ICX (FastIron)','Comandos CLI nativos para colar no console'],
    fabric:['Gerador de Script — Extreme Fabric (VOSS)','Fabric Connect / SPBM — comandos CLI para colar no console']}[state.mode];
  const at=document.getElementById('appTitle'),sb=document.getElementById('appSub');
  if(at) at.textContent=T[0]; if(sb) sb.textContent=T[1];
  updateDocBtn();
}
/* Links oficiais de documentação de comandos, por tecnologia. */
const DOC_LINKS={
  exos:  'https://documentation.extremenetworks.com/exos_commands_30.2/GUID-3251352C-B502-42E1-9AAB-D09329F7FD95.shtml',
  ruckus:'https://support.ruckuswireless.com/documents/4694-fastiron-10-0-20-ga-command-reference-guide',
  fabric:'https://documentation.extremenetworks.com/Fabric%20Engine%20v9.3%20Command%20References/Switch_Operating_Systems/VOSS_and_Fabric_Engine/fabric_engine_cli_commands_reference/topics_general/purpose.shtml'
};
/* Atualiza o botão de documentação conforme o modo (ou o alvo, no Ansible). */
function updateDocBtn(){
  const btn=document.getElementById('docBtn'); if(!btn) return;
  let key=null, rotulo='Documentação';
  if(state.mode==='exos'){ key='exos'; rotulo='Documentação EXOS'; }
  else if(state.mode==='ruckus'){ key='ruckus'; rotulo='Documentação Ruckus'; }
  else if(state.mode==='fabric'){ key='fabric'; rotulo='Documentação Fabric'; }
  else if(state.mode==='ansible'){
    if(state.target==='exos'){ key='exos'; rotulo='Documentação EXOS'; }
    else if(state.target==='ruckus_icx'){ key='ruckus'; rotulo='Documentação Ruckus'; }
    else if(state.target==='voss'){ key='fabric'; rotulo='Documentação Fabric'; }
  }
  if(key && DOC_LINKS[key]){
    btn.href=DOC_LINKS[key];
    btn.textContent='📖 Documentação';
    btn.title='Documentação oficial — '+rotulo.replace('Documentação ','');
    btn.style.display='inline-flex';
  } else {
    btn.style.display='none';
  }
}

function renderTarget(){
  const opts=Object.entries(TARGETS).map(([k,v])=>`<option value="${k}" ${state.target===k?'selected':''}>${v.label}</option>`).join('');
  document.getElementById('target-card').innerHTML=`
    <div class="card target-card">
      <div class="card-title">🎯 Alvo da automação</div>
      <div class="field"><label>O que você vai configurar?</label>
        <select onchange="setTarget(this.value)" style="font-weight:600">${opts}</select></div>
      <div class="hint">${isNet()?('Módulo: <code>'+netModule()+'</code> · <code>connection=network_cli</code>'):TARGETS.linux.hint}</div>
    </div>`;
}

/* ---------- Painel Linux ---------- */
function renderLinux(){
  const a=state.linux;
  const p=document.getElementById('panel-linux');
  p.innerHTML=`
    <div class="card">
      <div class="card-title">⚙ Play (playbook.yml)</div>
      <div class="grid2">
        <div class="field"><label>Nome do play</label>
          <input type="text" placeholder="Configurar servidores web" value="${esc(a.play.name)}" oninput="a_play('name',this.value)"></div>
        <div class="field"><label>Hosts alvo (grupo do inventário)</label>
          <input type="text" placeholder="webservers" value="${esc(a.play.hosts)}" oninput="a_play('hosts',this.value)"></div>
      </div>
      <div class="grid2">
        <label class="chk"><input type="checkbox" ${a.play.become?'checked':''} onchange="a_play('become',this.checked)"> Executar como root (become)</label>
        <label class="chk"><input type="checkbox" ${a.play.facts?'checked':''} onchange="a_play('facts',this.checked)"> Coletar facts</label>
      </div>
      <div class="params-head">Variáveis do play (vars)
        <button class="muted-link" onclick="a_addVar()">+ variável</button></div>
      <div id="a_vars"></div>
    </div>

    <div class="card">
      <div class="card-title">🗂 Inventário (hosts.ini)</div>
      <div id="a_groups"></div>
      <button class="btn-add" onclick="a_addGroup()">+ Adicionar grupo</button>
    </div>

    <div class="card">
      <div class="card-title">📋 Tarefas (tasks)</div>
      <div id="a_tasks"></div>
      <button class="btn-add" onclick="a_addTask()">+ Adicionar tarefa</button>
    </div>`;

  const vc=document.getElementById('a_vars');
  vc.innerHTML=a.vars.length?'':'<div class="empty">Nenhuma variável.</div>';
  a.vars.forEach((v,i)=>vc.appendChild(kvRow(v.k,v.val,'chave','valor',
    (val)=>{a.vars[i].k=val;syncOut()},(val)=>{a.vars[i].val=val;syncOut()},()=>{a.vars.splice(i,1);render()})));

  const gc=document.getElementById('a_groups');
  gc.innerHTML=a.groups.length?'':'<div class="empty">Nenhum grupo. Adicione para montar o hosts.ini.</div>';
  a.groups.forEach((g,gi)=>{
    const d=document.createElement('div');d.className='block';
    d.innerHTML=`
      <div class="block-head">
        <div class="bnum">[ ]</div>
        <input type="text" placeholder="nome do grupo (ex: webservers)" value="${esc(g.name)}" oninput="a_grp(${gi},'name',this.value)">
        <button class="icon-btn" title="remover grupo" onclick="a_delGroup(${gi})">✕</button>
      </div>
      <div class="params-head">Hosts <button class="muted-link" onclick="a_addHost(${gi})">+ host</button></div>
      <div id="grp_hosts_${gi}"></div>
      <div class="params-head">Variáveis do grupo <button class="muted-link" onclick="a_addGVar(${gi})">+ variável</button></div>
      <div id="grp_vars_${gi}"></div>`;
    gc.appendChild(d);
    const hc=d.querySelector('#grp_hosts_'+gi);
    hc.innerHTML=g.hosts.length?'':'<div class="empty">Sem hosts.</div>';
    g.hosts.forEach((h,hi)=>{
      const hr=document.createElement('div');hr.className='param-row';hr.style.gridTemplateColumns='1.1fr 1.3fr 30px';
      hr.innerHTML=`
        <input type="text" placeholder="nome (web1)" value="${esc(h.name)}" oninput="a_host(${gi},${hi},'name',this.value)">
        <input type="text" placeholder="ansible_host (IP)" value="${esc(h.ip)}" oninput="a_host(${gi},${hi},'ip',this.value)">
        <button class="icon-btn" title="remover host" onclick="a_delHost(${gi},${hi})">✕</button>`;
      hc.appendChild(hr);
    });
    const gv=d.querySelector('#grp_vars_'+gi);
    gv.innerHTML=g.vars.length?'':'<div class="empty">Sem variáveis de grupo.</div>';
    g.vars.forEach((v,vi)=>gv.appendChild(kvRow(v.k,v.val,'chave (ansible_user)','valor (ubuntu)',
      (val)=>{g.vars[vi].k=val;syncOut()},(val)=>{g.vars[vi].val=val;syncOut()},()=>{g.vars.splice(vi,1);render()})));
  });

  const tc=document.getElementById('a_tasks');
  tc.innerHTML=a.tasks.length?'':'<div class="empty">Nenhuma tarefa.</div>';
  a.tasks.forEach((t,ti)=>{
    const card=document.createElement('div');card.className='block';
    const params=t.params.map((p,pi)=>paramRowHTML(ti,pi,p)).join('');
    card.innerHTML=`
      <div class="block-head">
        <div class="bnum">${ti+1}</div>
        <input type="text" placeholder="Nome da tarefa" value="${esc(t.name)}" oninput="a_task(${ti},'name',this.value)">
        <button class="icon-btn up" onclick="a_moveTask(${ti},-1)" title="subir">▲</button>
        <button class="icon-btn down" onclick="a_moveTask(${ti},1)" title="descer">▼</button>
        <button class="icon-btn" onclick="a_delTask(${ti})" title="remover">✕</button>
      </div>
      <label>Módulo Ansible</label>
      <input type="text" list="modlist" placeholder="ansible.builtin.apt" value="${esc(t.module)}" oninput="a_task(${ti},'module',this.value)">
      <div class="params-head">Parâmetros (campos mutáveis)
        <button class="muted-link" onclick="a_addParam(${ti})">+ campo</button></div>
      <div>${params||'<div class="empty">Sem parâmetros.</div>'}</div>
      ${advHTML(ti,t)}`;
    tc.appendChild(card);
  });
}

function paramRowHTML(ti,pi,p){
  const types=['str','int','bool','list'];
  const sel=types.map(tp=>`<span class="tag-sel ${p.type===tp?'active':''}" onclick="a_param(${ti},${pi},'type','${tp}')">${tp}</span>`).join('');
  let v;
  if(p.type==='bool') v=`<select onchange="a_param(${ti},${pi},'val',this.value)"><option value="true" ${p.val==='true'?'selected':''}>true</option><option value="false" ${p.val==='false'?'selected':''}>false</option></select>`;
  else if(p.type==='list') v=`<textarea placeholder="um item por linha" oninput="a_param(${ti},${pi},'val',this.value)">${esc(p.val)}</textarea>`;
  else v=`<input type="text" placeholder="valor" value="${esc(p.val)}" oninput="a_param(${ti},${pi},'val',this.value)">`;
  return `<div class="param-row">
    <input type="text" placeholder="chave" value="${esc(p.k)}" oninput="a_param(${ti},${pi},'k',this.value)">
    <div class="eq">:</div>${v}
    <button class="icon-btn" title="remover campo" onclick="a_delParam(${ti},${pi})">✕</button>
    <div class="typ">${sel}</div></div>`;
}
function advHTML(ti,t){
  return `<details class="adv"><summary>Opções avançadas (when, loop, tags, register, notify)</summary>
    <div class="field" style="margin-top:10px"><label>when</label>
      <input type="text" placeholder="ansible_os_family == 'Debian'" value="${esc(t.when)}" oninput="a_task(${ti},'when',this.value)"></div>
    <div class="field"><label>loop (um item por linha)</label>
      <textarea placeholder="item1&#10;item2" oninput="a_task(${ti},'loop',this.value)">${esc(t.loop)}</textarea>
      <div class="hint">Use <code>{{ item }}</code> nos parâmetros.</div></div>
    <div class="grid2">
      <div class="field"><label>register</label><input type="text" value="${esc(t.register)}" oninput="a_task(${ti},'register',this.value)"></div>
      <div class="field"><label>tags (vírgula)</label><input type="text" value="${esc(t.tags)}" oninput="a_task(${ti},'tags',this.value)"></div>
    </div>
    <div class="field"><label>notify (vírgula)</label><input type="text" value="${esc(t.notify)}" oninput="a_task(${ti},'notify',this.value)"></div>
  </details>`;
}

/* ---------- Painel Rede ---------- */
function selOptions(key,t,kind){
  if(key==='mode'){
    // O seletor tagged/untagged (ou access/trunk) vale apenas para portas de VLAN.
    if(kind==='vlan_ports') return t==='exos'?['untagged','tagged']:['access','trunk'];
    // Modo do STP: dropdown com as opções de cada dialeto.
    if(kind==='stp' && t==='exos') return ['rstp','stp','mstp'];
    if(kind==='stp' && (t==='ruckus_icx' || t==='icx' || t==='voss')) return ['rstp','mstp'];
    // Registro na controladora (Ruckus): lista ativa ou de backup.
    if(kind==='icx_register') return ['active','backup'];
    return null;
  }
  if(key==='role' && kind==='user_create' && t==='voss') return ['ro','rw','rwa'];
  if(key==='state') return ['enable','disable'];
  if(key==='access') return ['readonly','readwrite'];
  if(key==='lacp') return ['active','passive','static'];
  if(key==='authproto') return ['sha','md5'];
  if(key==='privproto') return ['aes','des'];
  if(key==='smlt') return ['standalone','smlt'];
  return null;
}
const FABRIC_KINDS=['spbm_isis','nni','ip_shortcuts','l3vsn','mlt'];
/* Intenções exclusivas do Ruckus ICX e do Cisco, para filtragem por alvo. */
const ICX_ONLY_KINDS=['icx_register','icx_license'];
const CISCO_ONLY_KINDS=['cdp'];
function kindsFor(t){
  if(t==='generic')return['raw','save'];
  if(t==='voss')return['spbm_isis','nni','vlan_create','vlan_ports','svi_ip','vint','ip_shortcuts','l3vsn','mlt','static_route','lldp','banner','poe','speed','stp','user_create','raw','save'];
  const isCisco=(t==='cisco_ios'||t==='cisco_nxos');
  const isIcx=(t==='ruckus_icx');
  return Object.keys(NET_KINDS).filter(k=>{
    if(FABRIC_KINDS.indexOf(k)>=0) return false;              // intenções só de fabric
    if(CISCO_ONLY_KINDS.indexOf(k)>=0 && !isCisco) return false; // CDP só na Cisco/Ansible
    if(ICX_ONLY_KINDS.indexOf(k)>=0 && !isIcx) return false;     // registro/licença só no Ruckus
    return true;
  });
}
function availableKinds(){return kindsFor(state.target);}

function renderNet(){
  const t=state.target,T=TARGETS[t],n=state.net;
  const p=document.getElementById('panel-net');
  const genericFields = t==='generic'? `
      <div class="grid2">
        <div class="field"><label>ansible_network_os</label>
          <input type="text" placeholder="arista.eos.eos" value="${esc(n.customOs)}" oninput="n_root('customOs',this.value)"></div>
        <div class="field"><label>Módulo de configuração</label>
          <input type="text" placeholder="arista.eos.eos_config" value="${esc(n.customModule)}" oninput="n_root('customModule',this.value)"></div>
      </div>
      <div class="hint">Ex.: Arista <code>arista.eos.eos_config</code>, Juniper <code>junipernetworks.junos.junos_config</code>, Aruba <code>arubanetworks.aoscx.aoscx_config</code>.</div>`
    : '';
  p.innerHTML=`
    <div class="card">
      <div class="card-title">🌐 Conexão & dispositivos</div>
      <div class="grid2">
        <div class="field"><label>Nome / descrição do playbook</label>
          <input type="text" placeholder="Provisionar VLANs de acesso" value="${esc(n.meta.name)}" oninput="n_meta('name',this.value)"></div>
        <div class="field"><label>Usuário (ansible_user)</label>
          <input type="text" placeholder="admin" value="${esc(n.conn.user)}" oninput="n_conn('user',this.value)"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Senha (ansible_password)</label>
          <input type="text" placeholder="vazio = preencher depois / usar vault" value="${esc(n.conn.password||'')}" oninput="n_conn('password',this.value)"></div>
        ${T.enable&&n.conn.enable? `<div class="field"><label>Senha de enable (become)</label>
          <input type="text" placeholder="senha de enable" value="${esc(n.conn.enablePassword||'')}" oninput="n_conn('enablePassword',this.value)"></div>`:''}
      </div>
      ${genericFields}
      ${T.enable? `<label class="chk"><input type="checkbox" ${n.conn.enable?'checked':''} onchange="n_conn('enable',this.checked)"> Usar modo enable (become)</label>`:''}
      <div class="params-head">Dispositivos alvo <button class="muted-link" onclick="n_addDev()">+ dispositivo</button></div>
      <div id="n_dev"></div>
      <div class="hint">Grupo <code>${netGroup()}</code> no inventário, com <code>ansible_network_os=${esc(netOs())}</code>.</div>
    </div>
    <div class="card">
      <div class="card-title">🔧 ${t==='generic'?'Linhas de configuração':'Comandos (intenção → tasks)'}</div>
      <div id="n_cmds"></div>
      <button class="btn-add" onclick="n_addCmd()">+ Adicionar ${t==='generic'?'bloco':'comando'}</button>
    </div>`;

  const dv=document.getElementById('n_dev');
  dv.innerHTML=n.devices.length?'':'<div class="empty">Nenhum dispositivo listado.</div>';
  n.devices.forEach((s,i)=>{
    const r=document.createElement('div');r.className='param-row';r.style.gridTemplateColumns='1.1fr 1.3fr 30px';
    r.innerHTML=`
      <input type="text" placeholder="nome (SW-ACESSO-01)" value="${esc(s.name)}" oninput="n_dev(${i},'name',this.value)">
      <input type="text" placeholder="IP de gerência" value="${esc(s.ip)}" oninput="n_dev(${i},'ip',this.value)">
      <button class="icon-btn" title="remover" onclick="n_delDev(${i})">✕</button>`;
    dv.appendChild(r);
  });

  const cc=document.getElementById('n_cmds');
  cc.innerHTML=n.cmds.length?'':'<div class="empty">Nenhum comando. Clique no botão acima.</div>';
  const kinds=availableKinds();
  n.cmds.forEach((c,ci)=>{
    const def=NET_KINDS[c.kind]||NET_KINDS.raw;
    const opts=kinds.map(k=>`<option value="${k}" ${c.kind===k?'selected':''}>${NET_KINDS[k].label}</option>`).join('');
    const fields = c.kind==='vlan_create' ? vlanFieldsHTML('net',ci,c,TARGETS[t].dialect) : def.fields.filter(fl=>!fl[3]||fl[3]===TARGETS[t].dialect).map(([key,lbl,ph])=>{
      const placeholder=(ph&&(ph[t]||ph.cisco_ios))||'';
      if(key==='cmds'){const le=lintCmds(c[key]||'',TARGETS[t].dialect);
        return `<div class="field"><label>${lbl}</label><textarea class="${le.length?'has-err':''}" placeholder="${esc(placeholder)}" oninput="n_cmd(${ci},'${key}',this.value)">${esc(c[key]||'')}</textarea><div class="lint-area">${lintBoxHTML(le)}</div></div>`;}
      const so=selOptions(key,t,c.kind);
      if(so){
        const o=so.map(x=>`<option value="${x}" ${(c[key]||'')===x?'selected':''}>${x}</option>`).join('');
        return `<div class="field"><label>${lbl}</label><select onchange="n_cmd(${ci},'${key}',this.value)"><option value="">—</option>${o}</select></div>`;
      }
      return `<div class="field"><label>${lbl}</label><input type="text" placeholder="${esc(placeholder)}" value="${esc(c[key]||'')}" oninput="n_cmd(${ci},'${key}',this.value)"></div>`;
    }).join('');
    const card=document.createElement('div');card.className='block';
    card.innerHTML=`
      <div class="block-head">
        <div class="bnum net">${ci+1}</div>
        ${kindCombo('net',ci,c.kind,kinds)}
        <button class="icon-btn up" onclick="n_move(${ci},-1)" title="subir">▲</button>
        <button class="icon-btn down" onclick="n_move(${ci},1)" title="descer">▼</button>
        <button class="icon-btn" onclick="n_del(${ci})" title="remover">✕</button>
      </div>
      <div class="field"><label>Comentário / nome da task (opcional)</label>
        <input type="text" placeholder="o que este passo faz" value="${esc(c.comment||'')}" oninput="n_cmd(${ci},'comment',this.value)"></div>
      ${def.fields.length? '<div class="grid2">'+fields+'</div>' : '<div class="hint">Sem parâmetros.</div>'}
      <div class="preview-label">Linhas geradas no playbook</div>
      <div class="preview-cmd">${esc(netPreview(c).join('\n'))||'—'}</div>`;
    cc.appendChild(card);
  });
}

