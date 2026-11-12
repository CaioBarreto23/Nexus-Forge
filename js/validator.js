/* ===================== TESTE DO SCRIPT (simulação local) ===================== */
function vIp(x){const q=String(x||'').trim().split('.');return q.length===4&&q.every(o=>/^\d+$/.test(o)&&+o<=255);}
function vCidr(x){const m=String(x||'').trim().match(/^([\d.]+)\/(\d+)$/);return !!m&&vIp(m[1])&&+m[2]>=1&&+m[2]<=32;}
function vHostOrIp(x){x=String(x||'').trim();return vIp(x)||/^[A-Za-z][A-Za-z0-9.-]*$/.test(x);}
function vNum(x,mi,ma){x=String(x||'').trim();if(!/^\d+$/.test(x))return false;const n=+x;return n>=mi&&n<=ma;}
function checkPorts(add,who,dialect,ports){
  if(!ports)return;
  if(dialect==='exos'&&/[\/]|gi|eth/i.test(ports)) add('warn',who,'formato de portas do EXOS costuma ser 1:1-1:8 — confira «'+ports+'»');
  else if(dialect==='ios'&&/^\d+:\d/.test(ports)) add('warn',who,'formato de portas Cisco costuma ser Gi1/0/1 — confira «'+ports+'»');
  else if(dialect==='voss'&&/[:]|gi|eth/i.test(ports)) add('warn',who,'formato de portas do VOSS costuma ser 1/1-1/8 — confira «'+ports+'»');
}
function checkCmd(add,c,dialect,idx){
  const f=k=>(c[k]||'').trim();
  const who='Comando '+(idx+1)+' — '+(NET_KINDS[c.kind]||NET_KINDS.raw).label;
  switch(c.kind){
    case 'vlan_create': {
      const vls=vlanList(c);
      vls.forEach((v,vi)=>{
        const rot=vls.length>1?(who+' (VLAN '+(vi+1)+')'):who;
        const tag=(v.tag||'').trim(),nm=(v.name||'').trim(),isid=(v.isid||'').trim();
        if(!tag&&!(dialect==='exos'&&nm)) add('err',rot,'informe o número (tag) da VLAN');
        else if(tag&&!vNum(tag,1,4094)) add('err',rot,'tag de VLAN inválida «'+tag+'» (use 1–4094)');
        if(dialect==='voss'&&isid&&!vNum(isid,1,16777215)) add('err',rot,'I-SID inválido «'+isid+'»');
      });
      const tags=vls.map(v=>(v.tag||'').trim()).filter(Boolean);
      const dup=tags.find((t,i)=>tags.indexOf(t)!==i);
      if(dup) add('warn',who,'VLAN '+dup+' repetida dentro da mesma task');
      break; }
    case 'vlan_ports':
      if(!f('tag')) add('err',who,'informe a VLAN (tag)');
      else if(!vNum(f('tag'),1,4094)) add('err',who,'tag de VLAN inválida «'+f('tag')+'»');
      if(!f('ports')) add('err',who,'informe as portas'); else checkPorts(add,who,dialect,f('ports'));
      break;
    case 'svi_ip':
      if(!f('tag')) add('err',who,'informe a VLAN (tag)');
      else if(!vNum(f('tag'),1,4094)) add('err',who,'tag de VLAN inválida «'+f('tag')+'»');
      if(!f('ipmask')) add('err',who,'informe o IP/máscara');
      else if(!vCidr(f('ipmask'))) add('err',who,'IP/máscara inválido «'+f('ipmask')+'» (use ex.: 10.10.0.1/24)');
      break;
    case 'port_state':
      if(!f('ports')) add('err',who,'informe as portas'); else checkPorts(add,who,dialect,f('ports'));
      break;
    case 'port_desc':
      if(!f('ports')) add('err',who,'informe as portas');
      if(!f('desc')) add('err',who,'informe a descrição');
      break;
    case 'hostname':
      if(!f('name')) add('err',who,'informe o nome');
      else if(/\s/.test(f('name'))) add('warn',who,'hostname com espaço — a maioria dos CLIs não aceita');
      break;
    case 'snmp':
      if(!f('community')) add('err',who,'informe a community');
      else if(/^(public|private)$/i.test(f('community'))) add('warn',who,'community «'+f('community')+'» é padrão de fábrica — considere trocar por segurança');
      break;
    case 'ntp': case 'dns':
      if(!f('server')) add('err',who,'informe o(s) servidor(es)');
      else f('server').split(/[\s,]+/).filter(Boolean).forEach(x=>{if(!vHostOrIp(x))add('err',who,'servidor inválido «'+x+'»');});
      break;
    case 'lag':
      if(!f('ports')) add('err',who,'informe as portas membro');
      if(dialect!=='exos'&&!f('id')) add('err',who,'informe o ID do LAG');
      break;
    case 'snmpv3':
      if(!f('user')) add('err',who,'informe o usuário');
      if(!f('authpass')) add('warn',who,'sem senha de autenticação — sairá um placeholder no script');
      else if(f('authpass').length<8) add('warn',who,'senha de autenticação curta (menos de 8 caracteres)');
      if(f('privpass')&&f('privpass').length<8) add('warn',who,'senha de criptografia curta (menos de 8 caracteres)');
      break;
    case 'user_create':
      if(!f('user')) add('err',who,'informe o usuário');
      if(dialect!=='exos'){
        if(!f('password')) add('warn',who,'sem senha — sairá um placeholder no script');
        else if(f('password').length<8) add('warn',who,'senha curta (menos de 8 caracteres)');
      }
      break;
    case 'spbm_isis':
      if(!f('bvid1')) add('err',who,'informe a B-VLAN primária');
      else if(!vNum(f('bvid1'),2,4094)) add('err',who,'B-VLAN primária inválida');
      if(f('bvid2')&&!vNum(f('bvid2'),2,4094)) add('err',who,'B-VLAN secundária inválida');
      if(f('system_id')&&!/^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i.test(f('system_id'))) add('warn',who,'system-id fora do formato xxxx.xxxx.xxxx');
      if(f('nickname')&&!/^[0-9a-f]\.[0-9a-f]{2}\.[0-9a-f]{2}$/i.test(f('nickname'))) add('warn',who,'nickname fora do formato x.xx.xx');
      if(!f('system_id')||!f('nickname')) add('warn',who,'system-id e nickname devem ser únicos no fabric — confira o seu plano');
      break;
    case 'nni': if(!f('ports')) add('err',who,'informe as portas NNI'); break;
    case 'ip_shortcuts':
      if(!f('ip')) add('err',who,'informe o IP do loopback');
      else if(!vCidr(f('ip'))) add('err',who,'IP do loopback inválido (use ex.: 1.1.1.16/32)');
      break;
    case 'l3vsn':
      if(!f('vrf')) add('err',who,'informe o nome da VRF');
      if(f('isid')&&!vNum(f('isid'),1,16777215)) add('err',who,'I-SID inválido «'+f('isid')+'»');
      break;
    case 'mlt':
      if(!f('id')) add('err',who,'informe o ID do MLT');
      if(!f('ports')) add('err',who,'informe as portas membro');
      break;
    case 'static_route':
      if(!f('dest')) add('err',who,'informe a rede de destino (ex.: 0.0.0.0/0 ou 192.168.10.0/24)');
      else if(!vCidr(f('dest'))) add('err',who,'rede de destino inválida «'+f('dest')+'» (use CIDR, ex.: 192.168.10.0/24)');
      if(!f('nexthop')) add('err',who,'informe o next-hop (gateway)');
      else if(!vIp(f('nexthop'))) add('err',who,'next-hop inválido «'+f('nexthop')+'» (informe um IP, ex.: 10.0.0.1)');
      if(f('distance')&&!vNum(f('distance'),1,255)) add('warn',who,'distância administrativa fora de 1–255 «'+f('distance')+'»');
      break;
    case 'lldp':
    case 'cdp':
      if((f('scope')||'global')==='port' && !f('ports')) add('err',who,'escopo "por porta" selecionado, mas nenhuma porta foi informada');
      break;
    case 'banner':
      if(!f('text')) add('err',who,'informe o texto do banner');
      break;
    case 'poe':
      if((f('scope')||'port')==='port' && !f('ports')) add('err',who,'escopo "por porta" selecionado, mas nenhuma porta foi informada');
      if(dialect==='nxos') add('warn',who,'switches Nexus (NX-OS) não fornecem PoE — este item não gera comando');
      break;
    case 'speed':
      if(!f('ports')) add('err',who,'informe a(s) porta(s)');
      if(f('autoneg')!=='on'){
        if(f('speed')&&!vNum(f('speed'),10,100000)) add('warn',who,'velocidade incomum «'+f('speed')+'» (ex.: 10, 100, 1000, 10000)');
        if(f('duplex')&&['full','half','auto'].indexOf(f('duplex'))<0) add('warn',who,'duplex deve ser full, half ou auto «'+f('duplex')+'»');
      }
      break;
    case 'vint':
      if(!f('tag')) add('err',who,'informe a VLAN da interface virtual');
      else if(!vNum(f('tag'),1,4094)) add('err',who,'VLAN inválida «'+f('tag')+'» (use 1–4094)');
      if(!f('ipmask')) add('err',who,'informe o IP/máscara (CIDR)');
      else if(!vCidr(f('ipmask'))) add('err',who,'IP/máscara inválido «'+f('ipmask')+'» (ex.: 10.10.0.1/24)');
      break;
    case 'stp':
      if(f('priority')&&!vNum(f('priority'),0,61440)) add('warn',who,'prioridade fora de 0–61440 «'+f('priority')+'»');
      else if(f('priority')&&(Number(f('priority'))%4096!==0)) add('warn',who,'a prioridade de STP deve ser múltiplo de 4096 «'+f('priority')+'»');
      if(f('tag')&&!vNum(f('tag'),1,4094)) add('warn',who,'VLAN/instância inválida «'+f('tag')+'»');
      break;
    case 'icx_register':
      if(!f('ip')) add('err',who,'informe o IP da controladora (SmartZone/vSZ)');
      else if(!vIp(f('ip'))) add('err',who,'IP da controladora inválido «'+f('ip')+'»');
      break;
    case 'icx_license':
      if(!f('unit')) add('err',who,'informe a unidade (standalone = 1)');
      else if(!vNum(f('unit'),1,12)) add('warn',who,'unidade incomum «'+f('unit')+'» (standalone = 1; em stack, o número da unidade)');
      if(!f('pkg')) add('err',who,'informe o pacote de licença (ex.: l3-prem, macsec, 2x10g)');
      break;
    case 'raw':{
      const txt=f('cmds');
      if(!txt){add('warn',who,'bloco de linhas livres vazio');break;}
      lintCmds(txt,dialect).forEach(e=>add('err',who,'linha '+e.ln+', coluna '+e.col+': '+e.msg+(e.sug?' (sugestão: '+e.sug+')':'')));
      break;}
  }
}
function collectFindings(){
  const F=[];const add=(lv,who,msg)=>F.push({lv,who,msg});
  if(state.mode==='ansible'&&!isNet()){ linuxFindings(add); return F; }
  let cmds,dialect;
  if(state.mode==='ansible'){
    const n=state.net;dialect=TARGETS[state.target].dialect;cmds=n.cmds;
    const devs=n.devices.filter(d=>d.name.trim()||d.ip.trim());
    if(!devs.length) add('err','Inventário','nenhum dispositivo alvo — o playbook não terá onde rodar');
    else{
      let ok=true;
      n.devices.forEach((d,i)=>{
        const ip=(d.ip||'').trim();
        if(ip&&!vIp(ip)&&!/^[A-Za-z]/.test(ip)){add('err','Inventário','IP inválido no dispositivo '+(i+1)+': «'+ip+'»');ok=false;}
        if((d.name.trim()||ip)&&!ip){add('warn','Inventário','dispositivo «'+(d.name.trim()||'?')+'» sem IP de gerência');ok=false;}
      });
      if(ok) add('ok','Inventário',devs.length+' dispositivo(s) ok');
    }
    if(!n.conn.user.trim()) add('warn','Conexão','usuário vazio');
    if(!(n.conn.password||'').trim()) add('warn','Conexão','senha vazia — sairá comentada no hosts.ini (preencha ou use ansible-vault)');
    if(state.target==='generic'){
      if(!n.customOs.trim()) add('err','Alvo genérico','defina o ansible_network_os');
      if(!n.customModule.trim()) add('err','Alvo genérico','defina o módulo de configuração');
    }
  } else { dialect=cliDialect(); cmds=cliSlice().cmds; }
  if(!cmds.length){ add('err','Comandos','nenhum comando definido'); return F; }
  const seen={};
  cmds.forEach((c,i)=>{
    const before=F.length;
    checkCmd(add,c,dialect,i);
    if(c.kind==='vlan_create'){
      vlanList(c).forEach(v=>{
        const tg=(v.tag||'').trim(); if(!tg)return;
        if(seen['v'+tg]!=null) add('warn','Comando '+(i+1)+' — Criar VLAN','VLAN '+tg+' criada mais de uma vez (também no comando '+(seen['v'+tg]+1)+')');
        seen['v'+tg]=i;
      });
    }
    if(c.kind==='hostname'){ if(seen.h!=null) add('warn','Comando '+(i+1)+' — Hostname','hostname definido mais de uma vez'); seen.h=i; }
    if(F.length===before) add('ok','Comando '+(i+1)+' — '+(NET_KINDS[c.kind]||NET_KINDS.raw).label,'ok');
  });
  const createdAt={};
  cmds.forEach((c,i)=>{ if(c.kind==='vlan_create') vlanList(c).forEach(v=>{ const tg=(v.tag||'').trim(); if(tg&&createdAt[tg]==null) createdAt[tg]=i; }); });
  const anyCreated=Object.keys(createdAt).length>0;
  cmds.forEach((c,i)=>{
    if((c.kind==='vlan_ports'||c.kind==='svi_ip')&&(c.tag||'').trim()){
      const tg=c.tag.trim(),ci=createdAt[tg];
      if(ci==null){
        if(anyCreated) add('warn','Comando '+(i+1),'usa a VLAN '+tg+', que não é criada neste script (ok se ela já existir no equipamento)');
      } else if(ci>i){
        add('warn','Comando '+(i+1),'usa a VLAN '+tg+' antes de criá-la (ela só é criada no comando '+(ci+1)+') — mova a criação da VLAN para antes');
      }
    }
  });
  const si=cmds.findIndex(c=>c.kind==='save');
  if(si<0) add('warn','Final do script','sem passo de salvar configuração — as mudanças se perdem ao reiniciar o equipamento');
  else if(si!==cmds.length-1) add('warn','Ordem','o passo de salvar não é o último — considere movê-lo para o fim');
  return F;
}
function linuxFindings(add){
  const a=state.linux;
  const groups=a.groups.filter(g=>g.name.trim());
  if(!groups.length) add('err','Inventário','nenhum grupo definido — o playbook não terá onde rodar');
  else{
    let ok=true;
    groups.forEach(g=>{
      const hosts=g.hosts.filter(h=>h.name.trim());
      if(!hosts.length){add('warn','Inventário','grupo «'+g.name.trim()+'» sem hosts');ok=false;}
      hosts.forEach(h=>{const ip=(h.ip||'').trim();
        if(ip&&!vIp(ip)&&!/^[A-Za-z]/.test(ip)){add('err','Inventário','IP inválido em «'+h.name.trim()+'»: «'+ip+'»');ok=false;}});
    });
    if(ok) add('ok','Inventário',groups.length+' grupo(s) ok');
  }
  const ph=(a.play.hosts||'').trim();
  if(ph&&ph!=='all'&&groups.length&&!groups.some(g=>g.name.trim()===ph))
    add('warn','Play','hosts «'+ph+'» não corresponde a nenhum grupo do inventário');
  if(!a.tasks.length){ add('err','Tarefas','nenhuma tarefa definida'); return; }
  a.tasks.forEach((t,i)=>{
    const who='Tarefa '+(i+1)+(t.name?' — '+t.name:'');
    const before=[];let bad=false;
    if(!(t.module||'').trim()){ add('err',who,'sem módulo Ansible (ex.: ansible.builtin.apt)'); bad=true; }
    t.params.forEach(pp=>{ if(!pp.k.trim()&&(pp.val||'').trim()){ add('warn',who,'parâmetro com valor mas sem chave'); bad=true; } });
    if(!bad) add('ok',who,'ok');
  });
}
function testTitle(){ return state.mode==='ansible'?TARGETS[state.target].label:cliLabel(); }
function runScriptTest(){
  const F=collectFindings();
  const errs=F.filter(x=>x.lv==='err'),warns=F.filter(x=>x.lv==='warn'),oks=F.filter(x=>x.lv==='ok');
  let m=document.getElementById('testModal');
  if(!m){m=document.createElement('div');m.id='testModal';m.className='tmodal';
    m.onclick=e=>{if(e.target===m)m.classList.remove('show');};document.body.appendChild(m);}
  const icon={err:'✗',warn:'⚠',ok:'✓'},cls={err:'t-err',warn:'t-warn',ok:'t-ok'};
  const head= errs.length? '❌ '+errs.length+' erro(s) para corrigir'
            : warns.length? '🟡 Sem erros, com '+warns.length+' aviso(s) para revisar'
            : '✅ Nenhum problema encontrado';
  const list=F.filter(x=>x.lv!=='ok').concat(oks).map(x=>
    '<div class="titem '+cls[x.lv]+'"><span class="tic">'+icon[x.lv]+'</span><div><b>'+esc(x.who)+':</b> '+esc(x.msg)+'</div></div>').join('');
  m.innerHTML='<div class="tpanel">'
    +'<div class="thead"><span>🧪 Teste do script — '+esc(testTitle())+'</span>'
    +'<button class="icon-btn" title="fechar" onclick="document.getElementById(&quot;testModal&quot;).classList.remove(&quot;show&quot;)">✕</button></div>'
    +'<div class="tsum">'+head+' <span class="tmini">('+errs.length+' erro(s) · '+warns.length+' aviso(s) · '+oks.length+' ok)</span></div>'
    +'<div class="tbody">'+(list||'<div class="titem t-ok"><span class="tic">✓</span><div>nada a verificar</div></div>')+'</div>'
    +'<div class="tfoot">Simulação local: confere preenchimento, formatos e digitação. Não substitui o teste no equipamento — revise antes de aplicar em produção.</div>'
    +'</div>';
  m.classList.add('show');
}

