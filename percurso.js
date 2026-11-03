'use strict';
const API='https://zpsjuxusydfbptjotyxo.supabase.co/rest/v1/rpc/',KEY='sb_publishable_n7giA7FAUqRmj1zv2JF8og_VQbjrxa7';
let app=document.getElementById('app');let token='',data=null,dirty=false,busy=false;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const add=(parent,...nodes)=>{nodes.forEach(n=>parent.append(n));return parent};
const btn=(text,fn,secondary=false)=>{const b=el('button',text,secondary?'secondary':'');b.onclick=fn;return b};
const date=s=>s?new Date(s).toLocaleString('pt-BR',{timeZone:'America/Bahia'}):'';
async function rpc(name,args){const r=await fetch(API+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(args)});const d=await r.json();if(!r.ok)throw Error(d.message||'Não foi possível conectar.');return d;}
function message(e){if(/ACESSO/.test(e.message))return 'Acesso não reconhecido. Confira sua chave individual.';if(/OUTRA_ABA|unique/.test(e.message))return 'Este registro foi atualizado em outra aba. Copie seu texto antes de recarregar.';if(/INDISPONIVEL/.test(e.message))return 'Este módulo não está disponível neste momento.';if(/VAZIO/.test(e.message))return 'Escreva seu registro antes de enviar.';return 'Não foi possível salvar. Seu texto continua nesta tela. Tente novamente antes de sair.';}
function leave(){return !busy&&(!dirty||confirm('Há alterações ainda não salvas. Deseja sair sem salvar?'));}
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
async function enterResearcher(candidate){
 const r=await fetch(API+'percurso_admin',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_chave:candidate,p_acao:'carregar',p_dados:{}})});
 if(!r.ok)return false;const result=await r.json();if(!Array.isArray(result.participantes)||!Array.isArray(result.modulos))return false;
 sessionStorage.removeItem('percurso_chave');sessionStorage.setItem('percurso_admin',candidate);location.replace('organizador.html');return true;
}
function login(){app.replaceChildren();const box=el('section',undefined,'card login'),h=el('h2','Bem-vinda ao Por Escrito'),label=el('label','Acesso alternativo: cole seu link individual aqui'),input=el('input'),status=el('p','','status');input.id='chave';input.type='password';input.autocomplete='off';label.htmlFor='chave';const form=el('form');const enter=btn('Entrar',()=>{});enter.type='submit';form.onsubmit=async e=>{e.preventDefault();token=chaveDoAcesso(input.value);enter.disabled=true;status.textContent='Conectando…';try{data=await rpc('percurso_carregar',{p_token:token});sessionStorage.removeItem('percurso_admin');sessionStorage.setItem('percurso_chave',token);home();}catch(e){try{if(await enterResearcher(token))return;}catch{}status.textContent=message(e);}finally{enter.disabled=false;}};add(box,h,el('p','Você não precisa criar senha nem digitar códigos. Abra o e-mail da pesquisadora e clique em “ENTRAR NO MEU PERCURSO”.','notice'));add(form,label,input,el('p','Use este campo somente se o botão do e-mail não abrir. Cole o link inteiro recebido, sem compartilhar com outras pessoas.','muted'),enter,status);box.append(form);app.append(box);}
async function refresh(){data=await rpc('percurso_carregar',{p_token:token});}
function home(){dirty=false;app.replaceChildren();const top=el('div',undefined,'toolbar');add(top,el('h2','Meu Percurso'),btn('Sair',()=>{sessionStorage.removeItem('percurso_chave');token='';data=null;login();},true));add(app,top,el('p','Olá, '+data.participante.nome+'.'),el('p','Escolha um espaço para escrever ou retomar seus registros.','muted'));const grid=el('div',undefined,'grid');for(const m of data.modulos){const c=el('section',undefined,'card');add(c,el('span',m.data_encontro?new Date(m.data_encontro+'T12:00:00').toLocaleDateString('pt-BR'):'No seu tempo','eyebrow'),el('h3',m.titulo));if(m.id==='e2')c.append(el('p','Folha de Percurso · uma experiência, quatro momentos de escrita.'));if(m.id==='livre')c.append(el('p','Espaço opcional, sem prazo. Você pode registrar mais de uma vez.'));c.append(btn(m.tipo==='memoria'?'Revisitar encontro':m.tipo==='carta'?'Abrir minha carta':'Abrir',()=>openModule(m)));grid.append(c);}app.append(grid);const hist=el('section',undefined,'card');hist.append(el('h2','Meus registros'));const regs=[...data.registros,...data.cartas];if(!regs.length)hist.append(el('p','Seus registros aparecerão aqui depois de salvos.','muted'));for(const r of regs){const b=btn((r.modulo==='livre'?'Registro espontâneo':r.modulo.toUpperCase())+' · '+(r.complemento_de?'Complemento · ':'')+(r.status==='rascunho'?'Rascunho':'Enviado')+' · '+date(r.atualizado_em),()=>viewRecord(r),true);const row=el('p');row.append(b);hist.append(row);}app.append(hist);mostrarRespostasRecebidas(app);renderArquivos(hist,{p_token:token},true);}
function back(){if(leave())home();}
function materialList(m){const box=el('section');for(const a of data.materiais.filter(x=>x.modulo===m.id)){if(!/^https:\/\//i.test(a.url))continue;const p=el('p'),link=el('a',a.titulo);link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';p.append(link);box.append(p);}return box;}
function openModule(m){if(m.tipo==='carta'){location.href='carta.html';return;}if(m.tipo==='memoria'){app.replaceChildren(btn('← Meu Percurso',back,true),el('h2',m.titulo),el('p','26 de outubro de 2026 · 13h30 às 17h'),el('h3','Para lembrar o nosso primeiro encontro'),el('p','Em 26 de outubro de 2026, nos encontramos on-line para conversar sobre o trabalho real da coordenação pedagógica em Barrocas: o que fazemos, as situações que atravessam o cotidiano e o que precisamos compreender antes de agir.'),el('p','A partilha reuniu registros individuais, conversas em pequenos grupos e perguntas que continuam conosco. Não se tratou de avaliar práticas nem de definir uma resposta única sobre o trabalho de coordenar.'),el('h3','Materiais para revisitar o E1'),el('p','Aqui você encontra os slides apresentados e os arquivos do encontro disponíveis para consulta. Os registros individuais continuam protegidos: cada participante acessa somente os seus.'),materialList(m));renderArquivos(app,{p_token:token},false,[],{modulo:'e1'});return;}const existing=data.registros.find(r=>r.modulo===m.id&&!r.complemento_de);if(m.id!=='livre'&&existing){viewRecord(existing);return;}editor(m,null,null);}
function viewRecord(r){const m=data.modulos.find(x=>x.id===r.modulo);if(r.status==='rascunho'&&m&&m.tipo!=='carta'){editor(m,r,r.complemento_de);return;}app.replaceChildren(btn('← Meu Percurso',back,true),el('h2',m?.titulo||r.modulo.toUpperCase()),el('p',(r.complemento_de?'Complemento · ':'')+'Enviado em '+date(r.enviado_em),'muted'));const qs=m?.conteudo?.questoes||[];for(const [k,v] of Object.entries(r.respostas||{})){const b=el('section',undefined,'block');add(b,el('h3',qs.find(q=>q.id===k)?.pergunta||'Registro'),el('p',v||'—','read'));app.append(b);}app.append(el('p','O texto enviado é preservado. Novas reflexões podem ser acrescentadas em um complemento separado.','muted'));if(m&&m.tipo!=='carta')app.append(btn('Acrescentar complemento',()=>editor(m,null,r.id)));}
function editor(m,r,complemento){dirty=false;app.replaceChildren(btn('← Meu Percurso',back,true),el('h2',m.titulo));const c=m.conteudo||{};if(!complemento){app.append(el('h3',c.subtitulo||''));for(const p of c.introducao||[])app.append(el('p',p));if(c.importante){const n=el('aside',undefined,'notice');n.append(el('strong','IMPORTANTE'));for(const p of c.importante)n.append(el('p',p));app.append(n);}}else app.append(el('p','Este complemento será guardado separadamente. O registro original permanece intacto.','notice'));
 const qs=complemento?[{id:'texto',titulo:'Complemento',pergunta:'O que você deseja acrescentar ao seu registro?'}]:c.questoes||[];let id=r?.id||crypto.randomUUID(),revision=r?.revisao||0;const fields={};for(const q of qs){const b=el('section',undefined,'block'),label=el('label',q.pergunta),t=el('textarea');t.id=q.id;label.htmlFor=q.id;t.value=r?.respostas?.[q.id]||'';t.maxLength=22000;t.oninput=()=>{dirty=true;status.textContent='Alterações ainda não salvas. Use “Salvar rascunho”.';};add(b,el('span',q.titulo,'eyebrow'),label,t);fields[q.id]=t;app.append(b);}const status=el('p',r?'Rascunho salvo em '+date(r.atualizado_em):'Salve seu rascunho para continuar em outro momento.','status');status.setAttribute('role','status');const actions=el('div',undefined,'actions');const save=btn('Salvar rascunho',()=>saveRecord(false),true),send=btn('Enviar registro',()=>saveRecord(true));add(actions,save,send);add(app,el('p','Somente você e a pesquisadora acessam este registro. Não há transferência automática para espaços coletivos.','muted'),actions,status);
 async function saveRecord(enviar){if(busy)return;if(enviar&&!confirm('Enviar este registro? O texto será preservado; depois você poderá acrescentar complementos.'))return;busy=true;save.disabled=send.disabled=true;Object.values(fields).forEach(t=>t.disabled=true);status.textContent='Salvando…';try{const saved=await rpc('percurso_salvar',{p_token:token,p_id:id,p_modulo:m.id,p_respostas:Object.fromEntries(Object.entries(fields).map(([k,t])=>[k,t.value])),p_enviar:enviar,p_revisao:revision,p_complemento:complemento||null});revision=saved.revisao;r=saved;dirty=false;const i=data.registros.findIndex(x=>x.id===saved.id);if(i<0)data.registros.push(saved);else data.registros[i]=saved;status.textContent='Salvo no ambiente em '+date(saved.atualizado_em)+'.';if(enviar)viewRecord(saved);}catch(e){status.textContent=message(e);status.classList.add('error');}finally{busy=false;save.disabled=send.disabled=false;Object.values(fields).forEach(t=>t.disabled=false);}}
}
async function consultarRespostasDaPesquisadora(){
 const r=await fetch(API+'percurso_minhas_respostas',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token})});
 if(!r.ok)throw Error('Não foi possível consultar as respostas.');
 const x=await r.json();if(!Array.isArray(x))throw Error('Formato inesperado.');return x;
}
function mostrarRespostasRecebidas(container,registroId=null){
 const sec=el('section',undefined,'card');
 sec.append(el('h3',registroId?'Respostas da pesquisadora':'Respostas recebidas da pesquisadora'));
 const info=el('p','Consultando respostas…','muted');sec.append(info);container.append(sec);
 consultarRespostasDaPesquisadora().then(respostas=>{
  if(!sec.isConnected)return;
  const lista=registroId?respostas.filter(x=>x.registro_id===registroId):respostas;
  info.textContent=lista.length?registroId?'Respostas referentes a este registro:':'Estas respostas também ficam guardadas nos seus registros.':'Nenhuma resposta recebida até o momento.';
  for(const r of lista)add(sec,el('p','Resposta de '+date(r.criado_em),'muted'),el('p',r.texto,'read'));
 }).catch(()=>{if(sec.isConnected)info.textContent='Não foi possível consultar as respostas agora. Tente novamente mais tarde.';});
}
let encontroAtual='inicio';
function montarParticipante(){app=montarPainel({modulos:data.modulos,selecionado:encontroAtual,nome:data.participante.nome,pesquisadora:false,navegar:id=>{if(!leave())return;if(id==='inicio')home();else openModule(data.modulos.find(m=>m.id===id));},sair:()=>{if(!leave())return;sessionStorage.removeItem('percurso_chave');token='';data=null;document.body.classList.remove('dashboard');app=document.getElementById('app');login();}});}
function home(){dirty=false;encontroAtual='inicio';montarParticipante();
if(data?.participante?.codigo?.startsWith('OBS')){
 add(app,
   el('h2','Visão de convidada · Por Escrito'),
   el('p','Olá, '+data.participante.nome+'. Este acesso foi preparado para que você conheça a dimensão do percurso investigativo e a organização do ambiente.','notice'),
   el('p','Este perfil é somente leitura. Registros individuais, rascunhos, cartas e produções protegidas das participantes não são exibidos.','muted'),
   el('h3','Percurso da pesquisa'),
   el('p','E1 — Entre o que fazemos e o que sabemos · E2 — Tornar-se coordenadora pedagógica · E3 — O que sustenta nossa leitura pedagógica? · Carta de Percurso — O que ainda preciso dizer · E4 — Decisões em situações reais de trabalho · E5 — Construindo referências para o trabalho da coordenação pedagógica · devolução à rede em 2027.','read'),
   el('h3','Espaços atualmente disponíveis')
 );
 const lista=el('div',undefined,'encounter-list');
 for(const m of data.modulos)lista.append(btn(m.id==='livre'?'Entre encontros':m.titulo,()=>abrirVisaoConvidada(m)));
 app.append(lista);
 return;
}add(app,el('h2','Seu percurso tem lugar aqui.'),el('p','Olá, '+data.participante.nome+'. Escolha um encontro para escrever ou retomar seus registros.'));const list=el('div',undefined,'encounter-list');for(const m of data.modulos)list.append(btn(m.id==='livre'?'Entre encontros':m.titulo,()=>openModule(m)));app.append(list);const hist=el('section',undefined,'card');hist.append(el('h2','Meus registros'));const regs=[...(data.registros||[]),...(data.cartas||[])];if(!regs.length)hist.append(el('p','Seus registros aparecerão aqui depois de salvos.','muted'));for(const r of regs){const label=(r.modulo==='livre'?'Registro espontâneo':r.modulo.toUpperCase())+' · '+(r.complemento_de?'Complemento · ':'')+(r.status==='rascunho'?'Rascunho':'Enviado')+' · '+date(r.atualizado_em);const row=el('p');row.append(btn(label,()=>viewRecord(r),true));hist.append(row);}app.append(hist);renderArquivos(hist,{p_token:token},true);}
function materiaisLiberadosE2(){
 if(encontroAtual!=='e2'||!Array.isArray(data?.materiais))return;
 if(document.getElementById('materiais-e2'))return;
 const itens=data.materiais.filter(x=>x.modulo==='e2'&&/^https:\/\//i.test(x.url));
 if(!itens.length)return;
 const sec=el('section',undefined,'card');sec.id='materiais-e2';
 sec.append(el('h3','Materiais para retomar o E2'),el('p','Disponibilizados depois do fechamento do encontro. Os slides e a Contrapartida 2 são recursos para consulta, não uma atividade a entregar.'),materialList({id:'e2'}));
 app.append(sec);
 renderArquivos(app,{p_token:token},true,[],{modulo:'e2'});
}
const editorAnterior=editor,verAnterior=viewRecord,abrirAnterior=openModule;
editor=function(m,r,complemento){encontroAtual=m.id;montarParticipante();editorAnterior(m,r,complemento);if(m.id==='livre'&&!complemento){const h=app.querySelector('h2');if(h){h.textContent='Entre encontros';h.after(el('p','Entre um encontro e outro, este espaço permanece aberto para você compartilhar, se desejar, situações vividas na coordenação, dúvidas, reflexões ou mensagens à pesquisadora. Seus registros e as respostas recebidas ficam disponíveis para retomada no seu percurso. A participação é opcional: este espaço não é uma atividade obrigatória e não substitui as propostas de cada encontro.','notice'));}}const blocks=[...app.querySelectorAll('section.block')];blocks.forEach((b,i)=>{const title=b.querySelector('.eyebrow');const d=el('details',undefined,'question');d.open=i===0;d.append(el('summary',(i+1)+'  '+(title?.textContent||'Registro')));if(title)title.remove();while(b.firstChild)d.append(b.firstChild);b.replaceWith(d);});if(m.id==='e2')materiaisLiberadosE2();};
viewRecord=function(r){encontroAtual=r.modulo;montarParticipante();verAnterior(r);if(r.modulo==='e2')materiaisLiberadosE2();if(r.modulo==='livre'){const h=app.querySelector('h2');if(h)h.textContent='Entre encontros';if(r.status==='enviado')mostrarRespostasRecebidas(app,r.id);}};
function abrirVisaoConvidada(m){
 encontroAtual=m.id;montarParticipante();
 add(app,btn('← Visão geral',home,true),el('h2',m.titulo),el('p','Visualização de convidada · somente leitura','muted'));
 const c=m.conteudo||{};
 if(c.subtitulo)app.append(el('h3',c.subtitulo));
 for(const p of c.introducao||[])app.append(el('p',p));
 if(Array.isArray(c.questoes)&&c.questoes.length){
   app.append(el('h3','Questões que organizam este movimento'));
   c.questoes.forEach((q,i)=>{
     const b=el('section',undefined,'block');
     add(b,el('span','Questão '+(i+1),'eyebrow'),el('p',q.pergunta||q.titulo||'','read'));
     app.append(b);
   });
 }
 const mats=data.materiais.filter(x=>x.modulo===m.id&&/^https:\/\//i.test(x.url));
 if(mats.length){app.append(el('h3','Materiais liberados para consulta'),materialList(m));}
 if(m.tipo==='memoria'&&!c.introducao?.length){
   app.append(el('p','Este movimento reúne memórias e materiais do encontro realizado. Os registros individuais permanecem protegidos e não aparecem neste perfil.'));
 }
}
openModule=function(m){if(data?.participante?.codigo?.startsWith('OBS')){abrirVisaoConvidada(m);return;}encontroAtual=m.id;montarParticipante();abrirAnterior(m);if(m.id==='e2')materiaisLiberadosE2();if(m.tipo==='memoria')return;};
(async()=>{const u=new URL(location.href);const hash=new URLSearchParams(u.hash.slice(1));const incoming=(u.searchParams.get('token')||hash.get('token')||hash.get('chave')||'').trim();if(incoming){u.searchParams.delete('token');u.hash='';history.replaceState(null,'',u.pathname+u.search);}if(!incoming&&sessionStorage.getItem('percurso_admin')){location.replace('organizador.html');return;}token=incoming||sessionStorage.getItem('percurso_chave')||'';if(!token){login();return;}app.textContent='Abrindo seu percurso…';try{await refresh();sessionStorage.removeItem('percurso_admin');sessionStorage.setItem('percurso_chave',token);home();}catch(e){try{if(await enterResearcher(token))return;}catch{}sessionStorage.removeItem('percurso_chave');login();}})();
