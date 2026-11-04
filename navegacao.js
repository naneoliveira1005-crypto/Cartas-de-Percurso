'use strict';
function montarPainel({modulos,selecionado,nome,pesquisadora=false,observadora=false,orientadora=false,navegar,sair}){
 document.body.classList.add('dashboard');const root=document.getElementById('app');root.replaceChildren();
 const nav=document.createElement('nav');nav.className='sidebar';nav.setAttribute('aria-label','Encontros');
 const add=(id,titulo,sub,target=nav)=>{const b=document.createElement('button');b.type='button';b.className=id===selecionado?'nav-item active':'nav-item';if(id===selecionado)b.setAttribute('aria-current','page');const a=document.createElement('strong');a.textContent=titulo;b.append(a);if(sub){const s=document.createElement('span');s.textContent=sub;b.append(s);}b.onclick=()=>navegar(id);target.append(b);return b;};
 add('inicio','Início','Por Escrito');
 const perfis=document.createElement('div');perfis.className='nav-profile-pair';nav.append(perfis);
 add('sobre_pesquisadora','Um pouco sobre mim','Nanny Oliveira',perfis);
 const perfilModulo=modulos.find(m=>m.id==='perfil');if(perfilModulo)add('perfil','Muito sobre nós','Minha trajetória',perfis);
 for(const m of modulos.filter(m=>m.id!=='perfil'))add(
   m.id,
   m.id==='carta'?'Carta de Percurso':m.id==='livre'?'Entre encontros':/^e\d$/.test(m.id)?m.id.toUpperCase():m.titulo,
   m.id==='carta'?'O que ainda preciso dizer'+((pesquisadora||observadora||orientadora)&&!m.liberado?' · Não liberado':''):m.id==='livre'?'Espaço opcional de comunicação':m.titulo.replace(/^E\d\s*[—–-]\s*/, '')+((pesquisadora||observadora||orientadora)&&!m.liberado?' · Não liberado':'')
 );
 if(pesquisadora){add('novidades','Novidades','Quem escreveu e onde');add('orientacao','Orientação','Canal com Silvia');add('acessos','Acessos individuais','Links das coordenadoras');add('admin','Administração');}
 if(orientadora)add('orientacao','Orientação','Canal privado com Nanny');
 const content=document.createElement('section');content.className='workspace';const identity=document.createElement('div');identity.className='identity';const n=document.createElement('span');n.textContent=(pesquisadora?'Pesquisadora · ':orientadora?'Orientadora · ':observadora?'Observadora · ':'Meu percurso · ')+nome;const out=document.createElement('button');out.className='secondary';out.textContent='Sair';out.onclick=sair;identity.append(n,out);content.append(identity);const panel=document.createElement('div');panel.id='conteudo';content.append(panel);root.append(nav,content);return panel;
}
function chaveDoAcesso(valor){const text=valor.trim();try{const u=new URL(text);if(u.protocol==='https:'||u.protocol==='http:'){const h=new URLSearchParams(u.hash.slice(1));return (u.searchParams.get('token')||h.get('token')||h.get('chave')||'').trim();}}catch{}return text;}
function montarAberturaPorEscrito(){
 const wrap=document.createElement('section');wrap.className='abertura-por-escrito abertura-texto';
 const titulo=document.createElement('span');titulo.className='eyebrow';titulo.textContent='POR ESCRITO — PERCURSOS DE UMA COORDENADORA';
 const h=document.createElement('h2');h.textContent='Um lugar para pensar a profissão a partir do que vivemos.';
 const p1=document.createElement('p');p1.className='abertura-paragrafo';p1.textContent='A coordenação pedagógica ocupa um lugar singular na escola. É trabalho de acompanhamento, formação, articulação e leitura do cotidiano pedagógico. Exige escuta atenta, repertório profissional, capacidade de fazer perguntas e disposição para rever caminhos. Nem tudo se resolve no momento em que acontece; muitas vezes, é quando voltamos a uma situação, narramos o que vivemos e interrogamos nossas escolhas que começamos a compreender melhor o trabalho.';
 const p2=document.createElement('p');p2.className='abertura-paragrafo';p2.textContent='O Por Escrito nasceu dentro desta pesquisa para acolher justamente esse movimento. Não é um lugar de respostas prontas nem uma coleção de tarefas. É um espaço para registrar, retomar e acompanhar o percurso de cada coordenadora; guardar perguntas que ainda permanecem; reconhecer saberes construídos no exercício da função; e perceber o que muda quando olhamos novamente para aquilo que vivemos.';
 const p3=document.createElement('p');p3.className='abertura-paragrafo';p3.textContent='Há acontecimentos que passam por nós sem deixar marcas e há outros que permanecem, nos inquietam, nos deslocam e passam a fazer parte da maneira como pensamos e agimos. É nesse sentido que a experiência ganha força neste percurso:';
 const ep=document.createElement('blockquote');ep.className='epigrafe citacao-site';ep.textContent='“A experiência é o que nos passa, o que nos acontece, o que nos toca.”';
 const fonte=document.createElement('p');fonte.className='autor-citacao';fonte.textContent='Jorge Larrosa, 2002';
 const p4=document.createElement('p');p4.className='abertura-paragrafo';p4.textContent='É também por isso que escrever importa. A escrita ajuda a retomar o vivido, perceber aspectos que o ritmo do cotidiano pode deixar passar e compreender melhor aquilo que ainda está em elaboração.';
 const ass=document.createElement('blockquote');ass.className='assinatura-percurso citacao-site';ass.textContent='“Há percursos que só conseguimos compreender quando encontramos um lugar para escrevê-los.”';
 const assinatura=document.createElement('p');assinatura.className='autor-citacao';assinatura.textContent='Nanny Oliveira';
 const prox=document.createElement('div');prox.className='daqui-em-diante';
 const ph=document.createElement('h3');ph.textContent='O que você vai encontrar por aqui';
 const pp=document.createElement('p');pp.textContent='Ao longo do Por Escrito, você poderá conhecer um pouco de quem conduz a pesquisa, construir e revisitar o seu próprio perfil, acompanhar os Encontros de Partilha, acessar materiais, reler registros já produzidos e escrever entre um encontro e outro quando alguma questão precisar continuar sendo pensada.';
 prox.append(ph,pp);
 const fim=document.createElement('div');fim.className='encerramento-abertura';
 const f1=document.createElement('p');f1.textContent='Quero que este seja um espaço de cuidado com o pensamento e com o trabalho que vocês realizam. Desde que começamos este percurso, tenho aprendido muito com o modo como vocês narram situações, formulam perguntas e dão sentido ao que fazem. O olhar de vocês amplia o meu, desloca minhas certezas e fortalece esta pesquisa.';
 const f2=document.createElement('p');f2.textContent='Espero que essa troca seja de mão dupla: que, enquanto aprendo com vocês, o Por Escrito também lhes devolva tempo, perguntas e ferramentas para olhar o próprio trabalho com mais nitidez. Que possamos construir este percurso juntas, com confiança, curiosidade e respeito pelo que cada experiência tem de singular.';
 const despedida=document.createElement('p');despedida.className='despedida-nanny';despedida.innerHTML='Um abraço carinhoso,<br><strong>Nanny Oliveira</strong>';
 fim.append(f1,f2,despedida);
 wrap.append(titulo,h,p1,p2,p3,ep,fonte,p4,ass,assinatura,prox,fim);return wrap;
}

function montarPerfilPesquisadora(editavel=false,chaveAdmin=''){
 const wrap=document.createElement('section');wrap.className='perfil-pesquisadora-publico';
 const hero=document.createElement('section');hero.className='perfil-hero';
 const foto=document.createElement('div');foto.className='perfil-foto';
 const img=document.createElement('img');img.alt='Foto de Nanny Oliveira';img.hidden=true;
 const iniciais=document.createElement('div');iniciais.className='perfil-iniciais';iniciais.textContent='NO';
 foto.append(img,iniciais);

 const FOTO_PESQ='https://zpsjuxusydfbptjotyxo.supabase.co/functions/v1/pesquisadora-foto';
 async function carregarFoto(){
   try{
     const r=await fetch(FOTO_PESQ,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
     const x=await r.json();
     if(r.ok&&x.url){img.src=x.url;img.hidden=false;iniciais.hidden=true;}
     else{img.hidden=true;iniciais.hidden=false;}
   }catch{img.hidden=true;iniciais.hidden=false;}
 }
 carregarFoto();

 const intro=document.createElement('div');intro.className='perfil-apresentacao';
 const olho=document.createElement('span');olho.className='eyebrow';olho.textContent='UM POUCO SOBRE MIM';
 const h=document.createElement('h2');h.textContent='Nanny Oliveira';
 const p=document.createElement('p');p.className='perfil-lead';p.textContent='Antes de ser a pesquisadora deste percurso, sou professora. É desse lugar — atravessado pela sala de aula, pela formação de professores, pela coordenação de processos formativos e pelas muitas perguntas que a educação continua me fazendo — que chego a esta pesquisa.';
 intro.append(olho,h,p);

 if(editavel){
   const upload=document.createElement('div');upload.className='pesquisadora-upload';
   const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.hidden=true;
   const btnFoto=document.createElement('button');btnFoto.type='button';btnFoto.className='secondary';btnFoto.textContent='Escolher foto';
   const nota=document.createElement('span');nota.className='muted';nota.textContent='JPG, PNG ou WEBP · até 5 MB';
   btnFoto.onclick=()=>file.click();
   file.onchange=async()=>{
     const arq=file.files?.[0];if(!arq)return;
     btnFoto.disabled=true;nota.textContent='Enviando foto…';
     try{
       const fd=new FormData();fd.append('chave',chaveAdmin);fd.append('file',arq);
       const r=await fetch(FOTO_PESQ,{method:'POST',body:fd});const x=await r.json();
       if(!r.ok)throw Error(x?.error||'Falha');
       if(x.url){img.src=x.url;img.hidden=false;iniciais.hidden=true;}
       btnFoto.textContent='Trocar foto';nota.textContent='Foto salva no seu perfil.';
     }catch{nota.textContent='Não foi possível enviar a foto agora.';}
     finally{btnFoto.disabled=false;}
   };
   upload.append(btnFoto,file,nota);intro.append(upload);
 }

 hero.append(foto,intro);
 const texto=document.createElement('section');texto.className='card texto-nanny';
 texto.append(
   Object.assign(document.createElement('p'),{textContent:'Minha relação com Barrocas começou antes da pesquisa, em experiências de formação e acompanhamento da rede. Retornar agora como pesquisadora exige de mim outro movimento: escutar sem antecipar respostas, reconhecer o que já conheço e, ao mesmo tempo, permitir que o campo desfaça certezas e produza novas perguntas.'}),
   Object.assign(document.createElement('p'),{textContent:'Por isso, também me coloco neste percurso. Enquanto vocês escrevem sobre o trabalho vivido, eu preciso olhar para o modo como pergunto, como intervenho, como escuto e como vou me tornando pesquisadora no encontro com vocês.'})
 );
 wrap.append(hero,texto);return wrap;
}

function montarPortasPerfis(abrirPesquisadora,abrirNos){
 const duo=document.createElement('section');duo.className='duo-percurso portas-perfis';
 const mim=document.createElement('article');mim.className='card porta-perfil';
 const a=document.createElement('span');a.className='eyebrow';a.textContent='UM POUCO SOBRE MIM';
 const h1=document.createElement('h3');h1.textContent='Nanny Oliveira';
 const p1=document.createElement('p');p1.textContent='Conheça um pouco de quem pesquisa, escreve e também se coloca neste percurso.';
 const b1=document.createElement('button');b1.textContent='Conhecer Nanny';b1.onclick=abrirPesquisadora;
 mim.append(a,h1,p1,b1);
 const nos=document.createElement('article');nos.className='card porta-perfil';
 const b=document.createElement('span');b.className='eyebrow';b.textContent='MUITO SOBRE NÓS';
 const h2=document.createElement('h3');h2.textContent='As coordenadoras que fazem este percurso';
 const p2=document.createElement('p');p2.textContent='Um espaço para reconhecer e escrever as trajetórias de quem constrói esta pesquisa.';
 const b2=document.createElement('button');b2.textContent='Abrir nosso percurso';b2.onclick=abrirNos;
 nos.append(b,h2,p2,b2);duo.append(mim,nos);return duo;
}
window.montarPainel=montarPainel;window.chaveDoAcesso=chaveDoAcesso;window.montarAberturaPorEscrito=montarAberturaPorEscrito;window.montarPerfilPesquisadora=montarPerfilPesquisadora;window.montarPortasPerfis=montarPortasPerfis;
