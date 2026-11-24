const nomes=['Escolha da materialidade','Meu olhar','Nossos olhares','Intervalo','Outros olhares','Dialogamos com as colegas','Nossa contribuição para o Referencial','Plenária','Carta de Percurso'];
const titulos=['Meu olhar','Assim pensamos inicialmente','O olhar das colegas','Dialogamos com as colegas','Revisitamos nossa análise','Nossa contribuição para o Referencial'];
const codigos=['A','B','C'];
let carregandoConteudo;
function conteudo(){
 if(!carregandoConteudo)carregandoConteudo=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='./e23-conteudo.js';
   script.onload=()=>resolve(E23_CONTEUDO);
   script.onerror=()=>{carregandoConteudo=null;reject(Error('Perguntas indisponíveis.'));};document.head.append(script);
 });
 return carregandoConteudo;
}
export async function abrir({host,rpc,chave,el,onDirty}){
 const device=crypto.randomUUID();
 const api=(acao,p={})=>rpc('e23_api',{p_token:chave,p_action:acao,p_payload:{session_id:sid,device,...p}});
 const oficina=(acao='ler',p={})=>rpc('oficina_integrada',{p_token:chave,p_sid:sid,p_acao:acao,p:{...p,device}});
 let sid=null,sala,meta,c,edit=null,versaoPerguntas=null,ultimo,operando=false;
 const ativos=new Set(),limpezas=new Set();
 const indicador=el('p','','e23-status');indicador.setAttribute('role','status');
 function botao(texto,fn){const b=el('button',texto);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){indicador.textContent='Erro: '+e.message;}finally{b.disabled=false;}};return b;}
 const lista=await api('sessions');
 if(lista.actor?.role!=='participante')throw Error('Este percurso requer o acesso individual de uma coordenadora.');
 const sessoes=lista.sessions.filter(x=>lista.actor.is_test?x.is_test&&x.id===lista.actor.session_id:x.published&&!x.is_test);
 if(!sessoes.length){host.replaceChildren(el('h2','E2–E3 integrados'),el('p','O encontro será disponibilizado pela pesquisadora.'));return;}
 async function iniciar(id){sid=id;[sala,meta]=await Promise.all([oficina(),api('load')]);c=await conteudo();if(!host.isConnected)return;draw();monitorar();}
 if(sessoes.length===1)await iniciar(sessoes[0].id);
 else{host.replaceChildren(el('h2','E2–E3 integrados'),indicador);for(const s of sessoes)host.append(botao(s.title,()=>iniciar(s.id)));}
 function assinatura(s){return JSON.stringify([s.sala,s.grupo,s.registros,s.historico_coletivo]);}
 function monitorar(){
 const timer=setInterval(async()=>{
   if(!host.isConnected){clearInterval(timer);for(const stop of limpezas)stop();return;}
   if(operando)return;
   const anterior=ultimo;
   try{const novo=await oficina();if(!host.isConnected||operando||anterior!==ultimo)return;
    if(assinatura(novo)!==ultimo&&!ativos.size){meta=await api('load');if(ativos.size||!host.isConnected)return;sala=novo;edit=null;versaoPerguntas=null;draw();}
   }catch(e){if(/reservado|inválido|ACESSO/i.test(e.message)){clearInterval(timer);host.replaceChildren(el('p','Acesso à oficina encerrado.'));}else indicador.textContent='Erro de conexão ao atualizar a oficina.';}
 },4000);
 }
 function historico(o,b){return (sala.historico_coletivo||[]).filter(h=>h.origem===o&&h.bloco===b).sort((a,b)=>a.versao-b.versao);}
 function registro(o,b){return sala.registros.find(r=>r.origem===o&&r.bloco===b);}
 function material(o,box){
 const codigo=sala.sala.materiais[o],m=c.materiais[codigos.indexOf(codigo)];
 if(!m)return null;
 box.append(el('h3',m.titulo),el('p',m.contexto,'e23-context'));
 const arquivos=(meta.files||[]).filter(f=>f.material_code===codigo&&meta.materials?.some(v=>v.code===codigo&&v.status==='conferido'));
 if(!arquivos.length)box.append(el('p','Arquivo em preparação.','muted'));
 for(const f of arquivos)box.append(botao('Abrir '+f.name,async()=>{
  const r=await fetch('https://zpsjuxusydfbptjotyxo.supabase.co/functions/v1/por-escrito-e23-files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:chave,session_id:sid,file_id:f.id})});if(!r.ok)throw Error('Arquivo indisponível.');const {url}=await r.json();if(!/^https:\/\//.test(url))throw Error('Arquivo indisponível.');
  let frame=box.querySelector('iframe');if(!frame){frame=el('iframe');frame.className='e23-source';frame.referrerPolicy='no-referrer';box.append(frame);}frame.title=f.name;frame.src=url;
  const a=el('a','Abrir em outra aba');a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);
 }));
 return m;
 }
 let etapaVisivel, faseAnterior, destino, navegacao;
 const liberacao=[2,4,5,5,6];
 const orientacoes=['Leiam a materialidade e registrem juntos o que observam.','Leiam a análise do grupo parceiro e preparem a interlocução.','Leiam as perguntas recebidas e construam as respostas do grupo.','Retomem a análise inicial à luz da conversa com as colegas.','Registrem o que o grupo considera importante para o Referencial.'];
 function draw(){
 for(const stop of limpezas)stop();limpezas.clear();
 ultimo=assinatura(sala);const f=sala.sala.fase,g=sala.grupo;
 destino=host;
 navegacao=null;
 if(f!==faseAnterior){etapaVisivel=({2:1,3:1,4:2,5:3,6:5,7:5,8:5})[f];faseAnterior=f;}
 if(edit)etapaVisivel=edit.b;
 const orientacao=el('p',etapaVisivel?orientacoes[etapaVisivel-1]:f===1?'Leia a materialidade e registre individualmente o que chama sua atenção.':c.introducao,'e23-context');
 const faixa=el('div',undefined,'oficina-faixa');
 const materialGrupo=c.materiais[codigos.indexOf(sala.sala.materiais[g])];
 if(g)faixa.append(el('strong','Grupo '+g+(materialGrupo?' · '+materialGrupo.titulo:'')));
 host.replaceChildren(el('h2','E2–E3 integrados'),orientacao,faixa,indicador);
 if(f>0&&f<7){
 const out=el('output');const origem=Date.now(),servidor=Date.parse(sala.agora);
 const tick=()=>{const instante=sala.sala.pausa?Date.parse(sala.sala.pausa):servidor+Date.now()-origem;
 const n=Math.max(0,sala.sala.segundos-Math.floor((instante-Date.parse(sala.sala.inicio))/1000));
 out.textContent=(sala.sala.pausa?'Pausado · ':'')+Math.floor(n/60)+':'+String(n%60).padStart(2,'0')+(n===0?' · A escrita continua aberta.':'');};
 tick();faixa.append(out);const t=setInterval(tick,1000);limpezas.add(()=>clearInterval(t));
 }
 if(f===0){
 const box=el('section',undefined,'e23-materials');host.append(box);
 for(const [i,m] of c.materiais.entries()){const card=el('article',undefined,'e23-material');card.append(el('h3',m.titulo),el('p',m.contexto));
 if(codigos[i]==='C'&&!meta.materials?.some(v=>v.code==='C'&&v.status==='conferido')){card.append(el('p','Resultados municipais do Ciclo III em preparação.'));box.append(card);continue;}
 const escolhida=registro(0,-1)?.dados[0]===codigos[i];
 card.append(botao(escolhida?'Escolhida':'Escolher esta materialidade',async()=>{if(operando)return;operando=true;indicador.textContent='Salvando';try{sala=await oficina('salvar',{bloco:-1,versao:registro(0,-1)?.versao||0,dados:[codigos[i]]});indicador.textContent='Salvo';draw();}catch(e){indicador.textContent=erro(e);}finally{operando=false;}}));box.append(card);}return;
 }
 if(!g){host.append(el('p','Aguardando a organização dos grupos pela pesquisadora.'));return;}
 const parceiro=sala.sala.pares[g-1];
 const o=f===4?parceiro:g;
 const consulta=el('section',undefined,'oficina-consulta');
 const escrever=el('section',undefined,'oficina-escrita');
 const areas=el('div',undefined,'oficina-areas');
 areas.append(consulta,escrever);
 if(f>=2){
   navegacao=el('nav',undefined,'oficina-etapas');
   navegacao.setAttribute('aria-label','Etapas da escrita coletiva');
   host.append(navegacao);
   for(let i=1;i<=5;i++){
     const icones=['▤','♧','☏','↻','☆'];
     const concluida=registro(i===2?parceiro:g,i)?.finalizado;
     const estado=concluida?'Concluída':f<liberacao[i-1]?'Aguarda liberação':f===liberacao[i-1]?'Em andamento':'Disponível';
     const aba=botao(icones[i-1]+' '+i+'. '+titulos[i],()=>{if(ativos.size)return;edit=null;etapaVisivel=i;draw();});
     aba.append(el('small',estado));
     aba.disabled=f<liberacao[i-1]||!!ativos.size;
     aba.setAttribute('aria-pressed',String(i===etapaVisivel));
     navegacao.append(aba);
   }
 }
 host.append(areas);
 consulta.append(el('h3','Materialidade em consulta'));
 if(o)material(o,consulta);
 destino=escrever;
 if(f===1)bloco(g,0,[c.individual],true);
 if(f>=2){
 if(o)bloco(o,1,c.materiais[codigos.indexOf(sala.sala.materiais[o])]?.questoes||[],f===2);
 if(f>=4&&o)bloco(o,2,[...c.interlocucao,'Segunda pergunta (opcional)'],f===4&&!!registro(o,1)?.finalizado);
 if(f>=5){
 const origem=registro(g,2);
 if(origem?.finalizado){
 const opcoes=historico(g,2).filter(h=>h.registro.finalizado&&h.registro.posterior);
 const resposta=registro(g,3);const vinculo=historico(g,3).find(h=>h.versao===resposta?.versao)?.registro;
 const maisRecente=edit?.b===3?historico(g,3).at(-1)?.registro:vinculo;
 const versao=versaoPerguntas??maisRecente?.versao_da_interlocucao??origem.versao;
 if(opcoes.length&&(!resposta?.finalizado||edit?.b===3)){const l=el('label','Versão da interlocução');const select=el('select');for(const v of [origem.versao,...opcoes.map(h=>h.versao)]){const opt=el('option','Versão '+v);opt.value=v;select.append(opt);}select.value=versao;select.onchange=()=>{if(ativos.size){select.value=versao;return;}versaoPerguntas=Number(select.value);draw();};l.append(select);if(etapaVisivel===3)destino.append(l);}
 const dados=opcoes.find(h=>h.versao===versao)?.registro.dados||origem.dados;
 bloco(g,3,dados.slice(1).filter(q=>q.trim()),f===5,versao);
 }else if(etapaVisivel===3)destino.append(el('p','Aguardando a interlocução finalizada das colegas.'));
 bloco(g,4,[c.retomada],f===5);
 }
 if(f>=6)bloco(g,5,[c.referencial],f===6);
 if(f>=7)host.append(el('p',c.plenaria));
 if(f===8){const a=el('a','Abrir minha Carta de Percurso');a.href='carta.html';host.append(a);}
 if(f===3)host.append(el('p','O trabalho será retomado após o intervalo.'));
 if(f===4&&!registro(o,1)?.finalizado)host.append(el('p','Aguardando a análise finalizada do grupo parceiro.'));
 // A interlocutora pode revisar sua própria devolutiva após voltar ao grupo de origem.
 if(f>4&&parceiro&&registro(parceiro,2)?.finalizado)bloco(parceiro,2,[...c.interlocucao,'Segunda pergunta (opcional)'],false);
 }
 }
 function erro(e){return /Versão|atualizad|OUTRA_PESSOA|ASSUMA_A_ESCRITA|duplicate/i.test(e.message)?'Alterado em outro dispositivo':('Erro: '+e.message);}
 function bloco(o,b,perguntas,aberto,vPerg){
 const r=registro(o,b),hist=historico(o,b),g=sala.grupo;
 const autor=b===2?sala.sala.pares[g-1]===o:g===o;
 const revisando=edit?.o===o&&edit?.b===b;
 if(navegacao&&b!==etapaVisivel&&!(b===1&&o!==g&&etapaVisivel===2))return;
 const sec=el('section',undefined,'card e23-panel');
 const leituraParceira=b===1&&o!==g&&etapaVisivel===2;
 (leituraParceira?destino.previousElementSibling:destino).append(sec);sec.append(el('h3',titulos[b]),el('p',b===0?'Registro individual privado':'Produção vinculada ao grupo '+o,'muted'));
 const editar=autor&&(revisando||(aberto&&!r?.finalizado));
 const anterior=revisando?hist.at(-1):null;
 const baseResposta=anterior?.registro||hist.find(h=>h.versao===r?.versao)?.registro;
 const valores=b===3&&baseResposta?.versao_da_interlocucao!==undefined&&vPerg!==baseResposta.versao_da_interlocucao?perguntas.map(q=>baseResposta.perguntas_e_respostas?.find(par=>par.pergunta===q)?.resposta||''):anterior?.registro.dados||r?.dados||[];
 let versao=anterior?.versao??r?.versao??0, timer, emCurso=false,seq=0,conflito=false;
 const fields=[];const st=el('p',editar&&r?'Salvo':'','e23-status');st.setAttribute('role','status');
 const bloquear=()=>navegacao?.querySelectorAll('button').forEach((aba,i)=>aba.disabled=!!ativos.size||sala.sala.fase<liberacao[i]);
 const marcar=()=>{ativos.add(sec);onDirty(true);bloquear();};const limpar=()=>{ativos.delete(sec);onDirty(ativos.size>0);bloquear();};
 const questoes=[];
 for(const [i,q] of perguntas.entries()){const l=el('label',q,'e23-question');if(editar){const campo=el('textarea');campo.value=valores[i]||'';campo.oninput=()=>{seq++;marcar();st.textContent='Alteração pendente';clearTimeout(timer);if(!conflito)timer=setTimeout(()=>salvar(false),900);};fields.push(campo);l.append(campo);}else l.append(el('p',valores[i]||'Aguardando registro.','read'));questoes.push(l);sec.append(l);}
 if(b===1&&editar&&questoes.length>1){
   let atual=0;
   const pos=el('span');
   const anterior=botao('Pergunta anterior',()=>{if(atual>0)atual--;mostrar();});
   const proxima=botao('Próxima pergunta',()=>{if(atual<questoes.length-1)atual++;mostrar();});
   const mostrar=()=>{questoes.forEach((q,i)=>q.hidden=i!==atual);pos.textContent=(atual+1)+' de '+questoes.length;anterior.disabled=atual===0;proxima.disabled=atual===questoes.length-1;};
   const controles=el('div',undefined,'oficina-paginacao');controles.append(anterior,pos,proxima);sec.append(controles);mostrar();
 }

 async function salvar(final){
 clearTimeout(timer);if(emCurso||conflito||!sec.isConnected)return;
 if(final&&ativos.size>Number(ativos.has(sec))){st.textContent='Aguarde o salvamento do outro bloco.';return;}
 emCurso=true;const antes=seq;const dados=fields.map(x=>x.value);st.textContent='Salvando';marcar();if(final)fields.forEach(x=>x.readOnly=true);
 try{
 if(b>0)await api('claim_writer');
 const novo=await oficina(revisando?'revisar':'salvar',{bloco:b,dados,versao,final,...(vPerg!=null?{versao_interlocucao:vPerg}:{})});
 versao++;sala=novo;ultimo=assinatura(novo);
 if(antes===seq){limpar();st.textContent='Salvo';}else{st.textContent='Alteração pendente';timer=setTimeout(()=>salvar(false),300);}
 if(final&&host.isConnected){edit=null;indicador.textContent='Salvo';draw();}
 }catch(e){st.textContent=erro(e);conflito=st.textContent==='Alterado em outro dispositivo';if(conflito){recuperar.hidden=false;}fields.forEach(x=>x.readOnly=false);}
 finally{emCurso=false;}
 }
 const recuperar=botao('Consultar versão do servidor',async()=>{const novo=await oficina();if(!confirm('Substituir o texto desta tela pela versão do servidor?'))return;limpar();sala=novo;draw();});recuperar.hidden=true;
 if(editar){sec.append(st,botao('Salvar rascunho',()=>salvar(false)),botao('Salvar e finalizar',async()=>{while(emCurso)await new Promise(resolve=>setTimeout(resolve,50));await salvar(true);}),recuperar);limpezas.add(()=>clearTimeout(timer));}
 if(hist.length){const d=el('details');d.append(el('summary','Histórico autorizado'));for(const h of hist){d.append(el('h4','Versão '+h.versao+' · Grupo '+h.grupo_autor+' · '+(h.registro.finalizado?'Finalizada':'Rascunho')),el('small',new Date(h.registrado_em).toLocaleString('pt-BR')));
 if(h.registro.perguntas_e_respostas)for(const v of h.registro.perguntas_e_respostas)d.append(el('p',v.pergunta),el('p',v.resposta||'','read'));else for(const v of h.registro.dados)d.append(el('p',v,'read'));}sec.append(d);}
 if(autor&&b>0&&r?.finalizado&&!revisando)sec.append(botao('Iniciar revisão',()=>{if(ativos.size){st.textContent='Salve as alterações em andamento.';indicador.textContent=st.textContent;return;}edit={o,b};draw();}));
 }
}

