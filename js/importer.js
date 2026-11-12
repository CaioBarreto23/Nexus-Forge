/* ===================== IMPORTAÇÃO (.yml / .txt / .json) ===================== */
const MOD2TARGET={'cisco.ios.ios_config':'cisco_ios','cisco.nxos.nxos_config':'cisco_nxos',
  'community.network.exos_config':'exos','community.network.icx_config':'ruckus_icx','community.network.voss_config':'voss'};
function maskToPrefix(m){const p=(m||'').split('.').map(Number);if(p.length!==4||p.some(isNaN))return null;
  let b='';p.forEach(o=>b+=(o>>>0).toString(2).padStart(8,'0'));const i=b.indexOf('0');
  return i===-1?32:(b.slice(i).indexOf('1')===-1?i:null);}
function toCidr(ip,mask){if(/\//.test(ip))return ip;const pf=maskToPrefix(mask);return pf==null?(ip+(mask?(' '+mask):'')):(ip+'/'+pf);}
function unq(x){x=String(x==null?'':x).trim(); if(/^".*"$/.test(x))return x.slice(1,-1).replace(/\\"/g,'"').replace(/\\\\/g,'\\'); if(/^'.*'$/.test(x))return x.slice(1,-1); return x;}

function importDef(ev){
  const file=ev.target.files[0]; if(!file) return;
  const nm=(file.name||'').toLowerCase();
  const r=new FileReader();
  r.onload=()=>{
    try{
      const text=String(r.result||'');
      if(nm.endsWith('.json')){ const d=JSON.parse(text); state=Object.assign(freshState(),d); }
      else if(nm.endsWith('.yml')||nm.endsWith('.yaml')){ importAnsible(text); }
      else { importCli(text); }
      activeTab=0; render(); toast('Arquivo importado');
    }catch(e){ toast('Falha ao importar: '+(e&&e.message?e.message:e)); }
  };
  r.readAsText(file); ev.target.value='';
}

function importAnsible(text){
  const raw=text.replace(/\r/g,'').split('\n');
  let module='';
  raw.some(l=>{const m=l.match(/^\s+([a-z0-9_]+\.[a-z0-9_]+\.[a-z0-9_]+)\s*:\s*$/);
    if(m&&/_config$/.test(m[1])){module=m[1];return true;}return false;});
  const netMode=!!module || /connection:\s*network_cli/.test(text);
  const nameLine=raw.find(l=>/^\s*-?\s*name:/.test(l))||'';
  const playName=unq(nameLine.replace(/^\s*-?\s*name:\s*/,''));
  if(netMode){
    const target=MOD2TARGET[module]||'generic';
    state=freshState(); state.mode='ansible'; state.target=target; state.net.meta.name=playName||'';
    if(target==='generic'){ const os=(text.match(/ansible_network_os\s*[=:]\s*([^\s"']+)/)||[])[1]||''; state.net.customOs=os; state.net.customModule=module||''; }
    const tasks=parseYamlTasks(raw), cmds=[];
    for(let i=0;i<tasks.length;i++){
      const t=tasks[i];
      if(t.save_when){ cmds.push({kind:'save',comment:t.name||''}); continue; }
      if(target==='ruckus_icx' && /^vlan\s+\d+$/.test((t.parents||[])[0]||'') && /router-interface ve/.test((t.lines||[]).join(' ')) && tasks[i+1] && /^interface ve/.test((tasks[i+1].parents||[])[0]||'')){
        const tag=(t.parents[0].match(/vlan\s+(\d+)/)||[])[1];
        const ipl=(tasks[i+1].lines||[]).join(' ').match(/ip address\s+([\d.]+)\s+([\d.]+)/);
        if(tag&&ipl){ cmds.push({kind:'svi_ip',comment:t.name||'',tag:tag,ipmask:toCidr(ipl[1],ipl[2])}); i++; continue; }
      }
      cmds.push(reverseUnit(target,t.parents,t.lines,t.name));
    }
    for(let i=cmds.length-1;i>=0;i--){ if(cmds[i].kind==='raw'&&String(cmds[i].cmds||'').trim()==='feature lacp'&&((cmds[i+1]&&cmds[i+1].kind==='lag')||(cmds[i-1]&&cmds[i-1].kind==='lag'))) cmds.splice(i,1); }
    state.net.cmds=cmds;
  } else {
    state=freshState(); state.target='linux'; state.linux.play.name=playName||'';
    const h=(text.match(/^\s+hosts:\s*(.+)$/m)||[])[1]; if(h) state.linux.play.hosts=unq(h);
    state.linux.play.become=/become:\s*true/.test(text);
    state.linux.play.facts=!/gather_facts:\s*false/.test(text);
    const vi=raw.findIndex(l=>/^\s+vars:\s*$/.test(l));
    if(vi>=0){ for(let i=vi+1;i<raw.length;i++){ const l=raw[i]; if(!l.trim())continue; const mm=l.match(/^\s{4}([a-z0-9_]+):\s*(.+)$/i); if(mm){state.linux.vars.push({k:mm[1],val:unq(mm[2])});} else if(!/^\s{4}\S/.test(l)) break; } }
    state.linux.tasks=parseLinuxTasks(raw);
  }
}

function parseYamlTasks(raw){
  let ti=raw.findIndex(l=>/^\s*tasks:\s*$/.test(l)); if(ti<0) return [];
  const tasks=[]; let cur=null, sect=null, m;
  for(let i=ti+1;i<raw.length;i++){
    const l=raw[i]; if(!l.trim()) continue;
    if(/^\s*-\s+name:/.test(l)){ if(cur)tasks.push(cur); cur={name:unq(l.replace(/^\s*-\s+name:\s*/,'')),parents:[],lines:[],save_when:'',module:''}; sect=null; continue; }
    if(!cur){ if(/^\S/.test(l))break; continue; }
    if(/^\S/.test(l)) break;
    if(m=l.match(/^\s+save_when:\s*(.+)$/)){ cur.save_when=unq(m[1]); continue; }
    if(m=l.match(/^\s+parents:\s*(.+)$/)){ cur.parents=[unq(m[1])]; sect=null; continue; }
    if(/^\s+parents:\s*$/.test(l)){ sect='parents'; continue; }
    if(/^\s+lines:\s*$/.test(l)){ sect='lines'; continue; }
    if(m=l.match(/^\s+-\s+(.*)$/)){ if(sect==='parents')cur.parents.push(unq(m[1])); else if(sect==='lines')cur.lines.push(unq(m[1])); continue; }
    if(m=l.match(/^\s+([a-z0-9_.]+):\s*$/)){ if(!/^(parents|lines)$/.test(m[1])&&!cur.module)cur.module=m[1]; sect=null; continue; }
  }
  if(cur)tasks.push(cur);
  return tasks;
}

function parseLinuxTasks(raw){
  let ti=raw.findIndex(l=>/^\s*tasks:\s*$/.test(l)); if(ti<0) return [];
  const tasks=[]; let cur=null, sect=null, lref=null, m;
  const mk=n=>({name:n,module:'',params:[],when:'',loop:'',register:'',tags:'',notify:''});
  for(let i=ti+1;i<raw.length;i++){
    const l=raw[i]; if(!l.trim()) continue;
    if(/^\s*-\s+name:/.test(l)){ if(cur)tasks.push(cur); cur=mk(unq(l.replace(/^\s*-\s+name:\s*/,''))); sect=null; lref=null; continue; }
    if(!cur){ if(/^\S/.test(l))break; continue; }
    if(/^\S/.test(l)) break;
    if(m=l.match(/^\s{6}when:\s*(.+)$/)){ cur.when=unq(m[1]); sect=null; continue; }
    if(m=l.match(/^\s{6}register:\s*(.+)$/)){ cur.register=m[1].trim(); sect=null; continue; }
    if(m=l.match(/^\s{6}tags:\s*\[(.+)\]$/)){ cur.tags=m[1].split(',').map(x=>unq(x)).join(','); sect=null; continue; }
    if(m=l.match(/^\s{6}notify:\s*(.+)$/)){ cur.notify=unq(m[1]); sect=null; continue; }
    if(/^\s{6}loop:\s*$/.test(l)){ sect='loop'; continue; }
    if(/^\s{6}notify:\s*$/.test(l)){ sect='notify'; continue; }
    if(m=l.match(/^\s{8}([a-z0-9_]+):\s*(.+)$/)){ const v=unq(m[2]); cur.params.push({k:m[1],val:v,type:/^-?\d+$/.test(v)?'int':(/^(true|false)$/.test(v)?'bool':'str')}); sect=null; lref=null; continue; }
    if(m=l.match(/^\s{8}([a-z0-9_]+):\s*$/)){ lref={k:m[1],items:[]}; cur.params.push({k:m[1],val:'',type:'list',_r:lref}); sect='plist'; continue; }
    if(m=l.match(/^\s{8}-\s+(.*)$/)){ if(sect==='loop'){cur.loop+=(cur.loop?'\n':'')+unq(m[1]);} else if(sect==='notify'){cur.notify+=(cur.notify?',':'')+unq(m[1]);} continue; }
    if(m=l.match(/^\s{10}-\s+(.*)$/)){ if(lref){ lref.items.push(unq(m[1])); const p=cur.params.find(x=>x._r===lref); if(p)p.val=lref.items.join('\n'); } continue; }
    if(m=l.match(/^\s{6}([a-z0-9_.]+):\s*$/)){ if(!cur.module)cur.module=m[1]; sect=null; continue; }
  }
  if(cur)tasks.push(cur);
  tasks.forEach(t=>t.params.forEach(p=>{delete p._r;}));
  return tasks;
}

function importCli(text,forceMode){
  const raw=text.replace(/\r/g,'').split('\n'); const t=text.toLowerCase();
  let mode;
  if(forceMode){ mode=forceMode; }
  else{
    let ex=0,ru=0,fa=0;
    [/create vlan/,/configure vlan/,/configure ports/,/configure sntp/,/enable sntp/,/save configuration/,/configure snmp/].forEach(re=>{if(re.test(t))ex++;});
    [/configure terminal/,/write memory/,/router-interface ve/,/interface ve/,/ ethernet /].forEach(re=>{if(re.test(t))ru++;});
    [/vlan create /,/vlan i-sid /,/vlan members add /,/port-mstprstp/,/save config\b/,/interface gigabitethernet/].forEach(re=>{if(re.test(t))fa++;});
    if(/^#/m.test(text))ex++; if(/^!/m.test(text))ru++;
    mode='exos';let b=ex; if(ru>b){mode='ruckus';b=ru;} if(fa>b){mode='fabric';b=fa;}
    if(/vlan create |vlan i-sid |vlan members add |port-mstprstp|save config\b/.test(t)) mode='fabric';
  }
  state=freshState(); state.mode=mode;
  const metaC=(raw.find(l=>{const x=l.trim();return (x[0]==='#'||x[0]==='!')&&!/gerado automaticamente|revise antes/i.test(x);})||'').trim().replace(/^[#!]+\s*/,'');
  const blocks=cliBlocks(raw,mode), cmds=[];
  blocks.forEach(b=>{ if(b.save){cmds.push({kind:'save',comment:b.comment||''});return;} const r=reverseCliBlock(mode,b.lines,b.comment); if(Array.isArray(r)){ r.forEach(x=>{ if(x)cmds.push(x); }); } else if(r){ cmds.push(r); } });
  state.cli[mode]={meta:{name:metaC||''},cmds:cmds};
}

function cliBlocks(raw,mode){
  const blocks=[]; let cur={comment:'',lines:[]};
  const flush=()=>{ if(cur.lines.length) blocks.push(cur); cur={comment:'',lines:[]}; };
  for(let i=0;i<raw.length;i++){
    const l=raw[i], t=l.trim();
    if(!t){ flush(); continue; }
    if(t[0]==='#'||t[0]==='!'){ const c=t.replace(/^[#!]+\s*/,''); if(/gerado automaticamente|revise antes/i.test(c))continue; flush(); cur.comment=c; continue; }
    if((mode==='ruckus'||mode==='fabric')&&/^(configure terminal|end)$/.test(t)) continue;
    if(mode==='fabric'&&/^enable$/.test(t)) continue;
    if((mode==='ruckus'&&/^write memory$/.test(t))||(mode==='fabric'&&/^save config$/.test(t))||(mode==='exos'&&/^save configuration$/.test(t))){ flush(); blocks.push({save:true,comment:''}); continue; }
    cur.lines.push((mode==='ruckus'||mode==='fabric')?l:t);
  }
  flush();
  return blocks;
}

function reverseFabricBlock(lines,comment){
  const T=lines.map(x=>x.trim()).filter(Boolean), J=T.join(' '), cm=comment||'';
  if(/spbm-bvlan/.test(J)||/nick-name/.test(J)||/manual-area/.test(J)){
    const bv=T.filter(x=>/type spbm-bvlan/.test(x)).map(x=>(x.match(/vlan create\s+(\d+)/)||[])[1]);
    const parts=((J.match(/b-vid\s+([\d,]+)/)||[])[1]||'').split(',');
    return {kind:'spbm_isis',comment:cm,bvid1:bv[0]||parts[0]||'',bvid2:bv[1]||parts[1]||'',
      nickname:(J.match(/nick-name\s+(\S+)/)||[])[1]||'',system_id:(J.match(/system-id\s+(\S+)/)||[])[1]||'',area:(J.match(/manual-area\s+(\S+)/)||[])[1]||''};
  }
  if(/ip-source-address/.test(J)||/spbm 1 ip enable/.test(J)){
    const ipl=T.find(x=>/^ip address /.test(x))||''; const ip=ipl.match(/ip address\s+([\d.]+)(?:\s+([\d.]+)|(\/\d+))/);
    return {kind:'ip_shortcuts',comment:cm,loopback:(J.match(/interface loopback\s+(\d+)/)||[])[1]||'',ip:ip?(ip[3]?(ip[1]+ip[3]):toCidr(ip[1],ip[2])):''};
  }
  if(/ipvpn/.test(J)&&/i-sid/.test(J)&&/vrf/.test(J)){
    return {kind:'l3vsn',comment:cm,vrf:(J.match(/(?:ip vrf|router vrf)\s+(\S+)/)||[])[1]||'',vrfid:(J.match(/vrfid\s+(\d+)/)||[])[1]||'',isid:(J.match(/i-sid\s+(\S+)/)||[])[1]||''};
  }
  if(/^mlt\s+\d+/.test(T[0]||'')||/\bmlt\s+\d+\s+member/.test(J)){
    return {kind:'mlt',comment:cm,id:(J.match(/mlt\s+(\d+)/)||[])[1]||'',ports:(J.match(/mlt\s+\d+\s+member\s+(\S+)/)||[])[1]||'',mode:/encapsulation dot1q/.test(J)?'trunk':'access',smlt:/\bsmlt\b/.test(J)?'smlt':'standalone'};
  }
  if(/interface gigabitEthernet/i.test(J)&&/isis spbm/.test(J)){
    return {kind:'nni',comment:cm,ports:(J.match(/interface gigabitEthernet\s+(\S+)/i)||[])[1]||''};
  }
  { const m=(T[0]||'').match(/^username\s+(\S+)\s+(\S+)\s+access-level\s+(\S+)$/);
    if(m) return {kind:'user_create',comment:cm,user:m[1],password:m[2],role:m[3]}; }
  return null;
}
function reverseCliBlock(mode,lines,comment){
  if(mode==='exos'){
    const t=lines.map(x=>x.trim()).filter(Boolean);
    return reverseExosLines(t,comment);
  }
  const target=mode==='fabric'?'voss':'ruckus_icx';
  if(mode==='fabric'){ const rf=reverseFabricBlock(lines,comment); if(rf) return rf; }
  const groups=[]; let cur=null; const flat=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i]; if(!l.trim())continue; const indented=/^\s+/.test(l); const tx=l.trim();
    if(tx==='exit'){ if(cur){groups.push(cur);cur=null;} continue; }
    if(indented){ if(cur)cur.kids.push(tx); else flat.push(tx); continue; }
    const nxt=lines[i+1];
    if(nxt&&/^\s+\S/.test(nxt)){ if(cur)groups.push(cur); cur={parent:tx,kids:[]}; }
    else { if(cur){groups.push(cur);cur=null;} flat.push(tx); }
  }
  if(cur)groups.push(cur);
  if(mode==='ruckus' && groups.length===2 && !flat.length && /^vlan\s+\d+$/.test(groups[0].parent) && /router-interface ve/.test(groups[0].kids.join(' ')) && /^interface ve/.test(groups[1].parent)){
    const tag=(groups[0].parent.match(/vlan\s+(\d+)/)||[])[1];
    const ipl=groups[1].kids.join(' ').match(/ip address\s+([\d.]+)\s+([\d.]+)/);
    if(tag&&ipl) return {kind:'svi_ip',comment:comment||'',tag:tag,ipmask:toCidr(ipl[1],ipl[2])};
  }
  if(mode==='fabric' && groups.length===1 && flat.length && /vlan members add/.test(flat.join(' ')) && /encapsulation dot1q/.test(groups[0].kids.join(' '))){
    const mm=flat.join(' ').match(/vlan members add\s+(\S+)\s+(\S+)/);
    if(mm) return {kind:'vlan_ports',comment:comment||'',tag:mm[1],ports:mm[2],mode:'trunk'};
  }
  if(groups.length===1 && !flat.length) return reverseUnit(target,[groups[0].parent],groups[0].kids,comment);
  if(!groups.length && flat.length) return reverseUnit(target,[],flat,comment);
  return {kind:'raw',comment:comment||'',cmds:lines.map(x=>x.trim()).filter(Boolean).join('\n')};
}

/* Parser EXOS fiel: processa linha a linha. Só converte para um "kind"
   estruturado quando a geração reproduz exatamente a linha original; caso
   contrário mantém a(s) linha(s) como bloco 'raw' verbatim, garantindo que
   nada do script importado seja perdido ou alterado. O comentário do bloco
   fica no primeiro comando gerado. */
function reverseExosLines(T,comment){
  const out=[]; let rawBuf=[];
  const flushRaw=()=>{ if(rawBuf.length){ out.push({kind:'raw',comment:'',cmds:rawBuf.join('\n')}); rawBuf=[]; } };
  for(let i=0;i<T.length;i++){
    const line=T[i]; let m, cmd=null;
    // Consolidação inteligente de VLAN: "create vlan <nome>" seguido de
    // "configure vlan <nome> tag <N>" vira um único comando create+tag.
    let mc=line.match(/^create vlan\s+(?:"([^"]+)"|(\S+))\s*$/);
    if(mc){
      const nome=mc[1]||mc[2];
      const nxt=T[i+1]||'';
      const mt=nxt.match(/^configure vlan\s+(\S+)\s+tag\s+(\d+)\s*$/);
      if(mt && mt[1]===nome){
        flushRaw();
        out.push({kind:'vlan_create',comment:'',tag:mt[2],name:nome});
        i++; // consome a linha da tag
        continue;
      }
    }
    // DNS (dns-client): agrupa name-servers consecutivos com o mesmo vr.
    let md=line.match(/^configure dns-client add name-server\s+(\S+)(?:\s+vr\s+(\S+))?\s*$/);
    if(md){
      const vr=md[2]||''; const servers=[md[1]]; let dom=''; let j=i+1;
      while(j<T.length){
        const mm=T[j].match(/^configure dns-client add name-server\s+(\S+)(?:\s+vr\s+(\S+))?\s*$/);
        if(mm && (mm[2]||'')===vr){ servers.push(mm[1]); j++; continue; }
        const dm=T[j].match(/^configure dns-client default-domain\s+(.+)$/);
        if(dm && !dom){ dom=dm[1].trim(); j++; continue; }
        break;
      }
      flushRaw();
      out.push({kind:'dns',comment:'',server:servers.join(' '),domain:dom,vr:vr});
      i=j-1; continue;
    }
    // NTP (formato moderno): "enable ntp [vr X]" + "configure ntp server add <ip> [vr X]".
    let mn=line.match(/^enable ntp(?:\s+vr\s+(\S+))?\s*$/);
    if(mn){
      const vr=mn[1]||''; const servers=[]; let j=i+1; let ok=true;
      while(j<T.length){
        const mm=T[j].match(/^configure ntp server add\s+(\S+)(?:\s+vr\s+(\S+))?\s*$/);
        if(mm){ if((mm[2]||'')!==vr){ok=false;break;} servers.push(mm[1]); j++; continue; }
        break;
      }
      if(ok && servers.length){
        flushRaw();
        out.push({kind:'ntp',comment:'',server:servers.join(' '),vr:vr});
        i=j-1; continue;
      }
    }
    // hostname / sysName
    if(m=line.match(/^configure snmp sysName\s+(.+)$/)) cmd={kind:'hostname',name:m[1].trim()};
    // descrição de porta
    else if(m=line.match(/^configure ports\s+(.+?)\s+description-string\s+(.+)$/)) cmd={kind:'port_desc',ports:m[1],desc:m[2].trim()};
    // estado da porta
    else if(m=line.match(/^(enable|disable) ports\s+(.+)$/)) cmd={kind:'port_state',state:m[1],ports:m[2]};
    // IP de VLAN (SVI) — só o próprio ipaddress; ipforwarding é preservado à parte
    else if(m=line.match(/^configure vlan\s+(\S+)\s+ipaddress\s+(.+)$/)) cmd={kind:'svi_ip',tag:m[1],ipmask:m[2].trim()};
    // adição de portas à VLAN
    else if(m=line.match(/^configure vlan\s+(\S+)\s+add ports\s+(.+?)\s+(untagged|tagged)$/)) cmd={kind:'vlan_ports',tag:m[1],ports:m[2],mode:m[3]};
    // LAG (agregação): enable sharing <master> grouping <portas> algorithm <alg> [lacp]
    else if(m=line.match(/^enable sharing\s+(\S+)\s+grouping\s+(\S+)\s+algorithm\s+(.+?)(\s+lacp)?$/))
      cmd={kind:'lag',id:m[1],ports:m[2],algorithm:m[3].trim(),lacp:(m[4]?'active':'static')};
    // (rotas iproute ficam como raw para preservar a forma exata, ex.: "default")
    // conta de usuário só quando a senha é simples (round-trip garantido);
    // contas com hash "encrypted" ficam como raw para não serem alteradas.
    else if(!/\bencrypted\b/.test(line) && (m=line.match(/^create account\s+(\S+)\s+(\S+)\s+(\S+)$/))) cmd={kind:'user_create',role:m[1],user:m[2],password:m[3]};
    // (mantém 'raw' para tudo o mais, inclusive:
    //  configure slot / sys-recovery-level / vlan delete/tag / vr / enable sharing /
    //  create vlan / enable ipforwarding / configure account admin encrypted /
    //  access-list / log target / snmpv3 / mstp / dns-client / ntp / etc.)
    if(cmd){ flushRaw(); out.push(cmd); }
    else rawBuf.push(line);
  }
  flushRaw();
  // aplica o comentário do bloco ao primeiro comando gerado
  if(out.length){ out[0].comment=comment||''; }
  else if(comment){ out.push({kind:'raw',comment:comment,cmds:''}); }
  return out;
}
function reverseUnit(target,parents,lines,name){
  const d=TARGETS[target]?TARGETS[target].dialect:'generic';
  parents=parents||[]; lines=(lines||[]).map(x=>String(x).trim()).filter(Boolean);
  const P=parents.join(' ').trim(), L=lines, J=L.join(' '), first=(L[0]||P||'').trim(), cm=name||'', noP=!parents.length;
  const raw=()=>({kind:'raw',comment:cm,cmds:(parents.length?parents.concat(lines):lines).join('\n')});
  let m;
  if(d==='ios'||d==='nxos'){
    if(noP && L.length && L.every(x=>/^ntp server /.test(x))) return {kind:'ntp',comment:cm,server:L.map(x=>x.replace(/^ntp server\s+/,'')).join(' ')};
    if(noP && L.some(x=>/^ip name-server /.test(x))){ const srv=L.filter(x=>/^ip name-server /.test(x)).map(x=>x.replace(/^ip name-server\s+/,'')).join(' '); const dom=(L.find(x=>/^ip domain[- ]name /.test(x))||'').replace(/^ip domain[- ]name\s+/,''); return {kind:'dns',comment:cm,server:srv,domain:dom}; }
    if(noP && /snmp-server user\s+\S+/.test(J) && /v3 auth/.test(J)){ m=J.match(/snmp-server user\s+(\S+).*?v3 auth (\S+) (\S+)/); const pv=J.match(/priv (aes(?:[ -]?128)?|des) (\S+)/); if(m) return {kind:'snmpv3',comment:cm,user:m[1],authproto:m[2],authpass:m[3],privproto:pv?(/aes/.test(pv[1])?'aes':'des'):'aes',privpass:pv?pv[2]:''}; }
    if(noP && (m=first.match(/^username\s+(\S+)\s+privilege\s+(\S+)\s+secret\s+(.+)$/))) return {kind:'user_create',comment:cm,user:m[1],role:m[2],password:m[3]};
    if(noP && (m=first.match(/^username\s+(\S+)\s+password\s+(.+?)\s+role\s+(\S+)$/))) return {kind:'user_create',comment:cm,user:m[1],password:m[2],role:m[3]};
    if(noP && L.length===1 && /^ip routing$/.test(first)) return {kind:'inter_vlan',comment:cm,vlans:''};
    if(noP && L.length===1 && /^feature interface-vlan$/.test(first)) return {kind:'inter_vlan',comment:cm,vlans:''};
    if(/^interface range /.test(P) && (m=J.match(/channel-group\s+(\S+)\s+mode\s+(\S+)/))) return {kind:'lag',comment:cm,id:m[1],ports:P.replace(/^interface range\s+/,''),lacp:(m[2]==='on'?'static':m[2])};
    if(/^interface \S/.test(P) && (m=J.match(/channel-group\s+(\S+)\s+mode\s+(\S+)/))) return {kind:'lag',comment:cm,id:m[1],ports:P.replace(/^interface\s+/,''),lacp:(m[2]==='on'?'static':m[2])};
    if(m=P.match(/^vlan\s+(\d+)$/)){ const nm=(L.find(x=>/^name /.test(x))||'').replace(/^name\s+/,''); return {kind:'vlan_create',comment:cm,tag:m[1],name:nm}; }
    if(m=P.match(/^interface\s+[Vv]lan\s*(\d+)$/)){ const ip=J.match(/ip address\s+([\d.]+)(?:\s+([\d.]+)|(\/\d+))/); if(ip) return {kind:'svi_ip',comment:cm,tag:m[1],ipmask:ip[3]?(ip[1]+ip[3]):toCidr(ip[1],ip[2])}; }
    if(m=P.match(/^interface\s+(.+)$/)){
      const iface=m[1];
      if(/switchport mode trunk/.test(J)) return {kind:'vlan_ports',comment:cm,ports:iface,mode:'trunk',tag:(J.match(/allowed vlan\s+([0-9,\-]+)/)||[])[1]||''};
      if(/switchport mode access/.test(J)) return {kind:'vlan_ports',comment:cm,ports:iface,mode:'access',tag:(J.match(/access vlan\s+(\d+)/)||[])[1]||''};
      if(L.some(x=>/^description /.test(x))) return {kind:'port_desc',comment:cm,ports:iface,desc:(L.find(x=>/^description /.test(x))||'').replace(/^description\s+/,'')};
      if(L.some(x=>/^(no )?shutdown$/.test(x))) return {kind:'port_state',comment:cm,ports:iface,state:(L.some(x=>/^shutdown$/.test(x))?'disable':'enable')};
    }
    if(m=first.match(/^hostname\s+(.+)$/)) return {kind:'hostname',comment:cm,name:m[1]};
    return raw();
  }
  if(d==='exos'){
    if(L.some(x=>/^configure sntp-client|^enable sntp-client/.test(x))){ const srv=L.filter(x=>/^configure sntp-client/.test(x)).map(x=>x.replace(/^configure sntp-client\s+(?:primary|secondary)\s+/,'')).join(' '); return {kind:'ntp',comment:cm,server:srv}; }
    if(L.some(x=>/^configure dns-client/.test(x))){ const srv=L.filter(x=>/add name-server/.test(x)).map(x=>x.replace(/^configure dns-client add name-server\s+/,'')).join(' '); const dom=(L.find(x=>/default-domain/.test(x))||'').replace(/^configure dns-client default-domain\s+/,''); return {kind:'dns',comment:cm,server:srv,domain:dom}; }
    if(m=first.match(/^enable sharing\s+(\S+)\s+grouping\s+(.+?)\s+algorithm\s+(.+?)(\s+lacp)?$/)) return {kind:'lag',comment:cm,id:m[1],ports:m[2],algorithm:m[3].trim(),lacp:(m[4]?'active':'static')};
    if(m=first.match(/^configure snmpv3 add user\s+(\S+)\s+authentication\s+(\S+)\s+auth-passphrase\s+(\S+)(?:\s+privacy\s+(\S+)\s+priv-passphrase\s+(\S+))?/)) return {kind:'snmpv3',comment:cm,user:m[1],authproto:m[2],authpass:m[3],privproto:m[4]||'aes',privpass:m[5]||''};
    if(L.some(x=>/^enable ipforwarding/.test(x))){ const vs=L.filter(x=>/vlan /.test(x)).map(x=>(x.match(/vlan\s+(\S+)/)||[])[1]).filter(Boolean).join(','); return {kind:'inter_vlan',comment:cm,vlans:vs}; }
    if(m=first.match(/^create account\s+(\S+)\s+(\S+)(?:\s+(\S+))?$/)) return {kind:'user_create',comment:cm,role:m[1],user:m[2],password:m[3]||''};
    {
      const vlanLines=L.filter(x=>/^create vlan\s+/.test(x));
      if(vlanLines.length>1){
        const parse=x=>{ let mm=x.match(/^create vlan\s+(\d+)\s*$/); if(mm)return{tag:mm[1],name:'',isid:''}; mm=x.match(/^create vlan\s+(\S+)(?:\s+tag\s+(\d+))?/); if(mm)return{tag:mm[2]||'',name:mm[1],isid:''}; return null; };
        const parsed=vlanLines.map(parse).filter(Boolean);
        if(parsed.length>1){ const first0=parsed[0]; return {kind:'vlan_create',comment:cm,tag:first0.tag,name:first0.name,extra:parsed.slice(1)}; }
      }
    }
    if(m=first.match(/^create vlan\s+(\d+)\s*$/)) return {kind:'vlan_create',comment:cm,tag:m[1]};
    if(m=first.match(/^create vlan\s+(\S+)(?:\s+tag\s+(\d+))?/)) return {kind:'vlan_create',comment:cm,name:m[1],tag:m[2]||''};
    if(m=first.match(/^configure vlan\s+([0-9,\-]+)\s+add ports\s+(.+?)\s+(untagged|tagged)$/)) return {kind:'vlan_ports',comment:cm,tag:m[1],ports:m[2],mode:m[3]};
    if(m=first.match(/^configure vlan\s+(\d+)\s+ipaddress\s+(.+)$/)) return {kind:'svi_ip',comment:cm,tag:m[1],ipmask:m[2].trim()};
    if(m=first.match(/^configure ports\s+(.+?)\s+description-string\s+(.+)$/)) return {kind:'port_desc',comment:cm,ports:m[1],desc:m[2]};
    if(m=first.match(/^(enable|disable) ports\s+(.+)$/)) return {kind:'port_state',comment:cm,state:m[1],ports:m[2]};
    if(m=first.match(/^configure snmp sysName\s+(.+)$/)) return {kind:'hostname',comment:cm,name:m[1]};
    return raw();
  }
  if(d==='icx'){
    if(/^ntp$/.test(P)) return {kind:'ntp',comment:cm,server:L.map(x=>x.replace(/^server\s+/,'')).join(' ')};
    if(m=P.match(/^lag\s+"?LAG?(\S+?)"?\s+(dynamic|static)\s+id\s+(\d+)$/)){ const ports=(L.find(x=>/^ports ethernet /.test(x))||'').replace(/^ports ethernet\s+/,''); return {kind:'lag',comment:cm,id:m[3],ports:ports,lacp:(m[2]==='static'?'static':'active')}; }
    if(m=first.match(/^vlan\s+(\d+)\s+name\s+(.+)$/)) return {kind:'vlan_create',comment:cm,tag:m[1],name:m[2]};
    if(m=P.match(/^vlan\s+(\d+)$/)){ const pm=J.match(/(untagged|tagged) ethernet\s+(.+?)\s*$/); if(pm) return {kind:'vlan_ports',comment:cm,tag:m[1],ports:pm[2],mode:(pm[1]==='untagged'?'access':'trunk')}; }
    if(m=P.match(/^interface ethernet\s+(.+)$/)){
      if(L.some(x=>/^port-name /.test(x))) return {kind:'port_desc',comment:cm,ports:m[1],desc:(L.find(x=>/^port-name /.test(x))||'').replace(/^port-name\s+/,'')};
      if(L.some(x=>/^(enable|disable)$/.test(x))) return {kind:'port_state',comment:cm,ports:m[1],state:(L.some(x=>/^disable$/.test(x))?'disable':'enable')};
    }
    if(noP && L.some(x=>/^ip dns server-address/.test(x))){ const srv=(L.find(x=>/^ip dns server-address/.test(x))||'').replace(/^ip dns server-address\s+/,''); const dom=(L.find(x=>/^ip dns domain-list/.test(x))||'').replace(/^ip dns domain-list\s+/,''); return {kind:'dns',comment:cm,server:srv,domain:dom}; }
    if(noP && /snmp-server user\s+\S+/.test(J) && /v3 auth/.test(J)){ m=J.match(/snmp-server user\s+(\S+)\s+\S+\s+v3 auth (\S+) (\S+)(?:\s+priv (\S+) (\S+))?/); if(m) return {kind:'snmpv3',comment:cm,user:m[1],authproto:m[2],authpass:m[3],privproto:m[4]||'aes',privpass:m[5]||''}; }
    if(noP && (m=first.match(/^username\s+(\S+)\s+privilege\s+(\S+)\s+password\s+(.+)$/))) return {kind:'user_create',comment:cm,user:m[1],role:m[2],password:m[3]};
    if(m=first.match(/^hostname\s+(.+)$/)) return {kind:'hostname',comment:cm,name:m[1]};
    return raw();
  }
  if(d==='voss'){
    if(L.some(x=>/^vlan create /.test(x))){ const cl=L.find(x=>/^vlan create /.test(x)); const tg=(cl.match(/^vlan create\s+(\S+)/)||[])[1]; const nl=L.find(x=>/^vlan name /.test(x)); const nm=nl?(nl.match(/^vlan name\s+\S+\s+"?([^"]*)"?/)||[])[1]:''; const sl=L.find(x=>/^vlan i-sid /.test(x)); const si=sl?(sl.match(/^vlan i-sid\s+\S+\s+(\S+)/)||[])[1]:''; return {kind:'vlan_create',comment:cm,tag:tg,name:nm||'',isid:si||''}; }
    if(m=P.match(/^interface vlan\s+(\d+)$/)){ const ip=J.match(/ip address\s+([\d.]+)(?:\s+([\d.]+)|(\/\d+))/); if(ip) return {kind:'svi_ip',comment:cm,tag:m[1],ipmask:ip[3]?(ip[1]+ip[3]):toCidr(ip[1],ip[2])}; }
    if(m=first.match(/^vlan members add\s+(\S+)\s+(.+)$/)) return {kind:'vlan_ports',comment:cm,tag:m[1],ports:m[2],mode:'access'};
    return raw();
  }
  return raw();
}

async function resetTarget(){ const ok=await uiConfirm({title:'Limpar conteúdo',message:'Limpar o conteúdo atual? As alterações não salvas serão perdidas.',okLabel:'Limpar',danger:true}); if(!ok)return;
  if(state.mode==='exos'){state.cli.exos={meta:{name:''},cmds:[]};render();return;}
  if(state.mode==='ruckus'){state.cli.ruckus={meta:{name:''},cmds:[]};render();return;}
  if(state.mode==='fabric'){state.cli.fabric={meta:{name:''},cmds:[]};render();return;}
  const fs=freshState();
  if(isNet()){const T=state.target;state.net=fs.net;state.target=T;}
  else state.linux=fs.linux;
  render();}

/* ===================== EXEMPLOS ===================== */
function loadExample(){
  if(state.mode==='exos'){
    state.cli.exos={meta:{name:'Provisionar VLAN de acesso'},cmds:[
      {kind:'vlan_create',comment:'VLAN de dados',tag:'100',name:'Vendas'},
      {kind:'vlan_ports',comment:'Portas de acesso',tag:'100',name:'Vendas',ports:'1:1-1:8',mode:'untagged'},
      {kind:'svi_ip',comment:'Gateway da VLAN',tag:'100',name:'Vendas',ipmask:'10.10.0.1/24'},
      {kind:'port_desc',comment:'',ports:'1:48',desc:'Uplink-Core'},
      {kind:'raw',comment:'Hardening básico',cmds:'disable telnet\nenable ssh2'},
      {kind:'ntp',comment:'Servidor de hora',server:'200.160.7.186'},
      {kind:'dns',comment:'Resolvedor DNS',server:'8.8.8.8',domain:'empresa.local'},
      {kind:'lag',comment:'Uplink agregado',id:'1:1',ports:'1:1-1:2',lacp:'active'},
      {kind:'snmpv3',comment:'Monitoramento',user:'snmpadmin',authproto:'sha',authpass:'Auth@12345',privproto:'aes',privpass:'Priv@12345'},
      {kind:'user_create',comment:'Admin local',user:'netadmin',password:'S3nha@Forte',role:'admin'},
      {kind:'save',comment:'Persistir configuração'}]};
    render();toast('Exemplo carregado');return;
  }
  if(state.mode==='ruckus'){
    state.cli.ruckus={meta:{name:'Provisionar VLAN de acesso'},cmds:[
      {kind:'vlan_create',comment:'VLAN de dados',tag:'100',name:'Vendas'},
      {kind:'vlan_ports',comment:'Portas de acesso',tag:'100',ports:'1/1/1 to 1/1/8',mode:'access'},
      {kind:'svi_ip',comment:'Gateway da VLAN',tag:'100',ipmask:'10.10.0.1/24'},
      {kind:'port_desc',comment:'',ports:'1/1/48',desc:'Uplink-Core'},
      {kind:'raw',comment:'Hardening básico',cmds:'no telnet server\nip ssh version 2'},
      {kind:'ntp',comment:'Servidor de hora',server:'200.160.7.186'},
      {kind:'dns',comment:'Resolvedor DNS',server:'8.8.8.8',domain:'empresa.local'},
      {kind:'lag',comment:'Uplink agregado',id:'1',ports:'1/1/49 to 1/1/50',lacp:'active'},
      {kind:'snmpv3',comment:'Monitoramento',user:'snmpadmin',authproto:'sha',authpass:'Auth@12345',privproto:'aes',privpass:'Priv@12345'},
      {kind:'user_create',comment:'Admin local',user:'netadmin',password:'S3nha@Forte',role:'0'},
      {kind:'save',comment:'Persistir configuração'}]};
    render();toast('Exemplo carregado');return;
  }
  if(state.mode==='fabric'){
    state.cli.fabric={meta:{name:'Bring-up Fabric Connect (VOSS)'},cmds:[
      {kind:'spbm_isis',comment:'Underlay SPBM / IS-IS',bvid1:'4051',bvid2:'4052',nickname:'0.00.16',system_id:'0016.0016.0016',area:'49.0000'},
      {kind:'nni',comment:'Link NNI para o core',ports:'1/1-1/2'},
      {kind:'vlan_create',comment:'L2 VSN (VLAN + I-SID)',tag:'100',name:'Vendas',isid:'10100'},
      {kind:'vlan_ports',comment:'Portas de acesso (edge)',tag:'100',ports:'1/10-1/20',mode:'access'},
      {kind:'svi_ip',comment:'Gateway da VLAN',tag:'100',ipmask:'10.10.0.1/24'},
      {kind:'ip_shortcuts',comment:'IP Shortcuts (L3 na GRT)',loopback:'1',ip:'1.1.1.16/32'},
      {kind:'l3vsn',comment:'L3 VSN por VRF',vrf:'VENDAS',vrfid:'2',isid:'30100'},
      {kind:'mlt',comment:'MLT/SMLT de uplink',id:'1',ports:'1/3-1/4',mode:'trunk',smlt:'smlt'},
      {kind:'save',comment:'Persistir configuração'}]};
    render();toast('Exemplo carregado');return;
  }
  const t=state.target;
  if(t==='linux'){
    state.linux={
      play:{name:'Configurar servidor web Nginx',hosts:'webservers',become:true,facts:true},
      vars:[{k:'pacote_web',val:'nginx'}],
      groups:[{name:'webservers',hosts:[{name:'web1',ip:'10.0.0.11'},{name:'web2',ip:'10.0.0.12'}],
        vars:[{k:'ansible_user',val:'ubuntu'},{k:'ansible_port',val:'22'}]}],
      tasks:[
        {name:'Instalar o servidor web',module:'ansible.builtin.apt',
         params:[{k:'name',val:'{{ pacote_web }}',type:'str'},{k:'state',val:'present',type:'str'},{k:'update_cache',val:'true',type:'bool'}],
         when:"ansible_os_family == 'Debian'",loop:'',register:'',tags:'packages',notify:''},
        {name:'Garantir serviço iniciado e habilitado',module:'ansible.builtin.service',
         params:[{k:'name',val:'{{ pacote_web }}',type:'str'},{k:'state',val:'started',type:'str'},{k:'enabled',val:'true',type:'bool'}],
         when:'',loop:'',register:'svc',tags:'service',notify:''}]
    };
  } else {
    const devs=[{name:'SW-ACESSO-01',ip:'10.0.0.2'},{name:'SW-ACESSO-02',ip:'10.0.0.3'}];
    const base={meta:{name:'Provisionar VLAN de acesso'},conn:{user:'admin',enable:true},customOs:'',customModule:'',devices:devs};
    if(t==='cisco_ios'){
      state.net=Object.assign(base,{cmds:[
        {kind:'vlan_create',comment:'VLAN de dados',tag:'100',name:'Vendas'},
        {kind:'vlan_ports',comment:'',tag:'100',name:'Vendas',ports:'Gi1/0/1-8',mode:'access'},
        {kind:'svi_ip',comment:'Gateway da VLAN',tag:'100',name:'Vendas',ipmask:'10.10.0.1/24'},
        {kind:'port_desc',comment:'',ports:'Gi1/0/48',desc:'Uplink-Core'},
        {kind:'raw',comment:'Hardening básico',cmds:'no ip http server\nip ssh version 2'},
        {kind:'ntp',comment:'Servidor de hora',server:'200.160.7.186'},
        {kind:'dns',comment:'Resolvedor DNS',server:'8.8.8.8 1.1.1.1',domain:'empresa.local'},
        {kind:'lag',comment:'Uplink agregado',id:'1',ports:'Gi1/0/49-50',lacp:'active'},
        {kind:'snmpv3',comment:'Monitoramento',user:'snmpadmin',authproto:'sha',authpass:'Auth@12345',privproto:'aes',privpass:'Priv@12345'},
        {kind:'user_create',comment:'Admin local',user:'netadmin',password:'S3nha@Forte',role:'15'},
        {kind:'save',comment:'Persistir configuração'}]});
    } else if(t==='cisco_nxos'){
      state.net=Object.assign(base,{cmds:[
        {kind:'raw',comment:'Hardening básico',cmds:'feature interface-vlan\nno feature telnet\nfeature ssh'},
        {kind:'vlan_create',comment:'VLAN de dados',tag:'100',name:'Vendas'},
        {kind:'vlan_ports',comment:'',tag:'100',name:'Vendas',ports:'Ethernet1/1-8',mode:'access'},
        {kind:'svi_ip',comment:'Gateway da VLAN',tag:'100',name:'Vendas',ipmask:'10.10.0.1/24'},
        {kind:'port_desc',comment:'',ports:'Ethernet1/48',desc:'Uplink-Core'},
        {kind:'save',comment:'Persistir configuração'}]});
    } else if(t==='exos'){
      state.net=Object.assign(base,{conn:{user:'admin',enable:false},cmds:[
        {kind:'vlan_create',comment:'VLAN de dados',tag:'100',name:'Vendas'},
        {kind:'vlan_ports',comment:'',tag:'100',name:'Vendas',ports:'1:1-1:8',mode:'untagged'},
        {kind:'svi_ip',comment:'Gateway da VLAN',tag:'100',name:'Vendas',ipmask:'10.10.0.1/24'},
        {kind:'port_desc',comment:'',ports:'1:48',desc:'Uplink-Core'},
        {kind:'raw',comment:'Hardening básico',cmds:'disable telnet\nenable ssh2'},
        {kind:'save',comment:'Persistir configuração'}]});
    } else if(t==='ruckus_icx'){
      state.net=Object.assign(base,{cmds:[
        {kind:'vlan_create',comment:'VLAN de dados',tag:'100',name: 'Vendas'},
        {kind:'vlan_ports',comment:'',tag:'100',ports:'1/1/1 to 1/1/8',mode:'access'},
        {kind:'svi_ip',comment:'Gateway da VLAN',tag:'100',ipmask:'10.10.0.1/24'},
        {kind:'port_desc',comment:'',ports:'1/1/48',desc:'Uplink-Core'},
        {kind:'raw',comment:'Hardening básico',cmds:'no telnet server\nip ssh version 2'},
        {kind:'save',comment:'Persistir configuração'}]});
    } else if(t==='voss'){
      state.net=Object.assign(base,{meta:{name:'Provisionar L2 VSN (Fabric Connect)'},conn:{user:'admin',enable:false},cmds:[
        {kind:'vlan_create',comment:'VLAN + I-SID (L2 VSN)',tag:'100',name:'Vendas',isid:'10100'},
        {kind:'vlan_ports',comment:'Portas de acesso (edge)',tag:'100',ports:'1/1-1/8',mode:'access'},
        {kind:'svi_ip',comment:'Gateway',tag:'100',ipmask:'10.10.0.1/24'},
        {kind:'save',comment:'Salvar'}]});
    } else { // generic
      state.net=Object.assign(base,{meta:{name:'Exemplo genérico (Arista EOS)'},
        customOs:'arista.eos.eos',customModule:'arista.eos.eos_config',conn:{user:'admin',enable:false},cmds:[
        {kind:'raw',comment:'Criar VLAN',cmds:'vlan 100\n   name Vendas'},
        {kind:'raw',comment:'Porta de acesso',cmds:'interface Ethernet1\n   switchport access vlan 100'},
        {kind:'save',comment:'Persistir configuração'}]});
    }
  }
  render();toast('Exemplo carregado');
}

let toastT;function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1800);}

