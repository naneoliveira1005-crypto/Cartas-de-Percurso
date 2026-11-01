'use strict';
function montarPainel({modulos,selecionado,nome,pesquisadora,navegar,sair}){
 document.body.classList.add('dashboard');const root=document.getElementById('app');root.replaceChildren();
 const nav=document.createElement('nav');nav.className='sidebar';nav.setAttribute('aria-label','Encontros');
 const add=(id,titulo,sub)=>{const b=document.createElement('button');b.type='button';b.className=id===selecionado?'nav-item active':'nav-item';if(id===selecionado)b.setAttribute('aria-current','page');const a=document.createElement('strong');a.textContent=titulo;b.append(a);if(sub){const s=document.createElement('span');s.textContent=sub;b.append(s);}b.onclick=()=>navegar(id);nav.append(b);};
 add('inicio','Início');for(const m of modulos)add(m.id,m.id==='livre'?'Entre encontros':/^e\d$/.test(m.id)?m.id.toUpperCase():m.titulo,m.id==='livre'?'Escreva à pesquisadora':m.titulo.replace(/^E\d\s*[—–-]\s*/, '')+(pesquisadora&&!m.liberado?' · Não liberado':''));if(pesquisadora){add('acessos','Acessos individuais','Links das coordenadoras');add('admin','Administração');}
 const content=document.createElement('section');content.className='workspace';const identity=document.createElement('div');identity.className='identity';const n=document.createElement('span');n.textContent=(pesquisadora?'Pesquisadora · ':'Meu percurso · ')+nome;const out=document.createElement('button');out.className='secondary';out.textContent='Sair';out.onclick=sair;identity.append(n,out);content.append(identity);const panel=document.createElement('div');panel.id='conteudo';content.append(panel);root.append(nav,content);return panel;
}
function chaveDoAcesso(valor){const text=valor.trim();try{const u=new URL(text);if(u.protocol==='https:'||u.protocol==='http:'){const h=new URLSearchParams(u.hash.slice(1));return (u.searchParams.get('token')||h.get('token')||h.get('chave')||'').trim();}}catch{}return text;}
window.montarPainel=montarPainel;window.chaveDoAcesso=chaveDoAcesso;
