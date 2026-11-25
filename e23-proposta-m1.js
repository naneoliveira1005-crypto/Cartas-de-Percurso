export const tituloPropostaM1 = 'Nossa proposta de acompanhamento pedagógico';

export const perguntasPropostaM1 = [
  'O que priorizamos no acompanhamento?',
  'Como desenvolveremos o trabalho com a professora?',
  'Como acompanharemos e avaliaremos o desenvolvimento desse trabalho?',
  'O que ainda precisamos compreender ou discutir antes de colocar essa proposta em prática?'
];

const materialidadeB = {
  titulo: 'Materialidade B — Atividades de Língua Portuguesa do 2º ano',
  pdf: 'materialidades/tres-atividades.pdf?v=m2-revisada',
  orientacao: [
    'Vocês receberam atividades que integram sequências didáticas de Língua Portuguesa do 2º ano, organizadas a partir de obras literárias. Considerando a leitura e a reflexão que cada uma realizou individualmente, construam coletivamente uma proposta de atuação da coordenação pedagógica, contemplando o diálogo com a professora, as possibilidades de aprimoramento das atividades e o acompanhamento das aprendizagens das crianças.'
  ]
};

export const tituloMaterialidadeC = 'Materialidade C — Aprendizagens em percurso: de 2026 ao planejamento de 2027';
const orientacaoC = 'Vocês receberam os resultados municipais do Ciclo II do CNCA de 2026. Considerando a leitura e a reflexão que cada uma realizou individualmente, construam coletivamente uma proposta de atuação da coordenação pedagógica que contemple as necessidades de aprendizagem identificadas e a continuidade da escolarização dessas crianças em 2027.';
const discussoesC = [
  ['1. Identificar prioridades', 'Que necessidades de aprendizagem os resultados apresentados revelam e quais merecem atenção prioritária? Por quê?'],
  ['2. Planejar com as professoras', 'Como esses resultados podem orientar o trabalho da coordenação pedagógica com as professoras no planejamento de 2027?'],
  ['3. Acompanhar as aprendizagens', 'Como vocês acompanhariam o trabalho desenvolvido pelas professoras e os avanços nas aprendizagens das crianças ao longo de 2027?']
];

export function perguntasDaProposta(codigo) {
  if (codigo !== 'C') return perguntasPropostaM1;
  return [
    'O que os resultados apresentados revelam sobre as aprendizagens das crianças em 2026?',
    'A partir desses resultados, o que precisamos discutir com as professoras?',
    'Que prioridades e ações de acompanhamento pedagógico propomos para 2027?',
    perguntasPropostaM1[3]
  ];
}

export function orientacaoPropostaM1(el, codigo = 'A') {
  const estilo = new URL('./e23-orientacao-m1.css?v=materialidade-b', import.meta.url).href;
  if (!document.head.querySelector('link[data-orientacao-m1]')) {
    const folha = document.createElement('link');
    folha.rel = 'stylesheet';
    folha.href = estilo;
    folha.dataset.orientacaoM1 = '';
    document.head.append(folha);
  }
  const orientacao = el('section', undefined, 'm1-orientacao-mapa');
  orientacao.dataset.materialidade = codigo;
  const lista = el('div', undefined, 'm1-orientacao-ramos');
  for (const [titulo, pergunta] of (codigo === 'C' ? discussoesC : [
    ['Identificar prioridades', codigo === 'B' ? 'O que nessas atividades merece ser conversado com a professora, considerando as aprendizagens que se pretende favorecer? Por quê?' : 'O que nesse planejamento merece ser conversado com a professora? Por quê?'],
    ['Dialogar com a professora', codigo === 'B' ? 'Como vocês conduziriam essa conversa e que possibilidades de aprimoramento das atividades construiriam com a professora?' : 'Como vocês conduziriam essa conversa e que possibilidades de trabalho construiriam com a professora?'],
    ['Acompanhar as aprendizagens', codigo === 'B' ? 'Depois dessa conversa, como acompanhariam o desenvolvimento das atividades e identificariam o que as crianças estão aprendendo?' : 'Depois dessa conversa, como acompanhariam o trabalho realizado e as aprendizagens das crianças?']
  ])) {
    const bloco = el('article');
    bloco.append(el('h4', titulo), el('p', pergunta));
    lista.append(bloco);
  }

  const instrucoes = el('p', 'As questões abaixo podem ajudar vocês a pensar e construir essa proposta. ');
  instrucoes.append(el('strong', 'Não é necessário respondê-las separadamente por escrito.'));
  orientacao.append(
    el('h3', codigo==='C'?'Orientações para este percurso':'Orientação ao grupo'),
    ...(codigo === 'C' ? [el('p', orientacaoC)] : codigo === 'B' ? materialidadeB.orientacao.map(texto => el('p', texto)) : [el('p', 'Vocês receberam um planejamento semanal do Grupo 5 para acompanhamento pedagógico. Considerando a leitura e a reflexão que cada uma realizou individualmente, construam coletivamente uma proposta de atuação da coordenação pedagógica, contemplando o diálogo com a professora, as possibilidades de aprimoramento do planejamento e o acompanhamento das experiências e aprendizagens das crianças.')]),
    instrucoes,
    el('p', 'Acompanhamento pedagógico', 'm1-orientacao-centro'),
    lista
  );
  return orientacao;
}

export function conferirPropostaM1(el, rascunho = [], codigo = 'A', exportacao) {
   const conferencia=el('section',undefined,'e23 oficina-painel m1-proposta-textos');
   conferencia.append(el('h3','Assim pensamos inicialmente'),el('p',codigo==='C'?tituloMaterialidadeC:codigo==='B'?materialidadeB.titulo:'Materialidade A — Planejamento semanal do Grupo 5'),orientacaoPropostaM1(el,codigo));
   const areas=el('div',undefined,'oficina-areas');
   const consulta=el('section',undefined,'oficina-consulta');
   const documento=el('iframe');
   documento.className='e23-source';
   documento.title=codigo==='C'?tituloMaterialidadeC:codigo==='B'?materialidadeB.titulo:'Planejamento semanal do Grupo 5';
   documento.loading='lazy';
   documento.src=codigo==='C'?'materialidades/cnca-ciclo-ii.pdf':codigo==='B'?materialidadeB.pdf:'materialidades/planejamento-grupo-5.pdf?v=22';
   consulta.append(el('h3','Materialidade em análise'),documento);
   const proposta=el('section',undefined,'oficina-escrita');
   proposta.append(el('h3',tituloPropostaM1,'oficina-registro-titulo'),el('h4','Produção coletiva do grupo'));
   proposta.append(el('p','Campos de conferência. O texto digitado fica nesta aba.','muted'));
   const conclusao = codigo==='B' ? el('div') : proposta;
   if(codigo==='B')conclusao.hidden=true;
   for(const [i,pergunta] of perguntasDaProposta(codigo).entries()){
     if(i===3)(codigo==='B'?conclusao:proposta).append(el('h4','Para concluir nossa proposta'));
     const rotulo = el('label', (i+1)+'. '+pergunta, 'e23-question');
     const campo = el('textarea');
     campo.rows = 4;
     campo.value = rascunho[i] || '';
     campo.oninput = () => { rascunho[i] = campo.value; };
     rotulo.append(campo);
     (i===3?conclusao:proposta).append(rotulo);
   }
   if(exportacao)proposta.append(exportacao);
   if(codigo==='B'){
     exportacao?.addEventListener('esquema-gerado',()=>{conclusao.hidden=false;});
     proposta.append(conclusao);
   }
   areas.append(consulta,proposta);
   conferencia.append(areas);
   return conferencia;
}
