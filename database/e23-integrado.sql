-- Extensão aditiva do Por Escrito. Nenhuma tabela ou função anterior é substituída.
-- Projeto: zpsjuxusydfbptjotyxo. Sessões de homologação separadas das produções reais.
CREATE TABLE private.e23_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
 is_test boolean NOT NULL DEFAULT true, published boolean NOT NULL DEFAULT false,
 group_count int CHECK(group_count IN (3,4)), durations int[] CHECK(array_length(durations,1)=6),
 stage int NOT NULL DEFAULT 0 CHECK(stage BETWEEN 0 AND 7),
 state text NOT NULL DEFAULT 'preparacao' CHECK(state IN ('preparacao','em_curso','pausado','plenario')),
 started_at timestamptz, paused_at timestamptz, extra_seconds int NOT NULL DEFAULT 0 CHECK(extra_seconds>=0),
 revision int NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE private.e23_test_access (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES private.e23_sessions(id),
 token_hash text NOT NULL UNIQUE, label text NOT NULL CHECK(label LIKE 'TESTE%'),
 role text NOT NULL CHECK(role IN ('pesquisadora','participante','observadora','orientadora')),
 active boolean NOT NULL DEFAULT true, expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '14 days'
);
CREATE TABLE private.e23_members (
 session_id uuid NOT NULL REFERENCES private.e23_sessions(id), actor_id uuid NOT NULL,
 group_no int NOT NULL CHECK(group_no BETWEEN 1 AND 4), PRIMARY KEY(session_id,actor_id)
);
CREATE INDEX e23_members_group ON private.e23_members(session_id,group_no);
CREATE TABLE private.e23_writers (
 session_id uuid NOT NULL REFERENCES private.e23_sessions(id), group_no int NOT NULL,
 actor_id uuid NOT NULL, device text NOT NULL, expires_at timestamptz NOT NULL,
 PRIMARY KEY(session_id,group_no)
);
CREATE TABLE private.e23_experiences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES private.e23_sessions(id),
 owner_id uuid NOT NULL, original_text text NOT NULL DEFAULT '', transcription text NOT NULL DEFAULT '',
 circulation_title text NOT NULL DEFAULT '', circulation_text text NOT NULL DEFAULT '',
 approved boolean NOT NULL DEFAULT false, authorization_note text NOT NULL DEFAULT '',
 revision int NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(NOT approved OR (length(trim(circulation_text))>0 AND length(trim(authorization_note))>0))
);
CREATE INDEX e23_experiences_session ON private.e23_experiences(session_id);
CREATE TABLE private.e23_materials (
 session_id uuid NOT NULL REFERENCES private.e23_sessions(id), code text NOT NULL CHECK(code IN ('A','B','C')),
 title text NOT NULL, status text NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','conferido')),
 note text NOT NULL DEFAULT '', revision int NOT NULL DEFAULT 1,
 PRIMARY KEY(session_id,code)
);
CREATE TABLE private.e23_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES private.e23_sessions(id),
 experience_id uuid REFERENCES private.e23_experiences(id), material_code text,
 kind text NOT NULL CHECK(kind IN ('audio','transcricao','material','completo')),
 path text NOT NULL UNIQUE, name text NOT NULL, mime text NOT NULL, bytes int NOT NULL CHECK(bytes BETWEEN 1 AND 26214400),
 sha256 text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((experience_id IS NOT NULL AND material_code IS NULL AND kind IN ('audio','transcricao')) OR
       (experience_id IS NULL AND material_code IN ('A','B','C') AND kind IN ('material','completo')))
);
CREATE TABLE private.e23_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES private.e23_sessions(id),
 origin_group int NOT NULL, author_group int NOT NULL, stage int NOT NULL CHECK(stage BETWEEN 1 AND 6),
 payload jsonb NOT NULL DEFAULT '{}', revision int NOT NULL DEFAULT 0,
 submitted boolean NOT NULL DEFAULT false, submitted_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(session_id,author_group,stage)
);
CREATE TABLE private.e23_versions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, session_id uuid NOT NULL REFERENCES private.e23_sessions(id),
 record_id uuid, entity text NOT NULL, entity_id text, origin_group int, author_group int, stage int,
 revision int NOT NULL, payload jsonb NOT NULL, actor_id uuid, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX e23_versions_session ON private.e23_versions(session_id,created_at);
CREATE TABLE private.e23_deliveries (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, session_id uuid NOT NULL REFERENCES private.e23_sessions(id),
 group_no int NOT NULL, stage int NOT NULL, record_id uuid, revision int NOT NULL DEFAULT 0,
 status text NOT NULL CHECK(status IN ('entregue','prazo_encerrado','reaberto')),
 at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE private.e23_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, session_id uuid REFERENCES private.e23_sessions(id),
 actor_id uuid, type text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE private.e23_recoveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES private.e23_sessions(id),
 actor_id uuid NOT NULL, group_no int NOT NULL, stage int NOT NULL, payload jsonb NOT NULL,
 client_id uuid NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE private.e23_letters_test (
 session_id uuid NOT NULL REFERENCES private.e23_sessions(id), actor_id uuid NOT NULL,
 text text NOT NULL DEFAULT '', revision int NOT NULL DEFAULT 0, sealed_at timestamptz,
 PRIMARY KEY(session_id,actor_id)
);
DO $block$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='private' AND tablename LIKE 'e23_%' LOOP
  EXECUTE format('ALTER TABLE private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON private.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $block$;

-- O sistema existente usa links secretos com hash, não sessões Supabase Auth.
-- Todas as operações revalidam esses acessos. Não há elevação de OBS/ORI.
CREATE FUNCTION private.e23_identify(p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE a private.e23_test_access; p public.participantes; admin_id uuid;
BEGIN
 IF p_token IS NULL OR length(trim(p_token))<24 OR length(p_token)>256 THEN RAISE EXCEPTION 'ACESSO_INVALIDO'; END IF;
 SELECT * INTO a FROM private.e23_test_access WHERE active AND expires_at>clock_timestamp()
  AND token_hash=encode(extensions.digest(trim(p_token),'sha256'),'hex');
 IF FOUND THEN RETURN jsonb_build_object('id',a.id,'role',a.role,'name',a.label,'is_test',true,'session_id',a.session_id); END IF;
 SELECT id INTO admin_id FROM public.pesquisadora_acessos WHERE ativa AND chave_hash=encode(extensions.digest(trim(p_token),'sha256'),'hex');
 IF FOUND THEN RETURN jsonb_build_object('id',admin_id,'role','pesquisadora','name','Nanny Oliveira','is_test',false); END IF;
 SELECT * INTO p FROM public.participantes WHERE participacao_confirmada
  AND (token_expira_em IS NULL OR token_expira_em>clock_timestamp())
  AND token_hash=encode(extensions.digest(trim(p_token),'sha256'),'hex');
 IF NOT FOUND THEN RAISE EXCEPTION 'ACESSO_INVALIDO'; END IF;
 RETURN jsonb_build_object('id',p.id,'name',p.nome_completo,'is_test',false,'role',
  CASE WHEN p.codigo LIKE 'OBS%' THEN 'observadora' WHEN p.codigo LIKE 'ORI%' THEN 'orientadora' ELSE 'participante' END);
END $f$;

CREATE FUNCTION private.e23_tick(p_session uuid,p_now timestamptz DEFAULT clock_timestamp()) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE s private.e23_sessions; finish timestamptz;
BEGIN
 SELECT * INTO s FROM private.e23_sessions WHERE id=p_session FOR UPDATE;
 WHILE s.state='em_curso' AND s.stage BETWEEN 1 AND 6 LOOP
  finish:=s.started_at+make_interval(secs=>s.durations[s.stage]+s.extra_seconds+120);
  EXIT WHEN p_now<finish;
  INSERT INTO private.e23_deliveries(session_id,group_no,stage,record_id,revision,status,at)
   SELECT s.id,g,s.stage,r.id,coalesce(r.revision,0),'prazo_encerrado',finish
    FROM generate_series(1,s.group_count) g LEFT JOIN private.e23_records r
    ON r.session_id=s.id AND r.author_group=g AND r.stage=s.stage WHERE NOT coalesce(r.submitted,false);
  INSERT INTO private.e23_events(session_id,type,detail,at)
   VALUES(s.id,'transicao_automatica',jsonb_build_object('de',s.stage,'para',s.stage+1),finish);
  UPDATE private.e23_sessions SET stage=stage+1,started_at=finish,extra_seconds=0,
   state=CASE WHEN stage=6 THEN 'plenario' ELSE 'em_curso' END,revision=revision+1
   WHERE id=s.id RETURNING * INTO s;
 END LOOP;
END $f$;

CREATE FUNCTION private.e23_snapshot(p_session uuid,p_actor jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE s private.e23_sessions; g int; role_name text:=p_actor->>'role'; aid uuid:=(p_actor->>'id')::uuid; is_admin boolean:=role_name='pesquisadora'; result jsonb;
BEGIN
 SELECT * INTO s FROM private.e23_sessions WHERE id=p_session;
 SELECT group_no INTO g FROM private.e23_members WHERE session_id=s.id AND actor_id=aid;
 result:=jsonb_build_object('session',to_jsonb(s),'actor',p_actor,'group',g,'server_now',clock_timestamp(),'grace_seconds',120);
 -- Observadoras e orientadora conservam acesso à estrutura; novas produções não são liberadas implicitamente.
 IF role_name IN ('observadora','orientadora') THEN RETURN result||jsonb_build_object('read_only',true); END IF;
 result:=result||jsonb_build_object(
  'experiences',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'title',e.circulation_title,'text',e.circulation_text,'revision',e.revision) ORDER BY e.created_at)
    FROM private.e23_experiences e WHERE e.session_id=s.id AND e.approved),'[]'::jsonb),
  'materials',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY code) FROM private.e23_materials m WHERE m.session_id=s.id),'[]'::jsonb),
  'records',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY origin_group,stage) FROM private.e23_records r WHERE r.session_id=s.id AND
    (is_admin OR r.author_group=g OR (s.stage>=3 AND r.origin_group=(g%s.group_count)+1) OR (s.stage>=6 AND r.origin_group=g))),'[]'::jsonb),
  'writer',(SELECT jsonb_build_object('mine',w.actor_id=aid,'device',CASE WHEN w.actor_id=aid THEN w.device ELSE NULL END,'expires_at',w.expires_at)
    FROM private.e23_writers w WHERE w.session_id=s.id AND w.group_no=g),
  'files',coalesce((SELECT jsonb_agg(to_jsonb(f)-'path'-'sha256') FROM private.e23_files f WHERE f.session_id=s.id AND
    (is_admin OR f.material_code IS NOT NULL OR EXISTS(SELECT 1 FROM private.e23_experiences e WHERE e.id=f.experience_id AND e.owner_id=aid))),'[]'::jsonb));
 IF is_admin THEN
  result:=result||jsonb_build_object(
   'private_experiences',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY created_at) FROM private.e23_experiences e WHERE e.session_id=s.id),'[]'::jsonb),
   'members',coalesce((SELECT jsonb_agg(to_jsonb(m)) FROM private.e23_members m WHERE m.session_id=s.id),'[]'::jsonb),
   'people',CASE WHEN s.is_test THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',label,'role',role)) FROM private.e23_test_access WHERE session_id=s.id AND active),'[]'::jsonb)
    ELSE coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',nome_completo,'role',CASE WHEN codigo LIKE 'OBS%' THEN 'observadora' WHEN codigo LIKE 'ORI%' THEN 'orientadora' ELSE 'participante' END)) FROM public.participantes WHERE participacao_confirmada),'[]'::jsonb) END,
   'deliveries',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY at) FROM private.e23_deliveries d WHERE d.session_id=s.id),'[]'::jsonb),
   'events',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY id DESC) FROM (SELECT * FROM private.e23_events WHERE session_id=s.id ORDER BY id DESC LIMIT 100) v),'[]'::jsonb),
   'recoveries',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM private.e23_recoveries r WHERE r.session_id=s.id),'[]'::jsonb));
 ELSE
  result:=result||jsonb_build_object('my_experiences',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM private.e23_experiences e WHERE e.session_id=s.id AND e.owner_id=aid),'[]'::jsonb));
 END IF;
 RETURN result;
END $f$;

REVOKE ALL ON FUNCTION private.e23_identify(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.e23_tick(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.e23_snapshot(uuid,jsonb) FROM PUBLIC,anon,authenticated;
