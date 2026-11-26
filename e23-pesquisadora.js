import { percursoCompleto, mostrarPercursoCompleto } from './e23-fechamento.js?v=percurso-por-etapa';
import { conteudo } from './e23-coordenadoras.js?v=percurso-por-etapa';
import { imprimirPropostaM1, controleExportacaoPropostaM1, propostasSalvasM1 } from './e23-proposta-pdf.js?v=fechamento';
import { conferirPropostaM1, perguntasDaProposta, tituloMaterialidadeC } from './e23-proposta-m1.js?v=materialidade-c-questoes';
const titulo='E2–E3 integrados · 25/11/2026 · 13h30 às 17h';
const fases=['Preparação','Meu olhar','Nossos olhares','Intervalo','Outros olhares','Respostas e retomada','Contribuição ao Referencial','Plenária','Encerramento'];
const blocos=['Meu olhar','Assim pensamos inicialmente','O olhar das colegas','Dialogamos com as colegas','Revisitamos nossa análise','Nossa contribuição para o Referencial'];
const materiais={A:'Planejamento semanal do Grupo 5',B:'Três atividades em análise: o olhar da coordenação pedagógica',C:tituloMaterialidadeC};
function legenda(r){return r.finalizado?'Finalizado':'Rascunho salvo';}
export function projecao(d,g){
 return d.registros.filter(r=>r.origem===g&&r.autora==null&&r.bloco>0&&r.finalizado).sort((a,b)=>a.bloco-b.bloco).map(r=>{
  const versoes=d.historico_coletivo.filter(h=>h.origem===g&&h.bloco===r.bloco&&h.registro.finalizado).sort((a,b)=>a.versao-b.versao);
  const linhas=versoes.length?versoes:[{versao:r.versao,grupo_autor:r.bloco===2?d.sala.pares.indexOf(g)+1:g,registro:{dados:r.dados}}];
  return {bloco:r.bloco,versoes:linhas.map(h=>({grupo:h.grupo_autor,versao:h.versao,campos:campos(d,r.bloco,g,h.registro)}))};
 });
}
function campos(d,b,g,p){
 if(p.perguntas_e_respostas)return p.perguntas_e_respostas.map(v=>[v.pergunta,v.resposta]);
 const versao=p.proposta_m1?p:d.historico_coletivo.find(h=>h.origem===g&&h.bloco===b&&h.versao===p.versao)?.registro;
 const perguntas=b===1?(versao?.proposta_m1?perguntasDaProposta(d.sala.materiais[g]):d.perguntas[d.sala.materiais[g]]):b===2?['Contribuição das colegas','Pergunta 1','Pergunta 2']:null;
 return p.dados.map((texto,i)=>[perguntas?.[i]||blocos[b]||'Escolha da materialidade',texto]);
}
export function exportacao(d,m){
 const pessoas=new Map(m.people.map(p=>[p.id,p.name]));
 return {sessao:m.session.title,identificador:m.session.id,exportado_em:d.agora,oficina:d.sala,perguntas:d.perguntas,materialidades:materiais,
  registros:d.registros.map(r=>({...r,autora_nome:pessoas.get(r.autora),movimento:r.bloco===-1?'Escolha':blocos[r.bloco],materialidade:r.bloco===-1?r.dados[0]:d.sala.materiais[r.origem]})),
  historico_coletivo:d.historico_coletivo.map(h=>({...h,movimento:blocos[h.bloco],materialidade:d.sala.materiais[h.origem]}))};
}
export async function abrir({host,chamar,el,btn}){
 let sid,meta,d,conteudoOficina,ocupado=false,projetando=false,grupoTela=1,agoraLocal,timer,ciclo,visaoAoVivo,secaoAberta=new Set();
 const api=(acao,p={})=>chamar('e23_api',{p_action:acao,p_payload:{...(sid?{session_id:sid}:{}),...p}});
 const oficina=(acao='ler',p={})=>chamar('oficina_integrada',{p_sid:sid,p_acao:acao,p});
 const acao=(txt,fn)=>btn(txt,async()=>{if(ocupado)return;ocupado=true;try{await fn();}finally{ocupado=false;}});
 const grupos=()=>Array.from({length:meta.session.group_count||0},(_,i)=>i+1);
 function escolha(items,val){const s=el('select');for(const [k,t] of items){const o=el('option',t);o.value=k;s.append(o);}s.value=String(val??'');return s;}
 function campo(box,label,elem){const l=el('label',label+' ');l.append(elem);box.append(l);}
 function secao(t){const box=el('details',undefined,'card');box.open=secaoAberta.has(t);box.append(el('summary',t));box.ontoggle=()=>{if(box.isConnected){if(box.open)secaoAberta.add(t);else secaoAberta.delete(t);}};host.append(box);return box;}
 async function listar(abrirUnica=false){
 clearInterval(ciclo);
 const l=await api('sessions');if(l.actor?.role!=='pesquisadora')throw Error('Acesso reservado à pesquisadora.');
 host.replaceChildren(el('h2','E2–E3 integrados'));if(l.actor.is_test){await entrar(l.actor.session_id);return;}const oficiais=l.sessions.filter(s=>!s.is_test);
 if(abrirUnica&&oficiais.length===1){await entrar(oficiais[0].id);return;}
 for(const s of oficiais)host.append(acao(s.title+' · '+(s.published?'Liberada':'Fechada'),()=>entrar(s.id)));
 if(!oficiais.some(s=>s.title===titulo))host.append(acao('Criar sessão fechada de 25/11/2026',async()=>{const sessao=await api('create_session',{title:titulo,is_test:false});await entrar(sessao.id);}));
 }
 const numeroVisivel = grupo => d?.sala?.materiais?.circulacao_duas_salas ? ({4:1,3:2,1:3,2:'anterior 2'}[grupo] ?? grupo) : grupo;
 async function entrar(id){sid=id;await atualizar();acompanhar();}
 const painelAutomatico=()=>sid==='d79ace19-ee80-472e-8585-16784465cd6f';
 function acompanhar(){
   const sessao=sid;
   clearInterval(ciclo);
   ciclo=setInterval(async()=>{
     if(sid!==sessao||!host.isConnected){clearInterval(ciclo);return;}
     if(!host.isConnected||ocupado||projetando)return;
     ocupado=true;
     try{
       const [novo,novaMeta]=await Promise.all([oficina(),api('load')]);
       const estado=({agora,...dados})=>JSON.stringify(dados);
       if(host.isConnected&&sid===sessao&&(estado(novo)!==estado(d)||JSON.stringify(novaMeta.members)!==JSON.stringify(meta.members))){
         const faseMudou=novo.sala.fase!==d.sala.fase;
         d=novo;meta=novaMeta;agoraLocal=Date.now();
         if(painelAutomatico()||faseMudou)desenhar();else if(visaoAoVivo?.isConnected)resumirAndamento();
       }
       if(!painelAutomatico()&&visaoAoVivo?.isConnected){
         const status=visaoAoVivo.querySelector('[role="status"]');
         status.textContent=fases[d.sala.fase]+' · Consulta às '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Bahia'});
       }
     }catch{
       if(visaoAoVivo?.isConnected)visaoAoVivo.querySelector('[role="status"]').textContent='Atualização interrompida. Os dados exibidos são da última consulta.';
     }finally{ocupado=false;}
   },4000);
 }
 async function atualizar(){[meta,d,conteudoOficina]=await Promise.all([api('load'),oficina(),conteudo()]);agoraLocal=Date.now();desenhar();}
 function resumirAndamento(){
 const abertos=new Set(Array.from(visaoAoVivo.querySelectorAll('[data-grupo] details[open]'),el=>el.parentElement.dataset.grupo));
 const fase=d.sala.fase;
 const estados=el('p',fases[fase]+' · Consulta às '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Bahia'}),'muted');
 estados.setAttribute('role','status');
 visaoAoVivo.replaceChildren(el('h3','Andamento do encontro'),estados);
 const ativos=d.grupos_ativos??[...new Set(meta.members.map(m=>m.group_no))];
 const nomes=new Map(meta.people.map(p=>[p.id,p.name]));
 const blocoAtual={2:1,3:1,4:2,5:3,6:5,7:5,8:5}[fase];
 const registros=ativos.map(g=>{
   const outro=d.sala.pares[g-1];
   const registro=(b,origem=g)=>d.registros.find(r=>r.origem===origem&&r.bloco===b&&r.autora==null);
   const bloco=fase===5&&registro(3)?.finalizado?4:blocoAtual;
   return {g,outro,bloco,atual:registro(bloco,bloco===2?outro:g),propostaRecebida:registro(1,outro)};
 });
 const pendentes=registros.filter(r=>!r.atual?.finalizado);
 for(const {g,outro,bloco,atual,propostaRecebida} of registros){
   const box=el('section',undefined,'e23-panel');
   const membros=meta.members.filter(m=>m.group_no===g);
   const individuais=membros.filter(m=>d.registros.some(r=>r.bloco===0&&r.autora===m.actor_id&&r.finalizado));
   box.append(el('h4','Grupo '+numeroVisivel(g)+' · '+(materiais[d.sala.materiais[g]]||'Materialidade a definir')));
   if(bloco)box.append(el('p',blocos[bloco]+' · '+(atual?legenda(atual):'Sem registro salvo')));
   if(fase===4&&(!outro||!propostaRecebida?.finalizado))box.append(el('p',outro?'Aguarda a proposta do Grupo '+numeroVisivel(outro):'Aguarda definição do grupo interlocutor'));
   if(d.representacao&&[2,4,5,6].includes(fase)&&atual?.finalizado&&pendentes.length)box.append(el('p','Aguarda '+pendentes.map(p=>'Grupo '+numeroVisivel(p.g)).join(', ')+' finalizar'));
   if(membros.length){
     box.append(el('p',individuais.length+' de '+membros.length+' registros individuais finalizados entre as integrantes vinculadas'));
     const detalhes=el('details');
     detalhes.append(el('summary','Integrantes e registros individuais'));
     for(const m of membros){const escrita=d.registros.find(r=>r.bloco===0&&r.autora===m.actor_id);detalhes.append(el('p',(nomes.get(m.actor_id)||'Participante')+' · '+(escrita?legenda(escrita):'Sem registro salvo')));}
     detalhes.open=abertos.has(String(g));
     box.append(detalhes);
   }
   box.dataset.grupo=g;
   visaoAoVivo.append(box);
 }
 if(!ativos.length)visaoAoVivo.append(el('p','Nenhum grupo constituído até esta consulta.'));
 }
 function desenhar(){
 clearInterval(timer);host.replaceChildren();if(projetando){plenaria();return;}
 host.append(el('h2','E2–E3 integrados'),el('p',meta.session.title),el('p',(meta.session.published?'Acesso liberado':'Acesso fechado')+' · '+fases[d.sala.fase],'notice'));
 visaoAoVivo=el('section',undefined,'card');host.append(visaoAoVivo);resumirAndamento();
 const fluxo=el('img');
 fluxo.src='fluxo-oficina-e23.png?v=fechamento-plenaria';
 fluxo.alt='Fluxo da oficina: escolha da materialidade, escrita individual, produção em grupo, circulação e plenária.';
 fluxo.style.cssText='display:block;width:100%;height:auto;margin:0 0 1rem';
 host.append(fluxo,acao('Atualizar acompanhamento',atualizar),acao('Escolher sessão',listar));
 const escolhasAoVivo=el('section',undefined,'card');
 escolhasAoVivo.append(el('h3','Escolhas das coordenadoras'));
 const escolhasGrade=el('div');
 escolhasGrade.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:.75rem';
 const nomesPorId=new Map(meta.people.filter(p=>p.role==='participante').map(p=>[p.id,p.name]));
 const escolhasPorPessoa=new Map(d.registros.filter(r=>r.bloco===-1&&r.finalizado&&nomesPorId.has(r.autora)).map(r=>[r.autora,r.dados[0]]));
 for(const [codigo,titulo] of [...Object.entries(materiais),['','Ainda sem escolha']]){
   const nomes=[...nomesPorId].filter(([id])=>(escolhasPorPessoa.get(id)||'')===codigo).map(([,nome])=>nome).sort((a,b)=>a.localeCompare(b,'pt-BR'));
   const cartao=el('details',undefined,'card');
   cartao.append(el('summary',titulo+' · '+nomes.length));
   if(nomes.length){
     const lista=el('ul');
     for(const nome of nomes)lista.append(el('li',nome));
     cartao.append(lista);
   }else cartao.append(el('p','Nenhuma escolha registrada.'));
   escolhasGrade.append(cartao);
 }
 escolhasAoVivo.append(escolhasGrade);
 host.append(escolhasAoVivo);
 const preparacao=secao('Participantes e composição dos grupos');const livre=d.sala.fase===0;
 const n=escolha(Array.from({length:7},(_,i)=>[i+1,(i+1)+' grupo(s)']),meta.session.group_count||4);n.disabled=!livre;campo(preparacao,'Quantidade de grupos',n);
 if(livre)preparacao.append(acao('Confirmar quantidade',async()=>{await api('configure',{group_count:Number(n.value),durations:meta.session.durations||[600,3000,600,1800,1500,600]});await atualizar();}));
 for(const pessoa of meta.people.filter(p=>p.role==='participante')){
 const atual=meta.members.find(m=>m.actor_id===pessoa.id)?.group_no;const linha=el('p');preparacao.append(linha);
 const s=escolha([['','Sem grupo'],...grupos().map(g=>[g,'Grupo '+numeroVisivel(g)])],atual);
 s.disabled=!livre;campo(linha,pessoa.name,s);const pref=d.registros.find(r=>r.bloco===-1&&r.autora===pessoa.id);if(pref)linha.append(el('span','Escolha individual: '+materiais[pref.dados[0]]));
 if(livre&&grupos().length)linha.append(acao('Guardar atribuição',async()=>{if(!s.value)throw Error('Escolha um grupo.');await api('member',{actor_id:pessoa.id,group_no:Number(s.value)});await atualizar();}));
 }
 const pares=secao('Materialidades e grupos interlocutores'),escolhas=[],destinos=[];
 for(const g of grupos()){
 const linha=el('section',undefined,'e23-panel');pares.append(linha);linha.append(el('h3','Grupo '+numeroVisivel(g)));
 const m=escolha([['','Escolher'],...Object.entries(materiais)],d.sala.materiais[g]);m.disabled=!livre;campo(linha,'Materialidade',m);escolhas.push(m);
 if(!painelAutomatico()&&grupos().length>1){const p=escolha(grupos().filter(i=>i!==g).map(i=>[i,'Grupo '+numeroVisivel(i)]),d.sala.pares[g-1]||g%grupos().length+1);p.disabled=!livre;campo(linha,'Este grupo lê a produção de',p);destinos.push(p);}
 }
 if(livre&&grupos().length)pares.append(acao(painelAutomatico()?'Guardar materialidades':'Conferir e guardar distribuição',async()=>{
 const ordem=destinos.map(p=>Number(p.value));if(escolhas.some(m=>!m.value)||new Set(ordem).size!==ordem.length)throw Error('Escolha todas as materialidades e indique um interlocutor diferente para cada grupo.');
 const resumo=grupos().map(g=>'Grupo '+numeroVisivel(g)+' · '+materiais[escolhas[g-1].value]+(ordem.length?' · lê o Grupo '+ordem[g-1]:'')).join('\n');
 if(confirm(resumo+'\nGuardar esta distribuição?')){await oficina('configurar',{materiais:Object.fromEntries(escolhas.map((m,i)=>[i+1,m.value])),pares:painelAutomatico()&&grupos().length>1?grupos().map(g=>g===1?grupos().length:g-1):ordem});await atualizar();}
 }));
 const controle=secao('Acesso, etapas e tempo');if(!meta.session.is_test)controle.append(acao(meta.session.published?'Suspender acesso':'Liberar acesso às participantes',async()=>{if(confirm('Confirmar a mudança de acesso desta sessão?')){await api('publish',{published:!meta.session.published});await atualizar();}}));
 if(d.representacao)controle.append(el('p','Os tempos iniciam automaticamente no percurso das coordenadoras.','muted'));
 if(!d.representacao&&!painelAutomatico()&&d.sala.fase<8)controle.append(acao('Iniciar '+fases[d.sala.fase+1],async()=>{const resumo=d.sala.fase===3?'\n'+grupos().map(g=>'Grupo '+numeroVisivel(g)+' lê Grupo '+(d.sala.pares[g-1]||'—')).join('\n'):'';if(confirm('Liberar '+fases[d.sala.fase+1]+'?'+resumo)){await oficina('avancar');await atualizar();}}));
 if(d.sala.fase>=1&&d.sala.fase<=6){const out=el('output');controle.append(out);
 const tick=()=>{if(!host.isConnected){clearInterval(timer);return;}const agora=d.sala.pausa?Date.parse(d.sala.pausa):Date.parse(d.agora)+Date.now()-agoraLocal;const seg=Math.max(0,d.sala.segundos-Math.floor((agora-Date.parse(d.sala.inicio))/1000));out.textContent=(d.sala.pausa?'Pausado · ':'')+Math.floor(seg/60)+':'+String(seg%60).padStart(2,'0')+(seg?'':' · Escrita aberta');};tick();timer=setInterval(tick,1000);
 controle.append(acao(d.sala.pausa?'Retomar tempo':'Pausar tempo',async()=>{await oficina('tempo',{tipo:d.sala.pausa?'retomar':'pausar'});await atualizar();}));
 const mins=el('input');mins.type='number';mins.min='1';mins.max='240';mins.value='5';campo(controle,'Minutos adicionais',mins);controle.append(acao('Ampliar tempo',async()=>{if(!mins.checkValidity()||!Number(mins.value))throw Error('Informe entre 1 e 240 minutos.');await oficina('tempo',{delta:Number(mins.value)*60});await atualizar();}));
 }
 if(painelAutomatico()){
   secao('Conferir a proposta coletiva da Materialidade A').append(conferirPropostaM1(el, [], 'A', controleExportacaoPropostaM1(el,btn,async()=>propostasSalvasM1(await oficina(),meta.session.title))));
   secao('Conferir a proposta coletiva da Materialidade B').append(conferirPropostaM1(el, [], 'B', controleExportacaoPropostaM1(el,btn,async()=>propostasSalvasM1(await oficina(),meta.session.title,'B'),'B')));
   secao('Conferir a proposta coletiva da Materialidade C').append(conferirPropostaM1(el, [], 'C', controleExportacaoPropostaM1(el,btn,async()=>propostasSalvasM1(await oficina(),meta.session.title,'C'),'C')));
 }
 const quadro=secao('Acompanhamento dos grupos');quadro.append(el('p','Etapa atual · '+fases[d.sala.fase]));
 for(const g of (painelAutomatico()?d.grupos_ativos||[]:grupos())){const box=el('section',undefined,'e23-panel');quadro.append(box);box.append(el('h3','Grupo '+numeroVisivel(g)+' · '+(materiais[d.sala.materiais[g]]||'Materialidade a definir')));
 if(painelAutomatico()){
   const origem=d.sala.pares[g-1], destino=d.sala.pares.indexOf(g)+1;
   const propria=d.registros.some(r=>r.origem===g&&r.bloco===1&&r.finalizado);
   const recebida=d.registros.some(r=>r.origem===origem&&r.bloco===1&&r.finalizado);
   const olhar=d.registros.some(r=>r.origem===origem&&r.bloco===2&&r.finalizado);
   box.append(el('p',origem?'Recebe do Grupo '+numeroVisivel(origem)+' · Envia ao Grupo '+numeroVisivel(destino):'Aguardando a constituição de dois grupos'));
   box.append(el('p',olhar?'O olhar das colegas concluído':!propria?'Proposta inicial em elaboração':!recebida?'Aguardando a produção das colegas':'Leitura liberada · O olhar das colegas'));
 }
 if(d.registros.some(r=>r.origem===g&&r.bloco===5&&r.autora==null&&r.finalizado)){
   box.append(el('p','Percurso coletivo concluído'),acao('Consultar percurso completo do Grupo '+numeroVisivel(g),()=>{grupoTela=g;projetando=true;desenhar();}));
 }
 for(let b=1;b<=5;b++){const r=d.registros.find(r=>r.bloco===b&&r.origem===g);const ult=d.historico_coletivo.filter(h=>h.bloco===b&&h.origem===g).at(-1);box.append(el('p',blocos[b]+' · '+(ult?legenda(ult.registro)+' · v'+ult.versao:r?legenda(r):'Sem registro salvo')));}
 }
 const individuais=secao('Registros individuais · consulta privada');for(const r of d.registros.filter(r=>r.autora)){individuais.append(el('h3',meta.people.find(p=>p.id===r.autora)?.name||r.autora),el('small',legenda(r)+' · v'+r.versao),el('p',r.bloco===-1?materiais[r.dados[0]]:r.dados[0],'read'));}
 const historico=secao('Produções coletivas e histórico');for(const h of d.historico_coletivo){historico.append(el('h3',blocos[h.bloco]+' · Grupo autor '+numeroVisivel(h.grupo_autor)+' · Origem '+numeroVisivel(h.origem)),el('small','Versão '+h.versao+' · '+legenda(h.registro)+' · '+new Date(h.registrado_em).toLocaleString('pt-BR',{timeZone:'America/Bahia'})));escrever(historico,campos(d,h.bloco,h.origem,h.registro));if(h.bloco===1&&h.registro.proposta_m1&&['A','B','C'].includes(d.sala.materiais[h.origem]))historico.append(exportarProposta(h.origem,h.registro.dados));}
 const ref=secao('Referencial da Coordenação Pedagógica de Barrocas');for(const h of d.historico_coletivo.filter(h=>h.bloco===5&&h.registro.finalizado)){ref.append(el('h3','Grupo '+numeroVisivel(h.origem)+' · Versão '+h.versao),el('p',h.registro.dados[0],'read'));}
 host.append(acao('Abrir plenária',async()=>{projetando=true;try{await atualizar();}catch(e){projetando=false;throw e;}}),acao('Exportar registros privados (JSON)',async()=>{await atualizar();const url=URL.createObjectURL(new Blob([JSON.stringify(exportacao(d,meta),null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='Por-Escrito-E23-'+sid+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}));
 }
 function escrever(box,itens){for(const [q,r] of itens)box.append(el('h4',q),el('p',r||'','read'));}
 function exportarProposta(grupo,respostas){
   const codigo=d.sala.materiais[grupo];
   const botao=acao('Gerar esquema em PDF',()=>imprimirPropostaM1({grupo:numeroVisivel(grupo),respostas,tituloEncontro:meta.session.title,codigo,preliminar:codigo==='B'&&!respostas[3]?.trim()}));
   if(codigo==='C'&&(respostas.length!==4||!respostas.every(texto=>texto?.trim())))botao.disabled=true;
   return botao;
 }
 function plenaria(){host.append(el('h2','Plenária · E2–E3 integrados'));const sel=escolha(grupos().map(g=>[g,'Grupo '+numeroVisivel(g)]),grupoTela);campo(host,'Apresentar',sel);sel.onchange=()=>{grupoTela=Number(sel.value);desenhar();};
 const etapas=percursoCompleto(d,grupoTela,conteudoOficina);
 host.append(el('h3',materiais[d.sala.materiais[grupoTela]]||'Materialidade a definir'),mostrarPercursoCompleto(el,etapas));
 if(etapas.length)host.append(acao('Gerar registro completo em PDF',()=>imprimirPropostaM1({grupo:numeroVisivel(grupoTela),codigo:d.sala.materiais[grupoTela],tituloEncontro:meta.session.title,etapas})));
 const proposta=d.historico_coletivo.filter(h=>h.origem===grupoTela&&h.bloco===1&&h.registro.finalizado&&h.registro.proposta_m1).at(-1);
 if(proposta&&['A','B','C'].includes(d.sala.materiais[grupoTela]))host.append(exportarProposta(grupoTela,proposta.registro.dados));
 host.append(acao('Exportar plenária em PDF',()=>window.print()));
 host.append(acao('Voltar à consulta privada',()=>{projetando=false;desenhar();}));}
 await listar(true);
}

