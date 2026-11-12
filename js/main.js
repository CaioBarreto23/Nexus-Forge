/* datalist de módulos */
const dlEl=document.createElement('datalist');dlEl.id='modlist';
COMMON_MODULES.forEach(m=>{const o=document.createElement('option');o.value=m;dlEl.appendChild(o);});
document.body.appendChild(dlEl);


/* init */
state=freshState();
// Portão de login: só entra na plataforma se houver sessão válida.
(function bootAuth(){
  const cur=auth.current();
  if(cur){ document.getElementById('authGate').classList.add('hidden'); enterApp(); }
  else { showAuthGate(); }
})();

