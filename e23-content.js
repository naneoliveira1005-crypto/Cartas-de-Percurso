export const STAGES = ['Preparação','Escolha da experiência','Nosso primeiro olhar','O olhar das colegas','O que sustenta o nosso olhar?','Ampliando nosso olhar','De volta à nossa construção','Plenária'];
export const FIRST = [
 'Que conhecimentos vocês reconhecem na maneira como a coordenadora lidou com essa situação?',
 'Que outros conhecimentos poderiam ajudar a lidar com essa situação?',
 'Como e em quais experiências podemos construir esses conhecimentos?',
 'De que condições de trabalho a coordenadora precisa para atuar em situações como essa?',
 'O que dessa experiência também faz parte do nosso trabalho como coordenadoras?'];
export const SUPPORT = 'Considerem a organização do trabalho na escola, o tempo disponível, os recursos e o apoio institucional, entre outras condições.';
export const INTERLOCUTION = ['Concordamos — com o quê? Por quê?','Discordamos — de quê? Por quê?','Acrescentamos — o quê? Por quê?'];
export const COMMON = 'Em que conhecimentos nos apoiamos para fazer essa análise?';
export const MATERIALS = {
 A:{title:'Planejamento semanal do Grupo 5',questions:['O que esse planejamento revela sobre o que se ensina e o que se pretende que as crianças aprendam?','O que precisamos compreender melhor nesse planejamento para realizar seu acompanhamento pedagógico?',COMMON]},
 B:{title:'A Casa Sonolenta — 2º ano',questions:['O que os estudantes podem aprender com essas atividades?','O que precisamos compreender melhor sobre essas atividades para acompanhar o trabalho da professora?',COMMON]},
 C:{title:'Resultados do CNCA — Ciclo II',questions:['O que esses resultados nos dizem sobre as aprendizagens dos estudantes?','O que precisamos compreender melhor sobre essas aprendizagens para acompanhar o trabalho das professoras?',COMMON]}
};
export const BRIDGE = 'O que a análise dessa materialidade acrescenta à nossa compreensão da experiência da colega?';
export const BRIDGE_HELP = 'Expliquem as relações que encontraram. Caso não identifiquem uma relação, expliquem por quê.';
export const RETURN = ['Depois das contribuições das colegas, o que mantemos ou mudamos em nossa primeira construção? Por quê?','O que aprendemos com esse percurso?'];
export const LETTER = ['O que você gostaria que eu compreendesse sobre sua trajetória como coordenadora pedagógica?','O que você aprendeu desde que assumiu a coordenação? O que ainda precisa aprender?','Que dúvidas, dificuldades ou inseguranças você ainda não conseguiu compartilhar nos nossos encontros?','O que você gostaria de ter encontrado quando assumiu a coordenação pedagógica?','O que não pode faltar no Referencial da Coordenação Pedagógica de Barrocas para que ele realmente ajude você no seu trabalho?'];
export const E1 = ['Como apoiar os professores diante das diferentes necessidades de aprendizagem dos estudantes?','Como garantir a participação efetiva dos professores no planejamento coletivo?','Como construir uma rotina de acompanhamento contínuo que permita analisar e sustentar as ações pedagógicas?','Como sustentar a formação continuada em serviço diante das demandas emergenciais do cotidiano escolar?'];
export function originFor(group,count,stage){if(![3,4].includes(count)||group<1||group>count)throw Error('Grupo inválido');return stage>=3&&stage<=5?group%count+1:group;}
export function remaining(session,serverNow){if(session.stage<1||session.stage>6)return null;const at=session.state==='pausado'?Date.parse(session.paused_at):serverNow;const main=Date.parse(session.started_at)+(session.durations[session.stage-1]+session.extra_seconds)*1000;return {seconds:Math.max(0,Math.ceil((main+120000-at)/1000)),grace:at>=main,mainSeconds:Math.max(0,Math.ceil((main-at)/1000))};}
export function payloadFor(stage,values){const keys=stage===1?['experience_id']:stage===2?['q1','q2','q3','q4','q5']:stage===4?['material','q1','q2','q3']:stage===6?['q1','q2']:['text'];return Object.fromEntries(keys.filter(k=>values[k]!==undefined).map(k=>[k,String(values[k])]));}
export function readableExport(data){
 const lines=['POR ESCRITO — E2–E3',data.session.title,data.session.is_test?'HOMOLOGAÇÃO — REGISTROS DE TESTE':'REGISTROS DA PESQUISA','Exportação: '+data.exported_at,''];
 for(const r of [...(data.records||[])].sort((a,b)=>a.origin_group-b.origin_group||a.stage-b.stage)){
  lines.push('GRUPO DE ORIGEM '+r.origin_group+' · '+STAGES[r.stage]+' · autoria: Grupo '+r.author_group+' · versão '+r.revision,'Registrado em: '+(r.updated_at||'—'),'Situação: '+(r.submitted?'Entregue':'Registro parcial'));
  if(r.stage===1){lines.push(r.payload.experience_snapshot?.title||'Escolha não registrada',r.payload.experience_snapshot?.text||'');}
  else {const questions=r.stage===2?FIRST:r.stage===3?['Nossa interlocução']:r.stage===4?(MATERIALS[r.payload.material]?.questions||[]):r.stage===5?[BRIDGE]:RETURN;
   if(r.stage===4)lines.push('Materialidade: '+(MATERIALS[r.payload.material]?.title||'Não escolhida'));
   questions.forEach((q,i)=>lines.push(q,r.payload[[3,5].includes(r.stage)?'text':'q'+(i+1)]||'Sem registro.',''));
  }lines.push('');
 }lines.push('Histórico completo e procedência constam na exportação JSON.');return lines.join('\n');
}
