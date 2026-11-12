/* ===================== HELPERS ===================== */
function quoteStr(s){
  if(s==='') return "''";
  if(/^[\s]|[\s]$|[:#\{\}\[\],&\*!\|>'"%@`]|^-|^\?/.test(s)||/^(true|false|yes|no|null|~|on|off)$/i.test(s)||/^[\d.]+$/.test(s))
    return '"'+s.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
  return s;
}
function scalar(p){const v=(p.val||'').trim();
  if(p.type==='int') return v===''?'0':(isNaN(Number(v))?quoteStr(p.val):String(Number(v)));
  if(p.type==='bool') return v==='false'?'false':'true';
  return quoteStr(p.val);}
function lines(t){return (t||'').split('\n').map(s=>s.trim()).filter(Boolean);}
function iniVal(s){return /\s/.test(s)?'"'+s+'"':s;}
function q(s){return '"'+(s||'')+'"';}
function cidrToIpMask(cidr){
  const parts=(cidr||'').split('/');const ip=(parts[0]||'').trim();const pfx=parseInt(parts[1],10);
  if(isNaN(pfx)) return [ip,'255.255.255.0'];
  const mask=[0,0,0,0];for(let i=0;i<pfx;i++) mask[Math.floor(i/8)]|=128>>(i%8);
  return [ip,mask.join('.')];
}
function netGroup(){return state.target==='generic'?'rede':state.target;}
function netOs(){const T=TARGETS[state.target];return state.target==='generic'?(state.net.customOs.trim()||'<defina ansible_network_os>'):T.os;}
function netModule(){const T=TARGETS[state.target];return state.target==='generic'?(state.net.customModule.trim()||'<defina o módulo>'):T.module;}

/* ===================== GERADORES ===================== */
function generatedFiles(){
  if(state.mode==='exos') return [{name:'exos-config.txt',lang:'cli',content:buildCliScript('exos')}];
  if(state.mode==='ruckus') return [{name:'ruckus-icx-config.txt',lang:'cli',content:buildCliScript('ruckus')}];
  if(state.mode==='fabric') return [{name:'fabric-voss-config.txt',lang:'cli',content:buildCliScript('fabric')}];
  if(isNet()) return [
    {name:'playbook.yml',lang:'yaml',content:buildNetPlaybook()},
    {name:'hosts.ini',lang:'ini',content:buildNetInventory()}
  ];
  return [
    {name:'playbook.yml',lang:'yaml',content:buildLinuxPlaybook()},
    {name:'hosts.ini',lang:'ini',content:buildLinuxInventory()}
  ];
}

/* ---- Linux ---- */
function buildLinuxPlaybook(){
  const a=state.linux,I='  ',L=['---'];
  L.push('- name: '+quoteStr(a.play.name||'Playbook gerado'));
  L.push(I+'hosts: '+quoteStr(a.play.hosts||'all'));
  if(a.play.become) L.push(I+'become: true');
  if(!a.play.facts) L.push(I+'gather_facts: false');
  const vs=a.vars.filter(v=>v.k.trim());
  if(vs.length){L.push(I+'vars:');vs.forEach(v=>L.push(I+I+v.k.trim()+': '+quoteStr(v.val)));}
  L.push(I+'tasks:');
  if(!a.tasks.length) L.push(I+I+'# (nenhuma tarefa definida)');
  a.tasks.forEach(t=>{
    const ti=I+I,ki=I+I+'  ';
    L.push(ti+'- name: '+quoteStr(t.name||'tarefa sem nome'));
    const mod=(t.module||'ansible.builtin.debug').trim();
    const params=t.params.filter(p=>p.k.trim());
    if(params.length){L.push(ki+mod+':');
      params.forEach(p=>{
        if(p.type==='list'){const it=lines(p.val);L.push(ki+'  '+p.k.trim()+':');
          it.length?it.forEach(x=>L.push(ki+'    - '+quoteStr(x))):L.push(ki+'    []');}
        else L.push(ki+'  '+p.k.trim()+': '+scalar(p));});
    } else L.push(ki+mod+':');
    if(t.loop&&lines(t.loop).length){L.push(ki+'loop:');lines(t.loop).forEach(x=>L.push(ki+'  - '+quoteStr(x)));}
    if(t.when&&t.when.trim()) L.push(ki+'when: '+quoteStr(t.when.trim()));
    if(t.register&&t.register.trim()) L.push(ki+'register: '+t.register.trim());
    if(t.notify&&t.notify.trim()){const n=t.notify.split(',').map(s=>s.trim()).filter(Boolean);
      n.length===1?L.push(ki+'notify: '+quoteStr(n[0])):(L.push(ki+'notify:'),n.forEach(x=>L.push(ki+'  - '+quoteStr(x))));}
    if(t.tags&&t.tags.trim()){const tg=t.tags.split(',').map(s=>s.trim()).filter(Boolean);
      L.push(ki+'tags: ['+tg.map(quoteStr).join(', ')+']');}
  });
  return L.join('\n')+'\n';
}
function buildLinuxInventory(){
  const a=state.linux,L=['# Inventário Ansible — gerado automaticamente'];
  const groups=a.groups.filter(g=>g.name.trim());
  if(!groups.length) return L.join('\n')+'\n# (defina ao menos um grupo na seção Inventário)\n';
  groups.forEach(g=>{
    L.push('');L.push('['+g.name.trim()+']');
    const hosts=g.hosts.filter(h=>h.name.trim());
    if(!hosts.length) L.push('# sem hosts');
    hosts.forEach(h=>{
      let line=h.name.trim();
      if(h.ip&&h.ip.trim()) line+=' ansible_host='+iniVal(h.ip.trim());
      L.push(line);
    });
    const gv=g.vars.filter(v=>v.k.trim());
    if(gv.length){L.push('');L.push('['+g.name.trim()+':vars]');
      gv.forEach(v=>L.push(v.k.trim()+'='+iniVal((v.val||'').trim())));}
  });
  return L.join('\n')+'\n';
}

/* ---- Rede: intenção -> segmentos {parents,lines} por dialeto ---- */
function netSegments(c,dialectOverride){
  const t=state.target,f=k=>(c[k]||'').trim();
  if(c.kind==='save') return {save:true};
  if(c.kind==='raw'){const ls=lines(f('cmds'));return ls.length?[{parents:null,lines:ls}]:[];}
  const d=dialectOverride||TARGETS[t].dialect;
  if(d==='ios')  return iosSeg(c,f);
  if(d==='nxos') return nxosSeg(c,f);
  if(d==='icx')  return icxSeg(c,f);
  if(d==='exos') return exosSeg(c,f);
  if(d==='voss') return vossSeg(c,f);
  return [];
}
function vossSeg(c,f){
  switch(c.kind){
    case 'vlan_create': { const vls=vlanList(c).filter(v=>v.tag); if(!vls.length)return[]; const l=[]; vls.forEach(v=>{ l.push('vlan create '+v.tag+' type port-mstprstp 0'); if(v.name)l.push('vlan name '+v.tag+' "'+v.name+'"'); if(v.isid)l.push('vlan i-sid '+v.tag+' '+v.isid); }); return [{parents:null,lines:l}]; }
    case 'vlan_ports': { if(!f('tag')||!f('ports'))return[]; const segs=[]; if(!modeAccess(f)) segs.push({parents:['interface gigabitEthernet '+f('ports')],lines:['encapsulation dot1q']}); segs.push({parents:null,lines:['vlan members add '+f('tag')+' '+f('ports')]}); return segs; }
    case 'svi_ip': { if(!f('tag')||!f('ipmask'))return[]; const a=cidrToIpMask(f('ipmask')); return [{parents:['interface vlan '+f('tag')],lines:['ip address '+a[0]+' '+a[1]]}]; }
    case 'spbm_isis': { const b1=f('bvid1'),b2=f('bvid2'); if(!b1)return[]; const pre=['vlan create '+b1+' type spbm-bvlan']; if(b2)pre.push('vlan create '+b2+' type spbm-bvlan'); pre.push('spbm'); const isis=[]; if(f('system_id'))isis.push('system-id '+f('system_id')); if(f('area'))isis.push('manual-area '+f('area')); isis.push('spbm 1'); if(f('nickname'))isis.push('spbm 1 nick-name '+f('nickname')); isis.push('spbm 1 b-vid '+b1+(b2?(','+b2):'')+' primary '+b1); isis.push('is-type l1'); return [{parents:null,lines:pre},{parents:['router isis'],lines:isis},{parents:null,lines:['router isis enable']}]; }
    case 'nni': { if(!f('ports'))return[]; return [{parents:['interface gigabitEthernet '+f('ports')],lines:['isis','isis spbm 1','isis enable','no shutdown']}]; }
    case 'ip_shortcuts': { if(!f('ip'))return[]; const a=cidrToIpMask(f('ip')); const ipOnly=(f('ip')||'').split('/')[0]; return [{parents:['interface loopback '+(f('loopback')||'1')],lines:['ip address '+a[0]+' '+a[1]]},{parents:['router isis'],lines:['ip-source-address '+ipOnly,'spbm 1 ip enable']},{parents:null,lines:['isis redistribute direct','isis redistribute direct enable','isis apply redistribute direct']}]; }
    case 'l3vsn': { if(!f('vrf'))return[]; const pre=['ip vrf '+f('vrf')+(f('vrfid')?(' vrfid '+f('vrfid')):'')]; const v=['ipvpn']; if(f('isid'))v.push('i-sid '+f('isid')); v.push('ipvpn enable'); return [{parents:null,lines:pre},{parents:['router vrf '+f('vrf')],lines:v}]; }
    case 'mlt': { if(!f('id')||!f('ports'))return[]; const lns=['mlt '+f('id')]; if(!modeAccess(f))lns.push('mlt '+f('id')+' encapsulation dot1q'); lns.push('mlt '+f('id')+' member '+f('ports')); lns.push('mlt '+f('id')+' enable'); const segs=[{parents:null,lines:lns}]; if(f('smlt')==='smlt')segs.push({parents:['interface mlt '+f('id')],lines:['smlt']}); return segs; }
    case 'static_route': {if(!f('dest')||!f('nexthop'))return[]; const[net,m]=cidrToIpMask(f('dest')); return [{parents:null,lines:['ip route '+net+' '+m+' '+f('nexthop')+(f('vrf')?(' vrf '+f('vrf')):'')+(f('distance')?(' weight '+f('distance')):'')]}];}
    case 'user_create': return f('user')?[{parents:null,lines:['username add '+f('user')+' level '+(f('role')||'rwa')+' enable']}]:[];
    case 'lldp': { const en=f('state')!=='disable'; if((f('scope')||'global')==='global') return [{parents:null,lines:[(en?'':'no ')+'lldp']}]; if(!f('ports'))return[]; return [{parents:['interface gigabitEthernet '+f('ports')],lines:[(en?'':'no ')+'lldp status '+f('ports')+' txAndrx']}]; }
    case 'banner': { if(!f('text'))return[]; return [{parents:null,lines:['banner custom','banner "'+f('text')+'"']}]; }
    case 'poe': { if(!f('ports'))return[]; const en=f('state')!=='disable'; return [{parents:['interface gigabitEthernet '+f('ports')],lines:[(en?'no poe poe-shutdown':'poe poe-shutdown')]}]; }
    case 'speed': { if(!f('ports'))return[]; const auto=(f('autoneg')==='on'); const l= auto?['auto-negotiate enable']:['no auto-negotiate enable']; if(!auto){ if(f('speed'))l.push('speed '+f('speed')); if(f('duplex'))l.push('duplex '+f('duplex')); } return [{parents:['interface gigabitEthernet '+f('ports')],lines:l}]; }
    case 'vint': { if(!f('tag')||!f('ipmask'))return[]; const a=cidrToIpMask(f('ipmask')); const l=[]; if(f('desc'))l.push('name "'+f('desc')+'"'); l.push('ip address '+a[0]+' '+a[1]); return [{parents:['interface vlan '+f('tag')],lines:l}]; }
    case 'stp': { const segs=[]; const mode=(f('mode')==='mstp')?'mstp':'rstp'; segs.push({parents:null,lines:['boot config flags spanning-tree-mode '+mode]}); const glob=[]; if(f('priority'))glob.push('spanning-tree '+mode+' priority '+f('priority')); if(glob.length)segs.push({parents:null,lines:glob}); if(f('edgeports')){ const el=['spanning-tree '+mode+' edge-port true']; if(f('bpduguard')==='yes')el.push('spanning-tree bpduguard enable'); segs.push({parents:['interface gigabitEthernet '+f('edgeports')],lines:el}); } return segs; }
  }
  return [];
}
function modeAccess(f){let m=f('mode');return !(m==='trunk'||m==='tagged');}

function iosSeg(c,f){
  switch(c.kind){
    case 'vlan_create': return vlanList(c).filter(v=>v.tag).map(v=>({parents:['vlan '+v.tag],lines:v.name?['name '+v.name]:[]}));
    case 'vlan_ports': if(!f('ports'))return[]; return [{parents:['interface '+f('ports')],
      lines: modeAccess(f)?['switchport mode access'].concat(f('tag')?['switchport access vlan '+f('tag')]:[])
                          :['switchport mode trunk'].concat(f('tag')?['switchport trunk allowed vlan '+f('tag')]:[])}];
    case 'svi_ip': {if(!f('tag')||!f('ipmask'))return[];const[ip,m]=cidrToIpMask(f('ipmask'));
      return [{parents:['interface vlan '+f('tag')],lines:['ip address '+ip+' '+m,'no shutdown']}];}
    case 'port_state': return f('ports')?[{parents:['interface '+f('ports')],lines:[(f('state')==='disable'?'shutdown':'no shutdown')]}]:[];
    case 'port_desc': return (f('ports')&&f('desc'))?[{parents:['interface '+f('ports')],lines:['description '+f('desc')]}]:[];
    case 'hostname': return f('name')?[{parents:null,lines:['hostname '+f('name')]}]:[];
    case 'snmp': return f('community')?[{parents:null,lines:['snmp-server community '+f('community')+' '+(f('access')==='readwrite'?'RW':'RO')]}]:[];
    case 'ntp': {if(!f('server'))return[]; return [{parents:null,lines:f('server').split(/[\s,]+/).filter(Boolean).map(x=>'ntp server '+x)}];}
    case 'lag': {if(!f('id')||!f('ports'))return[]; const md=(f('lacp')==='static')?'on':(f('lacp')||'active'); return [{parents:['interface range '+f('ports')],lines:['channel-group '+f('id')+' mode '+md]}];}
    case 'snmpv3': {if(!f('user'))return[]; const ap=f('authproto')||'sha',pv=(f('privproto')==='des')?'des':'aes 128'; let u='snmp-server user '+f('user')+' V3GRP v3 auth '+ap+' '+(f('authpass')||'<senha-auth>'); if(f('privpass'))u+=' priv '+pv+' '+f('privpass'); return [{parents:null,lines:['snmp-server group V3GRP v3 priv',u]}];}
    case 'dns': {const o=[]; if(f('server'))o.push('ip name-server '+f('server').split(/[\s,]+/).filter(Boolean).join(' ')); if(f('domain')){o.push('ip domain name '+f('domain'));o.push('ip domain lookup');} return o.length?[{parents:null,lines:o}]:[];}
    case 'user_create': return f('user')?[{parents:null,lines:['username '+f('user')+' privilege '+(f('role')||'15')+' secret '+(f('password')||'<senha>')]}]:[];
    case 'inter_vlan': return [{parents:null,lines:['ip routing']}];
    case 'static_route': {if(!f('dest')||!f('nexthop'))return[]; const[net,m]=cidrToIpMask(f('dest')); return [{parents:null,lines:['ip route '+net+' '+m+' '+f('nexthop')+(f('distance')?(' '+f('distance')):'')]}];}
    case 'lldp': { const en=f('state')!=='disable'; if((f('scope')||'global')==='global') return [{parents:null,lines:[(en?'':'no ')+'lldp run']}]; if(!f('ports'))return[]; return [{parents:['interface range '+f('ports')],lines:en?['lldp transmit','lldp receive']:['no lldp transmit','no lldp receive']}]; }
    case 'cdp': { const en=f('state')!=='disable'; if((f('scope')||'global')==='global') return [{parents:null,lines:[(en?'':'no ')+'cdp run']}]; if(!f('ports'))return[]; return [{parents:['interface range '+f('ports')],lines:[(en?'':'no ')+'cdp enable']}]; }
    case 'banner': { if(!f('text'))return[]; const bt=f('btype')||'login'; return [{parents:null,lines:['banner '+bt+' ^',f('text'),'^']}]; }
    case 'poe': { if(!f('ports'))return[]; const en=f('state')!=='disable'; return [{parents:['interface range '+f('ports')],lines:['power inline '+(en?'auto':'never')]}]; }
    case 'speed': { if(!f('ports'))return[]; const auto=(f('autoneg')==='on'); const l= auto?['speed auto','duplex auto']:[]; if(!auto){ if(f('speed'))l.push('speed '+f('speed')); if(f('duplex'))l.push('duplex '+f('duplex')); } return l.length?[{parents:['interface '+f('ports')],lines:l}]:[]; }
    case 'vint': { if(!f('tag')||!f('ipmask'))return[]; const[ip,m]=cidrToIpMask(f('ipmask')); const l=[]; if(f('desc'))l.push('description '+f('desc')); l.push('ip address '+ip+' '+m); l.push('no shutdown'); return [{parents:['interface vlan '+f('tag')],lines:l}]; }
    case 'stp': { const segs=[]; const glob=[]; if(f('mode'))glob.push('spanning-tree mode '+f('mode')); if(f('tag')&&f('priority'))glob.push('spanning-tree vlan '+f('tag')+' priority '+f('priority')); if(glob.length)segs.push({parents:null,lines:glob}); if(f('edgeports')){ const el=['spanning-tree portfast']; if(f('bpduguard')==='yes')el.push('spanning-tree bpduguard enable'); segs.push({parents:['interface range '+f('edgeports')],lines:el}); } return segs; }
  }
  return [];
}
function nxosSeg(c,f){
  switch(c.kind){
    case 'vlan_create': return vlanList(c).filter(v=>v.tag).map(v=>({parents:['vlan '+v.tag],lines:v.name?['name '+v.name]:[]}));
    case 'vlan_ports': if(!f('ports'))return[]; return [{parents:['interface '+f('ports')],
      lines: modeAccess(f)?['switchport','switchport mode access'].concat(f('tag')?['switchport access vlan '+f('tag')]:[])
                          :['switchport','switchport mode trunk'].concat(f('tag')?['switchport trunk allowed vlan '+f('tag')]:[])}];
    case 'svi_ip': if(!f('tag')||!f('ipmask'))return[]; return [{parents:['interface Vlan'+f('tag')],lines:['ip address '+f('ipmask'),'no shutdown']}];
    case 'port_state': return f('ports')?[{parents:['interface '+f('ports')],lines:[(f('state')==='disable'?'shutdown':'no shutdown')]}]:[];
    case 'port_desc': return (f('ports')&&f('desc'))?[{parents:['interface '+f('ports')],lines:['description '+f('desc')]}]:[];
    case 'hostname': return f('name')?[{parents:null,lines:['hostname '+f('name')]}]:[];
    case 'snmp': return f('community')?[{parents:null,lines:['snmp-server community '+f('community')+' '+(f('access')==='readwrite'?'rw':'ro')]}]:[];
    case 'ntp': {if(!f('server'))return[]; return [{parents:null,lines:f('server').split(/[\s,]+/).filter(Boolean).map(x=>'ntp server '+x)}];}
    case 'lag': {if(!f('id')||!f('ports'))return[]; const md=(f('lacp')==='static')?'on':(f('lacp')||'active'); return [{parents:null,lines:['feature lacp']},{parents:['interface '+f('ports')],lines:['channel-group '+f('id')+' mode '+md]}];}
    case 'snmpv3': {if(!f('user'))return[]; const ap=f('authproto')||'sha',pv=(f('privproto')==='des')?'des':'aes-128'; let u='snmp-server user '+f('user')+' auth '+ap+' '+(f('authpass')||'<senha-auth>'); if(f('privpass'))u+=' priv '+pv+' '+f('privpass'); return [{parents:null,lines:[u]}];}
    case 'dns': {const o=[]; if(f('server'))f('server').split(/[\s,]+/).filter(Boolean).forEach(x=>o.push('ip name-server '+x)); if(f('domain'))o.push('ip domain-name '+f('domain')); return o.length?[{parents:null,lines:o}]:[];}
    case 'user_create': return f('user')?[{parents:null,lines:['username '+f('user')+' password '+(f('password')||'<senha>')+' role '+(f('role')||'network-admin')]}]:[];
    case 'inter_vlan': return [{parents:null,lines:['feature interface-vlan']}];
    case 'static_route': {if(!f('dest')||!f('nexthop'))return[]; const dst=/\//.test(f('dest'))?f('dest'):(f('dest')+'/32'); return [{parents:null,lines:['ip route '+dst+' '+f('nexthop')+(f('distance')?(' '+f('distance')):'')]}];}
    case 'lldp': { const en=f('state')!=='disable'; if((f('scope')||'global')==='global') return [{parents:null,lines:[(en?'':'no ')+'feature lldp']}]; if(!f('ports'))return[]; return [{parents:['interface '+f('ports')],lines:en?['lldp transmit','lldp receive']:['no lldp transmit','no lldp receive']}]; }
    case 'cdp': { const en=f('state')!=='disable'; if((f('scope')||'global')==='global') return [{parents:null,lines:[(en?'':'no ')+'cdp enable']}]; if(!f('ports'))return[]; return [{parents:['interface '+f('ports')],lines:[(en?'':'no ')+'cdp enable']}]; }
    case 'banner': { if(!f('text'))return[]; const bt=(f('btype')==='login')?'motd':(f('btype')||'motd'); return [{parents:null,lines:['banner '+bt+' ^',f('text'),'^']}]; }
    case 'poe': return []; /* Switches Nexus (NX-OS) não fornecem PoE */
    case 'speed': { if(!f('ports'))return[]; const auto=(f('autoneg')==='on'); const l=auto?['speed auto','duplex auto']:[]; if(!auto){ if(f('speed'))l.push('speed '+f('speed')); if(f('duplex'))l.push('duplex '+f('duplex')); } return l.length?[{parents:['interface '+f('ports')],lines:l}]:[]; }
    case 'vint': { if(!f('tag')||!f('ipmask'))return[]; const l=[]; if(f('desc'))l.push('description '+f('desc')); l.push('ip address '+f('ipmask')); l.push('no shutdown'); return [{parents:['interface Vlan'+f('tag')],lines:l}]; }
    case 'stp': { const segs=[]; const glob=[]; if(f('mode'))glob.push('spanning-tree mode '+f('mode')); if(f('tag')&&f('priority'))glob.push('spanning-tree vlan '+f('tag')+' priority '+f('priority')); if(glob.length)segs.push({parents:null,lines:glob}); if(f('edgeports')){ const el=['spanning-tree port type edge']; if(f('bpduguard')==='yes')el.push('spanning-tree bpduguard enable'); segs.push({parents:['interface '+f('edgeports')],lines:el}); } return segs; }
  }
  return [];
}
function icxSeg(c,f){
  switch(c.kind){
    case 'vlan_create': return vlanList(c).filter(v=>v.tag).map(v=>({parents:null,lines:['vlan '+v.tag+(v.name?(' name '+v.name):'')]}));
    case 'vlan_ports': return (f('tag')&&f('ports'))?[{parents:['vlan '+f('tag')],lines:[(modeAccess(f)?'untagged':'tagged')+' ethernet '+f('ports')]}]:[];
    case 'svi_ip': {if(!f('tag')||!f('ipmask'))return[];const[ip,m]=cidrToIpMask(f('ipmask'));
      return [{parents:['vlan '+f('tag')],lines:['router-interface ve '+f('tag')]},
              {parents:['interface ve '+f('tag')],lines:['ip address '+ip+' '+m]}];}
    case 'port_state': return f('ports')?[{parents:['interface ethernet '+f('ports')],lines:[(f('state')==='disable'?'disable':'enable')]}]:[];
    case 'port_desc': return (f('ports')&&f('desc'))?[{parents:['interface ethernet '+f('ports')],lines:['port-name '+f('desc')]}]:[];
    case 'hostname': return f('name')?[{parents:null,lines:['hostname '+f('name')]}]:[];
    case 'snmp': return f('community')?[{parents:null,lines:['snmp-server community '+f('community')+' '+(f('access')==='readwrite'?'rw':'ro')]}]:[];
    case 'ntp': {if(!f('server'))return[]; return [{parents:['ntp'],lines:f('server').split(/[\s,]+/).filter(Boolean).map(x=>'server '+x)}];}
    case 'lag': {if(!f('id')||!f('ports'))return[]; const dyn=(f('lacp')==='static')?'static':'dynamic'; return [{parents:['lag "LAG'+f('id')+'" '+dyn+' id '+f('id')],lines:['ports ethernet '+f('ports'),'deploy']}];}
    case 'snmpv3': {if(!f('user'))return[]; const ap=f('authproto')||'sha',pp=f('privproto')||'aes'; return [{parents:null,lines:['snmp-server group v3grp v3 priv','snmp-server user '+f('user')+' v3grp v3 auth '+ap+' '+(f('authpass')||'<senha-auth>')+(f('privpass')?(' priv '+pp+' '+f('privpass')):'')]}];}
    case 'dns': {const o=[]; if(f('server'))o.push('ip dns server-address '+f('server').split(/[\s,]+/).filter(Boolean).join(' ')); if(f('domain'))o.push('ip dns domain-list '+f('domain')); return o.length?[{parents:null,lines:o}]:[];}
    case 'user_create': return f('user')?[{parents:null,lines:['username '+f('user')+' privilege '+(f('role')||'0')+' password '+(f('password')||'<senha>')]}]:[];
    case 'inter_vlan': return [{parents:null,lines:['roteamento inter-VLAN é automático no FastIron (via interface ve)'],note:true}];
    case 'static_route': {if(!f('dest')||!f('nexthop'))return[]; const dst=/\//.test(f('dest'))?f('dest'):(f('dest')+'/32'); return [{parents:null,lines:['ip route '+dst+' '+f('nexthop')+(f('distance')?(' distance '+f('distance')):'')]}];}
    case 'lldp': { const en=f('state')!=='disable'; const scope=(f('scope')||'global');
      if(scope==='global'){
        if(en) return [{parents:null,lines:['No ICX (FastIron), o LLDP já vem habilitado por padrão — nenhum comando é necessário para ativá-lo globalmente. Para desabilitar, use: no lldp run'],note:true}];
        return [{parents:null,lines:['no lldp run']}];
      }
      if(!f('ports'))return[];
      return [{parents:null,lines:[(en?'':'no ')+'lldp enable ports ethernet '+f('ports')]}];
    }
    case 'banner': { if(!f('text'))return[]; return [{parents:null,lines:['banner motd $',f('text'),'$']}]; }
    case 'poe': { if(!f('ports'))return[]; const en=f('state')!=='disable'; return [{parents:['interface ethernet '+f('ports')],lines:[(en?'':'no ')+'inline power']}]; }
    case 'speed': { if(!f('ports'))return[]; const auto=(f('autoneg')==='on'); let sd; if(auto){sd='auto';} else { const sp=f('speed'),du=f('duplex'); const map={'10':'10','100':'100','1000':'1000','10000':'10G'}; sd=(map[sp]||sp||'1000')+'-'+(du||'full'); } return [{parents:['interface ethernet '+f('ports')],lines:['speed-duplex '+sd]}]; }
    case 'vint': { if(!f('tag')||!f('ipmask'))return[]; const[ip,m]=cidrToIpMask(f('ipmask')); const veLines=['ip address '+ip+' '+m]; if(f('desc'))veLines.unshift('port-name '+f('desc')); return [{parents:['vlan '+f('tag')],lines:['router-interface ve '+f('tag')]},{parents:['interface ve '+f('tag')],lines:veLines}]; }
    case 'stp': { const segs=[]; const mode=(f('mode')==='mstp')?'mstp':'802-1w'; const glob=['spanning-tree '+mode]; segs.push({parents:null,lines:glob}); if(f('tag')&&f('priority')) segs.push({parents:['vlan '+f('tag')],lines:['spanning-tree '+mode+' priority '+f('priority')]}); if(f('edgeports')){ const el=['spanning-tree '+mode+' admin-edge-port']; if(f('bpduguard')==='yes')el.push('stp-bpdu-guard'); segs.push({parents:['interface ethernet '+f('edgeports')],lines:el}); } return segs; }
    case 'icx_register': { if(!f('ip'))return[]; const lst=(f('mode')==='backup')?'backup-list':'active-list'; return [{parents:null,lines:['manager '+lst+' '+f('ip')]}]; }
    case 'icx_license': { if(!f('unit')||!f('pkg'))return[]; return [{parents:null,lines:['license install perpetual '+f('unit')+' '+f('pkg')]}]; }
  }
  return [];
}
function exosSeg(c,f){
  let m=f('mode'); if(m==='access')m='untagged'; if(m==='trunk')m='tagged'; if(!m)m='untagged';
  const parts=k=>f(k).split(/[\s,]+/).filter(Boolean);
  switch(c.kind){
    case 'vlan_create': {const vls=vlanList(c).filter(v=>v.tag||v.name); if(!vls.length)return[]; return [{parents:null,lines:vls.map(v=>v.name?('create vlan '+v.name+(v.tag?(' tag '+v.tag):'')):('create vlan '+v.tag))}];}
    case 'vlan_ports': return (f('tag')&&f('ports'))?[{parents:null,lines:['configure vlan '+f('tag')+' add ports '+f('ports')+' '+m]}]:[];
    case 'svi_ip': return (f('tag')&&f('ipmask'))?[{parents:null,lines:['configure vlan '+f('tag')+' ipaddress '+f('ipmask')]}]:[];
    case 'port_state': return f('ports')?[{parents:null,lines:[(f('state')||'enable')+' ports '+f('ports')]}]:[];
    case 'port_desc': return (f('ports')&&f('desc'))?[{parents:null,lines:['configure ports '+f('ports')+' description-string '+f('desc')]}]:[];
    case 'hostname': return f('name')?[{parents:null,lines:['configure snmp sysName '+f('name')]}]:[];
    case 'snmp': return f('community')?[{parents:null,lines:['configure snmp add community '+(f('access')||'readonly')+' '+f('community')]}]:[];
    case 'ntp': {if(!f('server'))return[]; const vr=f('vr')?(' vr '+f('vr')):''; const o=['enable ntp'+vr]; parts('server').forEach(x=>o.push('configure ntp server add '+x+vr)); return [{parents:null,lines:o}];}
    case 'lag': {if(!f('ports'))return[]; const master=f('id')||parts('ports')[0]; const st=(f('lacp')==='static'); const alg=f('algorithm')||'address-based L3'; return [{parents:null,lines:['enable sharing '+master+' grouping '+f('ports')+' algorithm '+alg+(st?'':' lacp')]}];}
    case 'snmpv3': {if(!f('user'))return[]; const ap=f('authproto')||'sha',pp=f('privproto')||'aes'; return [{parents:null,lines:['configure snmpv3 add user '+f('user')+' authentication '+ap+' auth-passphrase '+(f('authpass')||'<senha-auth>')+(f('privpass')?(' privacy '+pp+' priv-passphrase '+f('privpass')):'')]}];}
    case 'dns': {const o=[]; const vr=f('vr')?(' vr '+f('vr')):''; if(f('server'))parts('server').forEach(x=>o.push('configure dns-client add name-server '+x+vr)); if(f('domain'))o.push('configure dns-client default-domain '+f('domain')); return o.length?[{parents:null,lines:o}]:[];}
    case 'user_create': return f('user')?[{parents:null,lines:['create account '+(f('role')||'admin')+' '+f('user')+' '+(f('password')||'<senha>')]}]:[];
    case 'inter_vlan': {const v=parts('vlans'); return v.length?[{parents:null,lines:v.map(x=>'enable ipforwarding vlan '+x)}]:[{parents:null,lines:['enable ipforwarding']}];}
    case 'static_route': {if(!f('dest')||!f('nexthop'))return[]; const dst=/\//.test(f('dest'))?f('dest'):(f('dest')+'/32'); return [{parents:null,lines:['configure iproute add '+dst+' '+f('nexthop')+(f('distance')?(' '+f('distance')):'')]}];}
    case 'lldp': { const en=f('state')!=='disable'; const tgt=((f('scope')||'global')==='global'||!f('ports'))?'all':f('ports'); return [{parents:null,lines:[(en?'enable':'disable')+' lldp ports '+tgt]}]; }
    case 'banner': { if(!f('text'))return[]; const bt=(f('btype')==='motd'||f('btype')==='login')?'before-login':(f('btype')||'before-login'); return [{parents:null,lines:['configure banner '+bt,f('text')]}]; }
    case 'poe': { const en=f('state')!=='disable'; const tgt=((f('scope')||'port')==='global'||!f('ports'))?'all':f('ports'); return [{parents:null,lines:[(en?'enable':'disable')+' inline-power ports '+tgt]}]; }
    case 'speed': { if(!f('ports'))return[]; const auto=(f('autoneg')==='on'); if(auto) return [{parents:null,lines:['configure ports '+f('ports')+' auto on']}]; return [{parents:null,lines:['configure ports '+f('ports')+' auto off speed '+(f('speed')||'1000')+' duplex '+(f('duplex')||'full')]}]; }
    case 'vint': { if(!f('tag')||!f('ipmask'))return[]; return [{parents:null,lines:['configure vlan '+f('tag')+' ipaddress '+f('ipmask'),'enable ipforwarding vlan '+f('tag')]}]; }
    case 'stp': { const mr=(f('mode')||'').toLowerCase(); const mode=/mst/.test(mr)?'mstp':(/(1d|802\.1d|normal|cl[aá]ssic|^stp$)/.test(mr)?'dot1d':'dot1w'); const l=['configure stpd s0 mode '+mode]; if(f('tag'))l.push('configure stpd s0 add vlan '+f('tag')+' ports all'); if(f('priority'))l.push('configure stpd s0 priority '+f('priority')); if(f('edgeports')){ l.push('configure stpd s0 ports link-type edge '+f('edgeports')); if(f('bpduguard')==='yes')l.push('configure stpd s0 ports edge-safeguard enable '+f('edgeports')+' bpdu-restrict'); } l.push('enable stpd s0'); return [{parents:null,lines:l}]; }
  }
  return [];
}
function taskName(c){return (c.comment&&c.comment.trim())?c.comment.trim():(NET_KINDS[c.kind]||NET_KINDS.raw).label;}
function netPreview(c){
  const seg=netSegments(c);
  if(seg&&seg.save) return ['(task final) save_when: modified'];
  const out=[];
  (seg||[]).forEach(s=>{if(s.note){(s.lines||[]).forEach(l=>out.push('! '+l));return;}(s.parents||[]).forEach(p=>out.push(p));(s.lines||[]).forEach(l=>out.push(((s.parents&&s.parents.length)?'  ':'')+l));});
  return out;
}

function buildNetPlaybook(){
  const I='  ',L=['---'],grp=netGroup(),module=netModule();
  const n=state.net;
  L.push('- name: '+quoteStr(n.meta.name||'Configuração de rede'));
  L.push(I+'hosts: '+grp);
  L.push(I+'gather_facts: false');
  L.push(I+'connection: network_cli');
  L.push(I+'tasks:');
  const ti=I+I,ki=I+I+'  ',li=I+I+'    ';
  let any=false,hasSave=false;
  n.cmds.forEach(c=>{
    const seg=netSegments(c);
    if(seg&&seg.save){hasSave=true;return;}
    (seg||[]).forEach(s=>{
      const parents=(s.parents&&s.parents.length)?s.parents:null;
      const lns=s.lines||[];
      if(s.note) return;
      if(!lns.length&&!parents) return;
      any=true;
      L.push(ti+'- name: '+quoteStr(taskName(c)));
      L.push(ki+module+':');
      if(parents){
        if(parents.length===1) L.push(li+'parents: '+quoteStr(parents[0]));
        else {L.push(li+'parents:');parents.forEach(p=>L.push(li+'  - '+quoteStr(p)));}
      }
      if(lns.length){L.push(li+'lines:');lns.forEach(x=>L.push(li+'  - '+quoteStr(x)));}
    });
  });
  if(!any&&!hasSave) L.push(ti+'# (nenhum comando definido)');
  if(hasSave){
    L.push(ti+'- name: '+quoteStr('Salvar configuração (se houve mudança)'));
    L.push(ki+module+':');
    L.push(li+'save_when: modified');
  }
  return L.join('\n')+'\n';
}
function buildNetInventory(){
  const t=state.target,T=TARGETS[t],n=state.net,grp=netGroup(),L=['# Inventário de rede — gerado automaticamente'];
  L.push('','['+grp+']');
  const devs=n.devices.filter(d=>d.name.trim()||d.ip.trim());
  if(!devs.length) L.push('# (adicione dispositivos na seção Dispositivos alvo)');
  devs.forEach(d=>{let line=(d.name.trim()||'device');if(d.ip.trim())line+=' ansible_host='+iniVal(d.ip.trim());L.push(line);});
  L.push('','['+grp+':vars]');
  L.push('ansible_connection=network_cli');
  L.push('ansible_network_os='+netOs());
  if(n.conn.user.trim()) L.push('ansible_user='+iniVal(n.conn.user.trim()));
  if(n.conn.password&&n.conn.password.trim()) L.push('ansible_password='+iniVal(n.conn.password.trim()));
  else L.push('ansible_password=          # preencha — ou, de preferência, use ansible-vault');
  if(T.enable&&n.conn.enable){
    L.push('ansible_become=true');
    L.push('ansible_become_method=enable');
    if(n.conn.enablePassword&&n.conn.enablePassword.trim()) L.push('ansible_become_password='+iniVal(n.conn.enablePassword.trim()));
    else L.push('ansible_become_password=   # senha de enable (ou ansible-vault)');
  }
  return L.join('\n')+'\n';
}

/* ===================== CLI NATIVO (EXOS / Ruckus) ===================== */
function cliSlice(){return state.mode==='exos'?state.cli.exos:state.mode==='ruckus'?state.cli.ruckus:state.cli.fabric;}
function cliDialect(){return state.mode==='exos'?'exos':state.mode==='ruckus'?'icx':'voss';}
function cliLabel(){return state.mode==='exos'?'Extreme EXOS':state.mode==='ruckus'?'Ruckus ICX (FastIron)':'Extreme Fabric (VOSS)';}

function renderCli(){
  const dialect=cliDialect(),slice=cliSlice(),label=cliLabel();
  const phKey=state.mode==='exos'?'exos':state.mode==='ruckus'?'ruckus_icx':'voss';
  const p=document.getElementById('panel-cli');
  p.innerHTML=`
    <div class="card target-card">
      <div class="card-title">🎯 Script — ${label}</div>
      <div class="field"><label>Nome / descrição do script</label>
        <input type="text" placeholder="Provisionar VLAN de acesso" value="${esc(slice.meta.name)}" oninput="c_meta('name',this.value)"></div>
      <div class="hint">Gera <b>um único arquivo de comandos ${label}</b> para colar direto no console do equipamento. Sem Ansible, sem inventário.</div>
    </div>
    <div class="card">
      <div class="card-title">🔧 Comandos (intenção → CLI)</div>
      <div id="c_cmds"></div>
      <button class="btn-add" onclick="c_addCmd()">+ Adicionar comando</button>
    </div>`;
  const cc=document.getElementById('c_cmds');
  cc.innerHTML=slice.cmds.length?'':'<div class="empty">Nenhum comando. Clique no botão acima.</div>';
  const kinds=kindsFor(state.mode==='exos'?'exos':state.mode==='ruckus'?'ruckus_icx':'voss');
  slice.cmds.forEach((c,ci)=>{
    const def=NET_KINDS[c.kind]||NET_KINDS.raw;
    const opts=kinds.map(k=>`<option value="${k}" ${c.kind===k?'selected':''}>${NET_KINDS[k].label}</option>`).join('');
    const fields = c.kind==='vlan_create' ? vlanFieldsHTML('cli',ci,c,dialect) : def.fields.filter(fl=>!fl[3]||fl[3]===dialect).map(([key,lbl,ph])=>{
      const placeholder=(ph&&(ph[phKey]||ph.cisco_ios))||'';
      if(key==='cmds'){const le=lintCmds(c[key]||'',dialect);
        return `<div class="field"><label>${lbl}</label><textarea class="${le.length?'has-err':''}" placeholder="${esc(placeholder)}" oninput="c_cmd(${ci},'${key}',this.value)">${esc(c[key]||'')}</textarea><div class="lint-area">${lintBoxHTML(le)}</div></div>`;}
      const so=selOptions(key,dialect,c.kind);
      if(so){
        const o=so.map(x=>`<option value="${x}" ${(c[key]||'')===x?'selected':''}>${x}</option>`).join('');
        return `<div class="field"><label>${lbl}</label><select onchange="c_cmd(${ci},'${key}',this.value)"><option value="">—</option>${o}</select></div>`;
      }
      return `<div class="field"><label>${lbl}</label><input type="text" placeholder="${esc(placeholder)}" value="${esc(c[key]||'')}" oninput="c_cmd(${ci},'${key}',this.value)"></div>`;
    }).join('');
    const card=document.createElement('div');card.className='block';
    card.innerHTML=`
      <div class="block-head">
        <div class="bnum net">${ci+1}</div>
        ${kindCombo('cli',ci,c.kind,kinds)}
        <button class="icon-btn up" onclick="c_move(${ci},-1)" title="subir">▲</button>
        <button class="icon-btn down" onclick="c_move(${ci},1)" title="descer">▼</button>
        <button class="icon-btn" onclick="c_del(${ci})" title="remover">✕</button>
      </div>
      <div class="field"><label>Comentário (opcional)</label>
        <input type="text" placeholder="o que este passo faz" value="${esc(c.comment||'')}" oninput="c_cmd(${ci},'comment',this.value)"></div>
      ${def.fields.length? '<div class="grid2">'+fields+'</div>' : '<div class="hint">Sem parâmetros.</div>'}
      ${taskWarning(c,state.mode)?`<div class="task-warn"><span class="tw-ic">⚠️</span><span>${esc(taskWarning(c,state.mode))}</span></div>`:''}
      <div class="preview-label">Linhas geradas</div>
      <div class="preview-cmd">${esc(cliPreview(c,state.mode).join('\n'))||'—'}</div>`;
    cc.appendChild(card);
  });
}

/* Aviso visual exibido na task (fora do script). Retorna texto ou '' quando não há aviso. */
function taskWarning(c,mode){
  if(c.kind==='stp' && mode==='fabric'){
    const m=(c.mode==='mstp')?'mstp':'rstp';
    return 'Alterar o modo do Spanning Tree (spanning-tree-mode '+m+') exige reiniciar o switch (reboot) para entrar em vigor.';
  }
  return '';
}
function cliPreview(c,mode){
  const dialect=mode==='exos'?'exos':mode==='ruckus'?'icx':'voss';
  if(c.kind==='save') return [mode==='exos'?'save configuration':mode==='ruckus'?'write memory':'save config'];
  const hier=(mode==='ruckus'||mode==='fabric');
  const seg=netSegments(c,dialect);
  const out=[];
  (seg||[]).forEach(s=>{
    const parents=(s.parents&&s.parents.length)?s.parents:null;
    if(s.note){(s.lines||[]).forEach(l=>out.push('! '+l));return;}
    if(hier&&parents){
      parents.forEach(p=>out.push(p));
      (s.lines||[]).forEach(l=>out.push(' '+l));
      out.push(' exit');
    } else {
      (s.lines||[]).forEach(l=>out.push(l));
    }
  });
  return out;
}

function buildCliScript(mode){
  const dialect=mode==='exos'?'exos':mode==='ruckus'?'icx':'voss';
  const slice=mode==='exos'?state.cli.exos:mode==='ruckus'?state.cli.ruckus:state.cli.fabric;
  const cmt=mode==='exos'?'#':'!';
  const hier=(mode==='ruckus'||mode==='fabric');
  const titles={exos:'Configuração Extreme EXOS',ruckus:'Configuração Ruckus ICX (FastIron)',fabric:'Configuração Extreme Fabric (VOSS)'};
  const L=[];
  L.push(cmt+' '+(slice.meta.name||titles[mode]));
  L.push(cmt+' Gerado automaticamente — revise antes de aplicar em produção');
  const body=[];let hasSave=false;
  slice.cmds.forEach(c=>{
    const seg=netSegments(c,dialect);
    if(seg&&seg.save){hasSave=true;return;}
    const cmdLines=[];
    (seg||[]).forEach(s=>{
      const parents=(s.parents&&s.parents.length)?s.parents:null;
      const lns=s.lines||[];
      if(s.note){lns.forEach(l=>cmdLines.push(cmt+' '+l));return;}
      if(hier&&parents){
        parents.forEach(p=>cmdLines.push(p));
        lns.forEach(l=>cmdLines.push(' '+l));
        cmdLines.push(' exit');
      } else {
        lns.forEach(l=>cmdLines.push(l));
      }
    });
    if(cmdLines.length){
      if(c.comment&&c.comment.trim()) body.push(cmt+' '+c.comment.trim());
      cmdLines.forEach(l=>body.push(l));
      body.push('');
    }
  });
  while(body.length&&body[body.length-1]==='') body.pop();
  if(mode==='ruckus'){
    L.push('configure terminal');
    if(!body.length) L.push(cmt+' (nenhum comando definido)');
    body.forEach(l=>L.push(l));
    L.push('end'); if(hasSave) L.push('write memory');
  } else if(mode==='fabric'){
    L.push('enable'); L.push('configure terminal');
    if(!body.length) L.push(cmt+' (nenhum comando definido)');
    body.forEach(l=>L.push(l));
    L.push('end'); if(hasSave) L.push('save config');
  } else {
    L.push('');
    if(!body.length) L.push(cmt+' (nenhum comando definido)');
    body.forEach(l=>L.push(l));
    if(hasSave) L.push('save configuration');
  }
  return L.join('\n')+'\n';
}

/* mutações CLI */
function c_meta(f,v){cliSlice().meta[f]=v;syncOut();}
function c_addCmd(){cliSlice().cmds.push({kind:'vlan_create',comment:''});render();}
function c_del(i){cliSlice().cmds.splice(i,1);render();}
function c_move(i,d){const c=cliSlice().cmds,j=i+d;if(j<0||j>=c.length)return;[c[i],c[j]]=[c[j],c[i]];render();}
function c_setKind(i,k){const s=cliSlice();s.cmds[i]={kind:k,comment:s.cmds[i].comment||''};render();}
function c_cmd(i,f,v){const s=cliSlice();s.cmds[i][f]=v;
  const blocks=document.querySelectorAll('#c_cmds .block');
  if(blocks[i]){const pv=blocks[i].querySelector('.preview-cmd');if(pv)pv.textContent=cliPreview(s.cmds[i],state.mode).join('\n')||'—';
    if(f==='cmds') updateLint(blocks[i],v,cliDialect());}
  syncOut();}

