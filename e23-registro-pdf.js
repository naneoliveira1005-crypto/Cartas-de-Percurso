import { tituloMaterialidadeC } from './e23-proposta-m1.js?v=materialidade-c-questoes';

const materiais={
  A:'Materialidade A — Planejamento semanal do Grupo 5',
  B:'Materialidade B — Atividades de Língua Portuguesa do 2º ano',
  C:tituloMaterialidadeC+' · CNCA, Ciclo II de 2026'
};

export async function montarRegistroPDF(pdfLib,fontkit,fonte,{grupo,codigo,tituloEncontro,etapas}){
  const {PDFDocument,PageSizes,rgb}=pdfLib;
  const pdf=await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonteTexto=await pdf.embedFont(fonte,{subset:true});
  const caracteres=new Set(fonteTexto.getCharacterSet());
  const [largura,altura]=PageSizes.A4;
  const margem=57, medida=largura-2*margem;
  const cor=rgb(.09,.24,.20);
  let pagina,y;
  function novaPagina(){
    pagina=pdf.addPage(PageSizes.A4);
    y=altura-margem;
    pagina.drawText(String(pdf.getPageCount()),{x:margem,y:29,size:9,font:fonteTexto,color:cor});
  }
  function paragrafo(texto,tamanho,justificar=false){
    const medir=s=>fonteTexto.widthOfTextAtSize(s,tamanho);
    const entrelinhas=tamanho*1.5;
    function linha(s,justa){
      if(y-entrelinhas<margem)novaPagina();
      const palavras=s.split(' ');
      if(justa&&palavras.length>1){
        const espaco=(medida-palavras.reduce((total,p)=>total+medir(p),0))/(palavras.length-1);
        let x=margem;
        for(const palavra of palavras){
          pagina.drawText(palavra,{x,y:y-tamanho,size:tamanho,font:fonteTexto,color:cor});
          x+=medir(palavra)+espaco;
        }
      }else if(s)pagina.drawText(s,{x:margem,y:y-tamanho,size:tamanho,font:fonteTexto,color:cor});
      y-=entrelinhas;
    }
    for(const bloco of String(texto??'').normalize('NFC').split(/\r\n?|\n/)){
      const textoSeguro=Array.from(bloco,c=>caracteres.has(c.codePointAt(0))||/\s/u.test(c)?c:'[U+'+c.codePointAt(0).toString(16).toUpperCase()+']').join('');
      let atual='';
      for(const palavra of textoSeguro.trim().split(/\s+/u)){
        const candidato=atual?atual+' '+palavra:palavra;
        if(medir(candidato)<=medida){atual=candidato;continue;}
        if(atual){linha(atual,justificar);atual='';}
        for(const letra of palavra){
          if(medir(atual+letra)>medida){linha(atual,false);atual='';}
          atual+=letra;
        }
      }
      linha(atual,false);
    }
    y-=6;
  }
  novaPagina();
  pdf.setTitle('Registro completo do percurso coletivo — Grupo '+grupo);
  paragrafo('Registro completo do percurso coletivo',19);
  paragrafo('Grupo '+grupo+' · '+(materiais[codigo]||'Materialidade do grupo'),11);
  const data=tituloEncontro?.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0];
  if(data)paragrafo('Data do encontro · '+data,10);
  for(const etapa of etapas){
    if(y<margem+105)novaPagina();
    y-=9;
    paragrafo(etapa.titulo,15);
    paragrafo(etapa.identificacao,10);
    for(const [pergunta,resposta] of etapa.campos){
      if(y<margem+55)novaPagina();
      paragrafo(pergunta,12);
      paragrafo(resposta,11,true);
    }
  }
  return pdf.save();
}

function carregarScript(nome,chave){
  if(window[chave])return Promise.resolve(window[chave]);
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('./vendor/'+nome,import.meta.url).href;
    script.onload=()=>window[chave]?resolve(window[chave]):reject(Error('Gerador de PDF indisponível.'));
    script.onerror=()=>{script.remove();reject(Error('Não foi possível carregar o gerador de PDF.'));};
    document.head.append(script);
  });
}

let recursos;
export async function baixarRegistroPDF(opcoes){
  recursos??=Promise.all([
    carregarScript('pdf-lib.min.js','PDFLib'),
    carregarScript('fontkit.umd.min.js','fontkit'),
    fetch(new URL('./vendor/DejaVuSans.ttf',import.meta.url)).then(r=>{
      if(!r.ok)throw Error('Não foi possível carregar a fonte do PDF.');
      return r.arrayBuffer();
    })
  ]).catch(e=>{recursos=null;throw e;});
  const [pdfLib,fontkit,fonte]=await recursos;
  const bytes=await montarRegistroPDF(pdfLib,fontkit,fonte,opcoes);
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const link=document.createElement('a');
  link.href=url;
  link.download='Por-Escrito-Percurso-Grupo-'+opcoes.grupo+'.pdf';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
