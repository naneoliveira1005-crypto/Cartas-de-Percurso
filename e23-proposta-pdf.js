import { perguntasDaProposta, tituloPropostaM1, tituloMaterialidadeC } from './e23-proposta-m1.js?v=materialidade-c-questoes';

export function imprimirPropostaM1({ grupo, respostas, tituloEncontro, codigo = 'A', preliminar = false, etapas }) {
  const data = tituloEncontro?.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || '25/11/2026';
  const quadro = document.createElement('iframe');
  quadro.dataset.impressaoOficina = '';
  quadro.title = 'Impressão da proposta coletiva';
  quadro.style.cssText = 'position:fixed;width:1px;height:1px;bottom:0;right:0;border:0';
  document.body.append(quadro);
  const doc = quadro.contentDocument;
  doc.documentElement.lang = 'pt-BR';
  doc.title = 'Proposta de acompanhamento — Grupo ' + grupo;
  const css = doc.createElement('style');
  css.textContent = `
    @page { size: A4; margin: 20mm; }
    body { font: 11pt/1.55 Arial, sans-serif; color: #172b24; }
    h1 { font-size: 20pt; margin: 0 0 12pt; }
    h2 { font-size: 12pt; margin: 16pt 0 4pt; break-after: avoid; }
    p { margin: 0 0 8pt; orphans: 2; widows: 2; }
    .resposta { text-align: justify; white-space: pre-wrap; overflow-wrap: anywhere; hyphens: auto; }
  `;
  doc.head.append(css);
  function linha(tag, texto, classe = '') {
    const item = doc.createElement(tag);
    item.textContent = texto;
    item.className = classe;
    doc.body.append(item);
  }
  linha('h1', etapas?'Registro completo do percurso coletivo':tituloPropostaM1);
  linha('p', 'Grupo ' + grupo + (codigo==='C'?' · '+tituloMaterialidadeC:codigo==='B'?' · Materialidade B — Atividades de Língua Portuguesa do 2º ano':' · Materialidade A — Planejamento semanal do Grupo 5'));
  linha('p', 'Data do encontro · ' + data);
  if(etapas)for(const etapa of etapas){
    linha('h2',etapa.titulo);
    linha('p',etapa.identificacao);
    for(const [pergunta,resposta] of etapa.campos){linha('h2',pergunta);linha('p',resposta,'resposta');}
  }else perguntasDaProposta(codigo).slice(0,preliminar?3:4).forEach((pergunta, i) => {
    linha('h2', (i + 1) + '. ' + pergunta);
    linha('p', respostas[i] || 'Campo ainda sem resposta.', 'resposta');
  });
  const janela = quadro.contentWindow;
  const foco = document.activeElement;
  janela.addEventListener('afterprint', () => { quadro.remove(); foco?.focus({preventScroll:true}); }, { once: true });
  janela.focus();
  janela.print();
}

export function controleExportacaoPropostaM1(el, btn, carregar, codigo = 'A') {
  const controles = el('div');
  const escolha = el('select');
  const rotulo = el('label', 'Grupo');
  rotulo.append(escolha);
  const estado = el('p');
  estado.setAttribute('role', 'status');
  let propostas = [];
  const gerar = btn('Gerar esquema em PDF', () => {
    const proposta = propostas.find(item => String(item.grupo) === escolha.value);
    if (proposta) {
      imprimirPropostaM1({...proposta, codigo, preliminar:codigo==='B'&&!proposta.respostas[3]?.trim()});
      controles.dispatchEvent(new Event('esquema-gerado'));
    }
  });
  gerar.disabled = true;
  rotulo.hidden = true;
  estado.textContent = 'Consultando propostas salvas…';
  controles.append(rotulo, gerar, estado);
  Promise.resolve().then(carregar).then(lista => {
    propostas = lista;
    for (const { grupo } of lista) {
      const opcao = el('option', 'Grupo ' + grupo);
      opcao.value = grupo;
      escolha.append(opcao);
    }
    rotulo.hidden = lista.length < 2;
    gerar.disabled = lista.length === 0;
    estado.textContent = lista.length ? '' : 'O PDF estará disponível quando um grupo salvar a proposta da Materialidade '+codigo+'.';
  }).catch(() => { estado.textContent = 'Não foi possível consultar as propostas salvas. Reabra a etapa para tentar novamente.'; });
  return controles;
}

export function propostasSalvasM1(oficina, tituloEncontro, codigo = 'A') {
  const ultimas = new Map();
  for (const versao of oficina.historico_coletivo) {
    const grupo = versao.origem;
    if (versao.bloco !== 1 || !versao.registro.proposta_m1 || oficina.sala.materiais[grupo] !== codigo) continue;
    if(codigo==='B'&&!versao.registro.dados.slice(0,3).every(texto=>texto?.trim())) continue;
    if(codigo==='C'&&(versao.registro.dados.length!==4||!versao.registro.dados.every(texto=>texto?.trim()))) continue;
    if ((ultimas.get(grupo)?.versao ?? 0) < versao.versao) ultimas.set(grupo, versao);
  }
  return [...ultimas].sort(([a],[b]) => a-b).map(([grupo, versao]) => ({
    grupo, respostas: versao.registro.dados, tituloEncontro, codigo
  }));
}
