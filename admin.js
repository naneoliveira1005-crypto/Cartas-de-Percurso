'use strict';
const API='https://zpsjuxusydfbptjotyxo.supabase.co/rest/v1/rpc/',KEY='sb_publishable_n7giA7FAUqRmj1zv2JF8og_VQbjrxa7';
let app=document.getElementById('app');let chave='',data;const el=(t,s,c)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;if(c)n.className=c;return n;},add=(p,...ns)=>{ns.forEach(n=>p.append(n));return p;},btn=(s,f)=>{const b=el('button',s);b.onclick=async()=>{b.disabled=true;try{await f();}catch(e){alert(e.message);}finally{b.disabled=false;}};return b;};const date=s=>s?new Date(s).toLocaleString('pt-BR',{timeZone:'America/Bahia'}):'—';
async function rpc(acao='carregar',dados={}){const r=await fetch(API+'percurso_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave,p_acao:acao,p_dados:dados})});const d=await r.json();if(!r.ok)throw Error(d.message||'Falha de conexão');
 if(d&&Array.isArray(d.participantes)&&Array.isArray(d.registros)){
  try{
   const t=await fetch(API+'percurso_teste_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave})});
   if(t.ok){const demo=await t.json();d.participantes.push(...(demo.participantes||[]));d.registros.push(...(demo.registros||[]));}
  }catch(e){/* O ambiente principal continua acessível mesmo sem a conta de teste. */}
 }
 return d;}
function login(){app.replaceChildren();const f=el('form',undefined,'card login'),input=el('input'),label=el('label','Chave da pesquisadora'),st=el('p','','status');input.type='password';input.id='adminKey';label.htmlFor=input.id;const b=el('button','Entrar');b.type='submit';add(f,el('h2','Acesso da pesquisadora'),label,input,b,st);f.onsubmit=async e=>{e.preventDefault();b.disabled=true;chave=chaveDoAcesso(input.value);try{data=await rpc();sessionStorage.setItem('percurso_admin',chave);render();}catch(e){st.textContent='Não foi possível entrar. Confira sua chave e a conexão.';}finally{b.disabled=false;}};app.append(f);}
function select(options){const n=el('select');for(const [v,s] of options){const o=el('option',s);o.value=v;n.append(o);}return n;}
function renderLegacy(){app.replaceChildren();const bar=el('div',undefined,'toolbar');add(bar,el('h2','Registros do percurso'),btn('Atualizar',async()=>{data=await rpc();render();}),btn('Sair',()=>{sessionStorage.removeItem('percurso_admin');chave='';data=null;login();}));add(app,bar,el('p',`${data.participantes.length} participantes cadastradas · capacidade prevista: 35. Sem comparação ou classificação de respostas.`,'muted'));
 const views=el('section',undefined,'card');add(views,el('h2','Ver as atividades'),el('p','Abra os encontros para conferir as orientações e as perguntas. Você continua no seu acesso de pesquisadora.','muted'));const choices=el('div',undefined,'actions');for(const m of data.modulos)choices.append(btn('Visualizar '+(m.id.startsWith('e')?m.id.toUpperCase():m.titulo),()=>previewModule(m)));views.append(choices);app.append(views);
 const filters=el('div',undefined,'filters'),part=select([['','Todas as participantes'],...data.participantes.map(p=>[p.id,p.codigo+' — '+p.nome])]),mod=select([['','Todos os módulos'],...data.modulos.map(m=>[m.id,m.titulo])]),status=select([['','Todos os status'],['rascunho','Rascunho'],['enviado','Enviado']]),from=el('input'),to=el('input');from.type=to.type='date';part.setAttribute('aria-label','Participante');mod.setAttribute('aria-label','Módulo');status.setAttribute('aria-label','Status');from.setAttribute('aria-label','Data inicial');to.setAttribute('aria-label','Data final');add(filters,part,mod,status,from,to);app.append(filters);const results=el('div');let filtered=[];
 function show(){results.replaceChildren();filtered=[...data.registros,...data.cartas].filter(r=>(!part.value||r.participante_id===part.value)&&(!mod.value||r.modulo===mod.value)&&(!status.value||(r.status==='enviada'?'enviado':r.status)===status.value)&&(!from.value||new Date(r.criado_em)>=new Date(from.value+'T00:00:00-03:00'))&&(!to.value||new Date(r.criado_em)<=new Date(to.value+'T23:59:59.999-03:00')));results.append(el('p',filtered.length+' registro(s) no filtro atual.','muted'));for(const r of filtered){const p=data.participantes.find(x=>x.id===r.participante_id),m=data.modulos.find(x=>x.id===r.modulo),box=el('details',undefined,'card');add(box,el('summary',(p?p.codigo+' — '+p.nome:'Demonstração')+' · '+(r.modulo==='livre'?'Registro espontâneo entre encontros':r.modulo.toUpperCase())+' · '+r.status),el('p','Criado: '+date(r.criado_em)+' · Atualizado: '+date(r.atualizado_em)+' · Enviado: '+date(r.enviado_em),'muted'));if(r.complemento_de)box.append(el('p','Complemento do registro '+r.complemento_de,'muted'));for(const [k,v] of Object.entries(r.respostas||{})){add(box,el('h3',m?.conteudo?.questoes?.find(q=>q.id===k)?.pergunta||'Registro'),el('p',v||'—','read'));}results.append(box);}}
 for(const f of [part,mod,status,from,to])f.onchange=show;
 function exportRows(){return filtered.filter(r=>!data.participantes.find(p=>p.id===r.participante_id)?.codigo?.startsWith('TESTE-')).map(r=>{const p=data.participantes.find(x=>x.id===r.participante_id);return {codigo:p?.codigo||'DEMO',nome:p?.nome||'Demonstração',modulo:r.modulo,tipo:r.complemento_de?'Complemento':r.modulo==='livre'?'Registro espontâneo entre encontros':r.modulo==='carta'?'Carta de Percurso':'Registro de encontro',status:r.status,criado_em:r.criado_em,atualizado_em:r.atualizado_em,enviado_em:r.enviado_em,id:r.id,complemento_de:r.complemento_de||'',...r.respostas};});}
 function download(name,body,type){const u=URL.createObjectURL(new Blob([body],{type})),a=el('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
 function csv(){const rows=exportRows().filter(r=>r.codigo!=='TESTE-LUMINA');const cols=[...new Set(rows.flatMap(Object.keys))];const esc=v=>'"'+String(v??'').replace(/^[ \t\r\n]*[=+@\-]/,"'$&").replaceAll('"','""')+'"';download('registros-percurso.csv','\ufeff'+[cols.map(esc).join(';'),...rows.map(r=>cols.map(c=>esc(r[c])).join(';'))].join('\r\n'),'text/csv;charset=utf-8');}
 add(app,add(el('div',undefined,'actions'),btn('Exportar planilha (CSV)',csv),btn('Exportar textos completos',()=>download('registros-percurso.txt',exportRows().map(r=>Object.entries(r).map(([k,v])=>k+': '+(v??'')).join('\n\n')).join('\n\n————————————\n\n'),'text/plain;charset=utf-8')),btn('Exportar JSON',()=>download('registros-percurso.json',JSON.stringify(exportRows(),null,2),'application/json'))),results);show();
 const modules=el('details',undefined,'card');modules.append(el('summary','Disponibilidade dos módulos'));for(const m of data.modulos){const row=el('div',undefined,'actions');add(row,el('span',m.titulo+' · '+(m.liberado?'Disponível':'Oculto')),btn(m.liberado?'Ocultar':'Liberar',async()=>{if(!confirm((m.liberado?'Ocultar ':'Liberar ')+m.titulo+' para as participantes?'))return;data=await rpc('liberar',{id:m.id,liberado:!m.liberado});render();}));modules.append(row);}app.append(modules);
 const future=el('details',undefined,'card');future.append(el('summary','Preparar E3, E4 e E5'));const fm=select(data.modulos.filter(m=>['e3','e4','e5'].includes(m.id)).map(m=>[m.id,m.titulo])),intro=el('textarea'),questions=el('textarea');intro.placeholder='Orientação inicial';questions.placeholder='Uma pergunta por linha (até quatro).';fm.setAttribute('aria-label','Encontro futuro');intro.setAttribute('aria-label','Orientação inicial');questions.setAttribute('aria-label','Perguntas');function loadFuture(){const m=data.modulos.find(m=>m.id===fm.value);intro.value=(m?.conteudo?.introducao||[]).join('\n');questions.value=(m?.conteudo?.questoes||[]).map(q=>q.pergunta).join('\n');}fm.onchange=loadFuture;loadFuture();add(future,el('p','Prepare o conteúdo e depois libere o módulo. Após o primeiro registro, as perguntas ficam preservadas.','muted'),fm,intro,questions,btn('Salvar conteúdo do encontro',async()=>{const qs=questions.value.split('\n').map(s=>s.trim()).filter(Boolean);if(qs.length<1||qs.length>4)throw Error('Informe de uma a quatro perguntas.');data=await rpc('configurar',{id:fm.value,conteudo:{introducao:intro.value.split('\n').filter(Boolean),questoes:qs.map((q,i)=>({id:'q'+(i+1),titulo:'Questão '+(i+1),pergunta:q}))}});render();}));app.append(future);
 const people=el('details',undefined,'card');people.append(el('summary','Participantes e novos cadastros'));for(const p of data.participantes)people.append(el('p',p.codigo+' — '+p.nome+' · '+(p.email||'E-mail ainda não informado')));const nome=el('input'),email=el('input');nome.placeholder='Nome completo';email.placeholder='E-mail confirmado';email.type='email';nome.setAttribute('aria-label','Nome completo');email.setAttribute('aria-label','E-mail confirmado');add(people,el('h3','Adicionar participante confirmada'),nome,email,btn('Criar acesso individual',async()=>{if(!confirm('Cadastrar '+nome.value+' com o e-mail '+email.value+'? Nenhum e-mail será enviado automaticamente.'))return;const r=await rpc('cadastrar',{nome:nome.value,email:email.value});const output=el('textarea');output.readOnly=true;const link='https://naneoliveira1005-crypto.github.io/Cartas-de-Percurso/#chave='+encodeURIComponent(r.chave);output.value=r.codigo+'\nLink individual: '+link+'\nChave individual (alternativa): '+r.chave;people.append(el('p','Acesso criado. Compartilhe o link apenas com a participante indicada. O endereço já contém a chave individual.'));people.append(output);people.append(btn('Copiar link individual',async()=>{await navigator.clipboard.writeText(link);alert('Link individual copiado. Envie somente à participante correspondente.');}));data=await rpc();}));app.append(people);
 const materials=el('details',undefined,'card');materials.append(el('summary','Materiais coletivos autorizados'));for(const m of data.materiais){add(materials,el('p',m.titulo+' · '+(m.liberado?'Visível':'Oculto')),btn(m.liberado?'Ocultar material':'Disponibilizar material',async()=>{if(!confirm('Confirmar alteração de visibilidade deste material?'))return;data=await rpc('material_visibilidade',{id:m.id,liberado:!m.liberado});render();}));}const title=el('input'),url=el('input'),mm=select(data.modulos.map(m=>[m.id,m.titulo]));title.placeholder='Título do material';url.placeholder='https://…';title.setAttribute('aria-label','Título');url.setAttribute('aria-label','Endereço do material');mm.setAttribute('aria-label','Módulo do material');add(materials,el('p','Inclua somente materiais autorizados para o coletivo. Não inclua respostas individuais, notas de campo ou documentos identificáveis. O material será criado oculto.','notice'),mm,title,url,btn('Guardar material oculto',async()=>{data=await rpc('material',{modulo:mm.value,titulo:title.value,url:url.value,liberado:false});render();}));app.append(materials);renderArquivos(app,{p_chave:chave},false,data.participantes);
}
function previewModule(m){
 app.replaceChildren(btn('← Voltar ao meu painel',render),el('h2',m.titulo),el('p','Visualização da pesquisadora · '+(m.liberado?'Disponível para as participantes':'Ainda oculto para as participantes'),'muted'));
 const c=m.conteudo||{};
 if(m.id==='e1'){app.append(el('p','Aqui você consulta todos os arquivos do E1. Cada coordenadora recebe somente seu registro individual e os materiais coletivos liberados.'));renderArquivos(app,{p_chave:chave},false,data.participantes);return;}
 if(c.subtitulo)app.append(el('h3',c.subtitulo));for(const p of c.introducao||[])app.append(el('p',p));
 if(c.importante){const note=el('aside',undefined,'notice');note.append(el('strong','IMPORTANTE'));for(const p of c.importante)note.append(el('p',p));app.append(note);}
 const qs=c.questoes||[];
 if(!qs.length)app.append(el('p','O conteúdo deste espaço ainda não está disponível para visualização aqui. Os registros recebidos podem ser consultados no painel.','muted'));
 for(const q of qs){const block=el('section',undefined,'block'),label=el('label',q.pergunta),field=el('textarea');field.id='preview-'+q.id;label.htmlFor=field.id;field.readOnly=true;field.placeholder='Campo de escrita individual da coordenadora';add(block,el('span',q.titulo,'eyebrow'),label,field);app.append(block);}
 if(qs.length)app.append(el('p','Esta é uma visualização. Ela não envia respostas nem altera registros das coordenadoras. Na tela delas, estão disponíveis as opções Salvar rascunho e Enviar registro.','notice'));
 app.append(btn('← Voltar ao meu painel',render));
}
async function painelAcessos(){
 add(app,el('h2','Acessos individuais'),el('p','Aqui estão as coordenadoras, as contas de teste e, em seção separada, as observadoras convidadas. As observadoras não integram o corpus nem a contagem das participantes.','muted'));
 const sec=el('section',undefined,'card'),sorted=[...data.participantes].sort((a,b)=>(a.codigo?.startsWith('TESTE-')&&!b.codigo?.startsWith('TESTE-')?-1:!a.codigo?.startsWith('TESTE-')&&b.codigo?.startsWith('TESTE-')?1:a.nome.localeCompare(b.nome,'pt-BR'))),person=select([['','Escolha uma pessoa'],...sorted.map(p=>[p.id,p.codigo?.startsWith('TESTE-')?p.nome+' — Conta de teste':p.codigo+' — '+p.nome])]),detail=el('div'),status=el('p','Selecione uma pessoa para consultar seu link.','muted');
 person.setAttribute('aria-label','Coordenadora para acesso individual');
 add(sec,el('h3','Copiar um acesso por vez'),person,status,detail);
 app.append(sec);
 const obs=el('section',undefined,'card');
 add(obs,el('h3','Observadoras convidadas · painel espelho'),
 el('p','Carregando situação dos acessos…','muted'));
 app.append(obs);
 try{
  const ro=await fetch(API+'percurso_observadores_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave})});
  if(!ro.ok)throw Error('Falha');
  const observadoras=await ro.json();
  obs.replaceChildren(el('h3','Observadoras convidadas · painel espelho'));
  for(const o of observadoras){
   const estado=o.ativo?'ATIVO':'INATIVO';
   const acesso=o.primeiro_acesso_em?' · acesso técnico validado':' · sem registro de abertura';
   add(obs,el('p',o.codigo+' — '+o.nome+' · '+(o.email||'sem e-mail')+' · '+estado+acesso));
  }
  add(obs,
   el('p','Permissões: mesma organização geral do painel da pesquisadora, em modo somente leitura. Podem abrir módulos, atividades, materiais e ver contagens gerais. Não veem nomes, registros individuais, cartas pessoais, chaves ou links de participantes e não podem editar, responder, liberar, cadastrar ou exportar.','muted'),
   el('p','As credenciais pessoais das observadoras não são exibidas neste painel.','muted'));
 }catch(e){
  obs.replaceChildren(el('h3','Observadoras convidadas · painel espelho'),el('p','Não foi possível consultar a situação dos acessos agora.','error'));
 }
 let links=[];
 try{
  const r=await fetch(API+'percurso_links_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave})});
  if(!r.ok)throw Error('Não foi possível consultar os links.');
  links=await r.json();
  if(!Array.isArray(links))throw Error('Resposta inválida.');
  const totalReais=links.filter(x=>!x.codigo?.startsWith('TESTE-')).length;const testes=links.filter(x=>x.codigo?.startsWith('TESTE-')).length;status.textContent=totalReais+' acessos de coordenadoras e '+testes+' contas de teste. Selecione uma pessoa antes de copiar.';
 }catch(e){status.textContent='Não foi possível carregar os acessos. Atualize o painel ou verifique a conexão.';status.classList.add('error');}
 person.onchange=()=>{
  detail.replaceChildren();
  const item=links.find(x=>x.participante_id===person.value);
  if(!item){if(person.value)detail.append(el('p','Não encontramos um link válido para esta coordenadora.','error'));return;}
  const p=data.participantes.find(x=>x.id===person.value);const nomeExibicao=p?.nome||item.codigo;
  const address=el('input');address.readOnly=true;address.value=item.link;address.setAttribute('aria-label','Link individual');
  const copy=btn('Copiar link de '+nomeExibicao,async()=>{
   try{await navigator.clipboard.writeText(item.link);status.textContent='Link copiado para '+nomeExibicao+'. Compartilhe apenas com essa pessoa.';}
   catch{address.focus();address.select();status.textContent='Selecione e copie o link exibido no campo.';}
  });
  add(detail,el('p','Acesso de '+nomeExibicao),address,copy,el('p',p?.codigo?.startsWith('TESTE-')?'Conta para testar o site. Não faz parte dos registros da pesquisa.':'O link já contém a chave. Envie apenas à respectiva coordenadora.','muted'));
 };
 const note=el('section',undefined,'card');add(note,el('h3','Visualizar atividades e respostas'),el('p','Para ver as perguntas: abra E1 ou E2 à esquerda e escolha Atividade individual. Para ler os registros: escolha Registros e selecione a coordenadora. No E1, os arquivos originais aparecem nessa mesma aba.','muted'));app.append(note);
}
async function mensagensRespostasAdmin(){
 const r=await fetch(API+'percurso_respostas_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave})});
 if(!r.ok)throw Error('Não foi possível consultar as respostas da pesquisadora.');
 const x=await r.json();if(!Array.isArray(x))throw Error('Resposta inválida.');return x;
}
async function enviarRespostaPesquisadora(registro,texto){
 const r=await fetch(API+'percurso_responder_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave,p_registro_id:registro,p_texto:texto})});
 const x=await r.json();if(!r.ok)throw Error(x?.message||'Não foi possível enviar a resposta.');return x;
}

async function orientacaoAdmin(){
 const r=await fetch(API+'orientacao_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave})});
 const x=await r.json();if(!r.ok)throw Error(x?.message||'Não foi possível consultar a orientação.');return Array.isArray(x)?x:[];
}
async function responderOrientacao(texto){
 const r=await fetch(API+'orientacao_responder_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave,p_texto:texto})});
 const x=await r.json();if(!r.ok)throw Error(x?.message||'Não foi possível enviar a resposta.');return x;
}
async function painelOrientacao(){
 add(app,el('h2','Orientação da pesquisa'),el('p','Canal privado entre você e Silvia. As mensagens deste espaço não são visíveis às coordenadoras nem às observadoras e não entram automaticamente no corpus.','notice'));
 const box=el('section',undefined,'card');box.append(el('p','Carregando conversa…','muted'));app.append(box);
 try{
   let msgs=await orientacaoAdmin();
   const desenhar=()=>{
     box.replaceChildren(el('h3','Conversa com Silvia'));
     if(!msgs.length)box.append(el('p','Ainda não há anotações neste espaço.','muted'));
     for(const m of msgs){const a=m.autor==='orientadora'?'Silvia':'Nanny';add(box,el('p',a+' · '+date(m.criado_em),'muted'),el('p',m.texto,'read'));}
     const label=el('label','Responder / escrever para Silvia'),campo=el('textarea'),status=el('p','','status'),b=btn('Enviar resposta',async()=>{const texto=campo.value.trim();if(!texto){status.textContent='Escreva a mensagem antes de enviar.';return;}const salvo=await responderOrientacao(texto);msgs.push(salvo);desenhar();});
     campo.maxLength=12000;campo.placeholder='Escreva aqui sua resposta ou anotação para a orientadora.';add(box,label,campo,b,status);
   };desenhar();
 }catch(e){box.replaceChildren(el('p','Não foi possível carregar o canal de orientação agora.','error'));}
}


async function novidadesAdmin(){
 const r=await fetch(API+'percurso_novidades_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave})});
 const x=await r.json();if(!r.ok)throw Error(x?.message||'Não foi possível consultar as novidades.');return x;
}
function painelNovidades(){
 const sec=el('section',undefined,'card novidades-painel');
 add(sec,el('h3','Novidades no percurso'),el('p','Aqui aparecem as produções mais recentes, com nome, origem e horário. Assim você não precisa procurar coordenadora por coordenadora.','muted'));
 const corpo=el('div');corpo.append(el('p','Consultando movimentações…','muted'));sec.append(corpo);app.append(sec);
 novidadesAdmin().then(x=>{
   corpo.replaceChildren();
   const eventos=Array.isArray(x.eventos)?x.eventos:[];
   const novas=Number(x.novas||0);
   if(novas>0)corpo.append(el('p',novas+' novidade(s) desde sua última consulta.','notice'));
   else corpo.append(el('p','Nenhuma novidade desde sua última consulta. Abaixo estão as movimentações mais recentes.','muted'));
   if(!eventos.length){corpo.append(el('p','Ainda não há movimentações para mostrar.','empty'));return;}
   for(const n of eventos){
     const row=el('article',undefined,'novidade-item'+(n.novo?' novidade-nova':''));
     const info=el('div');
     add(info,
       el('strong',(n.nome||n.codigo||'Participante')+' · '+(n.acao||'Nova movimentação')),
       el('p',(n.origem||n.modulo||'Percurso')+' · '+date(n.ocorrido_em),'muted')
     );
     const abrir=btn('Abrir',()=>{
       if(n.tipo==='orientacao'){encontroAtual='orientacao';render();return;}
       if(n.tipo==='perfil'){perfilPendente=n.participante_id;encontroAtual='perfil';render();return;}
       registroPendente=n.participante_id||null;encontroAtual=n.modulo||'inicio';abaAtual='registros';render();
     });
     row.append(info,abrir);corpo.append(row);
   }
 }).catch(()=>corpo.replaceChildren(el('p','Não foi possível consultar as novidades agora.','error')));
}

let encontroAtual='e2',abaAtual='atividade',registroPendente=null,perfilPendente=null;
function sairPainel(){sessionStorage.removeItem('percurso_admin');chave='';data=null;document.body.classList.remove('dashboard');app=document.getElementById('app');login();window.scrollTo({top:0,behavior:'auto'});}
function render(){
 app=montarPainel({modulos:data.modulos.filter(m=>m.id==='perfil'||/^e\d$/.test(m.id)||m.id==='livre'||m.id==='carta'),selecionado:encontroAtual,nome:'Nanny Oliveira',pesquisadora:true,navegar:id=>{encontroAtual=id;abaAtual=id==='e1'?'sobre':id==='perfil'?'perfis':'atividade';render();},sair:sairPainel});
 if(encontroAtual==='sobre_pesquisadora'){app.append(montarPerfilPesquisadora(true,chave));return;}
 if(encontroAtual==='orientacao'){painelOrientacao();return;}
 if(encontroAtual==='acessos'){painelAcessos();return;}
 if(encontroAtual==='admin'){renderLegacy();const bar=app.querySelector('.toolbar');if(bar)bar.remove();const views=[...app.querySelectorAll('section')].find(x=>x.querySelector('h2')?.textContent==='Ver as atividades');if(views)views.remove();return;}
 if(encontroAtual==='inicio'){app.append(montarAberturaPorEscrito());painelNovidades();add(app,el('h2','Seu painel de pesquisa'),el('p','Acompanhe os encontros em uma única sequência. Selecione um encontro à esquerda e abra Sobre o encontro, Atividade individual, Registros ou Materiais.'));const summary=el('section',undefined,'card');summary.append(el('h3','Visão geral do percurso'));for(const m of data.modulos.filter(x=>/^e\d$/.test(x.id)||x.id==='livre')){const n=data.registros.filter(r=>r.modulo===m.id).length;const p=el('p');p.append(btn((m.id==='livre'?'Entre encontros':m.id.toUpperCase()+' · '+m.titulo.replace(/^E\d\s*[—–-]\s*/,'')),()=>{encontroAtual=m.id;abaAtual=m.id==='e1'?'sobre':'atividade';render();}));p.append(el('span','  '+(m.liberado?'Liberado':'Não liberado')+' · '+n+' registro(s)','muted'));if(n>0)p.append(btn('Ver quem enviou',()=>{encontroAtual=m.id;abaAtual='registros';render();}));summary.append(p);}app.append(summary,el('p','Administração reúne os cadastros, a liberação de encontros, os materiais e as exportações.','muted'));return;}
 const m=data.modulos.find(x=>x.id===encontroAtual);if(!m)return;
 if(m.id==='perfil'){
  add(app,el('h2','Muito sobre nós'),el('p','Aqui você acompanha os perfis individuais das coordenadoras sem misturá-los aos registros dos encontros. Os dados objetivos vêm da ficha de caracterização; os campos pessoais são complementados no Por Escrito.','muted'));
  const box=el('section',undefined,'card');box.append(el('p','Carregando perfis…','muted'));app.append(box);
  fetch(API+'percurso_perfis_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:chave})})
   .then(async r=>{if(!r.ok)throw Error();return r.json();})
   .then(perfis=>{
    box.replaceChildren();
    const completos=perfis.filter(p=>Object.values(p.complementos||{}).some(v=>String(v||'').trim())).length;
    add(box,el('h3','Perfis das participantes'),el('p',completos+' de '+perfis.length+' participantes já acrescentaram informações pessoais.','notice'));
    const sel=select([['','Escolha uma participante'],...perfis.map(p=>[p.participante_id,p.codigo+' — '+p.nome])]);
    const detalhe=el('div');box.append(sel,detalhe);
    sel.onchange=async()=>{
      detalhe.replaceChildren();const p=perfis.find(x=>x.participante_id===sel.value);if(!p)return;
      const d=p.dados||{},x=p.complementos||{};

      const hero=el('section',undefined,'perfil-hero pesquisadora-perfil-hero');
      const foto=el('div',undefined,'perfil-foto');
      const img=el('img');img.alt='Foto de '+p.nome;img.hidden=true;
      const iniciais=el('div',(p.nome||'').split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase(),'perfil-iniciais');
      add(foto,img,iniciais,el('p',p.foto_path?'Foto enviada pela participante.':'A participante ainda não enviou uma foto.','muted'));
      const intro=el('div',undefined,'perfil-apresentacao');
      add(intro,el('span',p.codigo,'eyebrow'),el('h2',p.nome),el('p',(d.funcao||'')+(d.onde?' · '+d.onde:''),'perfil-lead'));
      add(hero,foto,intro);detalhe.append(hero);

      if(p.foto_path){
        try{
          const rr=await fetch('https://zpsjuxusydfbptjotyxo.supabase.co/functions/v1/perfil-foto-admin',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({chave,participante_id:p.participante_id})
          });
          const fx=await rr.json();
          if(rr.ok&&fx.url){img.src=fx.url;img.hidden=false;iniciais.hidden=true;}
        }catch{}
      }

      const grid=el('div',undefined,'perfil-dados-grid');
      const card=(t,v)=>{const a=el('article',undefined,'perfil-dado-card');add(a,el('span',t,'eyebrow'),el('p',v||'Ainda não informado','read'));return a;};
      grid.append(card('ETAPAS',d.etapas),card('TEMPO NA FUNÇÃO',d.tempo_funcao),card('VÍNCULO',d.vinculo),card('TEMPO NA REDE',d.tempo_rede));detalhe.append(grid);

      const textos=[['COMO CHEGUEI ATÉ AQUI',x.chegada],['O QUE ME FORMOU',x.experiencias],['UMA REALIZAÇÃO QUE LEVO COMIGO',x.realizacao],['UM POUCO DE MIM',x.sobre_mim]];
      const escrita=el('div',undefined,'perfil-escrita-grid pesquisadora-perfil-escrita');
      for(const [t,v] of textos){
        const a=el('article',undefined,'perfil-escrita-card');
        add(a,el('span',t,'eyebrow'),el('p',v||'Ainda não preenchido.','read'));
        escrita.append(a);
      }
      detalhe.append(escrita);
    };
    if(perfilPendente){sel.value=perfilPendente;perfilPendente=null;sel.onchange();}
   }).catch(()=>box.replaceChildren(el('p','Não foi possível carregar os perfis agora.','error')));
  return;
 }
 add(app,el('p',m.id==='livre'?'Escuta / Entre encontros':m.id==='carta'?'Escrita individual protegida':'Encontros / '+m.id.toUpperCase(),'muted'),el('h2',m.id==='livre'?'Entre encontros':m.titulo),el('p',m.id==='livre'?'Espaço opcional de comunicação e acompanhamento':m.data_encontro?new Date(m.data_encontro+'T12:00:00').toLocaleDateString('pt-BR')+' · 13h30 às 17h':'Data a definir','muted'));
 if(m.id==='livre')app.append(el('p','Este canal complementar permite que a coordenadora escreva à pesquisadora entre os encontros. É opcional e não constitui uma nova atividade obrigatória nem um encontro adicional. Mensagens e devolutivas permanecem disponíveis no percurso individual e podem ajudar a acompanhar as intervenções da pesquisadora, nos limites do consentimento.','notice'));
 const tabs=el('div',undefined,'tabs');for(const [id,label] of [['sobre',m.id==='livre'?'Sobre o espaço':'Sobre o encontro'],['atividade',m.id==='livre'?'Campo de escrita':'Atividade individual'],['registros',m.id==='livre'?'Mensagens e respostas':'Registros'],['materiais','Materiais']]){const b=btn(label,()=>{abaAtual=id;render();});if(id===abaAtual)b.classList.add('active');tabs.append(b);}app.append(tabs);
 if(abaAtual==='sobre'){add(app,el('h3',m.id==='livre'?'Entre encontros':m.id==='e2'?'Tornar-se coordenadora pedagógica':m.titulo),el('p',m.id==='livre'?(m.liberado?'Este espaço opcional está disponível às coordenadoras.':'Este espaço está indisponível para as coordenadoras.'):m.liberado?'Este encontro está disponível para as participantes.':'Este encontro ainda não foi liberado para as participantes.'));for(const p of m.conteudo?.introducao||[])app.append(el('p',p));return;}
 if(abaAtual==='atividade'){
  if(m.id==='e1'){add(app,el('h3','Meu trabalho, hoje'),el('p','Os registros do E1 foram produzidos no formulário original. Consulte os arquivos individuais na aba Registros.'));return;}
  const c=m.conteudo||{};add(app,el('h3',m.id==='livre'?'Mensagem à pesquisadora':m.id==='e2'?'Folha de Percurso':c.subtitulo||'Atividade individual'),el('p','Visualização da pesquisadora. Cada coordenadora acessa apenas seu próprio registro.','muted'));for(const p of c.introducao||[])app.append(el('p',p));if(c.importante){const note=el('aside',undefined,'notice');for(const p of c.importante)note.append(el('p',p));app.append(note);}
  if(!c.questoes?.length){app.append(el('p','Atividade ainda em preparação.','empty'));return;}
  c.questoes.forEach((q,i)=>{const d=el('details',undefined,'question');d.open=i===0;const field=el('textarea');field.readOnly=true;field.placeholder='Espaço de escrita da coordenadora';field.id='preview-'+q.id;const label=el('label',q.pergunta);label.htmlFor=field.id;add(d,el('summary',(i+1)+'  '+q.titulo.replace(/^\d+[.\s—–-]*/,'')),label,field);app.append(d);});app.append(el('p','Nesta visualização, os registros das participantes não são alterados.','muted'));return;
 }
 if(abaAtual==='registros'){
  add(app,el('h3',m.id==='livre'?'Mensagens e perguntas recebidas':'Registros individuais das coordenadoras'),el('p',m.id==='livre'?'Leia cada mensagem e escreva uma resposta. A coordenadora verá sua resposta no próprio percurso ao voltar ao site.':'Escolha uma coordenadora para consultar os registros individuais deste encontro.','muted'));
  const who=select([[m.id==='livre'?'todos':'',m.id==='livre'?'Todas as coordenadoras':'Selecione uma coordenadora'],...data.participantes.map(p=>[p.id,p.nome])]);
  who.setAttribute('aria-label','Coordenadora');app.append(who);const box=el('div');app.append(box);let respostas=[];
  const show=()=>{
   box.replaceChildren();
   if(!who.value){box.append(el('p','Escolha uma coordenadora para consultar os registros.','empty'));return;}
   const rows=data.registros.filter(r=>r.modulo===m.id&&(who.value==='todos'||r.participante_id===who.value));
   for(const r of rows){
    const card=el('section',undefined,'block'),pessoa=data.participantes.find(p=>p.id===r.participante_id);
    add(card,el('h3',(m.id==='livre'?(pessoa?.nome||'Coordenadora')+' · ':'')+(r.complemento_de?'Complemento · ':'')+(r.status==='rascunho'?'Rascunho':'Enviado')),el('p',date(r.atualizado_em),'muted'));
    for(const [k,v] of Object.entries(r.respostas||{}))add(card,el('strong',m.conteudo?.questoes?.find(q=>q.id===k)?.pergunta||'Registro'),el('p',v,'read'));
    if(m.id==='livre'){
      const respostasDeste=respostas.filter(x=>x.registro_id===r.id);
      for(const resposta of respostasDeste)add(card,el('h3','Sua resposta · '+date(resposta.criado_em)),el('p',resposta.texto,'read'));
      if(r.status==='enviado'){
       const label=el('label','Escrever resposta para '+(pessoa?.nome||'coordenadora')),field=el('textarea'),status=el('p','','status'),b=btn('Enviar resposta',async()=>{
        if(!field.value.trim())throw Error('Escreva a resposta antes de enviar.');
        if(!confirm('Enviar sua resposta para '+(pessoa?.nome||'esta coordenadora')+'?'))return;
        const texto=field.value.trim();const saved=await enviarRespostaPesquisadora(r.id,texto);respostas.push(saved);show();
       });
       field.maxLength=12000;field.placeholder='Escreva sua devolutiva. Ela ficará disponível somente para esta coordenadora.';
       add(card,label,field,b,status);
      }else card.append(el('p','Este texto é um rascunho; aguarde o envio para responder.','muted'));
    }
    box.append(card);
   }
   if(m.id==='e1')renderArquivos(box,{p_chave:chave},true,data.participantes,{participante:who.value});
   else if(!rows.length)box.append(el('p',m.id==='livre'?'Ainda não há mensagens enviadas nesse espaço.':'Ainda não há registros desta coordenadora neste encontro.','empty'));
  };
  who.onchange=show;if(registroPendente){who.value=registroPendente;registroPendente=null;}show();
  if(m.id==='livre')mensagensRespostasAdmin().then(x=>{respostas=x;if(box.isConnected)show();}).catch(()=>{if(box.isConnected)box.prepend(el('p','Não foi possível carregar as devolutivas anteriores. Atualize antes de responder.','error'));});
  return;
 }
 if(abaAtual==='materiais'){if(m.id==='e1')renderArquivos(app,{p_chave:chave},false,data.participantes,{coletivo:true});const mats=data.materiais.filter(x=>x.modulo===m.id);for(const x of mats){if(!/^https:\/\//i.test(x.url))continue;const a=el('a',x.titulo+(x.liberado?'':' · Oculto'));a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';app.append(add(el('p'),a));}if(m.id!=='e1'&&!mats.length)app.append(el('p','Ainda não há materiais publicados neste encontro.','empty'));}
}
/* A mesma capa abre o portal reservado da pesquisadora antes de carregar o painel.
   A chave permanece na sessão; só consultar os registros após a entrada explícita. */
(async()=>{
 const h=new URLSearchParams(location.hash.slice(1));
 chave=h.get('chave')||sessionStorage.getItem('percurso_admin')||'';
 if(location.hash)history.replaceState(null,'',location.pathname+location.search);
 const acesso=document.querySelector('.enter-cta');
 if(!acesso){
  if(!chave){login();return;}
  app.textContent='Abrindo painel…';
  try{data=await rpc();sessionStorage.setItem('percurso_admin',chave);render();}
  catch{login();}
  return;
 }
 acesso.addEventListener('click',async ev=>{
  ev.preventDefault();
  if(acesso.dataset.abrindo==='sim')return;
  if(!chave){login();app.scrollIntoView({block:'start'});return;}
  acesso.dataset.abrindo='sim';
  acesso.setAttribute('aria-busy','true');
  const titulo=acesso.innerHTML;
  acesso.textContent='Abrindo seu painel…';
  try{
   data=await rpc();
   sessionStorage.setItem('percurso_admin',chave);
   render();
   window.scrollTo({top:0,behavior:'auto'});
  }catch{
   sessionStorage.removeItem('percurso_admin');
   chave='';
   login();
   const st=document.querySelector('.login .status');
   if(st)st.textContent='Confira sua chave de pesquisadora e tente novamente.';
   app.scrollIntoView({block:'start'});
  }finally{
   acesso.dataset.abrindo='nao';
   acesso.removeAttribute('aria-busy');
   acesso.innerHTML=titulo;
  }
 });
})();
