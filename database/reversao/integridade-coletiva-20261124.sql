BEGIN;
CREATE OR REPLACE FUNCTION public.oficina_integrada(p_token text, p_sid uuid, p_acao text DEFAULT 'ler'::text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a jsonb:=private.e23_identify(p_token); uid uuid:=(a->>'id')::uuid; adm boolean:=a->>'role'='pesquisadora';
 s private.e23_sessions; w private.oficina_salas; g int; o int; b int; owner_id uuid; dados jsonb; destinos int[]; rev int;
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
 elsif p_acao='salvar' then
 b:=(p->>'bloco')::int; o:=g;dados:=p->'dados';rev:=(p->>'versao')::int;
 if adm or b is null or jsonb_typeof(dados) is distinct from 'array' or octet_length(dados::text)>120000 then raise exception 'Registro inválido';end if;
 if b=-1 and w.fase=0 then owner_id:=uid;o:=0;if coalesce(dados->>0,'') not in ('A','B','C') then raise exception 'Escolha inválida';end if;
 elsif b=0 and w.fase=1 and g is not null then owner_id:=uid;
 elsif g is null or not((b=1 and w.fase=2) or (b=2 and w.fase=4) or (b in (3,4) and w.fase=5) or (b=5 and w.fase=6)) then raise exception 'Movimento fechado';
 else
 if not exists(select 1 from private.e23_writers where session_id=p_sid and group_no=g and actor_id=uid and expires_at>now() and device=p->>'device') then raise exception 'Assuma a escrita do grupo';end if;
 if b=2 then o:=w.pares[g];if not exists(select 1 from private.oficina_registros where sessao=p_sid and origem=o and bloco=1 and finalizado) then raise exception 'Aguardando a análise inicial';end if;end if;
 if b=3 and not exists(select 1 from private.oficina_registros where sessao=p_sid and origem=o and bloco=2 and finalizado) then raise exception 'Aguardando a interlocução';end if;
 end if;
 if coalesce((p->>'final')::boolean,false) and b<>3 and coalesce(trim(dados->>0),'')='' then raise exception 'Confira o registro antes de finalizar';end if;
 if rev=0 then insert into private.oficina_registros values(p_sid,o,b,owner_id,dados,1,coalesce((p->>'final')::boolean,false));
 else update private.oficina_registros set dados=p->'dados',versao=versao+1,finalizado=coalesce((p->>'final')::boolean,false) where sessao=p_sid and origem=o and bloco=b and autora is not distinct from owner_id and versao=rev and not finalizado;
 if not found then raise exception 'Versão alterada ou finalizada';end if;end if;
 elsif p_acao<>'ler' then raise exception 'Operação indisponível';end if;
 select * into w from private.oficina_salas where sessao=p_sid;
 return jsonb_build_object('perguntas', $q${"A": ["Ao ler esse planejamento, o que vocês observam?", "O que vocês consideram importante conversar com a professora a partir desse planejamento?", "Como dariam continuidade ao acompanhamento desse trabalho? Por quê?", "Que outras informações vocês consideram necessárias para aprofundar essa análise? Por quê?"], "B": ["Ao analisar essas atividades, o que chama a atenção de vocês?", "Que aprendizagens essas atividades podem favorecer nas crianças?", "A partir dessa análise, o que vocês conversariam com a professora? Por quê?", "Que outras informações vocês consideram necessárias para aprofundar essa análise? Por quê?"], "C": ["Ao comparar os resultados apresentados, o que vocês identificam? Que dados sustentam essa análise?", "Considerando a continuidade da escolarização dessas crianças, o que merece atenção da coordenação pedagógica em 2027?", "Que encaminhamentos vocês proporiam para o planejamento de 2027? Por quê?", "Que outras informações vocês consideram necessárias para aprofundar essa análise? Por quê?"]}$q$::jsonb,'sala',to_jsonb(w),'agora',clock_timestamp(),'grupo',g,'registros',coalesce((select jsonb_agg(to_jsonb(r)) from private.oficina_registros r where r.sessao=p_sid and (adm or r.autora=uid or r.autora is null and ((r.origem=g and (r.bloco<>2 or r.finalizado)) or r.origem=w.pares[g] and w.fase>=4 and (r.bloco=2 or r.bloco=1 and r.finalizado)))),'[]'::jsonb));
end $function$
;
COMMIT;
