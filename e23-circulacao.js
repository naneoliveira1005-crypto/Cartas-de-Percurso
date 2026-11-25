export const esperaColegas = 'A produção das colegas ainda está sendo finalizada. Assim que estiver disponível, vocês poderão iniciar a próxima etapa.';
export const orientacaoColegas = 'Agora vocês conhecerão a proposta construída por outro grupo. Leiam a produção das colegas, consultem a materialidade que fundamentou essa proposta e conversem sobre as escolhas apresentadas. O objetivo deste movimento é contribuir para ampliar e aprofundar a reflexão sobre o trabalho da coordenação pedagógica.';
export const perguntasColegas = [
  '1. O que vocês destacam, acrescentariam ou problematizariam na proposta construída pelas colegas?',
  '2. Que perguntas vocês fariam às colegas para aprofundar essa proposta?'
];

const pdfs = {A:'planejamento-grupo-5.pdf?v=22',B:'tres-atividades.pdf',C:'cnca-ciclo-ii.pdf'};
export function consultasColegas(el, propria, recebida) {
  const controles = el('div');
  function consulta(titulo,codigo){
    if(!pdfs[codigo])return;
    const botao=el('button',titulo);
    botao.type='button';
    botao.onclick=()=>{
      const modal=el('dialog');
      modal.setAttribute('aria-label',titulo);
      modal.style.cssText='width:min(95vw,1100px);height:88dvh;padding:.75rem;box-sizing:border-box';
      const fechar=el('button','Fechar materialidade');
      fechar.type='button';
      fechar.onclick=()=>modal.close();
      const pdf=el('iframe');
      pdf.title=titulo;
      pdf.src='materialidades/'+pdfs[codigo];
      pdf.style.cssText='display:block;width:100%;height:calc(100% - 3rem);border:0';
      modal.append(fechar,pdf);
      modal.addEventListener('close',()=>{modal.remove();botao.focus();},{once:true});
      controles.append(modal);
      modal.showModal();
    };
    controles.append(botao);
  }
  if(propria&&propria===recebida)consulta('Consultar materialidade das colegas e do nosso grupo',propria);
  else {
    consulta('Consultar materialidade das colegas',recebida);
    consulta('Consultar nossa materialidade',propria);
  }
  return controles;
}
