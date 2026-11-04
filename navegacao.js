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
 const wrap=document.createElement('section');wrap.className='abertura-por-escrito';
 const titulo=document.createElement('span');titulo.className='eyebrow';titulo.textContent='POR ESCRITO — PERCURSOS DE UMA COORDENADORA';
 const h=document.createElement('h2');h.textContent='Um lugar para registrar, retomar e compreender o percurso.';
 const p=document.createElement('p');p.className='perfil-lead';p.textContent='Por Escrito é um espaço de acompanhamento da pesquisa. Aqui, registros, perguntas, memórias e materiais podem ser retomados ao longo do caminho, sem transformar o percurso em uma sequência de tarefas. É um lugar para guardar o que o encontro faz pensar e perceber o que ganha novos sentidos quando voltamos ao que foi vivido.';
 const ep=document.createElement('blockquote');ep.className='epigrafe';ep.textContent='“A experiência é o que nos passa, o que nos acontece, o que nos toca.”';
 const fonte=document.createElement('p');fonte.className='muted';fonte.textContent='Jorge Larrosa Bondía · Notas sobre a experiência e o saber de experiência (2002)';
 const ass=document.createElement('blockquote');ass.className='assinatura-percurso';ass.textContent='“Há percursos que só conseguimos compreender quando encontramos um lugar para escrevê-los.”';
 const assinatura=document.createElement('p');assinatura.className='muted';assinatura.textContent='Nanny Oliveira';
 const duo=document.createElement('div');duo.className='duo-percurso';
 const mim=document.createElement('article');mim.className='card';
 mim.innerHTML='<span class="eyebrow">UM POUCO SOBRE MIM</span><h3>Nanny Oliveira</h3><p>Chego a esta pesquisa como professora, formadora e pesquisadora, trazendo uma relação com Barrocas que antecede esta investigação. Por isso, estar aqui também exige de mim escuta, revisão de certezas e atenção ao que minhas próprias intervenções produzem no percurso.</p>';
 const nos=document.createElement('article');nos.className='card';
 nos.innerHTML='<span class="eyebrow">MUITO SOBRE NÓS</span><h3>As coordenadoras que fazem este percurso</h3><p>Este percurso é construído com coordenadoras e articuladoras pedagógicas da Rede Municipal de Barrocas. Suas trajetórias, tempos de experiência, perguntas, diferenças, impasses e saberes produzidos no trabalho cotidiano dão forma ao que esta pesquisa pode compreender.</p>';
 duo.append(mim,nos);wrap.append(titulo,h,p,ep,fonte,ass,assinatura,duo);return wrap;
}
window.montarPainel=montarPainel;window.chaveDoAcesso=chaveDoAcesso;window.montarAberturaPorEscrito=montarAberturaPorEscrito;
