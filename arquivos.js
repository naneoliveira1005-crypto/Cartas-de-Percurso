'use strict';
async function renderArquivos(container,credenciais,somenteIndividuais=false,participantes=[]){
 const box=document.createElement('section');box.className='card';container.append(box);
 const h=document.createElement('h3');h.textContent='Registros originais do E1';box.append(h);
 const status=document.createElement('p');status.textContent='Carregando arquivos…';status.className='muted';box.append(status);
 async function consultar(id){const r=await fetch('https://zpsjuxusydfbptjotyxo.supabase.co/rest/v1/rpc/percurso_arquivos',{method:'POST',headers:{apikey:'sb_publishable_n7giA7FAUqRmj1zv2JF8og_VQbjrxa7','Content-Type':'application/json'},body:JSON.stringify({...credenciais,p_id:id||null})});if(!r.ok)throw Error('Não foi possível acessar o arquivo. Confira sua conexão e tente novamente.');return r.json();}
 try{
  const todos=await consultar(),arquivos=todos.filter(a=>!somenteIndividuais||!a.coletivo);
  status.textContent='Encontro de 26/10/2026. Arquivos preservados para consulta; a data de inclusão no ambiente não substitui a data do registro original.';
  if(!arquivos.length){status.textContent='Nenhum registro individual do E1 foi vinculado a este acesso até o momento.';return;}
  for(const grupo of [{nome:'Meu registro individual',coletivo:false},{nome:'Memória coletiva',coletivo:true}]){
   const lista=arquivos.filter(a=>a.coletivo===grupo.coletivo);if(!lista.length)continue;
   const title=document.createElement('h3');title.textContent=credenciais.p_chave&&!grupo.coletivo?'Registros individuais e pendentes':grupo.nome;box.append(title);
   for(const a of lista){
    const row=document.createElement('div');row.className='block';const p=document.createElement('p');const pessoa=participantes.find(p=>p.id===a.participante_id);p.textContent=a.titulo+(pessoa?' · '+pessoa.codigo+' — '+pessoa.nome:'')+(a.pendente?' · Reservado: '+a.nome_pendente:'');row.append(p);
    const info=document.createElement('p');info.className='muted';info.textContent=a.coletivo?'Material compartilhado com as participantes.':a.pendente?'Aguardando confirmação do cadastro. Disponível somente à pesquisadora.':'Registro individual: acessível somente à participante e à pesquisadora.';row.append(info);
    const button=document.createElement('button');button.textContent=a.mime==='application/pdf'?'Baixar PDF':'Baixar documento Word';button.onclick=async()=>{button.disabled=true;const old=button.textContent;button.textContent='Preparando arquivo…';try{const file=await consultar(a.id);const bytes=Uint8Array.from(atob(file.base64.replace(/\s/g,'')),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:file.mime}));const link=document.createElement('a');link.href=url;link.download=file.nome_arquivo;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){info.textContent=e.message;info.classList.add('error');}finally{button.disabled=false;button.textContent=old;}};row.append(button);box.append(row);
   }
  }
 }catch(e){status.textContent=e.message;status.classList.add('error');const retry=document.createElement('button');retry.textContent='Tentar novamente';retry.onclick=()=>{box.remove();renderArquivos(container,credenciais,somenteIndividuais,participantes);};box.append(retry);}
}
window.renderArquivos=renderArquivos;
