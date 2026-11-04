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
async function refresh(){
 data=await rpc('percurso_carregar',{p_token:token});
 if(data?.participante?.codigo?.startsWith('OBS')){
   const o=await rpc('percurso_observador',{p_token:token});
   data={participante:o.observadora,modulos:o.modulos||[],materiais:o.materiais||[],registros:[],cartas:[],resumo:o.resumo||{}};
 }
}
function home(){dirty=false;app.replaceChildren();const top=el('div',undefined,'toolbar');add(top,el('h2','Meu Percurso'),btn('Sair',()=>{sessionStorage.removeItem('percurso_chave');token='';data=null;login();},true));add(app,top,el('p','Olá, '+data.participante.nome+'.'),el('p','Escolha um espaço para escrever ou retomar seus registros.','muted'));const grid=el('div',undefined,'grid');for(const m of data.modulos){const c=el('section',undefined,'card');add(c,el('span',m.data_encontro?new Date(m.data_encontro+'T12:00:00').toLocaleDateString('pt-BR'):'No seu tempo','eyebrow'),el('h3',m.titulo));if(m.id==='e2')c.append(el('p','Folha de Percurso · uma experiência, quatro momentos de escrita.'));if(m.id==='livre')c.append(el('p','Espaço opcional, sem prazo. Você pode registrar mais de uma vez.'));c.append(btn(m.tipo==='memoria'?'Revisitar encontro':m.tipo==='carta'?'Abrir minha carta':'Abrir',()=>openModule(m)));grid.append(c);}app.append(grid);const hist=el('section',undefined,'card');hist.append(el('h2','Meus registros'));const regs=[...data.registros,...data.cartas];if(!regs.length)hist.append(el('p','Seus registros aparecerão aqui depois de salvos.','muted'));for(const r of regs){const b=btn((r.modulo==='livre'?'Registro espontâneo':r.modulo.toUpperCase())+' · '+(r.complemento_de?'Complemento · ':'')+(r.status==='rascunho'?'Rascunho':'Enviado')+' · '+date(r.atualizado_em),()=>viewRecord(r),true);const row=el('p');row.append(b);hist.append(row);}app.append(hist);mostrarRespostasRecebidas(app);renderArquivos(hist,{p_token:token},true);}
function back(){if(leave())home();}
function materialList(m){const box=el('section');for(const a of data.materiais.filter(x=>x.modulo===m.id)){if(!/^https:\/\//i.test(a.url))continue;const p=el('p'),link=el('a',a.titulo);link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';p.append(link);box.append(p);}return box;}

const FOTO_API='https://zpsjuxusydfbptjotyxo.supabase.co/functions/v1/perfil-foto';
async function abrirPerfil(){
 encontroAtual='perfil';montarParticipante();
 app.replaceChildren();
 const carregando=el('p','Abrindo seu perfil…','muted');app.append(carregando);
 try{
  let perfil=await rpc('percurso_perfil',{p_token:token});
  app.replaceChildren();

  const hero=el('section',undefined,'perfil-hero');
  const foto=el('div',undefined,'perfil-foto');
  const img=el('img');img.alt='Foto do perfil';img.hidden=true;
  const monograma=el('div',(perfil.nome||'').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'PE','perfil-iniciais');
  const file=el('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.id='foto-perfil';file.hidden=true;
  const camera=el('input');camera.type='file';camera.accept='image/*';camera.setAttribute('capture','user');camera.id='camera-perfil';camera.hidden=true;
  const fotoBtn=btn('Escolher foto',()=>file.click(),true);
  const cameraBtn=btn('Tirar foto agora',()=>camera.click(),true);
  const fotoAcoes=el('div',undefined,'perfil-foto-acoes');fotoAcoes.append(fotoBtn,cameraBtn);
  const fotoNota=el('p','Foto opcional · usada apenas para personalizar seu perfil neste ambiente.','muted');
  add(foto,img,monograma,file,camera,fotoAcoes,fotoNota);

  const intro=el('div',undefined,'perfil-apresentacao');
  add(intro,
    el('span','UM POUCO SOBRE MIM','eyebrow'),
    el('h2',perfil.nome),
    el('p','Este espaço reúne o que você já contou sobre sua trajetória e abre lugar para acrescentar um pouco mais sobre quem você é no trabalho da coordenação/articulação pedagógica.','perfil-lead'),
    el('p','Complete até 19/11. Você pode salvar e voltar quantas vezes precisar.','notice')
  );
  add(hero,foto,intro);app.append(hero);

  async function carregarFoto(){
   try{
    const rr=await fetch(FOTO_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
    const x=await rr.json();
    if(rr.ok&&x.url){img.src=x.url;img.hidden=false;monograma.hidden=true;}
   }catch{}
  }
  carregarFoto();

  async function enviarFoto(f){
   if(!f)return;
   fotoBtn.disabled=true;cameraBtn.disabled=true;fotoNota.textContent='Enviando foto…';
   try{
    const fd=new FormData();fd.append('token',token);fd.append('file',f);
    const rr=await fetch(FOTO_API,{method:'POST',body:fd});const x=await rr.json();
    if(!rr.ok)throw Error(x.error||'Falha');
    img.src=x.url;img.hidden=false;monograma.hidden=true;
    fotoBtn.textContent='Trocar foto';fotoNota.textContent='Foto salva no seu perfil.';
    fotoNota.classList.remove('error');
   }catch{fotoNota.textContent='Não foi possível enviar a foto agora. Tente novamente.';fotoNota.classList.add('error');}
   finally{fotoBtn.disabled=false;cameraBtn.disabled=false;}
  }
  file.onchange=()=>enviarFoto(file.files?.[0]);
  camera.onchange=()=>enviarFoto(camera.files?.[0]);

  const d=perfil.dados||{};
  const grade=el('section',undefined,'perfil-dados-grid');
  const cartao=(titulo,linhas)=>{
   const c=el('article',undefined,'perfil-dado-card');c.append(el('span',titulo,'eyebrow'));
   for(const [rotulo,valor] of linhas){if(!valor)continue;const bloco=el('div',undefined,'perfil-dado-linha');add(bloco,el('small',rotulo),el('strong',valor));c.append(bloco);}
   return c;
  };
  grade.append(
   cartao('ONDE ESTOU',[['Atuação atual',d.funcao],['Unidade / setor',d.onde],['Etapas que acompanho',d.etapas]]),
   cartao('MEU TEMPO',[['Na função atual',d.tempo_funcao],['Na Rede Municipal',d.tempo_rede]]),
   cartao('MEU VÍNCULO',[['Vínculo',d.vinculo],['Como exerço a função',d.forma_exercicio],['Cargo/função de origem',d.cargo_origem||d.outra_funcao]]),
   cartao('EXPERIÊNCIAS ANTERIORES',[['Atuou como professora?',d.atuou_professora],['Etapas/modalidades',d.etapas_docencia],['Já exerceu coordenação?',d.coord_anterior],['Sobre essa experiência',d.tempo_coord_anterior]])
  );
  app.append(grade);

  add(app,
   el('h3','Agora, acrescente um pouco de você'),
   el('p','Aqui não é para repetir os dados acima. Escreva apenas o que ajuda a contar seu percurso com suas próprias palavras.','muted')
  );

  const campos=el('section',undefined,'perfil-escrita-grid');
  const defs=[
   ['chegada','COMO CHEGUEI ATÉ AQUI','Como aconteceu sua chegada à coordenação/articulação pedagógica?'],
   ['experiencias','O QUE ME FORMOU','Que experiências, formações ou funções anteriores você considera importantes para o trabalho que realiza hoje?'],
   ['realizacao','UMA REALIZAÇÃO QUE LEVO COMIGO','Há alguma realização, experiência ou momento do seu percurso profissional que você gostaria de registrar aqui?'],
   ['sobre_mim','UM POUCO DE MIM','Se você fosse se apresentar em poucas linhas como profissional da coordenação/articulação pedagógica, o que gostaria de dizer sobre você?']
  ];
  const fields={};
  for(const [id,titulo,pergunta] of defs){
    const c=el('article',undefined,'perfil-escrita-card'),lab=el('label',pergunta),ta=el('textarea');
    ta.id='perfil-'+id;lab.htmlFor=ta.id;ta.maxLength=5000;ta.value=perfil.complementos?.[id]||'';
    ta.oninput=()=>{dirty=true;status.textContent='Há alterações ainda não salvas.';};
    add(c,el('span',titulo,'eyebrow'),lab,ta);campos.append(c);fields[id]=ta;
  }
  app.append(campos);
  const status=el('p','Você pode salvar e continuar depois.','status');
  const salvar=btn('Salvar meu perfil',async()=>{
    salvar.disabled=true;status.textContent='Salvando…';
    try{
      perfil=await rpc('percurso_perfil_salvar',{p_token:token,p_complementos:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]))});
      dirty=false;status.textContent='Perfil salvo no Por Escrito.';
    }catch(e){status.textContent='Não foi possível salvar agora. Seu texto continua nesta tela.';status.classList.add('error');}
    finally{salvar.disabled=false;}
  });
  add(app,el('div',undefined,'perfil-actions'),salvar,status);
 }catch(e){
  app.replaceChildren(el('h2','Um pouco sobre mim'),el('p','Não foi possível carregar seu perfil agora. Tente novamente.','error'));
 }
}

function openModule(m){if(m.tipo==='perfil'){abrirPerfil();return;}if(m.tipo==='carta'){location.href='carta.html';return;}if(m.tipo==='memoria'){app.replaceChildren(btn('← Meu Percurso',back,true),el('h2',m.titulo),el('p','26 de outubro de 2026 · 13h30 às 17h'),el('h3','Para lembrar o nosso primeiro encontro'),el('p','Em 26 de outubro de 2026, nos encontramos on-line para conversar sobre o trabalho real da coordenação pedagógica em Barrocas: o que fazemos, as situações que atravessam o cotidiano e o que precisamos compreender antes de agir.'),el('p','A partilha reuniu registros individuais, conversas em pequenos grupos e perguntas que continuam conosco. Não se tratou de avaliar práticas nem de definir uma resposta única sobre o trabalho de coordenar.'),el('h3','Materiais para revisitar o E1'),el('p','Aqui você encontra os slides apresentados e os arquivos do encontro disponíveis para consulta. Os registros individuais continuam protegidos: cada participante acessa somente os seus.'),materialList(m));renderArquivos(app,{p_token:token},false,[],{modulo:'e1'});return;}const existing=data.registros.find(r=>r.modulo===m.id&&!r.complemento_de);if(m.id!=='livre'&&existing){viewRecord(existing);return;}editor(m,null,null);}
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
function montarParticipante(){const observadora=!!data?.participante?.codigo?.startsWith('OBS');app=montarPainel({modulos:data.modulos,selecionado:encontroAtual,nome:data.participante.nome,pesquisadora:false,observadora,navegar:id=>{if(!leave())return;if(id==='inicio')home();else openModule(data.modulos.find(m=>m.id===id));},sair:()=>{if(!leave())return;sessionStorage.removeItem('percurso_chave');token='';data=null;document.body.classList.remove('dashboard');app=document.getElementById('app');login();}});}

function blocoPesquisadora(){
 const sec=el('section',undefined,'pesquisadora-card');
 const foto=el('div','NO','pesquisadora-foto-placeholder');
 const txt=el('div',undefined,'pesquisadora-texto');
 add(txt,
   el('span','A PESQUISADORA','eyebrow'),
   el('h3','Nani Oliveira'),
   el('p','Pesquisadora responsável pelo percurso Por Escrito e pela investigação sobre a constituição profissional da coordenação pedagógica em Barrocas.','muted')
 );
 add(sec,foto,txt);
 return sec;
}

function home(){dirty=false;encontroAtual='inicio';montarParticipante();
if(data?.participante?.codigo?.startsWith('OBS')){
 add(app,
   el('h2','Painel de observação · Por Escrito'),
   el('p','Olá, '+data.participante.nome+'. Você está no painel espelho da pesquisa, com a mesma organização geral do painel da pesquisadora e permissões exclusivamente de leitura.','notice'),
   el('p','Você pode acompanhar a estrutura dos encontros, as atividades planejadas, o estado de liberação e os materiais cadastrados. Não é possível editar, liberar, responder, cadastrar pessoas ou acessar produções individuais.','muted')
 );
 app.append(blocoPesquisadora());
 const resumo=el('section',undefined,'card');
 add(resumo,el('h3','Visão geral do percurso'));
 const total=data?.resumo?.participantes_ativas;
 if(Number.isFinite(Number(total)))resumo.append(el('p',total+' participantes ativas no percurso de pesquisa. Os nomes e registros individuais não são exibidos neste perfil.','muted'));
 for(const m of data.modulos){
   const n=Number(data?.resumo?.registros_por_modulo?.[m.id]||0);
   const p=el('p');
   const abrir=btn((m.id==='livre'?'Entre encontros':m.id==='perfil'?'Um pouco sobre mim':m.id.toUpperCase()+' · '+m.titulo.replace(/^E\\d\\s*[—–-]\\s*/,'')),()=>{abaObservadora='sobre';abrirVisaoConvidada(m);});
   p.append(abrir,el('span','  '+(m.liberado?'Liberado':'Ainda não liberado')+' · '+n+' registro(s) produzidos','muted'));
   resumo.append(p);
 }
 app.append(resumo);
 app.append(el('p','Os números acima mostram apenas a movimentação geral do percurso. Nenhum conteúdo individual é disponibilizado.','muted'));
 return;
}add(app,el('h2','Seu percurso tem lugar aqui.'),el('p','Olá, '+data.participante.nome+'. Escolha um encontro para escrever ou retomar seus registros.'));app.append(blocoPesquisadora());const list=el('div',undefined,'encounter-list');for(const m of data.modulos)list.append(btn(m.id==='livre'?'Entre encontros':m.titulo,()=>openModule(m)));app.append(list);const hist=el('section',undefined,'card');hist.append(el('h2','Meus registros'));const regs=[...(data.registros||[]),...(data.cartas||[])];if(!regs.length)hist.append(el('p','Seus registros aparecerão aqui depois de salvos.','muted'));for(const r of regs){const label=(r.modulo==='livre'?'Registro espontâneo':r.modulo.toUpperCase())+' · '+(r.complemento_de?'Complemento · ':'')+(r.status==='rascunho'?'Rascunho':'Enviado')+' · '+date(r.atualizado_em);const row=el('p');row.append(btn(label,()=>viewRecord(r),true));hist.append(row);}app.append(hist);renderArquivos(hist,{p_token:token},true);}
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
let abaObservadora='sobre';
function abrirVisaoConvidada(m){
 encontroAtual=m.id;montarParticipante();
 add(app,
   el('p',m.id==='livre'?'Escuta / Entre encontros':'Encontros / '+m.id.toUpperCase(),'muted'),
   el('h2',m.id==='livre'?'Entre encontros':m.titulo),
   el('p',(m.liberado?'Disponível para as participantes':'Ainda não liberado para as participantes')+' · painel espelho · somente leitura','muted')
 );
 const tabs=el('div',undefined,'tabs');
 const itens=[['sobre',m.id==='livre'?'Sobre o espaço':'Sobre o encontro'],['atividade','Atividade individual'],['indicadores','Registros gerais'],['materiais','Materiais']];
 for(const [id,label] of itens){
   const b=btn(label,()=>{abaObservadora=id;abrirVisaoConvidada(m);});
   if(id===abaObservadora)b.classList.add('active');
   tabs.append(b);
 }
 app.append(tabs);
 const c=m.conteudo||{};
 if(m.id==='perfil'){
   add(app,
     el('h3','Estrutura do perfil individual'),
     el('p','As participantes encontram aqui seus próprios dados de caracterização já organizados e podem complementar o percurso com textos pessoais e uma foto opcional.','muted')
   );
   const demo=el('section',undefined,'perfil-dados-grid');
   const nomes=['Onde estou','Meu tempo','Meu vínculo','Experiências anteriores'];
   for(const n of nomes){const a=el('article',undefined,'perfil-dado-card');add(a,el('span',n.toUpperCase(),'eyebrow'),el('p','Informações individuais protegidas neste perfil de observação.','read'));demo.append(a);}
   app.append(demo);
   const escrita=el('section',undefined,'perfil-escrita-grid');
   for(const n of ['Como cheguei até aqui','O que me formou','Uma realização que levo comigo','Um pouco de mim']){
     const a=el('article',undefined,'perfil-escrita-card');add(a,el('span',n.toUpperCase(),'eyebrow'),el('p','Conteúdo individual não exibido.','read'));escrita.append(a);
   }
   app.append(escrita,el('p','Fotos, nomes e textos pessoais das participantes não são disponibilizados às observadoras.','notice'));
   return;
 }
 if(abaObservadora==='sobre'){
   if(c.subtitulo)app.append(el('h3',c.subtitulo));
   for(const p of c.introducao||[])app.append(el('p',p));
   if(c.importante){const note=el('aside',undefined,'notice');for(const p of c.importante)note.append(el('p',p));app.append(note);}
   app.append(el('p','Este perfil acompanha a organização metodológica do percurso, sem acesso a produções individuais ou comandos de gestão.','notice'));
   return;
 }
 if(abaObservadora==='atividade'){
   add(app,el('h3',m.id==='e2'?'Folha de Percurso':c.subtitulo||'Atividade individual'),el('p','Visualização da proposta de escrita. Os campos estão desativados neste perfil.','muted'));
   const qs=c.questoes||[];
   if(!qs.length){app.append(el('p','O conteúdo detalhado deste espaço ainda não foi configurado.','empty'));return;}
   qs.forEach((q,i)=>{const d=el('details',undefined,'question');d.open=i===0;d.append(el('summary',(i+1)+'  '+(q.titulo||'Questão')),el('p',q.pergunta||'','read'));const campo=el('textarea');campo.readOnly=true;campo.disabled=true;campo.placeholder='Campo de escrita da participante — indisponível no perfil de observação.';d.append(campo);app.append(d);});
   app.append(el('p','Somente visualização: nenhuma resposta pode ser criada, alterada ou enviada.','notice'));
   return;
 }
 if(abaObservadora==='indicadores'){
   const n=Number(data?.resumo?.registros_por_modulo?.[m.id]||0);
   add(app,el('h3','Movimentação geral'),el('p',n+' registro(s) produzidos neste espaço.','read'),el('p','A observadora vê apenas a contagem geral. Nomes, textos, rascunhos, cartas e respostas individuais permanecem protegidos.','notice'));
   return;
 }
 if(abaObservadora==='materiais'){
   const mats=data.materiais.filter(x=>x.modulo===m.id&&/^https:\/\//i.test(x.url));
   if(!mats.length){app.append(el('p','Ainda não há materiais cadastrados neste espaço.','empty'));return;}
   for(const x of mats){const p=el('p'),a=el('a',x.titulo+(x.liberado?'':' · ainda oculto para as participantes'));a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);app.append(p);}
   app.append(el('p','Os materiais podem ser abertos para consulta, mas este perfil não altera sua visibilidade nem seu conteúdo.','notice'));
 }
}
openModule=function(m){if(data?.participante?.codigo?.startsWith('OBS')){abrirVisaoConvidada(m);return;}encontroAtual=m.id;montarParticipante();abrirAnterior(m);if(m.id==='e2')materiaisLiberadosE2();if(m.tipo==='memoria')return;};
/* A capa é a primeira tela para todas as participantes.
   O token pessoal permanece restrito à sessão e só abre o percurso após clique. */
(async()=>{
 const u=new URL(location.href);
 const hash=new URLSearchParams(u.hash.slice(1));
 const incoming=(u.searchParams.get('token')||hash.get('token')||hash.get('chave')||'').trim();
 if(incoming){u.searchParams.delete('token');u.hash='';history.replaceState(null,'',u.pathname+u.search);}
 if(!incoming&&sessionStorage.getItem('percurso_admin')){location.replace('organizador.html');return;}
 token=incoming||sessionStorage.getItem('percurso_chave')||'';
 if(incoming)sessionStorage.setItem('percurso_chave',incoming);
 const acesso=document.querySelector('.enter-cta');
 if(!acesso){if(token){try{await refresh();home();}catch(e){sessionStorage.removeItem('percurso_chave');login();}}else login();return;}
 acesso.addEventListener('click',async ev=>{
  ev.preventDefault();
  if(acesso.dataset.abrindo==='sim')return;
  if(!token){login();document.getElementById('app').scrollIntoView({block:'start'});return;}
  acesso.dataset.abrindo='sim';
  acesso.setAttribute('aria-busy','true');
  const titulo=acesso.textContent;
  acesso.textContent='Abrindo seu percurso…';
  try{
   await refresh();
   sessionStorage.removeItem('percurso_admin');
   sessionStorage.setItem('percurso_chave',token);
   home();
   window.scrollTo({top:0,behavior:'auto'});
  }catch(e){
   try{if(await enterResearcher(token))return;}catch{}
   sessionStorage.removeItem('percurso_chave');
   token='';
   login();
   const aviso=document.querySelector('.login .status');
   if(aviso)aviso.textContent=message(e);
   document.getElementById('app').scrollIntoView({block:'start'});
  }finally{
   acesso.dataset.abrindo='nao';
   acesso.removeAttribute('aria-busy');
   acesso.textContent=titulo;
  }
 });
})();
