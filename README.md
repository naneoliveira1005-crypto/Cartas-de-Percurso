# Ambiente Individual de Registros da Pesquisa

Site estático publicado no GitHub Pages, com dados privados no Supabase.

- Chaves anteriores preservadas; entrada manual ou compatibilidade com links antigos.
- E2 em quatro blocos, rascunho persistente, envio imutável e complementos separados.
- E1 contém apenas memória; materiais precisam de autorização e liberação explícitas.
- E3–E5 e Carta inicialmente ocultos. Espaço espontâneo opcional e permanente.
- Painel em organizador.html: filtros, exportação CSV/TXT/JSON, liberação, novos participantes até 35, preparação de encontros e materiais.
- Não há envio automático de e-mail nem transferência de respostas para o coletivo.

## Segurança
As funções públicas encaminham para funções privadas que verificam a chave em cada chamada. As tabelas privadas têm RLS habilitado e nenhum acesso direto para anon/authenticated. Os hashes de chaves existentes são mantidos. Respostas enviadas têm proteção contra sobrescrita e exclusão; rascunhos usam revisão para impedir conflitos entre abas. Chaves e registros nunca devem ser incluídos neste repositório.

## Validação
Testes transacionais revertidos: identidade, chave inválida, isolamento entre participantes, rascunho, conflito de revisões, envio, complemento, registros espontâneos múltiplos, módulos bloqueados, acesso administrativo e capacidade de 35. Conferidos hashes dos acessos existentes e conteúdo original após migração.

## Preservação
Versão anterior preservada no branch backup-antes-ambiente-individual. Backup dos dados foi entregue privadamente à pesquisadora; não está neste repositório. Os SQLs em database documentam mudanças já aplicadas e não devem ser executados novamente sem revisão.
