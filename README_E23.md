# Por Escrito E2 e E3

Extensão da plataforma existente para o encontro integrado de 25 de novembro de 2026. A branch de desenvolvimento não substitui a versão pública. A liberação às coordenadoras depende da homologação e autorização da pesquisadora.

## Código e build

Os arquivos `e23.html`, `e23.js`, `e23.css` e `e23-content.js` contêm o percurso integrado. A navegação anterior continua disponível. A Carta mantém seu campo único e seu mecanismo existente; foram atualizadas somente as cinco perguntas inspiradoras.

Execute `npm test` e `npm run build`. O diretório `dist` contém somente recursos do site. Nenhum relato, materialidade privada, token de teste ou backup deve entrar no repositório ou no pacote estático.

## Banco e arquivos

As migrações em `supabase/migrations` são aditivas. Elas criam as tabelas `private.e23_*`, a API autenticada `e23_api` e o bucket privado `por-escrito-e23`. As funções e tabelas anteriores permanecem intactas.

O projeto utiliza links individuais com hash, e não contas Supabase Auth. Cada operação autentica o acesso no servidor. Os papéis de participante, observadora, orientadora e pesquisadora são resolvidos no banco; não são aceitos do navegador. As contas TESTE ficam restritas a uma sessão e não acessam a administração original.

A função `por-escrito-e23-files` usa a chave de serviço apenas no ambiente do servidor. Confere permissão, MIME, assinatura, tamanho e hash. Os downloads usam endereço assinado temporário. Não criar políticas de acesso público ao bucket.

## Escrita e circulação

Cada grupo escolhe uma pessoa para registrar a construção. A reserva de escrita é renovada durante a consulta, com controle de revisão para impedir sobrescrita entre abas. Todas as versões ficam preservadas. A circulação é 1 recebe 2, 2 recebe 3 e assim sucessivamente; o último recebe 1. Na revisitação, cada grupo recebe sua construção de origem com as contribuições das colegas.

A API conserva o relógio do servidor. Cada etapa tem duração configurada mais 120 segundos de finalização. A primeira consulta após o prazo efetiva a transição de todos os grupos. Mesmo sem clientes conectados, o próximo acesso recupera a etapa correspondente ao tempo decorrido. O intervalo de consulta da interface é de três segundos; pode haver essa pequena diferença de atualização visual, sem alterar os prazos no servidor.

Rascunhos sem confirmação continuam neste dispositivo. Após recarregar a página, assumir a escrita e usar “Recuperar meu rascunho nesta tela”. Se a etapa já terminou, o texto segue para a fila de recuperação da pesquisadora. Não limpa nem substitui a produção encerrada.

## Testes

- `tests/engine.test.js`: circulação, relógio, campos e tipos de arquivo.
- `tests/security-clock.sql`: transação revertida, limites de 15+2 minutos, RLS, funções privilegiadas e contas TESTE.
- `tests/contingency.sql`: pausa, retomada, prorrogação, liberação excepcional e recuperação tardia.
- `tests/legacy-letter.sql`: funções originais da Carta sob o papel anon. Toda a transação é revertida; a carta não é publicada.
- `tests/reserved-session.sql`: criação reservada e bloqueio de participantes antes da liberação.
- `tests/integration.py`: integração real de três e quatro grupos, PDFs e áudio. Exige credenciais TESTE e materiais fora do repositório. Não executar com contas reais.

O servidor `scripts/qa-server.mjs` é exclusivamente local. Ele mapeia nomes de perfis para credenciais TESTE guardadas fora do repositório. Não integra o pacote publicado.

## Homologação e implantação

Usar o acesso habitual de pesquisadora no ambiente privado de homologação. Consultar as sessões identificadas como TESTE, a abertura, as materialidades e a plenária. O painel permite preparar um novo encontro reservado, definir três ou quatro grupos e preencher os tempos. Uma sessão real nasce sem publicação. As experiências só circulam quando a versão desidentificada e sua autorização são registradas.

Não publicar a branch principal nem liberar uma sessão real sem autorização final. E4, E5 e Referencial permanecem em preparação. Grupos definitivos, tempos, prazo da Carta e condução da plenária dependem da pesquisadora.

## Reversão

O ponto anterior está na branch `backup/antes-e23-20261122`, commit `d5abb630f86098463fc588e6a70ae3f6f602910e`. Enquanto a produção não for atualizada, basta encerrar a homologação; a versão pública já é a anterior.

Após eventual liberação, suspender o encontro no painel e exportar seus registros. Reverter o commit da atualização no GitHub e republicar a versão anterior. Preservar as tabelas novas e o bucket para manter os registros produzidos; não usar DROP, TRUNCATE nem restauração integral sobre dados mais recentes. Um restauro de desastre deve ser ensaiado em ambiente separado a partir do backup privado, com conferência de esquema, permissões, registros e hashes.
