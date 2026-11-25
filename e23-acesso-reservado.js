import { consultasColegas, orientacaoColegas, perguntasColegas } from './e23-circulacao.js';
import { controleExportacaoPropostaM1, propostasSalvasM1 } from './e23-proposta-pdf.js?v=fechamento';
import { conferirPropostaM1, perguntasDaProposta } from './e23-proposta-m1.js?v=materialidade-c-questoes';
import { perguntaIndividual } from './e23-perguntas-individuais.js';
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
   {id:'perfil',titulo:'Muito sobre nós',liberado:true},
   {id:'mapa',titulo:'Nosso percurso de construção',liberado:true},
   {id:'e1',titulo:'E1 — O trabalho vivido',liberado:true},
   {id:'e23',titulo:'E2–E3 integrados',liberado:true},
   {id:'e4',titulo:'Decisões em situações reais de trabalho',liberado:false},
   ...(pesquisadora?[
     {id:'e5',titulo:'Construindo referências para o trabalho da coordenação pedagógica',liberado:false}
   ]:[]),
   {id:'livre',titulo:'Entre encontros',liberado:true},
   {id:'carta',titulo:'Carta de Percurso',liberado:false}
 ];
 function exibir(pagina){
   const painel=montarPainel({
     modulos,selecionado:pagina,nome:l.actor.name,pesquisadora,homologacao:!pesquisadora,
     navegar:exibir,sair:()=>{sessionStorage.removeItem(slot);location.reload();}
   });
   if(pagina==='e23')for(const voltar of painel.parentElement.querySelectorAll('.percurso-voltar')){
     voltar.title='Voltar ao início do fluxo da oficina';
     voltar.setAttribute('aria-label',voltar.title);
     voltar.onclick=()=>{exibir('e23');document.querySelector('.workspace')?.scrollIntoView({block:'start'});};
   }
   const secoesReservadas={e4:'E4 — Decisões em situações reais de trabalho',e5:'E5 — Construindo referências para o trabalho da coordenação pedagógica',livre:'Entre encontros',carta:'Carta de Percurso',novidades:'Novidades',orientacao:'Orientação',acessos:'Acessos individuais',admin:'Administração'};
   if(pesquisadora&&Object.hasOwn(secoesReservadas,pagina)){
     const link=el('a','Abrir painel com chave oficial da pesquisadora');
     link.href='organizador.html';
     painel.append(el('h2',secoesReservadas[pagina]),el('p','Os conteúdos e controles desta seção estão disponíveis na conta oficial da pesquisadora.'),link);
   }
   if(!pesquisadora&&['carta','e4'].includes(pagina)){
     painel.append(el('h2',secoesReservadas[pagina]),el('p','Ainda não liberado pela pesquisadora.','notice'));
   }
   if(!pesquisadora&&pagina==='livre'){
     const chaveRascunho='entre-encontros-teste:'+l.actor.id;
     const texto=el('textarea');
     texto.rows=8;
     texto.value=localStorage.getItem(chaveRascunho)||'';
     const rotulo=el('label','Meu registro');
     rotulo.append(texto);
     const estado=el('p');
     estado.setAttribute('role','status');
     painel.append(el('h2','Entre encontros'),el('p','Espaço opcional de comunicação. Neste perfil fictício, o registro fica salvo neste navegador.'),rotulo,btn('Salvar meu registro',()=>{
       try{localStorage.setItem(chaveRascunho,texto.value);estado.textContent='Registro salvo neste navegador.';}
       catch{estado.textContent='Não foi possível salvar o registro neste navegador.';}
     }),estado);
   }
   if(pagina==='inicio')painel.append(montarAberturaPorEscrito());
   if(pagina==='sobre_pesquisadora')painel.append(montarPerfilPesquisadora());
   if(pagina==='e1'){
     painel.append(el('h2','E1 — O trabalho vivido'),el('p','Neste acesso fictício, os registros do E1 ficam reservados às contas oficiais.'));
   }
   if(pagina==='perfil'&&pesquisadora){
     painel.append(el('h2','Muito sobre nós'),el('p','As coordenadoras usam esta seção para escrever sobre sua trajetória e incluir uma foto em seu próprio perfil.'));
   }
   if(pagina==='perfil'&&!pesquisadora){
     const registro='perfil-ficticio:'+l.actor.id;
     const foto=el('img');foto.alt='Foto da coordenadora';
     foto.style.cssText='width:120px;height:120px;object-fit:cover;border-radius:50%;display:block';
     const seletor=el('input');seletor.type='file';seletor.accept='image/jpeg,image/png,image/webp';
     const rotuloFoto=el('label','Foto da coordenadora');rotuloFoto.append(seletor);
     const chaveFoto=registro+':foto';
     const anterior=localStorage.getItem(chaveFoto);
     foto.hidden=!anterior;
     if(anterior)foto.src=anterior;
     seletor.onchange=()=>{
       const arquivo=seletor.files[0];
       if(!arquivo)return;
       if(!['image/jpeg','image/png','image/webp'].includes(arquivo.type)||arquivo.size>2000000){
         retorno.textContent='Escolha uma foto JPG, PNG ou WebP de até 2 MB.';return;
       }
       const leitor=new FileReader();
       leitor.onload=()=>{
         try{localStorage.setItem(chaveFoto,leitor.result);}
         catch{retorno.textContent='O navegador não conseguiu guardar a foto.';return;}
         foto.src=leitor.result;foto.hidden=false;
         retorno.textContent='Foto salva neste navegador.';
       };
       leitor.readAsDataURL(arquivo);
     };
     const texto=el('textarea');texto.rows=8;texto.value=localStorage.getItem(registro)||'';
     const rotulo=el('label','Minha trajetória na coordenação pedagógica');rotulo.append(texto);
     const retorno=el('p');retorno.setAttribute('role','status');
     painel.append(el('h2','Muito sobre nós'),el('p','Conte um pouco sobre você e sua trajetória. Este registro de teste fica neste navegador.'),foto,rotuloFoto,rotulo,btn('Salvar minha apresentação',()=>{localStorage.setItem(registro,texto.value);retorno.textContent='Apresentação salva neste navegador.';}),retorno);
   }
   if(pagina==='mapa')painel.append(montarMapaPorEscrito(()=>exibir('e23')));
   if(pagina==='e23'&&!pesquisadora){
     const abertura=el('section');
     const imagem=el('img');
     imagem.src='fluxo-oficina-e23.png?v=oficina';imagem.alt='Fluxo da oficina E2–E3: escolha da materialidade, análise individual, trabalho em grupo e plenária.';
     imagem.style.cssText='display:block;width:100%;height:auto;margin-bottom:1rem';
     const apresentacao=el('div');apresentacao.style.position='relative';
     const ajuste=el('span');ajuste.setAttribute('aria-hidden','true');
     ajuste.style.cssText='position:absolute;left:41.9%;top:78.65%;width:42%;height:3%;background:#f8f5ea;pointer-events:none';
     apresentacao.append(imagem,ajuste);
     abertura.append(apresentacao,btn('Seguir para a oficina',()=>{abertura.replaceWith(oficina);oficina.scrollIntoView({block:'start'});}));
     painel.append(abertura);
   }
   if(pagina==='e23'&&pesquisadora)painel.append(montarFluxoPesquisadora({el,btn,oficina,l,rpc}));
 }
 exibir('inicio');
 sessionStorage.setItem(slot,token);
 oficina.textContent='Carregando oficina…';
 if(pesquisadora)await (await import('./e23-pesquisadora.js?v=baixar-registro-pdf')).abrir({host:oficina,chamar:rpc,el,btn});
 else{
   // A oficina das coordenadoras inicia quando seu espaço entra na página.
   const observar=new MutationObserver(async()=>{
     if(!oficina.isConnected)return;
     observar.disconnect();
     try{await (await import('./e23-coordenadoras.js?v=ver-materialidades')).abrir({host:oficina,rpc,chave:token,el,onDirty:()=>{}});}
     catch(e){oficina.textContent=e.message;}
   });
   observar.observe(host,{subtree:true,childList:true});
 }
 }catch(e){form();status.textContent=e.message;}};
 const form=()=>host.replaceChildren(label,btn('Entrar na oficina',()=>abrir(campo.value.trim())),status);form();if(chave)await abrir(chave);
}

export function montarFluxoPesquisadora({el,btn,oficina,l,rpc,carregarPdf,registrarVoltar}){
     const area=el('section');
     let materialEscolhido;
     const rascunhosProposta=[[],[],[]];
     function inicioOficina(){
       const imagem=el('img');imagem.src='fluxo-oficina-e23.png?v=oficina';
       imagem.alt='Fluxo da oficina E2–E3';
       imagem.style.cssText='display:block;width:100%;height:auto;margin-bottom:1rem';
       const parte=(inicio,fim,arte)=>{
         const recorte=el('div');
         recorte.style.cssText='position:relative;overflow:hidden;aspect-ratio:1200 / '+(fim-inicio);
         arte.style.cssText='display:block;position:absolute;width:100%;max-width:none;height:auto;top:-'+(inicio/(fim-inicio)*100)+'%;left:0';
         recorte.append(arte);
         return recorte;
       };
       const restante=imagem.cloneNode();
       restante.alt='Após salvar a resposta individual, seguem o trabalho em grupo e a plenária.';
       const trilha=el('div',undefined,'m1-trilha');
       const seta=el('div','↓','m1-ramo');seta.setAttribute('aria-hidden','true');
       const lista=el('div',undefined,'m1-cartoes');
       const nomes=['Planejamento da Educação Infantil','Atividades pedagógicas','Resultados das aprendizagens — CNCA'];
       for(const [i,nome] of nomes.entries()){
         const cartao=el('article');
         cartao.append(el('small','Materialidade '+(i+1)),el('h3',nome));
         cartao.append(btn('Ver materialidade',()=>mostrarMaterialidade(i,false)),btn('Escolher esta materialidade',()=>escolher(i)));
         lista.append(cartao);
       }
       trilha.append(seta,lista);
       const topo=el('header');
       topo.append(el('h2','Oficina E2–E3'));
       const passos=el('div',undefined,'m1-cartoes');
       for(const [titulo,descricao] of [
         ['1. Conheça as opções','Veja as três materialidades e escolha qual vai analisar.'],
         ['2. Abra o documento','Use Ver materialidade para consultar o PDF.'],
         ['3. Meu olhar sobre a materialidade','Consulte o PDF e responda às perguntas. O tempo de 10 minutos começa ao abrir a escrita individual na oficina.']
       ]){
         const passo=el('article');
         passo.append(el('h3',titulo),el('p',descricao));
         passos.append(passo);
       }
       topo.append(passos);
       const aviso=el('p');aviso.setAttribute('role','status');aviso.style.margin='.65rem 0';
       const avancar=btn('Meu olhar sobre a materialidade · Escrita individual',()=>{
         mostrarMaterialidade(materialEscolhido,true);
       });
       avancar.classList.add('m1-escrita-seguir');
       const proximo=el('div');proximo.style.cssText='text-align:center;padding:.5rem 0';
       proximo.append(el('div','↓','m1-ramo'),aviso,avancar);
       function indicarEscolha(){
         avancar.disabled=materialEscolhido===undefined;
         aviso.textContent=avancar.disabled?'Escolha uma materialidade para iniciar a escrita individual.':'Materialidade escolhida: '+nomes[materialEscolhido];
       }
       function escolher(indice){
         materialEscolhido=indice;
         indicarEscolha();
         avancar.focus({preventScroll:true});
         proximo.scrollIntoView({block:'center'});
       }
       indicarEscolha();
       trilha.append(proximo);
       const fluxoColetivo=parte(302,870,restante);
       const analise=btn('Assim pensamos inicialmente',mostrarPropostaM1);
       analise.style.cssText='position:absolute;left:3.17%;top:31.34%;width:17.42%;height:25.70%;display:flex;align-items:flex-start;justify-content:flex-start;text-align:left;padding:1.1%;margin:0;background:#e2ebdb;color:#173d34;border:1px solid #829b73;border-radius:8px;font-size:clamp(8px,1.25vw,17px);line-height:1.15;text-decoration:underline';
       analise.append(el('span','Abrir proposta do grupo'));
       analise.style.flexDirection='column';
       analise.style.gap='.3em';
       analise.dataset.propostaM1='';
       fluxoColetivo.append(analise);
       const olhar=btn('O olhar das colegas',mostrarCirculacao);
       olhar.style.cssText='position:absolute;left:22.25%;top:31.34%;width:17.42%;height:25.70%;padding:.5%;margin:0;background:#f3e5c8;color:#173d34;border:1px solid #b58a3c;border-radius:8px;font-size:clamp(8px,1.25vw,17px);line-height:1.15;text-decoration:underline';
       fluxoColetivo.append(olhar);
       area.replaceChildren(topo,trilha,fluxoColetivo,btn('Acompanhar a oficina',()=>area.replaceChildren(btn('Voltar ao fluxo da oficina',inicioOficina),oficina)));
     }
     function mostrarCirculacao(){
       const voltar=btn('Voltar ao fluxo da oficina',inicioOficina);
       const previa=el('section',undefined,'e23 oficina-painel');
       const areas=el('div',undefined,'oficina-areas');
       const consulta=el('section',undefined,'oficina-consulta');
       consulta.append(el('h3','Grupo leitor · 2'),el('p','Proposta do Grupo 1 · Materialidade A — Planejamento da Educação Infantil'),carregarPdf ? el('div') : consultasColegas(el,'B','A'));
       if(carregarPdf)for(const [codigo,titulo] of [['A','Consultar materialidade das colegas'],['B','Consultar nossa materialidade']]){
         const pdf=el('iframe');pdf.title=titulo;pdf.className='e23-source';pdf.hidden=true;
         consulta.append(btn(titulo,async()=>{pdf.src=await carregarPdf(codigo);pdf.hidden=false;}),pdf);
       }
       const perguntas=perguntasDaProposta('A');
       for(const [i,pergunta] of perguntas.entries()){
         consulta.append(el('h4',pergunta),el('p',[
           'Observar a participação das crianças nas atividades em pequenos grupos.',
           'Conversar com a professora sobre o planejamento e combinar uma observação em sala.',
           'Retomar os registros de observação na reunião de planejamento seguinte.',
           'Identificar quais registros da turma já estão disponíveis.'
         ][i],'read'));
       }
       const escrita=el('section',undefined,'oficina-escrita');
       escrita.append(el('h3','Nossa contribuição à proposta das colegas','oficina-registro-titulo'));
       for(const [i,pergunta] of perguntasColegas.entries()){
         const rotulo=el('label',pergunta,'e23-question');
         if(i===1)rotulo.append(el('small','Escrevam até duas perguntas, uma por linha.'));
         const campo=el('textarea');campo.readOnly=true;campo.rows=3;
         rotulo.append(campo);escrita.append(rotulo);
       }
       const salvar=btn('Salvar nosso olhar e seguir',()=>{});salvar.disabled=true;
       escrita.append(salvar);
       areas.append(consulta,escrita);
       previa.append(el('h2','O olhar das colegas'),el('p','Prévia da pesquisadora · Dados fictícios para conferência.','notice'),el('p',orientacaoColegas,'e23-context'),areas);
       const acompanhar=btn('Acompanhar a circulação da sessão',()=>area.replaceChildren(voltar,oficina));
       area.replaceChildren(voltar,previa,acompanhar);
       voltar.focus();
     }
     function mostrarPropostaM1(){
       const voltar=btn('Voltar ao fluxo da oficina',()=>{
         inicioOficina();
         area.querySelector('button[data-proposta-m1]')?.focus();
       });
       const indice=materialEscolhido ?? 0;
       const codigo=['A','B','C'][indice];
       const exportacao=carregarPdf ? undefined : controleExportacaoPropostaM1(el,btn,async()=>{
         const ensaio=l.sessions.find(s=>s.id===l.actor.session_id);
         const dados=await rpc('oficina_integrada',{p_sid:l.actor.session_id,p_acao:'ler',p:{}});
         return propostasSalvasM1(dados,ensaio?.title,codigo);
       },codigo);
       const proposta=conferirPropostaM1(el,rascunhosProposta[indice],codigo,exportacao);
       if(carregarPdf){const pdf=proposta.querySelector('iframe');pdf.removeAttribute('src');carregarPdf(codigo).then(url=>{pdf.src=url;}).catch(()=>pdf.replaceWith(el('p','Não foi possível abrir a materialidade.')));}
       area.replaceChildren(voltar,proposta);
       voltar.focus();
     }
     const materiais=[
       {id:'m1',titulo:'Materialidade A (M1) — Planejamento semanal do Grupo 5',pdf:'planejamento-grupo-5.pdf?v=semana-completa',rascunhos:[]},
       {id:'m2',titulo:'Materialidade B (M2) — Atividades de Língua Portuguesa do 2º ano',pdf:'tres-atividades.pdf?v=m2-revisada',rascunhos:[]},
       {id:'m3',titulo:'Materialidade C (M3) — Aprendizagens em percurso: de 2026 ao planejamento de 2027',pdf:'cnca-ciclo-ii.pdf',rascunhos:[]}
     ];
     function mostrarMaterialidade(indice,escolhida){
       if(escolhida!==false)materialEscolhido=indice;
       const material=materiais[indice];
       const consulta=el('section',undefined,'oficina-consulta');
       const escrita=el('section',undefined,'oficina-escrita');
       const areas=el('div',undefined,'oficina-areas');
       const tela=el('section',undefined,'e23 oficina-painel');
       const pdf=el('iframe');if(!carregarPdf)pdf.src='materialidades/'+material.pdf;pdf.title=material.titulo;pdf.className='e23-source';
       const ampliar=el('a','Ampliar PDF');if(!carregarPdf)ampliar.href=pdf.src;else{ampliar.hidden=true;carregarPdf(['A','B','C'][indice]).then(url=>{pdf.src=url;ampliar.href=url;ampliar.hidden=false;}).catch(()=>pdf.replaceWith(el('p','Não foi possível abrir a materialidade.')));}ampliar.target='_blank';ampliar.rel='noopener noreferrer';
       consulta.append(el('h3','Materialidade em análise'),ampliar,pdf);
       escrita.append(el('h3','Questões para análise','oficina-registro-titulo'),el('p','Campos para conferência. O texto fica nesta aba e não é enviado à oficina.'));
       const guia=el('section',undefined,'oficina-orientacao');
       const orientacao=el('p','','e23-context');guia.append(el('h3','Contextualização'),orientacao);
       const faixa=el('div',undefined,'oficina-faixa');faixa.append(el('strong',material.titulo));
       areas.append(consulta);if(escolhida===true)areas.append(escrita);
       tela.append(el('h2',escolhida===true?'Meu olhar sobre a materialidade':'Oficina E2–E3'),guia,faixa,areas);
       area.replaceChildren(tela,btn('Voltar às materialidades',inicioOficina));
       if(escolhida===true)area.append(btn('Ver a proposta coletiva da Materialidade '+(['A','B','C'][indice]),mostrarPropostaM1));
       if(escolhida)area.append(btn('Acompanhar os grupos',()=>area.replaceChildren(btn('Voltar à materialidade',()=>mostrarMaterialidade(indice,true)),oficina)));
       else if(escolhida===null)area.append(btn('Iniciar minha escrita individual',()=>mostrarMaterialidade(indice,true)));
       else area.append(btn('Escolher esta materialidade',()=>{materialEscolhido=indice;inicioOficina();area.querySelector('.m1-escrita-seguir')?.focus();}));
       const preencher=()=>{
         const m=indice===2?{
           contexto:'Os dados apresentados correspondem aos resultados municipais do Ciclo II do CNCA de 2026. Considerem que essas crianças darão continuidade à sua escolarização em 2027.',
           questoes:[
             'Ao comparar os resultados apresentados, o que vocês identificam? Que dados sustentam essa análise?',
             'Considerando a continuidade da escolarização dessas crianças, o que merece atenção da coordenação pedagógica em 2027?',
             'Que encaminhamentos vocês proporiam para o planejamento de 2027? Por quê?',
             'Que outras informações vocês consideram necessárias para aprofundar essa análise? Por quê?'
           ]
         }:E23_CONTEUDO.materiais.find(item=>item.id===material.id);
         orientacao.textContent=m.contexto;
         for(const [i,q] of m.questoes.entries()){
           const campo=el('textarea');campo.placeholder='Escreva sua resposta';
           campo.value=material.rascunhos[i]||'';
           campo.oninput=()=>{material.rascunhos[i]=campo.value;};
           const rotulo=el('label',(i+1)+'. '+perguntaIndividual(q),'e23-question');rotulo.append(campo);escrita.append(rotulo);
         }
       };
       if(typeof E23_CONTEUDO!=='undefined')preencher();
       else{const script=document.createElement('script');script.src='e23-conteudo.js';script.onload=preencher;script.onerror=()=>escrita.append(el('p','Não foi possível carregar as perguntas.'));document.head.append(script);}
     }
     registrarVoltar?.(inicioOficina);
     inicioOficina();return area;
}
