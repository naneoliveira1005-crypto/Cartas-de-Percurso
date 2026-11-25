import { perguntasDaProposta, tituloMaterialidadeC } from './e23-proposta-m1.js?v=materialidade-c-questoes';
import { perguntasColegas } from './e23-circulacao.js';

export const etapasColetivas = ['Assim pensamos inicialmente','O olhar das colegas','Dialogamos com as colegas','Revisitamos nossa análise','Nossa contribuição para o Referencial'];
const materiais = {A:'Materialidade A — Planejamento semanal do Grupo 5',B:'Materialidade B — Atividades de Língua Portuguesa do 2º ano',C:tituloMaterialidadeC+' · CNCA, Ciclo II de 2026'};
export const orientacaoPlenaria = 'Retornem à sala principal do encontro. Vamos compartilhar nossas reflexões e contribuições.';

export function percursoCompleto(sala, grupo, conteudo) {
  const parceiro=sala.sala.pares[grupo-1];
  const etapas=[];
  for(let bloco=1;bloco<=5;bloco++){
    const origem=bloco===2?parceiro:grupo;
    const registro=sala.registros.find(r=>r.origem===origem&&r.bloco===bloco&&r.autora==null&&r.finalizado);
    if(!registro)continue;
    const codigo=sala.sala.materiais[origem];
    const historico=sala.historico_coletivo.filter(h=>h.origem===origem&&h.bloco===bloco&&h.grupo_autor===grupo&&h.registro.finalizado).sort((a,b)=>a.versao-b.versao);
    const versoes=historico.length?historico:[{versao:registro.versao,registro}];
    for(const v of versoes){
      const dados=v.registro.dados;
      const devolutiva=sala.registros.find(r=>r.origem===grupo&&r.bloco===2&&r.autora==null&&r.finalizado);
      const perguntas = bloco===1 ? (v.registro.proposta_m1?perguntasDaProposta(codigo):sala.perguntas?.[codigo]||perguntasDaProposta(codigo))
        : bloco===2 ? perguntasColegas
        : bloco===3 ? (devolutiva?.dados.slice(1).filter(q=>q.trim())||[])
        : [bloco===4?conteudo.retomada:conteudo.referencial];
      const campos=v.registro.perguntas_e_respostas?.map(x=>[x.pergunta,x.resposta]) ||
        (bloco===2?[[perguntas[0],dados[0]],[perguntas[1],dados.slice(1).join('\n')]]:dados.map((r,i)=>[perguntas[i]||'Resposta '+(i+1),r]));
      const data=v.registrado_em?new Date(v.registrado_em).toLocaleString('pt-BR',{timeZone:'America/Bahia'}):'';
      etapas.push({titulo:etapasColetivas[bloco-1],identificacao:['Grupo '+grupo,bloco===2?'Proposta do Grupo '+origem:null,materiais[codigo],'Versão '+v.versao,data].filter(Boolean).join(' · '),campos});
    }
  }
  return etapas;
}

export function mostrarPercursoCompleto(el, etapas) {
  const sec=el('section');
  const mostrarVersao=(destino,etapa)=>{
    destino.append(el('p',etapa.identificacao,'muted'));
    for(const [pergunta,resposta] of etapa.campos)destino.append(el('h4',pergunta),el('p',resposta,'read'));
  };
  for(const titulo of etapasColetivas){
    const versoes=etapas.filter(etapa=>etapa.titulo===titulo);
    const item=el('details',undefined,'card');
    item.append(el('summary',titulo));
    const atual=versoes.at(-1);
    if(atual){
      item.append(el('h4','Versão mais recente'));
      mostrarVersao(item,atual);
      if(versoes.length>1){
        const historico=el('details');
        historico.append(el('summary','Versões anteriores'));
        for(const versao of versoes.slice(0,-1).reverse()){
          const anterior=el('details');
          anterior.append(el('summary',versao.identificacao));
          for(const [pergunta,resposta] of versao.campos)anterior.append(el('h4',pergunta),el('p',resposta,'read'));
          historico.append(anterior);
        }
        item.append(historico);
      }
    }else item.append(el('p','Nenhum registro nesta etapa.','muted'));
    sec.append(item);
  }
  return sec;
}
