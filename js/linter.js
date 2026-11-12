/* ===================== LINT — linhas de configuração (livre) ===================== */
/* Vocabulário de PRIMEIROS tokens aceitos por dialeto (heurístico). */
const CLI_VOCAB={
  ios:["no","default","do","exit","end","ip","ipv6","ntp","snmp-server","snmp","hostname","interface","vlan","name",
    "switchport","shutdown","description","username","enable","service","logging","line","banner","aaa","spanning-tree",
    "channel-group","access-list","crypto","clock","duplex","speed","mtu","encapsulation","router","network","permit",
    "deny","password","login","transport","exec-timeout","cdp","lldp","vtp","errdisable","storm-control","udld","power",
    "alias","archive","boot","class-map","policy-map","track","vrf","standby","route-map","tacacs-server","radius-server",
    "key","monitor","mac","arp","helper-address","redistribute","secret","privilege","ssh","scp",
    "show","copy","reload","terminal","configure","dir","debug","undebug","write","wr","do-exec"],
  nxos:["no","default","exit","end","feature","ip","ipv6","ntp","snmp-server","hostname","interface","vlan","name",
    "switchport","shutdown","description","username","password","role","spanning-tree","channel-group","vrf","vpc",
    "vdc","boot","clock","logging","line","banner","aaa","router","mtu","speed","duplex","cdp","lldp","copp","class-map",
    "policy-map","route-map","track","hsrp","permit","deny","mac","arp","redistribute","ssh","key",
    "show","copy","reload","terminal","configure","dir","debug","undebug","write"],
  exos:["create","configure","config","enable","disable","delete","unconfigure","unconfig","save","clear","run","show",
    "download","upload","install","uninstall","reboot","restart","rtlookup","edit","load","use","exit","quit","ping",
    "traceroute","virtual-router","telnet","ssh2","tftp","scp2","synchronize","refresh","mstp","stpd"],
  icx:["no","exit","end","write","ip","ipv6","vlan","tagged","untagged","router-interface","port-name","hostname",
    "interface","username","password","snmp-server","ntp","server","aaa","enable","disable","lag","ports","deploy",
    "spanning-tree","trunk","dual-mode","inline","stack","logging","clock","banner","crypto","ssh","telnet",
    "web-management","dhcp","helper-address","route-only","jumbo","mirror","monitor","rate-limit","broadcast",
    "multicast","qos","trust","speed-duplex","flow-control","loop-detection","privilege","router",
    "show","copy","reload","configure","terminal"],
  voss:["no","default","exit","end","enable","configure","save","boot","sys","vlan","interface","router","ip","ipv6",
    "isis","spbm","mlt","smlt","name","members","i-sid","ipvpn","vrf","brouter","encapsulation","auto-sense","fa",
    "lacp","vrrp","dvr","igmp","slpp","shutdown","description","ntp","clock","logging","cli","password","username",
    "ssh","telnet","snmplog","snmp-server","filter","qos","cfm","macsec","eapol","radius","tacacs","license",
    "ip-source-address","manual-area","system-id","nick-name","is-type","redistribute","ipfix",
    "show","copy","ping","traceroute","trace","reset","source","config"]
};
/* Palavras-chave que aparecem no MEIO dos comandos (para checar as palavras seguintes). */
const CLI_VOCAB_MID={
  ios:["address","secondary","server","version","http","https","secure-server","community","ro","rw","view","traps",
    "informs","contact","location","host","source","access","trunk","allowed","native","add","remove","except","mode",
    "active","passive","desirable","auto","on","nonegotiate","dot1q","isl","routing","route","lookup","domain",
    "domain-name","name-server","default-gateway","default-router","dhcp","pool","snooping","relay","local","input",
    "output","preferred","all","none","portfast","bpduguard","bpdufilter","guard","root","loop","cost","priority",
    "port-priority","hello-time","forward-time","max-age","mst","rapid-pvst","pvst","jumbo","full","half","negotiation",
    "flowcontrol","receive","send","bandwidth","delay","keepalive","load-interval","channel-protocol","lacp","pagp",
    "port-channel","min-links","group","auth","priv","sha","md5","aes","des","v1","v2c","v3","noauth","any","eq","gt",
    "lt","neq","range","established","log","log-input","seq","remark","extended","standard","in","out","vty","console",
    "aux","synchronous","motd","exec","level","buffered","trap","facility","timezone","summer-time","recurring","set",
    "calendar","master","peer","prefer","area","neighbor","remote-as","subnets","metric","passive-interface",
    "default-information","originate","maximum-paths","router-id","user","timeout","authentication","version",
    "tcp","udp","icmp","igmp","esp","ahp","gre","pim","ospf","eigrp","bgp","rip","running-config","startup-config"],
  nxos:["interface-vlan","peer-link","peer-keepalive","destination","management","member","type","ethernet","port",
    "force","lacp","active","passive","on","mode","access","trunk","allowed","native","add","remove","address","server",
    "version","http","https","community","ro","rw","use-vrf","source-interface","name-server","domain-name","routing",
    "route","auth","priv","sha","md5","aes-128","des","v3","permit","deny","any","host","eq","established","log","seq",
    "statistics","per-entry","priority","cost","portfast","bpduguard","root","guard","network","area","router-id",
    "direct","maximum-paths","peer","prefer","group","level","user","local","timeout","contact","location","traps",
    "tcp","udp","icmp","igmp","esp","gre","pim","ospf","eigrp","bgp","rip","running-config","startup-config"],
  exos:["vlan","vlans","vman","tag","ports","port","all","add","delete","untagged","tagged","ipaddress","ipforwarding",
    "name","description-string","display-string","sysname","syscontact","syslocation","snmp","community","readonly",
    "readwrite","access-profile","sntp-client","primary","secondary","update-interval","dns-client","name-server",
    "default-domain","sharing","grouping","algorithm","address-based","port-based","round-robin","lacp","account",
    "admin","user","password","encrypted","session","idletimeout","web","http","https","cist","msti","auto-bind",
    "edge-safeguard","bpdu-restrict","fdb","aging-time","mirror","mirroring","to","monitor","flood","broadcast",
    "multicast","unknown-destmac","dot1q","ethertype","jumbo-frame","size","log","syslog","target","severity","banner",
    "before-login","after-login","authentication","netlogin","radius","tacacs","mgmt-access","primary-server",
    "secondary-server","client","shared-secret","vr","vr-default","vr-mgmt","ospf","rip","bgp","rate-limit",
    "snmpv3","privacy","auth-passphrase","priv-passphrase"],
  icx:["to","ethernet","ve","address","server-address","domain-list","version","name","by","port","priority","802-1w",
    "rstp","admin-edge-port","admin-pt2pt-mac","community","ro","rw","user","auth","priv","sha","md5","aes","des","v3",
    "group","dynamic","static","id","primary-port","snooping","relay","mtu","full","half","auto","memory","terminal",
    "input","output","both","area","metric","permit","deny","any","host","eq","established","log","sequence","level",
    "facility","buffered","console","persistence","summer-time","timezone","gmt","sntp","poll-interval","authenticate",
    "authentication-key","lacp","timeout","short","long","add","remove","mode","local","http","https","routing",
    "tcp","udp","icmp","ospf","bgp","rip","running-config","startup-config","dns"],
  voss:["create","add","remove","type","port-mstprstp","spbm-bvlan","protocol-based","address","vrfid","gigabitethernet",
    "fastethernet","loopback","clip","b-vid","primary","secondary","l1","l2","direct","static","ospf","rip","bgp",
    "apply","member","dot1q","untag-port-default-vlan","default-vlan-id","assignment","key","aggregation",
    "backup-master","priority","leaf","controller","snooping","proxy","version","packet-rx","packet-tx","tx-interval",
    "ethertype","cp","limit","action","port-down","level","transferfile","write","timeout","sessions","more",
    "min-passwd-len","aging","secure","access","rwa","rw","ro","community","group","view","host","force-topology-ip",
    "mgmt","dhcp-client","source-ip","interval","route-map","preference","ecmp","alternative-route",
    "circuitless-ip-int","spb-mcast","multicast","fabric","attach","rsmlt","edge-support","holdup-timer","peer-address",
    "flags","sshd","ftpd","tftpd","telnetd","rlogind","sshpass","block-snmp","enhancedsecure-mode","factorydefaults",
    "server","host","http","https","web","client","used-by","timeout-interval"]
};
/* Palavras cujo PRÓXIMO token é um valor livre (não checar) */
const LINT_VALUE_NEXT=["username","user","vrf","group","account","key","alias","view"];
/* Palavras a partir das quais o resto da linha é texto livre (parar de checar) */
const LINT_FREE_REST=["name","description","description-string","display-string","port-name","banner","hostname",
  "community","password","secret","auth-passphrase","priv-passphrase","default-domain","domain-list","contact",
  "location","sysname","remark","motd","shared-secret","authentication-key"];
/* Formas que existem em outros fabricantes mas NÃO neste — apontar a forma certa */
const CLI_DIALECT_FIX={
  exos:{"ssh":"ssh2","write":"save configuration","reload":"reboot","hostname":"configure snmp sysName"}
};
/* Termos de rede universais — nunca marcados como erro, em nenhum dialeto.
   (Entram só na checagem de pertencimento; não são usados como sugestão de typo.) */
const LINT_SAFE_WORDS=["dns","dhcp","dhcpv6","ftp","tftp","sftp","scp","http","https","ssh","ssl","tls","vpn","mpls",
  "bgp","ospf","rip","ripng","eigrp","isis","stp","rstp","mstp","pvst","lacp","lldp","cdp","ntp","sntp","snmp","snmpv3",
  "syslog","radius","tacacs","aaa","acl","nat","pat","qos","cos","dscp","mtu","arp","mac","vlan","vlans","vrf","vrrp",
  "hsrp","glbp","igmp","pim","mld","ipv4","ipv6","icmp","icmpv6","tcp","udp","gre","ipsec","esp","sha","md5","aes",
  "des","rsa","web","gui","api","poe","lan","wan","wifi","dot1x","dot1q","port","ports","trunk","access","config",
  "system","login","logout","user","users","admin","guest","mgmt","oob","console","telnet","email","smtp","ldap",
  "kerberos","slaac","ttl","tos","ecn","sflow","netflow","ipfix","erspan","span","rspan","cpu","memory","flash",
  "nvram","bootflash","usb","auto","none","all","any","default","primary","secondary","backup","active","standby",
  "master","slave","client","server","host","hosts","local","remote","source","destination","input","output",
  "ingress","egress","up","down","reset","status","info","detail","brief","full","half","slot","module","stack",
  "unit","chassis","fan","psu","led","banner","clock","timezone","log","logs","debug","trace","test","lab",
  "ldp","rsvp","bfd","ptp","pbr","evpn","vxlan","vpls","lsp","oam","cfm","udld","mvrp","gvrp","lag","mlag","vpc",
  "twamp","y1731","erps","reboot","upgrade","firmware","image","boot","license"];
const _KW={};
function kwFor(dialect){
  if(!CLI_VOCAB[dialect]) return null;
  if(!_KW[dialect]){
    const arr=CLI_VOCAB[dialect].concat(CLI_VOCAB_MID[dialect]||[]);
    const set=new Set(arr.concat(LINT_SAFE_WORDS));
    _KW[dialect]={arr:arr,set:set,
      firstSet:(dialect==='exos'?new Set(CLI_VOCAB.exos):set),   // EXOS: linha começa com verbo
      fix:CLI_DIALECT_FIX[dialect]||{}};
  }
  return _KW[dialect];
}
/* Distância de edição com transposição (OSA): pega letras trocadas de lugar (ex.: "prots" ~ "ports") */
function lev(a,b){
  const m=a.length,n=b.length;if(!m)return n;if(!n)return m;
  const d=[];for(let i=0;i<=m;i++)d[i]=[i];
  for(let j=0;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    const c=a[i-1]===b[j-1]?0:1;
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
  }
  return d[m][n];
}
function nearestCmd(w,arr){
  let best=null,bd=Infinity;
  arr.forEach(v=>{const d=lev(w,v);if(d<bd){bd=d;best=v;}});
  return bd<=(w.length<=5?1:2)?best:null;
}
/* Typo de termo universal: só palavras alfabéticas 5+, distância 1, ignorando plural ("servers" ≠ typo) */
function nearestSafe(w){
  if(!/^[a-z]+$/.test(w)||w.length<4) return null;
  for(let i=0;i<LINT_SAFE_WORDS.length;i++){
    const v=LINT_SAFE_WORDS[i];
    if(w===v+'s') continue;
    if(Math.abs(w.length-v.length)<=1&&lev(w,v)<=1) return v;
  }
  return null;
}
/* Tecla segurada: "serverrrrrr" → colapsa sequências de 3+ letras iguais e compara */
function collapseHit(w,kw){
  if(!/(.)\1\1/.test(w)) return null;
  const c1=w.replace(/(.)\1{2,}/g,'$1'),c2=w.replace(/(.)\1{2,}/g,'$1$1');
  if(kw.set.has(c1)) return c1;
  if(kw.set.has(c2)) return c2;
  return nearestCmd(c1,kw.arr);
}
/* Analisa o texto do bloco livre e devolve [{ln,col,len,line,msg,sug}] */
function lintCmds(text,dialect){
  const errs=[],kw=kwFor(dialect);
  String(text||'').split('\n').forEach((line,i)=>{
    const ln=i+1,t=line.trim();
    if(!t||t[0]==='#'||t[0]==='!') return;                       // vazio ou comentário
    if(((line.match(/"/g)||[]).length)%2===1)
      errs.push({ln,col:line.lastIndexOf('"')+1,len:1,line,msg:'aspas abertas sem fechar'});
    const qi=line.indexOf('?');
    if(qi>=0) errs.push({ln,col:qi+1,len:1,line,msg:'«?» abre a ajuda no console — remova este caractere'});
    const si=line.indexOf(';');
    if(si>=0) errs.push({ln,col:si+1,len:1,line,msg:'«;» não é usado em comandos destes CLIs — remova ou quebre em outra linha'});
    const cm=line.match(/[A-Za-z],|,[A-Za-z]/);
    if(cm) errs.push({ln,col:line.indexOf(cm[0])+(cm[0][0]===','?1:2),len:1,line,msg:'vírgula colada em palavra — confira a digitação (listas numéricas como 100,200 são normais)'});
    const dd=line.indexOf('..');
    if(dd>=0) errs.push({ln,col:dd+1,len:2,line,msg:'ponto duplicado «..» — confira a digitação'});
    const na=line.match(/[^\x20-\x7E]/);
    if(na) errs.push({ln,col:line.indexOf(na[0])+1,len:1,line,msg:'caractere inválido «'+na[0]+'» — o CLI aceita apenas ASCII (sem acentos)'});
    const toks=[];const re=/\S+/g;let mm;
    while((mm=re.exec(line))) toks.push({t:mm[0],col:mm.index+1});
    if(!toks.length) return;
    /* pontuação colada em palavra (MAC/IPv6 hex e portas EXOS 1:1-1:8 são normais) */
    const punct=tk=>{
      const w=tk.t;
      if(w.indexOf(':')>=0&&/[A-Za-z]/.test(w)&&!/^[0-9A-Fa-f:.\-\/]+$/.test(w))
        errs.push({ln,col:tk.col+w.indexOf(':'),len:1,line,msg:'«:» no meio de «'+w+'» — confira a digitação'});
      if(/^[A-Za-z][A-Za-z0-9-]*\.$/.test(w))
        errs.push({ln,col:tk.col+w.length-1,len:1,line,msg:'ponto solto no fim de «'+w+'» — confira a digitação'});
    };
    if(!kw){ toks.forEach(punct); return; }                      // alvo genérico: só estrutura/pontuação
    const t0=toks[0];
    if(/^\d/.test(t0.t)) return;                                // linha numerada (seq. de ACL etc.)
    punct(t0);
    let low0=t0.t.toLowerCase();
    if(!kw.firstSet.has(low0)){
      const core0=low0.replace(/[;,.:]+$/,'');
      if(core0!==low0&&kw.firstSet.has(core0)) low0=core0;       // palavra-chave com pontuação (já apontada acima)
      else{
        const w0=core0||low0,fx0=kw.fix[w0];
        if(fx0) errs.push({ln,col:t0.col,len:t0.t.length,line,msg:'«'+t0.t+'» não existe neste fabricante — aqui use «'+fx0+'»'});
        else if(kw.set.has(w0)) errs.push({ln,col:t0.col,len:t0.t.length,line,msg:'em EXOS os comandos começam com um verbo (create, configure, enable, disable, delete, unconfigure, save…) — «'+t0.t+'» não inicia linha'});
        else errs.push({ln,col:t0.col,len:t0.t.length,line,msg:'comando «'+t0.t+'» não reconhecido — verifique a digitação',sug:nearestCmd(w0,kw.arr)||collapseHit(w0,kw)||nearestSafe(w0)});
        return;                                                  // 1ª palavra errada: não checa o resto
      }
    }
    if(LINT_FREE_REST.indexOf(low0)>=0) return;                  // ex.: hostname X, description X…
    let start=1;
    if((low0==='no'||low0==='default')&&toks[1]&&!/^\d/.test(toks[1].t)){
      punct(toks[1]);
      let low1=toks[1].t.toLowerCase();
      if(!kw.set.has(low1)){
        const core1=low1.replace(/[;,.:]+$/,'');
        if(core1!==low1&&kw.set.has(core1)) low1=core1;
        else{
          errs.push({ln,col:toks[1].col,len:toks[1].t.length,line,msg:'comando «'+toks[1].t+'» não reconhecido após «'+t0.t+'»',sug:nearestCmd(core1||low1,kw.arr)||collapseHit(core1||low1,kw)||nearestSafe(core1||low1)});
          return;
        }
      }
      if(LINT_FREE_REST.indexOf(low1)>=0) return;
      start=2;
    }
    /* Palavras seguintes: sinaliza apenas o que é "quase igual" a uma palavra-chave conhecida.
       Valores livres (nomes, IPs, portas, senhas, maiúsculas) são ignorados. */
    let skipNext=(LINT_VALUE_NEXT.indexOf(low0)>=0);
    for(let k=start;k<toks.length;k++){
      const tok=toks[k].t;
      if(skipNext){skipNext=false;continue;}
      punct(toks[k]);
      let low=tok.toLowerCase();
      const fx=kw.fix[low];
      if(fx){errs.push({ln,col:toks[k].col,len:tok.length,line,msg:'«'+tok+'» não existe neste fabricante — aqui use «'+fx+'»'});continue;}
      if(!kw.set.has(low)){
        const c2=low.replace(/[;,.:]+$/,'');
        if(c2!==low&&kw.set.has(c2)) low=c2;                     // palavra-chave com pontuação colada
      }
      if(kw.set.has(low)){
        if(LINT_FREE_REST.indexOf(low)>=0) break;                // resto da linha é texto livre
        if(LINT_VALUE_NEXT.indexOf(low)>=0) skipNext=true;
        continue;
      }
      const core=low.replace(/[;,.:]+$/,'');
      if(!/^[a-z][a-z0-9-]*$/.test(core)||core.length<3) continue; // parece valor, não comando
      const rep2=collapseHit(core,kw);
      if(rep2){errs.push({ln,col:toks[k].col,len:core.length,line,msg:'letras repetidas em «'+core+'» — confira a digitação',sug:rep2});continue;}
      const sug=nearestCmd(core,kw.arr)||nearestSafe(core);
      if(sug) errs.push({ln,col:toks[k].col,len:core.length,line,msg:'possível erro de digitação em «'+core+'»',sug:sug});
    }
  });
  return errs;
}
function lintBoxHTML(errs){
  if(!errs.length) return '';
  return '<div class="lint-box">'+errs.map(e=>{
    const s=e.line,a=s.slice(0,e.col-1),b=s.slice(e.col-1,e.col-1+e.len),c=s.slice(e.col-1+e.len);
    return '<div class="lint-item"><span class="lint-msg">⚠ Linha '+e.ln+', coluna '+e.col+': '+esc(e.msg)+'</span>'
      +(e.sug?' — você quis dizer <span class="lint-sug">'+esc(e.sug)+'</span>?':'')
      +'<code>'+esc(a)+'<span class="lint-tok">'+(esc(b)||' ')+'</span>'+esc(c)+'</code></div>';
  }).join('')+'</div>';
}
function updateLint(block,text,dialect){
  if(!block) return;
  const la=block.querySelector('.lint-area'); if(!la) return;
  const errs=lintCmds(text,dialect);
  la.innerHTML=lintBoxHTML(errs);
  const ta=la.previousElementSibling;
  if(ta&&ta.tagName==='TEXTAREA') ta.classList.toggle('has-err',errs.length>0);
}

