import { baixarRegistroPDF } from './e23-registro-pdf.js';
import { esquemaPlenaria, mostrarEsquema, baixarPowerPoint } from './e23-plenaria.js';
import { percursoCompleto, mostrarPercursoCompleto, orientacaoPlenaria } from './e23-fechamento.js?v=percurso-por-etapa';
import { consultasColegas, esperaColegas, orientacaoColegas, perguntasColegas } from './e23-circulacao.js';
import { imprimirPropostaM1 } from './e23-proposta-pdf.js?v=fechamento';
import { orientacaoPropostaM1, perguntasDaProposta, tituloPropostaM1, tituloMaterialidadeC } from './e23-proposta-m1.js?v=materialidade-c-questoes';
import { perguntaIndividual } from './e23-perguntas-individuais.js';
const nomes=['Escolha da materialidade','Meu olhar','Nossos olhares','Intervalo','Outros olhares','Dialogamos com as colegas','Nossa contribuição para o Referencial','Plenária','Encerramento'];
const titulos=['Meu olhar','Assim pensamos inicialmente','O olhar das colegas','Dialogamos com as colegas','Revisitamos nossa análise','Nossa contribuição para o Referencial'];
const codigos=['A','B','C'];
let carregandoConteudo;
export function conteudo(){
 if(!carregandoConteudo)carregandoConteudo=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='./e23-conteudo.js?v=fechamento';
   script.onload=()=>resolve(E23_CONTEUDO);
   script.onerror=()=>{carregandoConteudo=null;reject(Error('Perguntas indisponíveis.'));};document.head.append(script);
 });
 return carregandoConteudo;
}
export async function abrir({host,rpc,chave,el,onDirty,voltarAoFluxo}){
 const device=crypto.randomUUID();
 const api=(acao,p={})=>rpc('e23_api',{p_token:chave,p_action:acao,p_payload:{session_id:sid,device,...p}});
 const oficina=(acao='ler',p={})=>rpc('oficina_integrada',{p_token:chave,p_sid:sid,p_acao:acao,p:{...p,device}});
 let sid=null,sala,meta,c,edit=null,versaoPerguntas=null,ultimo,operando=false;
 const ativos=new Set(),limpezas=new Set();
 const indicador=el('p','','e23-status');indicador.setAttribute('role','status');
 function botao(texto,fn){const b=el('button',texto);b.type='button';if(/^(Gerar|Salvar proposta$|Salvar rascunho$|Iniciar revisão$)/.test(texto))b.classList.add('secondary');b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){indicador.textContent='Erro: '+e.message;}finally{b.disabled=false;}};return b;}
 const lista=await api('sessions');
 if(lista.actor?.role!=='participante')throw Error('Este percurso requer o acesso individual de uma coordenadora.');
 const sessoes=lista.sessions.filter(x=>lista.actor.is_test?x.is_test&&x.id===lista.actor.session_id:x.published&&!x.is_test);
 if(!sessoes.length){host.replaceChildren(el('h2','E2–E3 integrados'),el('p','O encontro será disponibilizado pela pesquisadora.'));return;}
 let etapaVisivel, faseAnterior, destino, navegacao;
 let inicioIndividual=0, fechamento, rolar=false, consultaCompleta=false;
 const liberacao=[2,4,5,5,6];
 const orientacoes=['Leiam a materialidade e registrem juntos o que observam.','Leiam a análise do grupo parceiro e preparem a interlocução.','Leiam as perguntas recebidas e construam as respostas do grupo.','Retomem a análise inicial à luz da conversa com as colegas.','Registrem o que o grupo considera importante para o Referencial.'];
 async function iniciar(id){sid=id;[sala,meta]=await Promise.all([oficina(),api('load')]);c=await conteudo();try{inicioIndividual=Number(localStorage.getItem(chaveRelogio()))||0;}catch{}if(!host.isConnected)return;draw();monitorar();}
 if(sessoes.length===1)await iniciar(sessoes[0].id);
 else{host.replaceChildren(el('h2','E2–E3 integrados'),indicador);for(const s of sessoes)host.append(botao(s.title,()=>iniciar(s.id)));}
 const numeroVisivel = grupo => sala?.sala?.materiais?.circulacao_duas_salas ? ({4:1,3:2,1:3,2:'anterior 2'}[grupo] ?? grupo) : grupo;
 function assinatura(s){return JSON.stringify([s.sala,s.grupo,s.registros,s.historico_coletivo,s.grupos_ativos]);}
 function monitorar(){
 const timer=setInterval(async()=>{
   if(!host.isConnected){clearInterval(timer);for(const stop of limpezas)stop();return;}
   if(operando||host.querySelector('dialog[open]')||document.querySelector('iframe[data-impressao-oficina]'))return;
   const anterior=ultimo;
   try{const novo=await oficina();if(!host.isConnected||operando||anterior!==ultimo)return;
    if(assinatura(novo)!==ultimo&&!ativos.size){meta=await api('load');if(ativos.size||!host.isConnected)return;sala=novo;edit=null;versaoPerguntas=null;draw();}
   }catch(e){if(/reservado|inválido|ACESSO/i.test(e.message)){clearInterval(timer);host.replaceChildren(el('p','Acesso à oficina encerrado.'));}else indicador.textContent='Erro de conexão ao atualizar a oficina.';}
 },4000);
 }
 function historico(o,b){return (sala.historico_coletivo||[]).filter(h=>h.origem===o&&h.bloco===b).sort((a,b)=>a.versao-b.versao);}
 function registro(o,b){return sala.registros.find(r=>r.origem===o&&r.bloco===b);}
 function material(codigo,box,abrirPdf=false){
 const m=c.materiais[codigos.indexOf(codigo)];
 if(!m)return null;
 box.append(el('h3',codigo==='C'&&lista.actor.is_test?tituloMaterialidadeC:m.titulo),el('p',m.contexto,'e23-context'));
 const arquivos=(meta.files||[]).filter(f=>f.material_code===codigo&&meta.materials?.some(v=>v.code===codigo&&v.status==='conferido'));
 if(lista.actor.is_test&&codigos.includes(codigo)){
 const link=el('a','Ampliar PDF');
 link.href=codigo==='C'?'materialidades/cnca-ciclo-ii.pdf':codigo==='A'?'materialidades/planejamento-grupo-5.pdf?v=22':'materialidades/tres-atividades.pdf';link.target='_blank';link.rel='noopener noreferrer';
 const frame=el('iframe');frame.title=m.titulo;frame.src=link.href;frame.className='e23-source';
 box.append(link,frame);return m;
 }else if(!arquivos.length)box.append(el('p','Arquivo em preparação.','muted'));
 for(const [i,f] of arquivos.entries()){
 const abrir=async()=>{
  const r=await fetch('https://zpsjuxusydfbptjotyxo.supabase.co/functions/v1/por-escrito-e23-files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:chave,session_id:sid,file_id:f.id})});if(!r.ok)throw Error('Arquivo indisponível.');const {url}=await r.json();if(!/^https:\/\//.test(url))throw Error('Arquivo indisponível.');
  let frame=box.querySelector('iframe');if(!frame){frame=el('iframe');frame.className='e23-source';frame.referrerPolicy='no-referrer';box.append(frame);}frame.title=f.name;frame.src=url;
  const a=el('a','Abrir em outra aba');a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);
 };
 if(abrirPdf&&i===0){
  const estado=el('p','Carregando PDF…');estado.setAttribute('role','status');box.append(estado);
  abrir().then(()=>estado.remove()).catch(()=>{estado.textContent='Não foi possível abrir o PDF. Tente novamente.';box.append(botao('Abrir '+f.name,abrir));});
 }else box.append(botao('Abrir '+f.name,abrir));
 }
 return m;
 }
 function automatico(){return sala?.representacao===true||lista.actor.is_test&&['d79ace19-ee80-472e-8585-16784465cd6f','4020eeaf-85e5-4e83-bda1-6e5810d65686'].includes(sid);}
 function chaveRelogio(){return 'e23-relogio-individual:'+sid+':'+lista.actor.id;}
 function iniciarRelogioIndividual(faixa){
   if(!inicioIndividual){
     inicioIndividual=Date.now();
     try{localStorage.setItem(chaveRelogio(),String(inicioIndividual));}catch{}
   }
   const relogio=el('output');
   faixa.append(relogio);
   const atualizar=()=>{
     const segundos=Math.max(0,600-Math.floor(Math.max(0,Date.now()-inicioIndividual)/1000));
     relogio.textContent='Tempo da escrita individual: '+Math.floor(segundos/60)+':'+String(segundos%60).padStart(2,'0')+(segundos?'':' · A escrita continua aberta.');
   };
   atualizar();
   const timer=setInterval(atualizar,1000);
   limpezas.add(()=>clearInterval(timer));
 }
 function inicioDaEtapa(){host.scrollIntoView?.({block:'start'});}
 function abrirFechamento(g,titulo){
   const etapas=percursoCompleto(sala,g,c);
   const esquema=esquemaPlenaria(etapas);
   const codigo=sala.sala.materiais[g];
   const materialidade=codigo==='C'?tituloMaterialidadeC:c.materiais[codigos.indexOf(codigo)]?.titulo||'Materialidade do grupo';
   const powerpoint=()=>botao('Baixar apresentação em PowerPoint',()=>baixarPowerPoint({grupo:numeroVisivel(g),materialidade,esquema}));
   const sec=el('section',undefined,'card');
   if(fechamento==='plenaria'){
     titulo.replaceChildren(el('h2','Plenária · E2–E3 integrados'));
     sec.append(el('p',orientacaoPlenaria),el('h3',c.plenaria),powerpoint(),mostrarEsquema(el,esquema));
     sec.append(botao('Voltar à conclusão',()=>{fechamento='conclusao';draw();inicioDaEtapa();}));
   }else{
     titulo.replaceChildren(el('h2','Concluímos nosso percurso coletivo!'));
     sec.append(el('p','Ao longo deste percurso, analisamos, compartilhamos, dialogamos, revisitamos nossas escolhas e construímos contribuições para o Referencial da Coordenação Pedagógica de Barrocas.'));
     const leitura=mostrarPercursoCompleto(el,etapas);leitura.hidden=!consultaCompleta;
     sec.append(botao('Consultar nosso percurso completo',()=>{consultaCompleta=!consultaCompleta;leitura.hidden=!consultaCompleta;}),botao('Gerar registro completo em PDF',()=>baixarRegistroPDF({grupo:numeroVisivel(g),codigo:sala.sala.materiais[g],tituloEncontro:meta.session?.title,etapas})),powerpoint(),leitura,mostrarEsquema(el,esquema));
     sec.append(el('h3','Agora, vamos à plenária!'),el('p',orientacaoPlenaria),botao('Seguir para a plenária',()=>{fechamento='plenaria';draw();inicioDaEtapa();}));
     if(!voltarAoFluxo)sec.append(botao('Voltar aos registros coletivos',()=>{fechamento='registros';etapaVisivel=5;draw();inicioDaEtapa();}));
   }
   if(voltarAoFluxo)sec.append(botao('Voltar ao início da oficina',voltarAoFluxo));
   host.replaceChildren(titulo,indicador,sec);
 }

 function draw(){
 for(const stop of limpezas)stop();limpezas.clear();
 ultimo=assinatura(sala);const f=sala.sala.fase,g=sala.grupo;
 destino=host;
 navegacao=null;
 const primeiraAbertura=faseAnterior===undefined;
 if(f!==faseAnterior){etapaVisivel=({2:1,3:1,4:2,5:registro(g,3)?.finalizado?4:3,6:5,7:5,8:5})[f];faseAnterior=f;if(!primeiraAbertura)rolar=true;}
 if(automatico()&&g&&registro(g,1)?.finalizado&&f<5&&(primeiraAbertura||etapaVisivel!==1))etapaVisivel=2;
 if(edit)etapaVisivel=edit.b;
 const orientacao=el('p',etapaVisivel?orientacoes[etapaVisivel-1]:f===1?'Leia a materialidade e registre individualmente o que chama sua atenção.':c.introducao,'e23-context');
 const faixa=el('div',undefined,'oficina-faixa');
 const escolha=registro(0,-1)?.dados[0];
 const individual=sala.registros.find(r=>r.bloco===0);
 const m1=automatico()&&codigos.includes(escolha);
 const grupoM1=m1&&individual?.finalizado&&g&&((sala.sala.materiais[g]||'A')===escolha);
 const codigoGrupo=f===0?escolha:sala.sala.materiais[g];
 const materialGrupo=c.materiais[codigos.indexOf(codigoGrupo)];
 if(g||materialGrupo)faixa.append(el('strong',[g?'Grupo '+numeroVisivel(g):'',materialGrupo?'M'+(codigos.indexOf(codigoGrupo)+1)+' · '+materialGrupo.titulo:''].filter(Boolean).join(' · ')));
 const titulo=el('header',undefined,'oficina-titulo');
 titulo.append(el('h2','Oficina E2 – E3'),el('span','Análise de práticas para a construção do Referencial'));
 if(automatico()&&registro(g,5)?.finalizado&&fechamento!=='registros'){abrirFechamento(g,titulo);if(rolar){rolar=false;inicioDaEtapa();}return;}
 const guia=el('section',undefined,'oficina-orientacao');
 guia.append(el('h3','◎  Orientação da atividade'),orientacao);
 host.classList.add('oficina-painel');
 host.replaceChildren(titulo,guia,faixa,indicador);
 if(rolar){rolar=false;inicioDaEtapa();}
 if(sala.representacao&&f>=1&&f<=2&&individual?.finalizado){
   const aviso=el('p',f===1?'Prepare-se para entrar na sala do seu grupo no Meet. Sua escrita individual continua disponível.':'É hora de ir para a sala do seu grupo no Meet. Você pode continuar sua escrita individual.','notice');
   if(f===1){
     const contagem=el('output');const base=Date.now();const servidor=Date.parse(sala.agora);
     const atualizar=()=>{
       const agora=sala.sala.pausa?Date.parse(sala.sala.pausa):servidor+Date.now()-base;
       const restante=Math.max(0,sala.sala.segundos-Math.floor((agora-Date.parse(sala.sala.inicio))/1000));
       contagem.textContent=restante?'Ida aos grupos em '+Math.floor(restante/60)+':'+String(restante%60).padStart(2,'0'):'Hora de entrar na sala do seu grupo no Meet.';
     };
     atualizar();aviso.append(el('br'),contagem);
     const timer=setInterval(atualizar,1000);limpezas.add(()=>clearInterval(timer));
   }
   host.append(aviso);
 }
 if(sala.representacao&&individual?.finalizado&&(f<=1||!g)){
   host.append(el('h3','Espaço do grupo'),el('p',g?'Você é a representante. Compartilhe a tela no Meet quando o trabalho coletivo começar.':'Sua escrita individual foi salva. Somente a pessoa escolhida pelo grupo deve assumir o registro coletivo.'));
   if(!g)for(const grupo of sala.grupos_ativos||[]){
     if(sala.sala.materiais[grupo]!==escolha)continue;
     host.append(botao('Entrar no Grupo '+numeroVisivel(grupo),async()=>{
       sala=await oficina('entrar_grupo',{grupo});draw();inicioDaEtapa();
     }));
   }
   if(!g&&f<=2)host.append(botao('Abrir registro coletivo',async()=>{
     if(!confirm('Seu grupo escolheu você para registrar a produção coletiva?'))return;
     sala=await oficina('representar');draw();inicioDaEtapa();
   }));
   return;
 }
 if(m1&&((sala.representacao&&!individual?.finalizado&&f<=7)||f<=1||(['B','C'].includes(escolha)&&f===2&&individual?.finalizado))&&!grupoM1){
   const iniciada=!!inicioIndividual||!!individual;
   if(individual?.finalizado){
     host.append(el('h3','Espaço do grupo'),el('p','Sua escrita individual foi salva. Assim que a pesquisadora vincular você a um grupo da materialidade escolhida, a proposta coletiva abrirá aqui automaticamente.'));
     return;
   }
   if(!iniciada){
     material(escolha,host);
     host.append(botao('Iniciar minha escrita individual',()=>{inicioIndividual=Date.now();try{localStorage.setItem(chaveRelogio(),String(inicioIndividual));}catch{}draw();inicioDaEtapa();}));
     return;
   }
   titulo.replaceChildren(el('h2','Meu olhar sobre a materialidade'));
   orientacao.textContent='Leia a materialidade e escreva individualmente a sua resposta a cada pergunta.';
   iniciarRelogioIndividual(faixa);
   const areas=el('div',undefined,'oficina-areas');
   const consulta=el('section',undefined,'oficina-consulta');
   const escrita=el('section',undefined,'oficina-escrita');
   consulta.append(el('h3','Materialidade em análise'));
   material(escolha,consulta);
   areas.append(consulta,escrita);host.append(areas);
   destino=escrita;
   bloco(individual?.origem??g??0,0,c.materiais[codigos.indexOf(escolha)].questoes.map(perguntaIndividual),true);
   return;
 }
 if(grupoM1&&f<=1&&!etapaVisivel)etapaVisivel=1;
 if(f>0&&f<7){
 const out=el('output');const origem=Date.now(),servidor=Date.parse(sala.agora);
 const tick=()=>{const instante=sala.sala.pausa?Date.parse(sala.sala.pausa):servidor+Date.now()-origem;
 const n=Math.max(0,sala.sala.segundos-Math.floor((instante-Date.parse(sala.sala.inicio))/1000));
 out.textContent='Tempo da oficina: '+(sala.sala.pausa?'Pausado · ':'')+Math.floor(n/60)+':'+String(n%60).padStart(2,'0')+(n===0?' · A escrita continua aberta.':'');};
 tick();faixa.append(out);const t=setInterval(tick,1000);limpezas.add(()=>clearInterval(t));
 }
 if((f===0||sala.representacao&&f<=7&&!escolha)&&!grupoM1){
 const areas=el('div',undefined,'oficina-areas');
 const consulta=el('section',undefined,'oficina-consulta');
 const escolhaBox=el('section',undefined,'oficina-materialidades');
 const box=el('div',undefined,'e23-materials oficina-escolhas');
 consulta.append(el('h3','▤  Materialidade em análise'));
 if(escolha&&!automatico()){
   material(escolha,consulta);
   const espera=el('section',undefined,'oficina-escrita');
   espera.append(el('h3','Análise coletiva'),el('p','Aguarde a pesquisadora liberar a análise. Enquanto isso, você pode consultar a materialidade.'));
   espera.append(botao('Trocar materialidade',()=>{areas.replaceWith(escolhaBox);}));
   areas.append(consulta,espera);
   host.append(areas);
 }
 else consulta.append(el('p','Escolha uma materialidade para consultar o documento.'));
 escolhaBox.append(el('h3','Escolha da materialidade'),el('p','Consulte as três materialidades antes de escolher qual vai analisar.'),box);
 if(!escolha||automatico())host.append(escolhaBox);
 for(const [i,m] of c.materiais.entries()){const card=el('article',undefined,'e23-material');card.append(el('small','M'+(i+1)),el('h3',m.titulo));
 if(codigos[i]==='C'&&!automatico()&&!meta.materials?.some(v=>v.code==='C'&&v.status==='conferido')){card.append(el('p','Resultados municipais do Ciclo II em preparação.'));box.append(card);continue;}
 const escolhida=registro(0,-1)?.dados[0]===codigos[i];
 if(automatico()&&escolhida&&registro(0,-1)?.finalizado){
   host.replaceChildren(titulo,guia,faixa);
   material(escolha,host);
   host.append(el('p','Escolha salva. A análise individual abre quando as colegas também confirmarem a escolha.'));
   return;
 }
 card.append(botao('Ver materialidade',()=>{
   const previa=el('dialog');
   previa.setAttribute('aria-label',m.titulo);
   previa.style.cssText='width:min(94vw,1100px);max-height:90dvh;box-sizing:border-box';
   const voltar=botao('Voltar às materialidades',()=>previa.close());
   const documento=el('section');
   previa.append(voltar,documento);
   previa.addEventListener('close',()=>previa.remove(),{once:true});
   host.append(previa);
   previa.showModal();
   material(codigos[i],documento,true);
 }));
 card.append(botao(escolhida?'Escolhida':'Escolher esta materialidade',async()=>{if(operando)return;operando=true;indicador.textContent='Salvando';try{sala=await oficina('salvar',{bloco:-1,versao:registro(0,-1)?.versao||0,dados:[codigos[i]],...(automatico()?{final:true}:{})});indicador.textContent='Salvo';draw();}catch(e){indicador.textContent=erro(e);}finally{operando=false;}}));box.append(card);}return;
 }
 if(!g){host.append(el('p','Aguardando a organização dos grupos pela pesquisadora.'));return;}
 if(sala.representacao&&f>=2)host.append(botao('Passar a escrita para outra integrante',async()=>{
   if(ativos.size){indicador.textContent='Aguarde o salvamento antes de passar a escrita.';return;}
   sala=await oficina('passar_edicao');indicador.textContent='A escrita está disponível para outra integrante.';draw();
 }));
 const parceiro=sala.sala.pares[g-1];
 const circulando=automatico()&&etapaVisivel===2&&!!registro(g,1)?.finalizado;
 const o=automatico()?(circulando?parceiro:g):f===4?parceiro:g;
 const consulta=el('section',undefined,'oficina-consulta');
 const escrever=el('section',undefined,'oficina-escrita');
 const areas=el('div',undefined,'oficina-areas');
 areas.append(consulta,escrever);
 if(f>=2||grupoM1){
   navegacao=el('nav',undefined,'oficina-etapas');
   navegacao.setAttribute('aria-label','Etapas da escrita coletiva');
   host.append(navegacao);
   for(let i=1;i<=5;i++){
     const icones=['▤','♧','☏','↻','☆'];
     const concluida=registro(i===2?parceiro:g,i)?.finalizado;
     const disponivel=f>=liberacao[i-1]||(i===1&&grupoM1)||(i===2&&automatico()&&!!registro(g,1)?.finalizado);
     const estado=concluida?'Concluída':!disponivel?'Aguarda liberação':f===liberacao[i-1]?'Em andamento':'Disponível';
     const aba=botao(icones[i-1]+' '+i+'. '+titulos[i],()=>{if(ativos.size)return;edit=null;etapaVisivel=i;draw();inicioDaEtapa();});
     aba.append(el('small',estado));
     aba.disabled=!disponivel||!!ativos.size;
     aba.setAttribute('aria-pressed',String(i===etapaVisivel));
     navegacao.append(aba);
   }
 }
 host.append(areas);
 if(automatico()&&etapaVisivel>=2)consulta.append(consultasColegas(el,sala.sala.materiais[g],sala.sala.materiais[parceiro]));
 if(automatico()&&etapaVisivel>=2){
   for(const [grupo,rotulo] of [[g,'Gerar nosso esquema em PDF'],[parceiro,'Gerar esquema das colegas em PDF']]){
     const proposta=registro(grupo,1);
     if(!proposta?.finalizado||!historico(grupo,1).some(h=>h.versao===proposta.versao&&h.registro.proposta_m1))continue;
     consulta.append(botao(rotulo,()=>imprimirPropostaM1({
       grupo:numeroVisivel(grupo),respostas:proposta.dados,codigo:sala.sala.materiais[grupo],tituloEncontro:meta.session?.title
     })));
   }
 }
 if(circulando){
   titulo.replaceChildren(el('h2','O olhar das colegas'));
   orientacao.textContent=orientacaoColegas;
   const codigo=sala.sala.materiais[parceiro];
   const origem=c.materiais[codigos.indexOf(codigo)];
   const recebida=registro(parceiro,1);
   consulta.append(el('h3','Grupo leitor · '+numeroVisivel(g)));
   if(parceiro)consulta.append(el('p','Proposta do Grupo '+numeroVisivel(parceiro)+' · '+(codigo==='C'?tituloMaterialidadeC:origem?.titulo||'Materialidade a definir')));
   if(!recebida?.finalizado){escrever.append(el('p',parceiro?esperaColegas:'A circulação começa quando houver pelo menos dois grupos constituídos.'));return;}
   destino=escrever;
   const perguntas=historico(parceiro,1).some(h=>h.versao===recebida.versao&&h.registro.proposta_m1)?perguntasDaProposta(codigo):origem?.questoes||[];
   bloco(parceiro,1,perguntas,false,undefined,true);
   bloco(parceiro,2,perguntasColegas,f<5);
   if(registro(parceiro,2)?.finalizado&&f<5)escrever.append(el('p','Nosso olhar foi salvo. A próxima etapa abre quando a circulação estiver concluída.'));
   return;
 }
 consulta.append(el('h3','▤  Materialidade em análise'));
 if(o)material(sala.sala.materiais[o]||(grupoM1?escolha:null),consulta);
 escrever.append(el('h3',etapaVisivel?'✎  Nosso registro — Etapa '+etapaVisivel:'✎  Nosso registro','oficina-registro-titulo'));
 destino=escrever;
 if(f===1&&!grupoM1)bloco(g,0,[c.individual],true);
 if(f>=2||grupoM1){
 if(o){
   const r=registro(o,1);
   const codigo=sala.sala.materiais[o]||(grupoM1&&o===g?escolha:null);
   const proposta=automatico()&&codigos.includes(codigo)&&
     (!r||historico(o,1).some(h=>h.versao===r.versao&&h.registro.proposta_m1));
   if(proposta&&etapaVisivel===1){
     escrever.classList.add('m1-proposta-textos');
     titulo.replaceChildren(el('h2',titulos[1]));
     faixa.append(el('strong',codigo==='C'?tituloMaterialidadeC:codigo==='B'?'Materialidade B — Atividades de Língua Portuguesa do 2º ano':'Materialidade A — Planejamento semanal do Grupo 5'));
     guia.replaceWith(orientacaoPropostaM1(el,codigo));
     escrever.querySelector('h3').textContent=tituloPropostaM1;
   }
   bloco(o,1,proposta?perguntasDaProposta(codigo):c.materiais[codigos.indexOf(sala.sala.materiais[o])]?.questoes||[],f===2||(proposta&&grupoM1&&f<2),undefined,proposta);
 }
 if(!automatico()&&f>=4&&o)bloco(o,2,[...c.interlocucao,'Segunda pergunta (opcional)'],f===4&&!!registro(o,1)?.finalizado);
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
 if(automatico()&&registro(g,5)?.finalizado)host.append(botao('Ir para a conclusão',()=>{fechamento='conclusao';draw();inicioDaEtapa();}));
 if(f>=7)host.append(el('p',c.plenaria));
 if(f===3)host.append(el('p','O trabalho será retomado após o intervalo.'));
 if(f===4&&!registro(o,1)?.finalizado)host.append(el('p','Aguardando a análise finalizada do grupo parceiro.'));
 // A interlocutora pode revisar sua própria devolutiva após voltar ao grupo de origem.
 if(f>4&&parceiro&&registro(parceiro,2)?.finalizado)bloco(parceiro,2,[...c.interlocucao,'Segunda pergunta (opcional)'],false);
 }
 }
 function erro(e){return /Versão|atualizad|OUTRA_PESSOA|ASSUMA_A_ESCRITA|duplicate/i.test(e.message)?'Alterado em outro dispositivo':('Erro: '+e.message);}
 function bloco(o,b,perguntas,aberto,vPerg,proposta=false){
 const r=registro(o,b),hist=historico(o,b),g=sala.grupo;
 const autor=b===0|| (b===2?sala.sala.pares[g-1]===o:g===o);
 const revisando=edit?.o===o&&edit?.b===b;
 if(navegacao&&b!==etapaVisivel&&!(b===1&&o!==g&&etapaVisivel===2))return;
 const sec=el('section',undefined,'card e23-panel');
 const leituraParceira=b===1&&o!==g&&etapaVisivel===2;
 const olhar=automatico()&&b===2&&etapaVisivel===2;
 (leituraParceira?destino.previousElementSibling:destino).append(sec);sec.append(el('h3',olhar?'Nossa contribuição à proposta das colegas':proposta?(leituraParceira?tituloPropostaM1:'Produção coletiva do grupo'):titulos[b]),el('p',b===0?'Registro individual privado':'Produção vinculada ao grupo '+numeroVisivel(o),'muted'));
 const codigoProposta=sala.sala.materiais[o]||'A';
 const propostaB=proposta&&codigoProposta==='B'&&!leituraParceira;
 const exportavel=proposta&&autor;
 const chaveEsquema='e23-esquema-b:'+sid+':'+o;
 let conclusaoVisivel=!propostaB||!!r?.dados[3]||!!anteriorEsquema();
 function anteriorEsquema(){return propostaB&&sessionStorage.getItem(chaveEsquema)==='gerado';}
 const conclusao=propostaB?el('div'):sec;
 if(propostaB)conclusao.hidden=!conclusaoVisivel;
 let respostasSalvas=r?.dados;
 const editar=autor&&(revisando||(aberto&&!r?.finalizado));
 const anterior=revisando?hist.at(-1):null;
 const baseResposta=anterior?.registro||hist.find(h=>h.versao===r?.versao)?.registro;
 const valores=b===3&&baseResposta?.versao_da_interlocucao!==undefined&&vPerg!==baseResposta.versao_da_interlocucao?perguntas.map(q=>baseResposta.perguntas_e_respostas?.find(par=>par.pergunta===q)?.resposta||''):anterior?.registro.dados||r?.dados||[];
 const valoresTela=olhar?[valores[0],valores.slice(1).join('\n')]:valores;
 let versao=anterior?.versao??r?.versao??0, timer, emCurso=false,seq=0,conflito=false;
 const fields=[];const st=el('p',editar&&r?'Salvo':'','e23-status');st.setAttribute('role','status');
 const bloquear=()=>navegacao?.querySelectorAll('button').forEach((aba,i)=>aba.disabled=!!ativos.size||(sala.sala.fase<liberacao[i]&&!(proposta&&i===0)));
 const marcar=()=>{ativos.add(sec);onDirty(true);bloquear();};const limpar=()=>{ativos.delete(sec);onDirty(ativos.size>0);bloquear();};
 const questoes=[];
 for(const [i,q] of perguntas.entries()){if(proposta&&i===3)conclusao.append(el('h4','Para concluir nossa proposta'));const l=el('label',proposta?(i+1)+'. '+q:q,'e23-question');if(editar){const campo=el('textarea');campo.value=valoresTela[i]||'';campo.oninput=()=>{seq++;marcar();st.textContent='Alteração pendente';clearTimeout(timer);if(!conflito)timer=setTimeout(()=>salvar(false),900);};fields.push(campo);if(olhar&&i===1)l.append(el('small','Escrevam até duas perguntas, uma por linha.'));l.append(campo);}else l.append(Object.assign(el('p',valoresTela[i]||'Aguardando registro.','read'),{style:'font-weight:400;white-space:pre-wrap'}));questoes.push(l);(i===3?conclusao:sec).append(l);}
 if(b===1&&!proposta&&editar&&questoes.length>1){
   let atual=0;
   const pos=el('span');
   const anterior=botao('Pergunta anterior',()=>{if(atual>0)atual--;mostrar();});
   const proxima=botao('Próxima pergunta',()=>{if(atual<questoes.length-1)atual++;mostrar();});
   const mostrar=()=>{questoes.forEach((q,i)=>q.hidden=i!==atual);pos.textContent=(atual+1)+' de '+questoes.length;anterior.disabled=atual===0;proxima.disabled=atual===questoes.length-1;};
   const controles=el('div',undefined,'oficina-paginacao');controles.append(anterior,pos,proxima);sec.append(controles);mostrar();
 }

 async function salvar(final){
 clearTimeout(timer);if(emCurso||conflito||!sec.isConnected)return;
 if(final&&!conclusaoVisivel){conclusaoVisivel=true;conclusao.hidden=false;st.textContent='Respondam à quarta pergunta antes de seguir.';fields[3]?.focus();return;}
 if(final&&ativos.size>Number(ativos.has(sec))){st.textContent='Aguarde o salvamento do outro bloco.';return;}
 const dados=fields.map(x=>x.value);
 if(olhar){const perguntas=dados[1].split(/\r?\n/).filter(x=>x.trim());if(perguntas.length>2){st.textContent='Registrem até duas perguntas, uma por linha.';return;}dados.splice(1,1,...perguntas);}
 emCurso=true;const antes=seq;st.textContent='Salvando';marcar();if(final)fields.forEach(x=>x.readOnly=true);
 try{
 if(b>0)await api('claim_writer');
 const novo=await oficina(revisando?'revisar':'salvar',{bloco:b,dados,versao,final,...(olhar?{origem_lida:o}:{}),...(proposta?{proposta_m1:true}:{}),...(vPerg!=null?{versao_interlocucao:vPerg}:{})});
 versao++;sala=novo;ultimo=assinatura(novo);
 if(exportavel)respostasSalvas=dados;
 if(antes===seq){limpar();st.textContent='Salvo';}else{st.textContent='Alteração pendente';timer=setTimeout(()=>salvar(false),300);}
 if(final&&host.isConnected){
   edit=null;
   if(automatico()){
     const fase=novo.sala.fase;
     if(b===1){etapaVisivel=2;faseAnterior=fase;}
     if(b===2&&fase<5){etapaVisivel=2;faseAnterior=fase;}
     if(b===3){etapaVisivel=4;faseAnterior=fase;}
     if(b===4&&fase<6){etapaVisivel=4;faseAnterior=fase;}
     if(b===5)fechamento='conclusao';
     rolar=true;
   }
   indicador.textContent='Registro salvo.';draw();
 }
 }catch(e){st.textContent=erro(e);conflito=st.textContent==='Alterado em outro dispositivo';if(conflito){recuperar.hidden=false;}fields.forEach(x=>x.readOnly=false);}
 finally{emCurso=false;}
 }
 const recuperar=botao('Consultar versão do servidor',async()=>{const novo=await oficina();if(!confirm('Substituir o texto desta tela pela versão do servidor?'))return;limpar();sala=novo;draw();});recuperar.hidden=true;
 const gerarEsquema=()=>botao('Gerar esquema em PDF',()=>{
   if(!respostasSalvas){st.textContent='Salve a proposta antes de gerar o PDF.';return;}
   if(ativos.has(sec)){st.textContent='Salve as alterações para gerar o PDF atualizado.';return;}
   if(propostaB&&!respostasSalvas.slice(0,3).every(texto=>texto?.trim())){st.textContent='Registre as três respostas para gerar o esquema.';return;}
   if(codigoProposta==='C'&&(respostasSalvas.length!==4||!respostasSalvas.every(texto=>texto?.trim()))){st.textContent='Salve as quatro respostas para gerar o esquema.';return;}
   imprimirPropostaM1({grupo:o,respostas:respostasSalvas,tituloEncontro:meta.session?.title,codigo:codigoProposta,preliminar:propostaB&&!respostasSalvas[3]?.trim()});
   if(propostaB){sessionStorage.setItem(chaveEsquema,'gerado');conclusao.hidden=false;conclusaoVisivel=true;}
 });
 if(propostaB)sec.append(conclusao);
 if(exportavel)sec.append(gerarEsquema());
 if(editar){sec.append(st,botao(exportavel?'Salvar proposta':'Salvar rascunho',async()=>{while(emCurso)await new Promise(resolve=>setTimeout(resolve,50));if(!exportavel||!respostasSalvas||ativos.has(sec))await salvar(false);}),botao(automatico()?(b===0?'Salvar e seguir para o grupo':b===1?'Salvar proposta e seguir para o olhar das colegas':olhar?'Salvar nosso olhar e seguir':'Salvar e seguir'):'Salvar e finalizar',async()=>{while(emCurso)await new Promise(resolve=>setTimeout(resolve,50));await salvar(true);}),recuperar);limpezas.add(()=>clearTimeout(timer));}
 if(exportavel&&!editar&&(propostaB||!respostasSalvas))sec.append(st);

 if(automatico()&&r?.finalizado&&b===4&&sala.sala.fase<6)sec.append(el('p','Revisitação salva. A contribuição para o Referencial abre automaticamente quando os grupos concluírem esta etapa.'));
 if(automatico()&&autor&&r?.finalizado&&b>=1&&b<5&&(b===1||sala.sala.fase>=liberacao[b]))sec.append(botao('Seguir',()=>{etapaVisivel=b+1;draw();inicioDaEtapa();}));
 if(hist.length){const d=el('details');d.append(el('summary','Histórico autorizado'));for(const h of hist){d.append(el('h4','Versão '+h.versao+' · Grupo '+numeroVisivel(h.grupo_autor)+' · '+(h.registro.finalizado?'Finalizada':'Rascunho')),el('small',new Date(h.registrado_em).toLocaleString('pt-BR')));
 if(h.registro.perguntas_e_respostas)for(const v of h.registro.perguntas_e_respostas)d.append(el('p',v.pergunta),el('p',v.resposta||'','read'));else for(const v of h.registro.dados)d.append(el('p',v,'read'));}sec.append(d);}
 if(autor&&b>0&&r?.finalizado&&!revisando&&!olhar)sec.append(botao('Iniciar revisão',()=>{if(ativos.size){st.textContent='Salve as alterações em andamento.';indicador.textContent=st.textContent;return;}edit={o,b};draw();}));
 }
}

