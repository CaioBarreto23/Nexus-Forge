/* ===================== ALVOS ===================== */
const TARGETS={
  linux:      {label:'🐧 Servidor Linux (dispositivo final)', net:false,
               hint:'Gera playbook com módulos ansible.builtin (apt/yum, service, copy…) e inventário de servidores.'},
  cisco_ios:  {label:'Cisco IOS / IOS-XE', net:true, os:'cisco.ios.ios',  module:'cisco.ios.ios_config',   enable:true,  dialect:'ios'},
  cisco_nxos: {label:'Cisco NX-OS (Nexus)', net:true, os:'cisco.nxos.nxos', module:'cisco.nxos.nxos_config', enable:false, dialect:'nxos'},
  exos:       {label:'Extreme EXOS', net:true, os:'community.network.exos', module:'community.network.exos_config', enable:false, dialect:'exos'},
  ruckus_icx: {label:'Ruckus ICX (FastIron)', net:true, os:'community.network.icx', module:'community.network.icx_config', enable:true, dialect:'icx'},
  voss:       {label:'Extreme Fabric (VOSS / Fabric Engine)', net:true, os:'community.network.voss', module:'community.network.voss_config', enable:false, dialect:'voss'},
  generic:    {label:'⚙ Genérico (outro fabricante)', net:true, os:'', module:'', enable:false, dialect:'generic'}
};

/* ===================== ESTADO (só em memória) ===================== */
let state, activeTab=0;
function freshState(){return{
  mode:'exos',
  target:'cisco_ios',
  linux:{
    play:{name:'',hosts:'all',become:false,facts:true},
    vars:[],
    groups:[],
    tasks:[]
  },
  net:{
    meta:{name:''},
    conn:{user:'admin',password:'',enablePassword:'',enable:true},
    customOs:'',
    customModule:'',
    devices:[],
    cmds:[]
  },
  cli:{
    exos:{meta:{name:''},cmds:[]},
    ruckus:{meta:{name:''},cmds:[]},
    fabric:{meta:{name:''},cmds:[]}
  }
};}

const COMMON_MODULES=["ansible.builtin.apt","ansible.builtin.yum","ansible.builtin.dnf","ansible.builtin.package",
  "ansible.builtin.service","ansible.builtin.systemd","ansible.builtin.copy","ansible.builtin.template",
  "ansible.builtin.file","ansible.builtin.lineinfile","ansible.builtin.user","ansible.builtin.group",
  "ansible.builtin.command","ansible.builtin.shell","ansible.builtin.git","ansible.builtin.pip",
  "ansible.builtin.cron","ansible.builtin.get_url","ansible.builtin.unarchive","ansible.posix.authorized_key",
  "ansible.builtin.debug"];

/* Intenções de rede — campo: [chave, rótulo, {placeholders por alvo}] */
const PH=(o)=>o;
const NET_KINDS={
  vlan_create:{label:"Criar VLAN",fields:[
    ["tag","VLAN ID (tag)",PH({cisco_ios:"100",cisco_nxos:"100",exos:"100",ruckus_icx:"100",voss:"100"})],
    ["name","Nome da VLAN",PH({cisco_ios:"Vendas",cisco_nxos:"Vendas",exos:"Vendas",ruckus_icx:"Vendas",voss:"Vendas"})],
    ["isid","I-SID (L2 VSN)",PH({voss:"10100"}),"voss"]]},
  vlan_ports:{label:"Atribuir portas à VLAN",fields:[
    ["tag","VLAN ID (tag)",PH({cisco_ios:"100",cisco_nxos:"100",exos:"100",ruckus_icx:"100",voss:"100"})],
    ["ports","Portas / interfaces",PH({cisco_ios:"Gi1/0/1-8",cisco_nxos:"Ethernet1/1-8",exos:"1:1-1:8",ruckus_icx:"1/1/1 to 1/1/8",voss:"1/1-1/8"})],
    ["mode","Modo",PH({cisco_ios:"access",cisco_nxos:"access",exos:"untagged",ruckus_icx:"access",voss:"access"})]]},
  svi_ip:{label:"IP da VLAN (SVI/L3)",fields:[
    ["tag","VLAN ID (tag)",PH({cisco_ios:"100",cisco_nxos:"100",exos:"100",ruckus_icx:"100",voss:"100"})],
    ["ipmask","IP/máscara (CIDR)",PH({cisco_ios:"10.10.0.1/24",cisco_nxos:"10.10.0.1/24",exos:"10.10.0.1/24",ruckus_icx:"10.10.0.1/24",voss:"10.10.0.1/24"})]]},
  inter_vlan:{label:"Roteamento entre VLANs (L3)",fields:[
    ["vlans","VLANs para rotear (apenas EXOS; vazio = todas)",PH({cisco_ios:"—",cisco_nxos:"—",exos:"100,200,300",ruckus_icx:"—"})]]},
  port_state:{label:"Habilitar/Desabilitar portas",fields:[
    ["state","Estado",PH({cisco_ios:"enable",cisco_nxos:"enable",exos:"enable",ruckus_icx:"enable"})],
    ["ports","Portas / interfaces",PH({cisco_ios:"Gi1/0/9",cisco_nxos:"Ethernet1/9",exos:"1:5-1:8",ruckus_icx:"1/1/9"})]]},
  port_desc:{label:"Descrição de portas",fields:[
    ["ports","Portas / interfaces",PH({cisco_ios:"Gi1/0/48",cisco_nxos:"Ethernet1/48",exos:"1:48",ruckus_icx:"1/1/48"})],
    ["desc","Descrição",PH({cisco_ios:"Uplink-Core",cisco_nxos:"Uplink-Core",exos:"Uplink-Core",ruckus_icx:"Uplink-Core"})]]},
  hostname:{label:"Hostname / sysName",fields:[
    ["name","Nome",PH({cisco_ios:"SW-ACESSO-01",cisco_nxos:"SW-ACESSO-01",exos:"SW-ACESSO-01",ruckus_icx:"SW-ACESSO-01"})]]},
  snmp:{label:"SNMP community",fields:[
    ["access","Acesso",PH({cisco_ios:"readonly",cisco_nxos:"readonly",exos:"readonly",ruckus_icx:"readonly"})],
    ["community","Community",PH({cisco_ios:"public",cisco_nxos:"public",exos:"public",ruckus_icx:"public"})]]},
  ntp:{label:"NTP (servidor de hora)",fields:[
    ["server","Servidor(es) NTP",PH({cisco_ios:"200.160.7.186",cisco_nxos:"200.160.7.186",exos:"200.160.7.186",ruckus_icx:"200.160.7.186"})],
    ["vr","Virtual Router (VR)",PH({exos:"VR-Default"}),"exos"]]},
  lag:{label:"LAG / agregação de link",fields:[
    ["id","ID do LAG / port-channel (master no EXOS)",PH({cisco_ios:"1",cisco_nxos:"1",exos:"1:1",ruckus_icx:"1"})],
    ["ports","Portas membro",PH({cisco_ios:"Gi1/0/1-2",cisco_nxos:"Ethernet1/1-2",exos:"1:1-1:2",ruckus_icx:"1/1/1 to 1/1/2"})],
    ["lacp","Modo",PH({cisco_ios:"active",cisco_nxos:"active",exos:"active",ruckus_icx:"active"})],
    ["algorithm","Algoritmo de sharing",PH({exos:"address-based L3"}),"exos"]]},
  snmpv3:{label:"SNMPv3 (usuário)",fields:[
    ["user","Usuário SNMPv3",PH({cisco_ios:"snmpadmin",cisco_nxos:"snmpadmin",exos:"snmpadmin",ruckus_icx:"snmpadmin"})],
    ["authproto","Autenticação",PH({cisco_ios:"sha",cisco_nxos:"sha",exos:"sha",ruckus_icx:"sha"})],
    ["authpass","Senha de autenticação",PH({cisco_ios:"Auth@12345",cisco_nxos:"Auth@12345",exos:"Auth@12345",ruckus_icx:"Auth@12345"})],
    ["privproto","Criptografia",PH({cisco_ios:"aes",cisco_nxos:"aes",exos:"aes",ruckus_icx:"aes"})],
    ["privpass","Senha de criptografia",PH({cisco_ios:"Priv@12345",cisco_nxos:"Priv@12345",exos:"Priv@12345",ruckus_icx:"Priv@12345"})]]},
  dns:{label:"DNS (resolvedor)",fields:[
    ["server","Servidor(es) DNS",PH({cisco_ios:"8.8.8.8 1.1.1.1",cisco_nxos:"8.8.8.8 1.1.1.1",exos:"8.8.8.8",ruckus_icx:"8.8.8.8"})],
    ["domain","Domínio de busca",PH({cisco_ios:"empresa.local",cisco_nxos:"empresa.local",exos:"empresa.local",ruckus_icx:"empresa.local"})],
    ["vr","Virtual Router (VR)",PH({exos:"VR-Default"}),"exos"]]},
  user_create:{label:"Criar usuário no switch",fields:[
    ["user","Nome do usuário",PH({cisco_ios:"netadmin",cisco_nxos:"netadmin",exos:"netadmin",ruckus_icx:"netadmin",voss:"netadmin"})],
    ["password","Senha",PH({cisco_ios:"S3nha@Forte",cisco_nxos:"S3nha@Forte",exos:"S3nha@Forte",ruckus_icx:"S3nha@Forte",voss:"S3nha@Forte"})],
    ["role","Perfil / privilégio",PH({cisco_ios:"15",cisco_nxos:"network-admin",exos:"admin",ruckus_icx:"0",voss:"rwa"})]]},
  static_route:{label:"Rota estática",fields:[
    ["dest","Rede de destino (CIDR)",PH({cisco_ios:"0.0.0.0/0",cisco_nxos:"0.0.0.0/0",exos:"0.0.0.0/0",ruckus_icx:"0.0.0.0/0",voss:"0.0.0.0/0"})],
    ["nexthop","Next-hop (gateway)",PH({cisco_ios:"10.0.0.1",cisco_nxos:"10.0.0.1",exos:"10.0.0.1",ruckus_icx:"10.0.0.1",voss:"10.0.0.1"})],
    ["distance","Distância administrativa (opcional)",PH({cisco_ios:"1",cisco_nxos:"1",exos:"1",ruckus_icx:"1",voss:"1"})],
    ["vrf","VRF (opcional; vazio = GRT/global)",PH({voss:"VENDAS"}),"voss"]]},
  spbm_isis:{label:"Fabric: SPBM / IS-IS (underlay)",fields:[
    ["bvid1","B-VLAN primária",PH({voss:"4051"})],
    ["bvid2","B-VLAN secundária",PH({voss:"4052"})],
    ["nickname","Nickname (x.xx.xx)",PH({voss:"0.00.16"})],
    ["system_id","System ID (xxxx.xxxx.xxxx)",PH({voss:"0016.0016.0016"})],
    ["area","Manual area (IS-IS)",PH({voss:"49.0000"})]]},
  nni:{label:"Fabric: porta NNI (link do fabric)",fields:[
    ["ports","Portas NNI",PH({voss:"1/1-1/2"})]]},
  ip_shortcuts:{label:"Fabric: IP Shortcuts (L3 na GRT)",fields:[
    ["loopback","Loopback / CLIP id",PH({voss:"1"})],
    ["ip","IP do loopback (CIDR)",PH({voss:"1.1.1.16/32"})]]},
  l3vsn:{label:"Fabric: L3 VSN (VRF)",fields:[
    ["vrf","Nome da VRF",PH({voss:"VENDAS"})],
    ["vrfid","VRF ID",PH({voss:"2"})],
    ["isid","I-SID do L3 VSN",PH({voss:"30100"})]]},
  mlt:{label:"Fabric: MLT / SMLT (agregação)",fields:[
    ["id","ID do MLT",PH({voss:"1"})],
    ["ports","Portas membro",PH({voss:"1/3-1/4"})],
    ["mode","Tagging",PH({voss:"access"})],
    ["smlt","Tipo",PH({voss:"standalone"})]]},
  lldp:{label:"LLDP (descoberta de vizinhos)",fields:[
    ["state","Estado",PH({cisco_ios:"enable",cisco_nxos:"enable",exos:"enable",ruckus_icx:"enable",voss:"enable"})],
    ["scope","Escopo",PH({cisco_ios:"global",cisco_nxos:"global",exos:"global",ruckus_icx:"global",voss:"global"})],
    ["ports","Portas (se por porta)",PH({cisco_ios:"Gi1/0/1-8",cisco_nxos:"Ethernet1/1-8",exos:"1:1-1:8",ruckus_icx:"1/1/1 to 1/1/8",voss:"1/1-1/8"})]]},
  cdp:{label:"CDP (Cisco Discovery Protocol)",fields:[
    ["state","Estado",PH({cisco_ios:"enable",cisco_nxos:"enable"})],
    ["scope","Escopo",PH({cisco_ios:"global",cisco_nxos:"global"})],
    ["ports","Portas (se por porta)",PH({cisco_ios:"Gi1/0/1-8",cisco_nxos:"Ethernet1/1-8"})]]},
  banner:{label:"Banner (aviso de login/MOTD)",fields:[
    ["btype","Tipo",PH({cisco_ios:"login",cisco_nxos:"motd",exos:"before-login",ruckus_icx:"motd",voss:"motd"})],
    ["text","Texto do banner",PH({cisco_ios:"Acesso restrito - Nexus Forge",cisco_nxos:"Acesso restrito - Nexus Forge",exos:"Acesso restrito - Nexus Forge",ruckus_icx:"Acesso restrito - Nexus Forge",voss:"Acesso restrito - Nexus Forge"})]]},
  poe:{label:"PoE (Power over Ethernet)",fields:[
    ["state","Estado",PH({cisco_ios:"enable",exos:"enable",ruckus_icx:"enable",voss:"enable"})],
    ["scope","Escopo",PH({cisco_ios:"port",exos:"port",ruckus_icx:"port",voss:"port"})],
    ["ports","Portas (se por porta)",PH({cisco_ios:"Gi1/0/1-8",exos:"1:1-1:8",ruckus_icx:"1/1/1 to 1/1/8",voss:"1/1-1/8"})]]},
  speed:{label:"Speed / duplex de portas",fields:[
    ["ports","Portas / interfaces",PH({cisco_ios:"Gi1/0/1",cisco_nxos:"Ethernet1/1",exos:"1:1",ruckus_icx:"1/1/1",voss:"1/1"})],
    ["autoneg","Auto-negociação",PH({cisco_ios:"off",cisco_nxos:"off",exos:"off",ruckus_icx:"off",voss:"off"})],
    ["speed","Velocidade (Mbps)",PH({cisco_ios:"1000",cisco_nxos:"1000",exos:"1000",ruckus_icx:"1000",voss:"1000"})],
    ["duplex","Duplex",PH({cisco_ios:"full",cisco_nxos:"full",exos:"full",ruckus_icx:"full",voss:"full"})]]},
  vint:{label:"Interface virtual (SVI/VE) com IP",fields:[
    ["tag","VLAN ID",PH({cisco_ios:"100",cisco_nxos:"100",exos:"100",ruckus_icx:"100",voss:"100"})],
    ["ipmask","IP/máscara (CIDR)",PH({cisco_ios:"10.10.0.1/24",cisco_nxos:"10.10.0.1/24",exos:"10.10.0.1/24",ruckus_icx:"10.10.0.1/24",voss:"10.10.0.1/24"})],
    ["desc","Descrição (opcional)",PH({cisco_ios:"Gateway Vendas",cisco_nxos:"Gateway Vendas",ruckus_icx:"Gateway Vendas"})]]},
  stp:{label:"STP (Spanning Tree)",fields:[
    ["mode","Modo (rstp / stp / mstp)",PH({cisco_ios:"rapid-pvst",cisco_nxos:"rapid-pvst",exos:"rstp",ruckus_icx:"rstp",voss:"rstp"})],
    ["tag","VLAN/instância (prioridade)",PH({cisco_ios:"100",cisco_nxos:"100",exos:"100",ruckus_icx:"100",voss:"100"})],
    ["priority","Prioridade (0-61440, múltiplo de 4096)",PH({cisco_ios:"4096",cisco_nxos:"4096",exos:"4096",ruckus_icx:"4096",voss:"4096"})],
    ["edgeports","Portas de borda (PortFast/edge)",PH({cisco_ios:"Gi1/0/1-8",cisco_nxos:"Ethernet1/1-8",exos:"1:1-1:8",ruckus_icx:"1/1/1 to 1/1/8",voss:"1/1-1/8"})],
    ["bpduguard","BPDU Guard nas portas de borda",PH({cisco_ios:"yes",cisco_nxos:"yes",exos:"yes",ruckus_icx:"yes",voss:"yes"})]]},
  icx_register:{label:"Registrar switch na controladora (SmartZone/vSZ)",fields:[
    ["ip","IP da controladora (SmartZone/vSZ)",PH({ruckus_icx:"192.168.10.5"})],
    ["mode","Lista (active = primária / backup = redundância)",PH({ruckus_icx:"active"})]]},
  icx_license:{label:"Instalar licença (perpétua)",fields:[
    ["unit","Unidade / stack unit (standalone = 1)",PH({ruckus_icx:"1"})],
    ["pkg","Pacote de licença",PH({ruckus_icx:"l3-prem"})]]},
  save:{label:"Salvar configuração",fields:[]},
  raw:{label:"Linhas de configuração (livre)",fields:[
    ["cmds","Comandos (um por linha)",PH({cisco_ios:"no ip http server\nip ssh version 2",cisco_nxos:"no feature telnet\nfeature ssh",
      exos:"disable telnet\nenable ssh2",ruckus_icx:"no telnet server\nip ssh version 2",generic:"vlan 100\n   name Vendas"})]]}
};