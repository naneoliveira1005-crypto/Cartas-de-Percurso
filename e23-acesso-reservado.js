export async function entrar({host,el,btn,pesquisadora}){
 const slot='oficina-reservada-'+(pesquisadora?'p':'c');
 const chave=new URLSearchParams(location.hash.slice(1)).get('acesso')||sessionStorage.getItem(slot);
 history.replaceState(null,'',location.pathname+location.search);
 const campo=el('input');campo.type='password';const label=el('label','Chave da oficina');label.append(campo);
 const status=el('p');const abrir=async(token)=>{try{
 const rpc=async(nome,args)=>{const r=await fetch(API+nome,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({...args,p_token:token})});const d=await r.json();if(!r.ok)throw Error(d.message);return d;};
 const l=await rpc('e23_api',{p_action:'sessions',p_payload:{}});
 if(!l.actor?.is_test||l.actor.role!==(pesquisadora?'pesquisadora':'participante'))throw Error('Confira a chave deste acesso.');
 const oficina=el('section',undefined,'e23');
 const modulos=[
   {id:'mapa',titulo:'Nosso percurso de construção',liberado:true},
   {id:'e23',titulo:'E2–E3 integrados',liberado:true}
 ];
 function exibir(pagina){
   const painel=montarPainel({
     modulos,selecionado:pagina,nome:l.actor.name,pesquisadora,homologacao:true,
     navegar:exibir,sair:()=>{sessionStorage.removeItem(slot);location.reload();}
   });
   if(pagina==='inicio')painel.append(montarAberturaPorEscrito());
   if(pagina==='sobre_pesquisadora')painel.append(montarPerfilPesquisadora());
   if(pagina==='mapa')painel.append(montarMapaPorEscrito(()=>exibir('e23')));
   if(pagina==='e23')painel.append(oficina);
 }
 exibir('inicio');
 sessionStorage.setItem(slot,token);
 oficina.textContent='Carregando oficina…';
 if(pesquisadora)await (await import('./e23-pesquisadora.js')).abrir({host:oficina,chamar:rpc,el,btn});
 else{
   // A oficina das coordenadoras inicia quando seu espaço entra na página.
   const observar=new MutationObserver(async()=>{
     if(!oficina.isConnected)return;
     observar.disconnect();
     try{await (await import('./e23-coordenadoras.js')).abrir({host:oficina,rpc,chave:token,el,onDirty:()=>{}});}
     catch(e){oficina.textContent=e.message;}
   });
   observar.observe(host,{subtree:true,childList:true});
 }
 }catch(e){form();status.textContent=e.message;}};
 const form=()=>host.replaceChildren(label,btn('Entrar na oficina',()=>abrir(campo.value.trim())),status);form();if(chave)await abrir(chave);
}
