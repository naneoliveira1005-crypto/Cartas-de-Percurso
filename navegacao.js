'use strict';
function montarPainel({modulos,selecionado,nome,pesquisadora=false,observadora=false,orientadora=false,navegar,sair}){
 document.body.classList.add('dashboard');const root=document.getElementById('app');root.replaceChildren();
 const nav=document.createElement('nav');nav.className='sidebar';nav.setAttribute('aria-label','Encontros');
 const add=(id,titulo,sub)=>{const b=document.createElement('button');b.type='button';b.className=id===selecionado?'nav-item active':'nav-item';if(id===selecionado)b.setAttribute('aria-current','page');const a=document.createElement('strong');a.textContent=titulo;b.append(a);if(sub){const s=document.createElement('span');s.textContent=sub;b.append(s);}b.onclick=()=>navegar(id);nav.append(b);};
 add('inicio','Início');for(const m of modulos)add(m.id,m.id==='livre'?'Entre encontros':/^e\d$/.test(m.id)?m.id.toUpperCase():m.titulo,m.id==='livre'?'Espaço opcional de comunicação':m.titulo.replace(/^E\d\s*[—–-]\s*/, '')+((pesquisadora||observadora)&&!m.liberado?' · Não liberado':''));if(pesquisadora){add('orientacao','Orientação','Canal com Silvia');add('acessos','Acessos individuais','Links das coordenadoras');add('admin','Administração');}if(orientadora)add('orientacao','Orientação','Canal privado com Nanny');
 const content=document.createElement('section');content.className='workspace';const identity=document.createElement('div');identity.className='identity';const n=document.createElement('span');n.textContent=(pesquisadora?'Pesquisadora · ':orientadora?'Orientadora · ':observadora?'Observadora · ':'Meu percurso · ')+nome;const out=document.createElement('button');out.className='secondary';out.textContent='Sair';out.onclick=sair;identity.append(n,out);content.append(identity);const panel=document.createElement('div');panel.id='conteudo';content.append(panel);root.append(nav,content);return panel;
}
function chaveDoAcesso(valor){const text=valor.trim();try{const u=new URL(text);if(u.protocol==='https:'||u.protocol==='http:'){const h=new URLSearchParams(u.hash.slice(1));return (u.searchParams.get('token')||h.get('token')||h.get('chave')||'').trim();}}catch{}return text;}
function montarAberturaPorEscrito(){
 const wrap=document.createElement('section');wrap.className='abertura-por-escrito abertura-texto';
 const titulo=document.createElement('span');titulo.className='eyebrow';titulo.textContent='POR ESCRITO — PERCURSOS DE UMA COORDENADORA';
 const h=document.createElement('h2');h.textContent='Um lugar para pensar a profissão a partir do que vivemos.';
 const p1=document.createElement('p');p1.className='abertura-paragrafo';p1.textContent='A coordenação pedagógica é feita de muitas coisas ao mesmo tempo: escuta, escolhas, encontros, urgências, formação, acompanhamento, perguntas e decisões que nem sempre chegam prontas. Entre o que planejamos e o que de fato acontece, vamos construindo modos de olhar, de agir e de compreender o trabalho.';
 const p2=document.createElement('p');p2.className='abertura-paragrafo';p2.textContent='O Por Escrito nasce como um convite para interromper um pouco a pressa e voltar o olhar para esse percurso. Aqui, não buscamos respostas certas sobre o que significa ser coordenadora. Buscamos palavras para aquilo que vivemos, perguntas para o que ainda não compreendemos e pistas sobre os saberes que vamos construindo no exercício da profissão.';
 const p3=document.createElement('p');p3.className='abertura-paragrafo';p3.textContent='Escrever, neste espaço, é também poder voltar. Voltar a uma situação, a uma escolha, a uma dúvida, a uma lembrança. Às vezes, só quando retomamos o vivido conseguimos perceber o que ele produziu em nós. Talvez por isso faça tanto sentido lembrar que:';
 const ep=document.createElement('blockquote');ep.className='epigrafe';ep.textContent='“A experiência é o que nos passa, o que nos acontece, o que nos toca.”';
 const fonte=document.createElement('p');fonte.className='autor-citacao';fonte.textContent='Jorge Larrosa, 2002';
 const p4=document.createElement('p');p4.className='abertura-paragrafo';p4.textContent='É desse lugar que este percurso pretende acompanhar o tornar-se coordenadora: não como uma identidade pronta, mas como uma construção que acontece no trabalho, nas relações, nas escolhas, nos impasses e nas aprendizagens que vão nos formando.';
 const ass=document.createElement('blockquote');ass.className='assinatura-percurso';ass.textContent='“Há percursos que só conseguimos compreender quando encontramos um lugar para escrevê-los.”';
 const assinatura=document.createElement('p');assinatura.className='autor-citacao';assinatura.textContent='Nanny Oliveira';
 const prox=document.createElement('div');prox.className='daqui-em-diante';
 const ph=document.createElement('h3');ph.textContent='O que você vai encontrar daqui para frente';
 const pp=document.createElement('p');pp.textContent='Um espaço para conhecer quem caminha nesta pesquisa, registrar sua própria trajetória, participar dos Encontros de Partilha, retomar materiais e registros, escrever entre um encontro e outro e acompanhar, ao longo do tempo, o que esse percurso vai fazendo aparecer.';
 prox.append(ph,pp);
 wrap.append(titulo,h,p1,p2,p3,ep,fonte,p4,ass,assinatura,prox);return wrap;
}

function montarPerfilPesquisadora(){
 const wrap=document.createElement('section');wrap.className='perfil-pesquisadora-publico';
 const hero=document.createElement('section');hero.className='perfil-hero';
 const foto=document.createElement('div');foto.className='perfil-foto';
 const img=document.createElement('img');img.alt='Foto de Nanny Oliveira';img.src='https://avatars.githubusercontent.com/u/340365526?v=4';img.onerror=()=>{img.hidden=true;iniciais.hidden=false;};img.onload=()=>{img.hidden=false;iniciais.hidden=true;};
 const iniciais=document.createElement('div');iniciais.className='perfil-iniciais';iniciais.textContent='NO';
 foto.append(img,iniciais);
 const intro=document.createElement('div');intro.className='perfil-apresentacao';
 const olho=document.createElement('span');olho.className='eyebrow';olho.textContent='UM POUCO SOBRE MIM';
 const h=document.createElement('h2');h.textContent='Nanny Oliveira';
 const p=document.createElement('p');p.className='perfil-lead';p.textContent='Antes de ser a pesquisadora deste percurso, sou professora. É desse lugar — atravessado pela sala de aula, pela formação de professores, pela coordenação de processos formativos e pelas muitas perguntas que a educação continua me fazendo — que chego a esta pesquisa.';
 intro.append(olho,h,p);hero.append(foto,intro);
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
