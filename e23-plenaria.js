import { etapasColetivas } from './e23-fechamento.js';

const focos = [
  ['Prioridade','Trabalho com as professoras','Acompanhamento','Questão em aberto'],
  ['Contribuição do grupo','Perguntas às colegas'],
  ['Resposta à primeira pergunta','Resposta à segunda pergunta'],
  ['O que o grupo revisitou'],
  ['Contribuição para o Referencial']
];

function trecho(texto) {
  const limpo=texto.replace(/\s+/g,' ').trim();
  return limpo.length<=150?limpo:limpo.slice(0,150).replace(/\s+\S*$/,'')+'…';
}

export function esquemaPlenaria(etapas) {
  return etapasColetivas.flatMap((titulo,i)=>{
    const ultima=etapas.filter(e=>e.titulo===titulo).at(-1);
    if(!ultima)return [];
    return [{titulo,itens:ultima.campos.flatMap(([,resposta],j)=>resposta?.trim()?
      [{foco:focos[i][j]||'Resposta '+(j+1),trecho:trecho(resposta)}]:[])}];
  });
}

export function mostrarEsquema(el,esquema) {
  const painel=el('section');
  painel.append(el('h3','Esquema para a plenária'));
  for(const etapa of esquema){
    const cartao=el('article',undefined,'card');
    cartao.append(el('h4',etapa.titulo));
    const lista=el('ul');
    for(const item of etapa.itens){
      const linha=el('li',item.trecho);
      linha.prepend(el('strong',item.foco+' — '));
      lista.append(linha);
    }
    cartao.append(lista);
    painel.append(cartao);
  }
  return painel;
}

export function montarPowerPoint(PptxGenJS,{grupo,materialidade,esquema}){
  const pptx=new PptxGenJS();
  pptx.layout='LAYOUT_WIDE';
  pptx.title='Por Escrito · Plenária · Grupo '+grupo;
  const verde='173D34', ouro='A68143', papel='FCF9F0';
  function base(titulo,numero){
    const slide=pptx.addSlide();
    slide.background={color:papel};
    slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:.16,line:{transparency:100},fill:{color:ouro}});
    slide.addText('POR ESCRITO  ·  OFICINA E2–E3',{x:.85,y:.5,w:11.6,h:.4,fontSize:14,bold:true,color:verde});
    slide.addText(titulo,{x:.85,y:1.05,w:11.6,h:1,fontSize:30,bold:true,color:verde,margin:0});
    slide.addText('Grupo '+grupo+'   ·   '+numero,{x:.85,y:7,w:11.6,h:.2,fontSize:11,color:verde,margin:0});
    return slide;
  }
  const capa=base('Nosso percurso coletivo',1);
  capa.addText(materialidade,{x:.85,y:2.35,w:11.4,h:1.2,fontSize:26,color:verde,margin:0});
  capa.addText('Trechos da produção coletiva para a plenária',{x:.85,y:4.05,w:11.4,h:.5,fontSize:18,color:verde,margin:0});
  esquema.forEach((etapa,i)=>{
    const slide=base(etapa.titulo,i+2);
    etapa.itens.forEach((item,j)=>{
      const y=2.15+j*1.04;
      slide.addText(item.foco,{x:.85,y,w:11.5,h:.28,fontSize:15,bold:true,color:verde,margin:0});
      slide.addText(item.trecho,{x:.85,y:y+.32,w:11.5,h:.65,fontSize:18,color:verde,margin:0,valign:'top'});
    });
  });
  return pptx;
}

let biblioteca;
export async function baixarPowerPoint(opcoes){
  biblioteca??=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('./vendor/pptxgen.bundle.js',import.meta.url).href;
    script.onload=()=>resolve(window.PptxGenJS);
    script.onerror=()=>{script.remove();biblioteca=null;reject(Error('Não foi possível carregar o gerador de PowerPoint.'));};
    document.head.append(script);
  });
  const pptx=montarPowerPoint(await biblioteca,opcoes);
  await pptx.writeFile({fileName:'Por-Escrito-Plenaria-Grupo-'+opcoes.grupo+'.pptx'});
}
