const titulo='E2–E3 integrados · 25/11/2026 · 13h30 às 17h';
const fases=['Preparação','Meu olhar','Nossos olhares','Intervalo','Outros olhares','Respostas e retomada','Contribuição ao Referencial','Plenária','Carta de Percurso'];
const blocos=['Meu olhar','Assim pensamos inicialmente','O olhar das colegas','Dialogamos com as colegas','Revisitamos nossa análise','Nossa contribuição para o Referencial'];
const materiais={A:'Planejamento semanal do Grupo 5',B:'Três atividades em análise: o olhar da coordenação pedagógica',C:'Resultados municipais do CNCA — Ciclo III de 2026'};
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
 const perguntas=b===1?d.perguntas[d.sala.materiais[g]]:b===2?['Contribuição das colegas','Pergunta 1','Pergunta 2']:null;
 return p.dados.map((texto,i)=>[perguntas?.[i]||blocos[b]||'Escolha da materialidade',texto]);
}
export function exportacao(d,m){
 const pessoas=new Map(m.people.map(p=>[p.id,p.name]));
 return {sessao:m.session.title,identificador:m.session.id,exportado_em:d.agora,oficina:d.sala,perguntas:d.perguntas,materialidades:materiais,
  registros:d.registros.map(r=>({...r,autora_nome:pessoas.get(r.autora),movimento:r.bloco===-1?'Escolha':blocos[r.bloco],materialidade:r.bloco===-1?r.dados[0]:d.sala.materiais[r.origem]})),
  historico_coletivo:d.historico_coletivo.map(h=>({...h,movimento:blocos[h.bloco],materialidade:d.sala.materiais[h.origem]}))};
}
export async function abrir({host,chamar,el,btn}){
 let sid,meta,d,ocupado=false,projetando=false,grupoTela=1,agoraLocal,timer,secaoAberta=new Set();
 const api=(acao,p={})=>chamar('e23_api',{p_action:acao,p_payload:{...(sid?{session_id:sid}:{}),...p}});
 const oficina=(acao='ler',p={})=>chamar('oficina_integrada',{p_sid:sid,p_acao:acao,p});
 const acao=(txt,fn)=>btn(txt,async()=>{if(ocupado)return;ocupado=true;try{await fn();}finally{ocupado=false;}});
 const grupos=()=>Array.from({length:meta.session.group_count||0},(_,i)=>i+1);
 function escolha(items,val){const s=el('select');for(const [k,t] of items){const o=el('option',t);o.value=k;s.append(o);}s.value=String(val??'');return s;}
 function campo(box,label,elem){const l=el('label',label+' ');l.append(elem);box.append(l);}
 function secao(t){const box=el('details',undefined,'card');box.open=secaoAberta.has(t);box.append(el('summary',t));box.ontoggle=()=>{if(box.isConnected){if(box.open)secaoAberta.add(t);else secaoAberta.delete(t);}};host.append(box);return box;}
 async function listar(){
 const l=await api('sessions');if(l.actor?.role!=='pesquisadora')throw Error('Acesso reservado à pesquisadora.');
 host.replaceChildren(el('h2','E2–E3 integrados'));const oficiais=l.sessions.filter(s=>!s.is_test);
 for(const s of oficiais)host.append(acao(s.title+' · '+(s.published?'Liberada':'Fechada'),()=>entrar(s.id)));
 if(!oficiais.some(s=>s.title===titulo))host.append(acao('Criar sessão fechada de 25/11/2026',async()=>{const sessao=await api('create_session',{title:titulo,is_test:false});await entrar(sessao.id);}));
 }
 async function entrar(id){sid=id;await atualizar();}
 async function atualizar(){[meta,d]=await Promise.all([api('load'),oficina()]);agoraLocal=Date.now();desenhar();}
 function desenhar(){
 clearInterval(timer);host.replaceChildren();if(projetando){plenaria();return;}
 host.append(el('h2','E2–E3 integrados'),el('p',meta.session.title),el('p',(meta.session.published?'Acesso liberado':'Acesso fechado')+' · '+fases[d.sala.fase],'notice'));
 host.append(acao('Atualizar acompanhamento',atualizar),acao('Escolher sessão',listar));
 const preparacao=secao('Participantes e composição dos grupos');const livre=d.sala.fase===0;
 const n=escolha(Array.from({length:7},(_,i)=>[i+1,(i+1)+' grupo(s)']),meta.session.group_count||4);n.disabled=!livre;campo(preparacao,'Quantidade de grupos',n);
 if(livre)preparacao.append(acao('Confirmar quantidade',async()=>{await api('configure',{group_count:Number(n.value),durations:meta.session.durations||[600,3000,600,1800,1500,600]});await atualizar();}));
 for(const pessoa of meta.people.filter(p=>p.role==='participante')){
 const atual=meta.members.find(m=>m.actor_id===pessoa.id)?.group_no;const linha=el('p');preparacao.append(linha);
 const s=escolha([['','Sem grupo'],...grupos().map(g=>[g,'Grupo '+g])],atual);
 s.disabled=!livre;campo(linha,pessoa.name,s);const pref=d.registros.find(r=>r.bloco===-1&&r.autora===pessoa.id);if(pref)linha.append(el('span','Escolha individual: '+materiais[pref.dados[0]]));
 if(livre&&grupos().length)linha.append(acao('Guardar atribuição',async()=>{if(!s.value)throw Error('Escolha um grupo.');await api('member',{actor_id:pessoa.id,group_no:Number(s.value)});await atualizar();}));
 }
 const pares=secao('Materialidades e grupos interlocutores'),escolhas=[],destinos=[];
 for(const g of grupos()){
 const linha=el('section',undefined,'e23-panel');pares.append(linha);linha.append(el('h3','Grupo '+g));
 const m=escolha([['','Escolher'],...Object.entries(materiais)],d.sala.materiais[g]);m.disabled=!livre;campo(linha,'Materialidade',m);escolhas.push(m);
 if(grupos().length>1){const p=escolha(grupos().filter(i=>i!==g).map(i=>[i,'Grupo '+i]),d.sala.pares[g-1]||g%grupos().length+1);p.disabled=!livre;campo(linha,'Este grupo lê a produção de',p);destinos.push(p);}
 }
 if(livre&&grupos().length)pares.append(acao('Conferir e guardar distribuição',async()=>{
 const ordem=destinos.map(p=>Number(p.value));if(escolhas.some(m=>!m.value)||new Set(ordem).size!==ordem.length)throw Error('Escolha todas as materialidades e indique um interlocutor diferente para cada grupo.');
 const resumo=grupos().map(g=>'Grupo '+g+' · '+materiais[escolhas[g-1].value]+(ordem.length?' · lê o Grupo '+ordem[g-1]:'')).join('\n');
 if(confirm(resumo+'\nGuardar esta distribuição?')){await oficina('configurar',{materiais:Object.fromEntries(escolhas.map((m,i)=>[i+1,m.value])),pares:ordem});await atualizar();}
 }));
 const controle=secao('Acesso, etapas e tempo');controle.append(acao(meta.session.published?'Suspender acesso':'Liberar acesso às participantes',async()=>{if(confirm('Confirmar a mudança de acesso desta sessão?')){await api('publish',{published:!meta.session.published});await atualizar();}}));
 if(d.sala.fase<8)controle.append(acao('Iniciar '+fases[d.sala.fase+1],async()=>{const resumo=d.sala.fase===3?'\n'+grupos().map(g=>'Grupo '+g+' lê Grupo '+(d.sala.pares[g-1]||'—')).join('\n'):'';if(confirm('Liberar '+fases[d.sala.fase+1]+'?'+resumo)){await oficina('avancar');await atualizar();}}));
 if(d.sala.fase>=1&&d.sala.fase<=6){const out=el('output');controle.append(out);
 const tick=()=>{if(!host.isConnected){clearInterval(timer);return;}const agora=d.sala.pausa?Date.parse(d.sala.pausa):Date.parse(d.agora)+Date.now()-agoraLocal;const seg=Math.max(0,d.sala.segundos-Math.floor((agora-Date.parse(d.sala.inicio))/1000));out.textContent=(d.sala.pausa?'Pausado · ':'')+Math.floor(seg/60)+':'+String(seg%60).padStart(2,'0')+(seg?'':' · Escrita aberta');};tick();timer=setInterval(tick,1000);
 controle.append(acao(d.sala.pausa?'Retomar tempo':'Pausar tempo',async()=>{await oficina('tempo',{tipo:d.sala.pausa?'retomar':'pausar'});await atualizar();}));
 const mins=el('input');mins.type='number';mins.min='1';mins.max='240';mins.value='5';campo(controle,'Minutos adicionais',mins);controle.append(acao('Ampliar tempo',async()=>{if(!mins.checkValidity()||!Number(mins.value))throw Error('Informe entre 1 e 240 minutos.');await oficina('tempo',{delta:Number(mins.value)*60});await atualizar();}));
 }
 const quadro=secao('Acompanhamento dos grupos');quadro.append(el('p','Etapa atual · '+fases[d.sala.fase]));
 for(const g of grupos()){const box=el('section',undefined,'e23-panel');quadro.append(box);box.append(el('h3','Grupo '+g+' · '+(materiais[d.sala.materiais[g]]||'Materialidade a definir')));
 for(let b=1;b<=5;b++){const r=d.registros.find(r=>r.bloco===b&&r.origem===g);const ult=d.historico_coletivo.filter(h=>h.bloco===b&&h.origem===g).at(-1);box.append(el('p',blocos[b]+' · '+(ult?legenda(ult.registro)+' · v'+ult.versao:r?legenda(r):'Sem registro salvo')));}
 }
 const individuais=secao('Registros individuais · consulta privada');for(const r of d.registros.filter(r=>r.autora)){individuais.append(el('h3',meta.people.find(p=>p.id===r.autora)?.name||r.autora),el('small',legenda(r)+' · v'+r.versao),el('p',r.bloco===-1?materiais[r.dados[0]]:r.dados[0],'read'));}
 const historico=secao('Produções coletivas e histórico');for(const h of d.historico_coletivo){historico.append(el('h3',blocos[h.bloco]+' · Grupo autor '+h.grupo_autor+' · Origem '+h.origem),el('small','Versão '+h.versao+' · '+legenda(h.registro)+' · '+new Date(h.registrado_em).toLocaleString('pt-BR',{timeZone:'America/Bahia'})));escrever(historico,campos(d,h.bloco,h.origem,h.registro));}
 const ref=secao('Referencial da Coordenação Pedagógica de Barrocas');for(const h of d.historico_coletivo.filter(h=>h.bloco===5&&h.registro.finalizado)){ref.append(el('h3','Grupo '+h.origem+' · Versão '+h.versao),el('p',h.registro.dados[0],'read'));}
 host.append(acao('Abrir plenária',async()=>{projetando=true;try{await atualizar();}catch(e){projetando=false;throw e;}}),acao('Exportar registros privados (JSON)',async()=>{await atualizar();const url=URL.createObjectURL(new Blob([JSON.stringify(exportacao(d,meta),null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='Por-Escrito-E23-'+sid+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}));
 }
 function escrever(box,itens){for(const [q,r] of itens)box.append(el('h4',q),el('p',r||'','read'));}
 function plenaria(){host.append(el('h2','Plenária · E2–E3 integrados'));const sel=escolha(grupos().map(g=>[g,'Grupo '+g]),grupoTela);campo(host,'Apresentar',sel);sel.onchange=()=>{grupoTela=Number(sel.value);desenhar();};
 host.append(el('h3',materiais[d.sala.materiais[grupoTela]]||'Materialidade a definir'));for(const b of projecao(d,grupoTela)){const box=el('section',undefined,'card');host.append(box);box.append(el('h3',blocos[b.bloco]));for(const v of b.versoes){box.append(el('small','Grupo '+v.grupo+' · Versão '+v.versao));escrever(box,v.campos);}}
 host.append(acao('Voltar à consulta privada',()=>{projetando=false;desenhar();}));}
 await listar();
}
