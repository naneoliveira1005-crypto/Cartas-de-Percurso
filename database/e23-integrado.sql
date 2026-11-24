-- Revisão: não executar em produção antes dos testes.
begin;
create table private.e23_controle (id boolean primary key default true check(id), etapa integer not null default 0 check(etapa between 0 and 7), liberado boolean not null default false);
insert into private.e23_controle default values;
create table private.e23_grupos (id uuid primary key default gen_random_uuid(), nome text not null, material text not null check(material in ('m1','m2','m3')), interlocutor uuid references private.e23_grupos(id));
create table private.e23_membros (participante uuid primary key references public.participantes(id), grupo uuid not null references private.e23_grupos(id));
create table private.e23_individual (participante uuid references public.participantes(id), etapa integer check(etapa in (1,7)), texto text not null, revisao integer not null default 1, primary key(participante,etapa));
create table private.e23_coletivo (grupo uuid references private.e23_grupos(id), etapa integer check(etapa between 2 and 6), respostas jsonb not null, revisao integer not null default 1, primary key(grupo,etapa));
alter table private.e23_controle enable row level security;
alter table private.e23_grupos enable row level security;
alter table private.e23_membros enable row level security;
alter table private.e23_individual enable row level security;
alter table private.e23_coletivo enable row level security;
revoke all on private.e23_controle,private.e23_grupos,private.e23_membros,private.e23_individual,private.e23_coletivo from public,anon,authenticated;
create function private.e23_salvar(p_token text,p_etapa integer,p_respostas jsonb,p_revisao integer) returns integer language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_grupo uuid; v_rev integer;
begin
v_id:=private.percurso_identificar(p_token);
select grupo into v_grupo from private.e23_membros where participante=v_id;
if v_grupo is null or not exists(select 1 from private.e23_controle where liberado and etapa=p_etapa) then raise exception 'INDISPONIVEL'; end if;
if jsonb_typeof(p_respostas)<>'object' or length(p_respostas::text)>100000 then raise exception 'REGISTRO_INVALIDO'; end if;
if p_etapa in (1,7) then
insert into private.e23_individual as t(participante,etapa,texto) select v_id,p_etapa,coalesce(p_respostas->>'0','') where p_revisao=0 or exists(select 1 from private.e23_individual where participante=v_id and etapa=p_etapa)
on conflict(participante,etapa) do update set texto=excluded.texto,revisao=t.revisao+1 where t.revisao=p_revisao returning revisao into v_rev;
elsif p_etapa between 2 and 6 then
insert into private.e23_coletivo as t(grupo,etapa,respostas) select v_grupo,p_etapa,p_respostas where p_revisao=0 or exists(select 1 from private.e23_coletivo where grupo=v_grupo and etapa=p_etapa)
on conflict(grupo,etapa) do update set respostas=excluded.respostas,revisao=t.revisao+1 where t.revisao=p_revisao returning revisao into v_rev;
end if;
if v_rev is null then raise exception 'OUTRA_ABA'; end if;
return v_rev;
end $$;
revoke all on function private.e23_salvar(text,integer,jsonb,integer) from public,anon,authenticated;
commit;
