export async function entrar({host,el,btn,pesquisadora}){
 const slot='oficina-reservada-'+(pesquisadora?'p':'c');
 const chave=new URLSearchParams(location.hash.slice(1)).get('acesso')||sessionStorage.getItem(slot);
 history.replaceState(null,'',location.pathname+location.search);
 const campo=el('input');campo.type='password';const label=el('label','Chave da oficina');label.append(campo);
 const status=el('p');const abrir=async(token)=>{try{
 const rpc=async(nome,args)=>{const r=await fetch(API+nome,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({...args,p_token:token})});const d=await r.json();if(!r.ok)throw Error(d.message);return d;};
 const l=await rpc('e23_api',{p_action:'sessions',p_payload:{}});
 if(!l.actor?.is_test||l.actor.role!==(pesquisadora?'pesquisadora':'participante'))throw Error('Confira a chave deste acesso.');
 const painel=el('section',undefined,'e23');host.replaceChildren(painel);
 if(pesquisadora)await (await import('./e23-pesquisadora.js')).abrir({host:painel,chamar:rpc,el,btn});
 else await (await import('./e23-coordenadoras.js')).abrir({host:painel,rpc,chave:token,el,onDirty:()=>{}});
 sessionStorage.setItem(slot,token);painel.scrollIntoView();
 }catch(e){form();status.textContent=e.message;}};
 const form=()=>host.replaceChildren(label,btn('Entrar na oficina',()=>abrir(campo.value.trim())),status);form();if(chave)await abrir(chave);
}
