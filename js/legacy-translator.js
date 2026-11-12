/* ============ Tradução de config legado (gera prompt para IA) ============ */
/* Regras de sintaxe por alvo, embutidas no prompt, refletindo as docs oficiais que validamos. */
function legacySyntaxRules(target){
  const R={
    exos:{nome:'Extreme EXOS (ExtremeXOS)',doc:'ExtremeXOS Command Reference 30.2',regras:[
      'Criar VLAN: "create vlan <nome> tag <id>".',
      'Adicionar portas: "configure vlan <id|nome> add ports <lista> {tagged|untagged}".',
      'IP de VLAN (SVI): "configure vlan <id> ipaddress <ip>/<prefixo>" e "enable ipforwarding vlan <id>".',
      'Usuário: "create account <admin|user> <nome> <senha>".',
      'STP: modos dot1w (RSTP), dot1d (STP) ou mstp; "configure stpd s0 mode <modo>", "configure stpd s0 add vlan <id> ports all", "configure stpd s0 priority <p>"; borda: "configure stpd s0 ports link-type edge <portas>" e, com BPDU guard, "configure stpd s0 ports edge-safeguard enable <portas> bpdu-restrict".',
      'LLDP: "enable lldp ports [all|<lista>]".',
      'PoE: "enable inline-power ports [all|<lista>]".',
      'Speed/duplex: "configure ports <lista> auto off speed <n> duplex <full|half>" ou "auto on".',
      'Rota estática: "configure iproute add <rede>/<prefixo> <next-hop>".',
      'Banner: "configure banner before-login".'
    ]},
    ruckus:{nome:'Ruckus ICX (FastIron)',doc:'RUCKUS FastIron Command Reference 10.0.20',regras:[
      'VLAN: "vlan <id> name <nome>" e portas com "tagged/untagged ethernet <portas>".',
      'Interface virtual: "vlan <id> router-interface ve <id>", depois "interface ve <id>" com "ip address <ip> <mascara>".',
      'Usuario: "username <nome> privilege <0|4|5> password <senha>".',
      'STP: "spanning-tree 802-1w" (RSTP) ou "mstp"; prioridade dentro de "vlan <id>": "spanning-tree 802-1w priority <p>"; borda na interface: "spanning-tree 802-1w admin-edge-port" e, com BPDU guard, "stp-bpdu-guard".',
      'LLDP: ja vem habilitado por padrao; para desabilitar global "no lldp run"; por porta "lldp enable ports ethernet <portas>".',
      'PoE: na "interface ethernet <porta>", comando "inline power".',
      'Speed/duplex: na interface, "speed-duplex <10-full|100-full|1000-full|auto|...>".',
      'Rota estatica: "ip route <rede>/<prefixo> <next-hop>".',
      'Registrar na controladora SmartZone/vSZ: "manager active-list <ip>" (ou "manager backup-list <ip>").',
      'Licenca perpetua: "license install perpetual <unidade> <pacote>".',
      'Salvar: "write memory".'
    ]},
    fabric:{nome:'Extreme Fabric Engine / VOSS',doc:'Fabric Engine v9.3 Command Reference',regras:[
      'VLAN por porta: "vlan create <id> type port-mstprstp 0", "vlan name <id> nome".',
      'Fabric/SPBM: B-VLAN "vlan create <id> type spbm-bvlan"; associar servico "vlan i-sid <id> <i-sid>".',
      'Interface virtual: "interface vlan <id>" com "ip address <ip> <mascara>".',
      'Usuario: "username add <nome> level <ro|rw|rwa> enable".',
      'STP: o modo e boot flag "boot config flags spanning-tree-mode <rstp|mstp>" (EXIGE REBOOT); prioridade "spanning-tree <rstp|mstp> priority <p>"; borda na interface "spanning-tree <rstp|mstp> edge-port true" e, com BPDU guard, "spanning-tree bpduguard enable".',
      'LLDP por porta: na "interface gigabitEthernet <portas>", "lldp status <portas> txAndrx".',
      'PoE: na interface, "poe poe-shutdown" (usar "no poe poe-shutdown" para habilitar).',
      'Speed/duplex: na interface, "auto-negotiate enable" ou "speed <n>" + "duplex <full|half>".',
      'Rota estatica: "ip route <rede> <mascara> <next-hop>".',
      'Banner: "banner custom" + banner com o texto entre aspas.',
      'Salvar: "save config".'
    ]},
    ansible:{nome:'playbook Ansible (multivendor)',doc:'modulos de rede do Ansible',regras:[
      'Gerar um playbook Ansible YAML valido, usando os modulos de rede apropriados ao fabricante de destino (ex.: cisco.ios.ios_config, extreme.exos, etc.).',
      'Estruturar com hosts, gather_facts: no, e tasks nomeadas.',
      'Cada intencao do config legado vira uma task clara e idempotente.'
    ]}
  };
  return R[target]||R.exos;
}
/* Monta o prompt completo para colar no Gemini, com o config embutido. */
function buildLegacyPrompt(config,target){
  const r=legacySyntaxRules(target);
  const L=[];
  L.push('Voce e um engenheiro de redes senior, especialista em migracao de configuracoes entre fabricantes.');
  L.push('');
  L.push('TAREFA: traduza o running-config legado abaixo (que pode ser de QUALQUER fabricante - Brocade, Cisco, HP, Huawei, etc.) para '+r.nome+'.');
  L.push('');
  L.push('CONVENCOES DE SINTAXE OBRIGATORIAS (baseadas na '+r.doc+'). Use EXATAMENTE estes formatos:');
  r.regras.forEach(x=>L.push('- '+x));
  L.push('');
  L.push('REGRAS DA RESPOSTA (SIGA RIGOROSAMENTE):');
  L.push('1. Responda APENAS com o script final pronto para uso. NAO escreva nenhuma explicacao, introducao, conclusao, justificativa ou comentario sobre o que foi feito ou por que.');
  L.push('2. NAO use texto conversacional (nada de "Aqui esta", "Claro", "Espero ter ajudado", etc.). A primeira linha da resposta ja deve ser a primeira linha do script.');
  L.push('3. NAO envolva a resposta em blocos de codigo markdown (sem crases ```). Retorne o script em texto puro.');
  L.push('4. Interprete a INTENCAO de cada parte do config legado (VLANs, portas, IPs, rotas, usuarios, STP, etc.) e reescreva no destino usando as convencoes acima.');
  L.push('5. A unica forma de texto explicativo permitida sao comentarios no estilo do proprio equipamento de destino (ex.: "#" no EXOS, "!" no Ruckus), usados apenas para separar secoes ou sinalizar itens.');
  L.push('6. Se algo do legado nao tiver equivalente direto, sinalize com um comentario "REVISAR:" na sintaxe do destino, em vez de inventar um comando inexistente.');
  L.push('7. NAO invente enderecos, senhas ou portas que nao estejam no config legado.');
  L.push('');
  L.push('Lembre-se: a resposta deve conter SOMENTE o script, sem uma unica linha de explicacao fora dos comentarios do proprio script.');
  L.push('');
  L.push('FORMATO DE ENTREGA: se voce tiver a capacidade de gerar arquivos, entregue o script como um arquivo .txt para download (nome sugerido: "script-traduzido.txt"). Caso nao consiga gerar arquivo, apenas escreva o script como texto puro na resposta (ainda assim sem explicacoes e sem blocos de codigo).');
  L.push('');
  L.push('===== RUNNING-CONFIG LEGADO =====');
  L.push(config.trim());
  L.push('===== FIM DO CONFIG LEGADO =====');
  return L.join('\n');
}
function openLegacyTranslate(){
  const targets=[['exos','EXOS'],['ruckus','Ruckus'],['fabric','Fabric'],['ansible','Ansible']];
  let sel=(state.mode==='exos'||state.mode==='ruckus'||state.mode==='fabric'||state.mode==='ansible')?state.mode:'exos';
  const tbtns=targets.map(function(a){return '<button data-t="'+a[0]+'"'+(a[0]===sel?' class="sel"':'')+'>'+a[1]+'</button>';}).join('');
  const ov=_buildModal('<div class="legacy-modal">'+
    '<button class="modal-close" title="Fechar">✕</button>'+
    '<h3>🔄 Traduzir config legado</h3>'+
    '<p class="modal-msg">Cole o running-config do equipamento antigo (qualquer fabricante). A ferramenta gera um prompt pronto, com as regras de sintaxe oficiais já embutidas, para você colar na IA e obter o script traduzido.</p>'+
    '<div class="lm-cols">'+
      '<div class="lm-left">'+
        '<div class="lm-field" style="display:flex;flex-direction:column;flex:1"><label>Running-config legado</label>'+
        '<textarea id="lm-config" placeholder="Cole aqui o running-config do Brocade, Cisco, etc."></textarea></div>'+
      '</div>'+
      '<div class="lm-right">'+
        '<div class="lm-field"><label>Traduzir para</label><div class="lm-targets" id="lm-targets">'+tbtns+'</div></div>'+
        '<div class="lm-warn">⚠️ O config será colado por você na IA (serviço externo). Evite incluir senhas reais e revise sempre o script gerado antes de aplicar em produção. A tradução por IA é um rascunho, não é infalível.</div>'+
        '<div class="modal-btns" style="margin-top:auto"><button class="mb-ok">📋 Gerar e copiar prompt</button></div>'+
      '</div>'+
    '</div>'+
    '</div>');
  const modalEl=ov.querySelector('.modal'); if(modalEl) modalEl.classList.add('modal-wide');
  _modalOpen=true;
  const done=function(){ document.removeEventListener('keydown',onKey); _closeModal(ov); };
  ov.querySelector('.modal-close').onclick=done;
  ov.querySelectorAll('#lm-targets button').forEach(function(b){ b.onclick=function(){ sel=b.getAttribute('data-t'); ov.querySelectorAll('#lm-targets button').forEach(function(x){x.classList.remove('sel');}); b.classList.add('sel'); }; });
  ov.querySelector('.mb-ok').onclick=async function(){
    const cfg=ov.querySelector('#lm-config').value.trim();
    if(!cfg){ ov.querySelector('#lm-config').focus(); toast('Cole o config legado primeiro'); return; }
    const prompt=buildLegacyPrompt(cfg,sel);
    const okBtn=ov.querySelector('.mb-ok');
    try{
      await navigator.clipboard.writeText(prompt);
      okBtn.textContent='✓ Copiado!'; okBtn.classList.add('copied');
      if(!ov.querySelector('.lm-ok')){
        const warn=ov.querySelector('.lm-warn');
        const ok=document.createElement('div'); ok.className='lm-ok';
        ok.innerHTML='<span class="lo-ic">✅</span><span>Prompt copiado para a área de transferência! Abra a IA de sua preferência e cole (Ctrl+V) para obter o script traduzido.</span>';
        warn.parentNode.insertBefore(ok,warn);
      }
      toast('Prompt copiado para a área de transferência');
    }catch(e){
      const ta=ov.querySelector('#lm-config'); ta.value=prompt; ta.focus(); ta.select();
      toast('Copie o texto selecionado (Ctrl+C)');
    }
  };
  function onKey(e){ if(e.key==='Escape'){e.preventDefault();done();} }
  document.addEventListener('keydown',onKey);
  setTimeout(function(){ const t=ov.querySelector('#lm-config'); if(t)t.focus(); },40);
}

