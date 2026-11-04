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
 const titulo=document.createElement('span');titulo.className='eyebrow';titulo.textContent='POR ESCRITO · PERCURSOS DE UMA COORDENADORA';
 const h=document.createElement('h2');h.textContent='Um lugar para olhar de novo para o que vivemos.';
 const paragrafos=[
  'Existe uma pergunta que costuma chegar no fim do dia, quando as salas já estão vazias e a gente finalmente senta: aquele momento com a professora, hoje de manhã, foi o jeito certo?',
  'Ninguém aprende a coordenar de fora. A gente aprende no meio do movimento: no corredor, entre uma reunião e outra, com o café esfriando enquanto alguém traz um problema que ainda não sabemos como resolver. Carregamos para essa função tudo o que fomos antes: professoras, alunas, colegas. E descobrimos, no dia a dia, que isso não basta para responder a tudo o que a coordenação pede. Vamos aprendendo no caminho.',
  'E é justamente aí que está uma das questões que movimentam esta pesquisa: passamos por muitas situações, mas nem todas se tornam experiência. Larrosa, autor que acompanha este percurso, diz que a experiência é “o que nos passa, o que nos acontece, o que nos toca”. Há coisas que acontecem e se vão. Outras ficam. Voltam depois, insistem, provocam novas perguntas e mudam alguma coisa no nosso jeito de olhar para o trabalho.',
  'Às vezes, o que faz diferença é conseguir parar um pouco e voltar ao que aconteceu: o que estava em jogo ali? O que me levou a agir daquele modo? O que percebo agora que talvez não tenha percebido naquele momento?',
  'Foi para esse movimento que este espaço nasceu.',
  'Aqui você poderá escrever sobre situações que ficaram, dúvidas que continuam, decisões que hoje talvez fossem tomadas de outro modo e aprendizagens que começaram no próprio exercício da função. Não existe uma forma certa de escrever e não há resposta esperada. O que me interessa é o seu trabalho como ele realmente acontece: com escolhas, dúvidas, acertos, tensões e questões que ainda permanecem.',
  'Escrever aqui não é prestar contas. É ter a possibilidade de voltar ao vivido e olhar para ele outra vez. Você também poderá reler o que escreveu nos encontros, acompanhar o próprio percurso e falar comigo entre um encontro e outro quando alguma questão continuar pedindo atenção.',
  'O Por Escrito faz parte da pesquisa que estamos construindo juntas. O que vocês registram aqui me ajuda a compreender melhor como as coordenadoras de Barrocas constroem seus saberes no exercício da função. E eu quero ler cada registro com o mesmo cuidado com que espero que vocês possam olhar para o próprio trabalho.',
  'Eu também estou aprendendo nesse processo. Quanto mais vocês contam sobre o que vivem na coordenação, mais eu preciso rever perguntas, certezas e modos de olhar para esse trabalho. Estamos construindo conhecimento juntas, cada uma do seu lugar.',
  'Quando este percurso chegar ao fim, gostaria que cada uma pudesse voltar ao que escreveu e reconhecer não apenas o que fez, mas também o que foi aprendendo e quem foi se tornando enquanto fazia.'
 ];
 wrap.append(titulo,h);
 for(const texto of paragrafos){const p=document.createElement('p');p.className='abertura-paragrafo';p.textContent=texto;wrap.append(p);}
 const fonte=document.createElement('p');fonte.className='autor-citacao';fonte.textContent='Jorge Larrosa, 2002';wrap.append(fonte);
 const final=document.createElement('p');final.className='abertura-paragrafo';final.innerHTML='Bem-vinda ao seu <strong>Por Escrito</strong>.';wrap.append(final);
 const despedida=document.createElement('p');despedida.className='despedida-nanny';despedida.innerHTML='Um abraço carinhoso,<br><strong>Nanny Oliveira</strong>';wrap.append(despedida);
 return wrap;
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
