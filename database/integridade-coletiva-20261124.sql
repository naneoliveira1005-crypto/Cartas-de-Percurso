BEGIN;
CREATE OR REPLACE FUNCTION public.oficina_integrada(p_token text, p_sid uuid, p_acao text DEFAULT 'ler'::text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
<<oficina>>
declare a jsonb:=private.e23_identify(p_token); uid uuid:=(a->>'id')::uuid; adm boolean:=a->>'role'='pesquisadora';
 s private.e23_sessions; w private.oficina_salas; g int; o int; b int; owner_id uuid; dados jsonb; destinos int[]; rev int; esperado int; entregue boolean; recebido private.oficina_registros; inicial private.oficina_registros; perguntas jsonb; vinculos jsonb;
begin
 select * into s from private.e23_sessions where id=p_sid for share;
 if not found or (a->>'is_test')::boolean and (not s.is_test or (a->>'session_id')::uuid<>p_sid)
    or (not adm and (a->>'role'<>'participante' or (not (a->>'is_test')::boolean and (s.is_test or not s.published)))) then
   raise exception 'Acesso reservado';
 end if;
 select * into strict w from private.oficina_salas where sessao=p_sid for update;
 select group_no into g from private.e23_members where session_id=p_sid and actor_id=uid;
 if p_acao='configurar' and adm and w.fase=0 then
 select array_agg(x::int order by pos) into destinos from jsonb_array_elements_text(p->'pares') with ordinality t(x,pos);
 if s.group_count is null or (s.group_count=1 and coalesce(cardinality(destinos),0)<>0) or (s.group_count>1 and cardinality(destinos) is distinct from s.group_count) or exists(select 1 from generate_series(1,s.group_count)i where (s.group_count>1 and (not coalesce(i=any(destinos),false) or destinos[i]=i)) or coalesce(p->'materiais'->>i::text,'') not in ('A','B','C')) then raise exception 'Confira os grupos, materialidades e interlocutoras';end if;
 update private.oficina_salas set pares=coalesce(destinos,array[]::int[]),materiais=p->'materiais' where sessao=p_sid;
 elsif p_acao='avancar' and adm and w.fase<8 then
 if w.fase=0 and (s.group_count is null or cardinality(w.pares)<>case when s.group_count=1 then 0 else s.group_count end or exists(select 1 from generate_series(1,s.group_count) i where not(w.materiais ? i::text) or not exists(select 1 from private.e23_members m where m.session_id=p_sid and m.group_no=i))) then raise exception 'Confirme os grupos antes de iniciar';end if;
 update private.oficina_salas set fase=fase+1,inicio=now(),pausa=null,segundos=(array[600,3000,600,1800,1500,600,0,0])[fase+1] where sessao=p_sid;
 elsif p_acao='tempo' and adm and w.fase between 1 and 6 then
 if p->>'tipo'='pausar' then update private.oficina_salas set pausa=coalesce(pausa,now()) where sessao=p_sid;
 elsif p->>'tipo'='retomar' then update private.oficina_salas set inicio=inicio+(now()-pausa),pausa=null where sessao=p_sid and pausa is not null;
 else update private.oficina_salas set segundos=greatest(0,least(14400,segundos+(p->>'delta')::int)) where sessao=p_sid;end if;
 elsif p_acao in ('salvar','revisar') then
 b:=(p->>'bloco')::int; o:=g;dados:=p->'dados';rev:=(p->>'versao')::int;
 if adm or b is null or jsonb_typeof(dados) is distinct from 'array' or octet_length(dados::text)>120000 then raise exception 'Registro inválido';end if;
 if rev is null or rev<0 or (p_acao='revisar' and b not between 1 and 5) then raise exception 'Versão ou bloco inválido';end if;
 if b=-1 and w.fase=0 then owner_id:=uid;o:=0;if coalesce(dados->>0,'') not in ('A','B','C') then raise exception 'Escolha inválida';end if;
 elsif b=0 and w.fase=1 and g is not null then owner_id:=uid;
 elsif g is null or (p_acao='salvar' and not((b=1 and w.fase=2) or (b=2 and w.fase=4) or (b in (3,4) and w.fase=5) or (b=5 and w.fase=6))) then raise exception 'Movimento fechado';
 else
 if not exists(select 1 from private.e23_writers where session_id=p_sid and group_no=g and actor_id=uid and expires_at>now() and device=p->>'device') then raise exception 'Assuma a escrita do grupo';end if;
 if b=2 then o:=w.pares[g];if not exists(select 1 from private.oficina_registros where sessao=p_sid and origem=o and bloco=1 and finalizado) then raise exception 'Aguardando a análise inicial';end if;end if;
 if b=3 and not exists(select 1 from private.oficina_registros where sessao=p_sid and origem=o and bloco=2 and finalizado) then raise exception 'Aguardando a interlocução';end if;
 end if;
 entregue:=coalesce((p->>'final')::boolean,false);
 if b>0 then
   if exists(select 1 from jsonb_array_elements(dados) x where jsonb_typeof(x)<>'string') then raise exception 'Campo de texto inválido';end if;
   if b=2 and entregue then
     select jsonb_build_array(dados->>0)||coalesce(jsonb_agg(x order by ord) filter(where ord>1 and x ~ '[^[:space:]]'),'[]'::jsonb)
     into dados from jsonb_array_elements_text(dados) with ordinality t(x,ord);
   end if;
   if b=3 then
     select * into strict recebido from private.oficina_registros where sessao=p_sid and origem=o and bloco=2 and autora is null and finalizado;
     if p ? 'versao_interlocucao' and (p->>'versao_interlocucao')::int is distinct from recebido.versao then
       select h.payload->'dados',h.revision into recebido.dados,recebido.versao from private.e23_versions h
       where h.session_id=p_sid and h.entity='oficina_coletiva' and h.origin_group=o and h.stage=2
       and h.revision=(p->>'versao_interlocucao')::int and (h.payload->>'finalizado')::boolean;
       if not found then raise exception 'Versão da interlocução indisponível';end if;
     end if;
     select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) into perguntas from jsonb_array_elements_text(recebido.dados) with ordinality t(x,ord) where ord>1 and x ~ '[^[:space:]]';
     select coalesce(jsonb_agg(jsonb_build_object('numero',ord,'pergunta',x,'resposta',dados->>(ord::int-1)) order by ord),'[]'::jsonb)
       into vinculos from jsonb_array_elements_text(perguntas) with ordinality t(x,ord);
   end if;
   esperado:=case b when 1 then 4 when 2 then 3 when 3 then jsonb_array_length(perguntas) else 1 end;
   if jsonb_array_length(dados)>esperado then raise exception 'Quantidade de campos excedida';end if;
   if entregue and ((b<>2 and jsonb_array_length(dados)<>esperado) or
       (b=2 and coalesce(dados->>0,'') !~ '[^[:space:]]') or
       exists(select 1 from jsonb_array_elements_text(dados) x where x !~ '[^[:space:]]' or x is null)) then
      raise exception 'Responda todos os campos necessários antes de finalizar';
   end if;
   if p_acao='revisar' then
     select * into inicial from private.oficina_registros where sessao=p_sid and origem=o and bloco=b and autora is null and finalizado;
     if not found then raise exception 'Finalize a versão inicial antes de revisar';end if;
     select coalesce(max(revision),inicial.versao) into esperado from private.e23_versions
      where session_id=p_sid and entity='oficina_coletiva' and origin_group=o and stage=b;
     if rev<>esperado then raise exception 'Versão desatualizada';end if;
   end if;
 end if;
 if entregue and b<=0 and coalesce(trim(dados->>0),'')='' then raise exception 'Confira o registro antes de finalizar';end if;
 if p_acao='revisar' then null;
 elsif rev=0 then insert into private.oficina_registros values(p_sid,o,b,owner_id,dados,1,entregue) on conflict do nothing;
 if not found then raise exception 'Versão desatualizada'; end if;
 else update private.oficina_registros set dados=oficina.dados,versao=versao+1,finalizado=coalesce((p->>'final')::boolean,false) where sessao=p_sid and origem=o and bloco=b and autora is not distinct from owner_id and versao=rev and not finalizado;
 if not found then raise exception 'Versão alterada ou finalizada';end if;end if;
 if b>0 then
   insert into private.e23_versions(session_id,entity,entity_id,origin_group,author_group,stage,revision,payload,actor_id)
   values(p_sid,'oficina_coletiva',o::text||'/'||b,o,g,b,rev+1,jsonb_strip_nulls(jsonb_build_object(
   'dados',dados,'finalizado',entregue,'posterior',p_acao='revisar','perguntas_e_respostas',vinculos,'versao_da_interlocucao',recebido.versao)),uid);
 end if;
 elsif p_acao<>'ler' then raise exception 'Operação indisponível';end if;
 select * into w from private.oficina_salas where sessao=p_sid;
 return jsonb_build_object('perguntas', $q${"A": ["Ao ler esse planejamento, o que vocês observam?", "O que vocês consideram importante conversar com a professora a partir desse planejamento?", "Como dariam continuidade ao acompanhamento desse trabalho? Por quê?", "Que outras informações vocês consideram necessárias para aprofundar essa análise? Por quê?"], "B": ["Ao analisar essas atividades, o que chama a atenção de vocês?", "Que aprendizagens essas atividades podem favorecer nas crianças?", "A partir dessa análise, o que vocês conversariam com a professora? Por quê?", "Que outras informações vocês consideram necessárias para aprofundar essa análise? Por quê?"], "C": ["Ao comparar os resultados apresentados, o que vocês identificam? Que dados sustentam essa análise?", "Considerando a continuidade da escolarização dessas crianças, o que merece atenção da coordenação pedagógica em 2027?", "Que encaminhamentos vocês proporiam para o planejamento de 2027? Por quê?", "Que outras informações vocês consideram necessárias para aprofundar essa análise? Por quê?"]}$q$::jsonb,'sala',to_jsonb(w),'agora',clock_timestamp(),'grupo',g,'historico_coletivo',coalesce((select jsonb_agg(jsonb_build_object('origem',h.origin_group,'grupo_autor',h.author_group,'bloco',h.stage,'versao',h.revision,'registrado_em',h.created_at,'registro',h.payload) order by h.id)
 from private.e23_versions h where h.session_id=p_sid and h.entity='oficina_coletiva' and (adm or h.author_group=g or ((h.payload->>'finalizado')::boolean and
 ((h.stage=1 and w.fase>=4 and h.origin_group=w.pares[g]) or (h.stage=2 and h.origin_group=g and w.fase>=4))))),'[]'::jsonb),'registros',coalesce((select jsonb_agg(to_jsonb(r)) from private.oficina_registros r where r.sessao=p_sid and (adm or r.autora=uid or r.autora is null and ((r.origem=g and (r.bloco<>2 or r.finalizado)) or r.origem=w.pares[g] and w.fase>=4 and (r.bloco=2 or r.bloco=1 and r.finalizado)))),'[]'::jsonb));
end $function$
;
COMMIT;
