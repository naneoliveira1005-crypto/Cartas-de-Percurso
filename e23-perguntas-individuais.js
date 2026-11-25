export function perguntaIndividual(pergunta) {
  return pergunta
    .replace(/de vocês/g, 'de você')
    .replace(/vocês observam/g, 'você observa')
    .replace(/vocês consideram/g, 'você considera')
    .replace(/vocês conversariam/g, 'você conversaria')
    .replace(/vocês identificam/g, 'você identifica')
    .replace(/vocês proporiam/g, 'você proporia')
    .replace(/^Como dariam /, 'Como você daria ');
}
