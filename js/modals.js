/* ===================== MODAIS (substituem prompt/confirm nativos) ===================== */
let _modalOpen=false;
function _buildModal(inner){
  const ov=document.createElement('div'); ov.className='modal-overlay';
  ov.innerHTML='<div class="modal" role="dialog" aria-modal="true">'+inner+'</div>';
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add('show'));
  return ov;
}
function _closeModal(ov){ ov.classList.remove('show'); setTimeout(()=>ov.remove(),160); _modalOpen=false; }

/* uiPrompt: entrada de texto. Resolve com a string, ou null se cancelado. */
function uiPrompt(opts){
  opts=opts||{};
  const title=opts.title||'Digite um valor';
  const msg=opts.message?('<p class="modal-msg">'+esc(opts.message)+'</p>'):'';
  const okLabel=opts.okLabel||'Confirmar';
  const initial=opts.value||'';
  const ph=opts.placeholder||'';
  return new Promise(resolve=>{
    const ov=_buildModal(
      '<h3>'+esc(title)+'</h3>'+msg+
      '<input type="text" class="modal-input" placeholder="'+esc(ph)+'" value="'+esc(initial)+'">'+
      '<div class="modal-btns">'+
        '<button class="mb-cancel">Cancelar</button>'+
        '<button class="mb-ok">'+esc(okLabel)+'</button>'+
      '</div>');
    _modalOpen=true;
    const input=ov.querySelector('.modal-input');
    const done=val=>{ document.removeEventListener('keydown',onKey); _closeModal(ov); resolve(val); };
    ov.querySelector('.mb-ok').onclick=()=>done(input.value);
    ov.querySelector('.mb-cancel').onclick=()=>done(null);
    ov.onclick=e=>{ if(e.target===ov)done(null); };
    function onKey(e){ if(e.key==='Enter'){e.preventDefault();done(input.value);} else if(e.key==='Escape'){e.preventDefault();done(null);} }
    document.addEventListener('keydown',onKey);
    setTimeout(()=>{ input.focus(); input.select(); },30);
  });
}
/* uiConfirm: sim/não. Resolve com true/false. */
function uiConfirm(opts){
  opts=opts||{};
  const title=opts.title||'Confirmar';
  const msg=opts.message?('<p class="modal-msg">'+esc(opts.message)+'</p>'):'';
  const okLabel=opts.okLabel||'Confirmar';
  const danger=opts.danger?' danger':'';
  return new Promise(resolve=>{
    const ov=_buildModal(
      '<h3>'+esc(title)+'</h3>'+msg+
      '<div class="modal-btns">'+
        '<button class="mb-cancel">Cancelar</button>'+
        '<button class="mb-ok'+danger+'">'+esc(okLabel)+'</button>'+
      '</div>');
    _modalOpen=true;
    const done=val=>{ document.removeEventListener('keydown',onKey); _closeModal(ov); resolve(val); };
    ov.querySelector('.mb-ok').onclick=()=>done(true);
    ov.querySelector('.mb-cancel').onclick=()=>done(false);
    ov.onclick=e=>{ if(e.target===ov)done(false); };
    function onKey(e){ if(e.key==='Enter'){e.preventDefault();done(true);} else if(e.key==='Escape'){e.preventDefault();done(false);} }
    document.addEventListener('keydown',onKey);
    setTimeout(()=>{ const b=ov.querySelector('.mb-ok'); if(b)b.focus(); },30);
  });
}
/* uiAlert: aviso com um único botão. */
function uiAlert(opts){
  opts=opts||{};
  const title=opts.title||'Aviso';
  const msg=opts.message?('<p class="modal-msg">'+esc(opts.message)+'</p>'):'';
  const okLabel=opts.okLabel||'OK';
  return new Promise(resolve=>{
    const ov=_buildModal('<h3>'+esc(title)+'</h3>'+msg+'<div class="modal-btns"><button class="mb-ok">'+esc(okLabel)+'</button></div>');
    _modalOpen=true;
    const done=()=>{ document.removeEventListener('keydown',onKey); _closeModal(ov); resolve(); };
    ov.querySelector('.mb-ok').onclick=done;
    ov.onclick=e=>{ if(e.target===ov)done(); };
    function onKey(e){ if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();done();} }
    document.addEventListener('keydown',onKey);
    setTimeout(()=>{ const b=ov.querySelector('.mb-ok'); if(b)b.focus(); },30);
  });
}
/* uiChoice: título + lista de botões. choices=[{value,label,sub,icon}]. Resolve com value ou null. */
function uiChoice(opts){
  opts=opts||{};
  const title=opts.title||'Escolha';
  const msg=opts.message?('<p class="modal-msg">'+esc(opts.message)+'</p>'):'';
  const choices=opts.choices||[];
  return new Promise(resolve=>{
    const btns=choices.map((c,i)=>
      '<button data-i="'+i+'">'+(c.icon?('<span class="ch-ic">'+c.icon+'</span>'):'')+
      '<span class="ch-txt"><span>'+esc(c.label)+'</span>'+(c.sub?('<span class="ch-sub">'+esc(c.sub)+'</span>'):'')+'</span></button>').join('');
    const ov=_buildModal('<button class="modal-close modal-close-red" title="Fechar">✕</button>'+
      '<h3>'+esc(title)+'</h3>'+msg+
      '<div class="modal-choices">'+btns+'</div>');
    _modalOpen=true;
    const done=val=>{ document.removeEventListener('keydown',onKey); _closeModal(ov); resolve(val); };
    ov.querySelectorAll('.modal-choices button').forEach(b=>{ b.onclick=()=>done(choices[+b.getAttribute('data-i')].value); });
    ov.querySelector('.modal-close').onclick=()=>done(null);
    ov.onclick=e=>{ if(e.target===ov)done(null); };
    function onKey(e){ if(e.key==='Escape'){e.preventDefault();done(null);} }
    document.addEventListener('keydown',onKey);
  });
}
