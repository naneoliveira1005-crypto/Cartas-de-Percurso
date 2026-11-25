const fases=['Escolha e formação dos grupos','Meu olhar','Nossos olhares','Intervalo','Outros olhares','Respostas e retomada da análise','Contribuindo para o Referencial','Plenária — Encontro de olhares','Carta de Percurso'];
const nomes=['Meu olhar','Assim pensamos inicialmente','O olhar das colegas','Dialogamos com as colegas','Revisitamos nossa análise','Nossa contribuição para o Referencial'];
const materias={A:'Planejamento semanal do Grupo 5',B:'Três atividades em análise: o olhar da coordenação pedagógica',C:'Aprendizagens em percurso — De 2026 ao planejamento de 2027'};
const descricoes={A:'Educação Infantil · Planejamento semanal, matutino e vespertino.',B:'2º ano · Bruxa, Bruxa, Venha à Minha Festa! · Os Mil Cabelos de Ritinha · A Casa Sonolenta.',C:'CNCA 2026 · Ciclo II de Língua Portuguesa · 1º ao 5º ano.'};
export async function oficina({root,call,state,n,button,details,openFile,manage,letter,claim,device}){
 const admin=state.actor.role==='pesquisadora';
 const tela=n('section');root.append(tela);
 let data=await call('ler'),origem=data.grupo||1,apresentar=false,ocupado=false,base=Date.now();
 const acao=async(tipo,p={})=>{data=await call(tipo,p);base=Date.now();draw();};
 const registro=(o,b)=>data.registros.find(r=>r.origem===o&&r.bloco===b);
 const select=(valores,valor)=>{const el=n('select');for(const [v,t] of valores){const opt=n('option',t);opt.value=v;el.append(opt);}el.value=valor;return el;};
 function draw(){
 const w=data.sala,f=w.fase,g=data.grupo,total=state.session.group_count||4;
 tela.replaceChildren(n('h1','Percurso de uma análise coletiva'));
 if(!apresentar){tela.append(n('h2',fases[f]),n('p','25 de novembro · Acolhimento às 13h30 · Abertura às 13h40.'));
 if(f>0&&f<7){const clock=n('output');clock.className='clock';clock.dataset.relogio='';tela.append(clock);relogio();}
 if(admin){const controles=details('Organizar grupos, materialidades e tempo');controles.open=f===0;
 controles.append(button('Participantes e arquivos do encontro',manage,true));
 if(f===0){const ms=[],ps=[];for(let i=1;i<=total;i++){const l=n('label','Grupo '+i+' · Materialidade');ms[i]=select(Object.entries(materias),w.materiais[i]||'');l.append(ms[i]);const par=n('label','Ler a análise do grupo');ps[i]=select(Array.from({length:total},(_,j)=>[j+1,'Grupo '+(j+1)]).filter(([k])=>k!==i),w.pares[i-1]||i%total+1);par.append(ps[i]);controles.append(l,par);}
 controles.append(button('Sugerir circulação',()=>{let best=[],score=-1;function perm(xs){if(xs.length===total){const pts=xs.filter((v,i)=>ms[v].value!==ms[i+1].value).length;if(pts>score){best=xs;score=pts;}return;}for(let j=1;j<=total;j++)if(j!==xs.length+1&&!xs.includes(j))perm([...xs,j]);}perm([]);best.forEach((v,i)=>ps[i+1].value=v);aviso.textContent=score<total?'Com estas escolhas, alguns grupos receberão a mesma materialidade.':'Cada grupo receberá outra materialidade.';}));
 const aviso=n('p');controles.append(aviso,button('Confirmar distribuição',()=>acao('configurar',{pares:ps.slice(1).map(x=>Number(x.value)),materiais:Object.fromEntries(ms.slice(1).map((x,i)=>[i+1,x.value]))})));
 }
 if(f>0&&f<7)for(const [label,opt] of [[w.pausa?'Retomar':'Pausar',{tipo:w.pausa?'retomar':'pausar'}],['+ 1 minuto',{delta:60}],['− 1 minuto',{delta:-60}]])controles.append(button(label,()=>acao('tempo',opt),true));
 if(f<8)controles.append(button('Iniciar '+fases[f+1],()=>acao('avancar')));
 tela.append(controles);
 const priv=details('Escolhas e registros individuais protegidos');for(const r of data.registros.filter(x=>x.autora)){priv.append(n('h4',state.people?.find(x=>x.id===r.autora)?.name||'Participante'),n('p',r.bloco===-1?materias[r.dados[0]]:r.dados[0]));}tela.append(priv);
 }
 if(f===0||admin){const lib=details('Materialidades');for(const [k,m] of Object.entries(materias)){lib.append(n('h3',m),n('p',descricoes[k]));const fs=(state.files||[]).filter(x=>x.material_code===k&&state.materials?.some(v=>v.code===k&&v.status==='conferido'));if(fs.length)for(const x of fs)lib.append(button(x.name,()=>openFile(x),true));else lib.append(n('p','Original em preparação.'));}tela.append(lib);}
 if(!admin&&f===0){const s=select(Object.entries(materias),registro(0,-1)?.dados[0]||'');tela.append(n('h3','Minha escolha'),s,button('Salvar escolha',()=>acao('salvar',{bloco:-1,dados:[s.value],versao:registro(0,-1)?.versao||0})));return;}
 if(!admin&&f===1)bloco(tela,0,g,['Ao analisar a materialidade escolhida, o que você considera importante destacar a partir do seu olhar como coordenadora pedagógica?'],true);
 if(f===2)tela.append(n('p','Organizem o trabalho do grupo, definindo quem ficará responsável pela mediação da conversa, pelo registro coletivo e pelo acompanhamento do tempo. Todas devem participar das discussões.'));
 if(admin){const s=select(Array.from({length:total},(_,i)=>[i+1,'Grupo '+(i+1)]),origem);s.onchange=()=>{origem=Number(s.value);draw();};tela.append(n('label','Consultar esquema do grupo'),s);}
 }
 const o=admin?origem:(f===4?w.pares[g-1]:g),mat=w.materiais[o];
 tela.append(n('h2','Grupo '+(o||'a definir')+' · '+(materias[mat]||'Materialidade em definição')));
 for(const x of state.files||[])if(x.material_code===mat&&state.materials?.some(v=>v.code===mat&&v.status==='conferido'))tela.append(button(x.name,()=>openFile(x),true));
 const interlocutor=w.pares.indexOf(o)+1;
 for(let b=1;b<=5;b++){
 const recebido=registro(o,2)?.dados||[];const qs=[[],data.perguntas[mat]||[],['O que vocês destacam, acrescentariam ou problematizariam na análise realizada pelas colegas?','Que perguntas vocês fariam às colegas para aprofundar essa análise? · Pergunta 1','Pergunta 2 (se houver)'],recebido.slice(1).filter(Boolean),['A partir desse diálogo, o que vocês manteriam, acrescentariam ou reconsiderariam na análise inicial do grupo? Por quê?'],['A partir do trabalho realizado pelo grupo, que aspectos vocês consideram importante contemplar no Referencial da Coordenação Pedagógica de Barrocas? Por quê?']];
 const fase=[1,2,4,5,5,6][b];const box=n('section',undefined,'sheet');tela.append(box);box.append(n('small',b===2?'Grupo interlocutor '+(interlocutor||'a definir'):'Grupo de origem '+o));
 if(!admin&&f<fase){box.append(n('h3',nomes[b]),n('p','Aguardando a etapa.'));continue;}
 bloco(box,b,o,qs[b],!admin&&!apresentar&&f===fase&&(b!==2||registro(o,1)?.finalizado)&&(b!==3||registro(o,2)?.finalizado));
 }
 if(f>=7||admin){tela.append(n('h3','Que questões sobre o trabalho da coordenação pedagógica em Barrocas precisamos continuar discutindo?'),button(apresentar?'Voltar ao painel':'Apresentar esquema',()=>{apresentar=!apresentar;draw();}),button('Imprimir ou salvar em PDF',()=>{apresentar=true;draw();window.print();},true));}
 if(admin&&!apresentar){const ref=details('Referencial em construção');for(const r of data.registros.filter(x=>x.bloco===5))ref.append(n('h3','Grupo '+r.origem),n('p',r.dados[0]));tela.append(ref);}
 if(f===8&&!admin)tela.append(button('Abrir minha Carta de Percurso',letter));
 }
 function bloco(box,b,o,qs,pode){
 const r=registro(o,b);box.append(n('h3',(b?'0'+b+'. ':'')+nomes[b]));const edit=pode&&!r?.finalizado;
 let versao=r?.versao||0;const inputs=[],status=n('p');let fila=Promise.resolve(),timer;
 const key=['oficina',state.session.id,state.actor.id,o,b].join(':');
 let local;try{local=JSON.parse(localStorage.getItem(key));}catch{}
 async function salvar(final){const dados=inputs.map(i=>i.value);fila=fila.catch(()=>{}).then(async()=>{try{if(b>0)await claim();const novo=await call('salvar',{bloco:b,dados,versao,final,device});const salvo=novo.registros.find(x=>x.origem===o&&x.bloco===b);versao=salvo.versao;status.textContent='Registro salvo.';if(inputs.every((x,i)=>x.value===dados[i])){localStorage.removeItem(key);ocupado=false;}if(final){data=novo;draw();}}catch(e){status.textContent='Rascunho neste dispositivo. '+e.message;throw e;}});return fila;}
 for(const [i,q] of qs.entries()){const l=n('label',q);if(edit){const t=n('textarea');t.rows=3;t.value=local?.[i]??r?.dados[i]??'';inputs.push(t);t.oninput=()=>{ocupado=true;localStorage.setItem(key,JSON.stringify(inputs.map(x=>x.value)));status.textContent='Salvando…';clearTimeout(timer);timer=setTimeout(()=>salvar(false).catch(()=>{}),800);};l.append(t);}else l.append(n('p',r?.dados[i]||'Aguardando registro.','read'));box.append(l);}
 if(edit&&qs.length)box.append(status,button('Salvar e finalizar',async()=>{clearTimeout(timer);await salvar(true);}));
 }
 function relogio(){const el=tela.querySelector('[data-relogio]');if(!el)return;const w=data.sala,agora=w.pausa?Date.parse(w.pausa):Date.parse(data.agora)+Date.now()-base;const sec=Math.max(0,w.segundos-Math.floor((agora-Date.parse(w.inicio))/1000));el.textContent=(w.pausa?'Pausado · ':'')+Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')+(sec===0?' · Tempo concluído. A escrita continua aberta.':sec<=60?' · Último minuto':sec<=300?' · Cinco minutos ou menos':'');}
 draw();const tick=setInterval(()=>{if(!tela.isConnected){clearInterval(tick);return;}relogio();},1000);
 const poll=setInterval(async()=>{if(!tela.isConnected){clearInterval(poll);return;}if(ocupado||apresentar||tela.contains(document.activeElement)&&['SELECT','TEXTAREA','INPUT'].includes(document.activeElement.tagName))return;try{const next=await call('ler');if(!tela.isConnected||ocupado)return;const mudou=JSON.stringify([next.sala,next.registros])!==JSON.stringify([data.sala,data.registros]);data=next;base=Date.now();if(mudou)draw();}catch{}},4000);
}
