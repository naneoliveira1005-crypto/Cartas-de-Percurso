BEGIN;
-- Reverter antes de abrir o encontro. Se houver grupos fora dos limites anteriores, a transação falha inteira, preservando os dados.
CREATE OR REPLACE FUNCTION private.e23_api(p_token text, p_action text DEFAULT 'sessions'::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a jsonb:=private.e23_identify(p_token); aid uuid:=(a->>'id')::uuid;
 admin boolean:=a->>'role'='pesquisadora'; test_actor boolean:=(a->>'is_test')::boolean;
 sid uuid; s private.e23_sessions; g int; orig int; st int; r private.e23_records;
 e private.e23_experiences; f private.e23_files; letter private.e23_letters_test;
 v jsonb; payload jsonb; exp_id uuid; rev int; target uuid; d int[]; finish timestamptz; key text; value jsonb;
 submitted boolean:=coalesce((p_payload->>'submit')::boolean,false); now_at timestamptz:=clock_timestamp();
BEGIN
 IF jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>400000 THEN RAISE EXCEPTION 'PEDIDO_INVALIDO'; END IF;
 IF p_action='sessions' THEN
  RETURN jsonb_build_object('actor',a,'server_now',clock_timestamp(),'sessions',coalesce((SELECT jsonb_agg(to_jsonb(z) ORDER BY created_at DESC)
   FROM private.e23_sessions z WHERE
   (test_actor AND z.id=(a->>'session_id')::uuid) OR
   (NOT test_actor AND (admin OR (z.published AND NOT z.is_test)))),'[]'::jsonb));
 END IF;
 IF p_action='create_session' THEN
  IF NOT admin OR test_actor THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
  INSERT INTO private.e23_sessions(title,is_test) VALUES(left(coalesce(p_payload->>'title','Encontro E2–E3'),160),coalesce((p_payload->>'is_test')::boolean,true)) RETURNING id INTO sid;
  INSERT INTO private.e23_materials(session_id,code,title) VALUES(sid,'A','Planejamento semanal do Grupo 5'),(sid,'B','A Casa Sonolenta — 2º ano'),(sid,'C','Resultados do CNCA — Ciclo II');
  RETURN jsonb_build_object('id',sid);
 END IF;
 sid:=(p_payload->>'session_id')::uuid;
 SELECT * INTO s FROM private.e23_sessions WHERE id=sid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ENCONTRO_INDISPONIVEL'; END IF;
 IF test_actor AND (a->>'session_id')::uuid<>sid THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF NOT test_actor AND NOT admin AND (s.is_test OR NOT s.published) THEN RAISE EXCEPTION 'ENCONTRO_NAO_LIBERADO'; END IF;
 IF a->>'role' IN ('observadora','orientadora') AND p_action<>'load' THEN RAISE EXCEPTION 'SOMENTE_LEITURA'; END IF;
 PERFORM private.e23_tick(sid);
 SELECT * INTO s FROM private.e23_sessions WHERE id=sid;
 SELECT group_no INTO g FROM private.e23_members WHERE session_id=sid AND actor_id=aid;
 IF p_action='load' THEN
  UPDATE private.e23_writers SET expires_at=clock_timestamp()+interval '35 seconds'
   WHERE session_id=sid AND actor_id=aid AND device=p_payload->>'device' AND expires_at>clock_timestamp();
  RETURN private.e23_snapshot(sid,a);
 END IF;

 IF p_action IN ('configure','member','experience','material','start','pause','resume','extend','advance','publish','recover','note','export','file_prepare','file_register','writer_release') THEN
  IF NOT admin THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
  IF p_action='configure' THEN
   IF s.stage<>0 THEN RAISE EXCEPTION 'ENCONTRO_JA_INICIADO'; END IF;
   g:=(p_payload->>'group_count')::int;
   IF (g NOT IN (3,4) AND NOT (g=5 AND EXISTS(SELECT 1 FROM private.e23_sessions WHERE id=sid AND is_test))) OR g IS NULL THEN RAISE EXCEPTION 'CONFIGURE_GRUPOS'; END IF;
   IF EXISTS(SELECT 1 FROM private.e23_members WHERE session_id=sid AND group_no>g) THEN RAISE EXCEPTION 'REORGANIZE_GRUPOS'; END IF;
   SELECT array_agg(CASE WHEN x='null'::jsonb THEN NULL ELSE (x::text)::int END ORDER BY n) INTO d FROM jsonb_array_elements(p_payload->'durations') WITH ORDINALITY t(x,n);
   IF array_length(d,1)<>6 OR EXISTS(SELECT 1 FROM unnest(d) t WHERE t IS NOT NULL AND (t<1 OR t>14400)) THEN RAISE EXCEPTION 'TEMPOS_INVALIDOS'; END IF;
   UPDATE private.e23_sessions SET group_count=g,durations=d,revision=revision+1 WHERE id=sid;
  ELSIF p_action='member' THEN
   target:=(p_payload->>'actor_id')::uuid; g:=(p_payload->>'group_no')::int;
   IF s.group_count IS NULL OR g<1 OR g>s.group_count OR g IS NULL THEN RAISE EXCEPTION 'GRUPO_INVALIDO'; END IF;
   IF s.stage<>0 THEN RAISE EXCEPTION 'GRUPOS_JA_INICIADOS'; END IF;
   IF s.is_test THEN
    IF NOT EXISTS(SELECT 1 FROM private.e23_test_access WHERE id=target AND session_id=sid AND role='participante') THEN RAISE EXCEPTION 'PARTICIPANTE_INVALIDA'; END IF;
   ELSE
    IF NOT EXISTS(SELECT 1 FROM public.participantes WHERE id=target AND participacao_confirmada AND codigo NOT LIKE 'OBS%' AND codigo NOT LIKE 'ORI%' AND codigo NOT LIKE 'TESTE%') THEN RAISE EXCEPTION 'PARTICIPANTE_INVALIDA'; END IF;
   END IF;
   INSERT INTO private.e23_members VALUES(sid,target,g) ON CONFLICT(session_id,actor_id) DO UPDATE SET group_no=excluded.group_no;
  ELSIF p_action='experience' THEN
   exp_id:=nullif(p_payload->>'id','')::uuid; target:=(p_payload->>'owner_id')::uuid;
   IF (s.is_test AND NOT EXISTS(SELECT 1 FROM private.e23_test_access WHERE id=target AND session_id=sid AND role='participante')) OR
      (NOT s.is_test AND NOT EXISTS(SELECT 1 FROM public.participantes WHERE id=target AND codigo NOT LIKE 'OBS%' AND codigo NOT LIKE 'ORI%' AND codigo NOT LIKE 'TESTE%')) THEN RAISE EXCEPTION 'AUTORIA_INVALIDA'; END IF;
   IF exp_id IS NOT NULL THEN
    SELECT * INTO e FROM private.e23_experiences WHERE id=exp_id AND session_id=sid FOR UPDATE;
    IF NOT FOUND OR e.revision<>coalesce((p_payload->>'revision')::int,0) THEN RAISE EXCEPTION 'CONFLITO_DE_VERSAO'; END IF;
   ELSE
    INSERT INTO private.e23_experiences(session_id,owner_id) VALUES(sid,target) RETURNING * INTO e;
   END IF;
   UPDATE private.e23_experiences SET owner_id=target,original_text=coalesce(p_payload->>'original_text',''),
    transcription=coalesce(p_payload->>'transcription',''),circulation_title=left(coalesce(p_payload->>'title',''),200),
    circulation_text=coalesce(p_payload->>'text',''),approved=coalesce((p_payload->>'approved')::boolean,false),
    authorization_note=coalesce(p_payload->>'authorization_note',''),revision=revision+1,updated_at=now_at
    WHERE id=e.id RETURNING * INTO e;
   INSERT INTO private.e23_versions(session_id,entity,entity_id,revision,payload,actor_id)
    VALUES(sid,'relato_individual',e.id::text,e.revision,to_jsonb(e),aid);
  ELSIF p_action='material' THEN
   IF p_payload->>'status'='conferido' AND NOT EXISTS(SELECT 1 FROM private.e23_files WHERE session_id=sid AND material_code=p_payload->>'code' AND kind='material') THEN RAISE EXCEPTION 'DOCUMENTO_ORIGINAL_PENDENTE'; END IF;
   UPDATE private.e23_materials SET status=p_payload->>'status',note=coalesce(p_payload->>'note',''),revision=revision+1 WHERE session_id=sid AND code=p_payload->>'code';
  ELSIF p_action='start' THEN
   IF s.stage<>0 OR s.state<>'preparacao' THEN RAISE EXCEPTION 'ENCONTRO_JA_INICIADO'; END IF;
   IF s.group_count IS NULL OR s.durations IS NULL OR array_position(s.durations,NULL) IS NOT NULL THEN RAISE EXCEPTION 'CONFIGURE_TEMPOS_E_GRUPOS'; END IF;
   IF EXISTS(SELECT 1 FROM generate_series(1,s.group_count) n WHERE NOT EXISTS(SELECT 1 FROM private.e23_members WHERE session_id=sid AND group_no=n)) THEN RAISE EXCEPTION 'GRUPO_SEM_PARTICIPANTE'; END IF;
   IF NOT s.is_test AND (NOT EXISTS(SELECT 1 FROM private.e23_experiences WHERE session_id=sid AND approved) OR
      (SELECT count(*) FROM private.e23_materials WHERE session_id=sid AND status='conferido')<>3) THEN RAISE EXCEPTION 'PREPARACAO_PENDENTE'; END IF;
   UPDATE private.e23_sessions SET stage=1,state='em_curso',started_at=now_at,revision=revision+1 WHERE id=sid;
  ELSIF p_action='pause' THEN
   IF s.state<>'em_curso' THEN RAISE EXCEPTION 'ESTADO_INVALIDO'; END IF;
   UPDATE private.e23_sessions SET state='pausado',paused_at=now_at,revision=revision+1 WHERE id=sid;
  ELSIF p_action='resume' THEN
   IF s.state<>'pausado' THEN RAISE EXCEPTION 'ESTADO_INVALIDO'; END IF;
   UPDATE private.e23_sessions SET state='em_curso',started_at=started_at+(now_at-paused_at),paused_at=NULL,revision=revision+1 WHERE id=sid;
  ELSIF p_action='extend' THEN
   st:=(p_payload->>'seconds')::int;
   IF st IS NULL OR st<1 OR st>14400 OR s.state NOT IN ('em_curso','pausado') THEN RAISE EXCEPTION 'PRORROGACAO_INVALIDA'; END IF;
   UPDATE private.e23_sessions SET extra_seconds=extra_seconds+st,revision=revision+1 WHERE id=sid;
  ELSIF p_action='advance' THEN
   IF s.stage NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'ESTADO_INVALIDO'; END IF;
   INSERT INTO private.e23_deliveries(session_id,group_no,stage,record_id,revision,status,at)
    SELECT sid,n,s.stage,rec.id,coalesce(rec.revision,0),'prazo_encerrado',now_at FROM generate_series(1,s.group_count) n
    LEFT JOIN private.e23_records rec ON rec.session_id=sid AND rec.author_group=n AND rec.stage=s.stage WHERE NOT coalesce(rec.submitted,false);
   UPDATE private.e23_sessions SET stage=stage+1,state=CASE WHEN stage=6 THEN 'plenario' ELSE 'em_curso' END,
    started_at=now_at,paused_at=NULL,extra_seconds=0,revision=revision+1 WHERE id=sid;
  ELSIF p_action='publish' THEN
   IF test_actor OR s.is_test THEN RAISE EXCEPTION 'HOMOLOGACAO_NAO_PUBLICAVEL'; END IF;
   UPDATE private.e23_sessions SET published=coalesce((p_payload->>'published')::boolean,false),revision=revision+1 WHERE id=sid;
  ELSIF p_action='writer_release' THEN
   UPDATE private.e23_writers SET expires_at=now_at WHERE session_id=sid AND group_no=(p_payload->>'group_no')::int;
  ELSIF p_action='recover' THEN
   SELECT to_jsonb(x) INTO v FROM private.e23_recoveries x WHERE x.id=(p_payload->>'recovery_id')::uuid AND session_id=sid;
   IF v IS NULL THEN RAISE EXCEPTION 'RECUPERACAO_INVALIDA'; END IF;
   g:=(v->>'group_no')::int; st:=(v->>'stage')::int;
   orig:=CASE WHEN st BETWEEN 3 AND 5 THEN (g%s.group_count)+1 ELSE g END;
   INSERT INTO private.e23_records(session_id,origin_group,author_group,stage,payload,revision)
    VALUES(sid,orig,g,st,v->'payload',1)
    ON CONFLICT(session_id,author_group,stage) DO UPDATE SET payload=excluded.payload,revision=private.e23_records.revision+1,updated_at=now_at RETURNING * INTO r;
   INSERT INTO private.e23_versions(session_id,record_id,entity,entity_id,origin_group,author_group,stage,revision,payload,actor_id)
    VALUES(sid,r.id,'recuperacao_pela_pesquisadora',r.id::text,orig,g,st,r.revision,r.payload,aid);
  ELSIF p_action='note' THEN
   INSERT INTO private.e23_events(session_id,actor_id,type,detail) VALUES(sid,aid,'registro_pesquisadora',jsonb_build_object('text',left(p_payload->>'text',20000)));
  ELSIF p_action='export' THEN
   v:=jsonb_build_object('format','por-escrito-e23-v1','exported_at',now_at,'session',to_jsonb(s),
    'records',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM private.e23_records x WHERE session_id=sid),'[]'::jsonb),
    'versions',coalesce((SELECT jsonb_agg(to_jsonb(x)-'actor_id') FROM private.e23_versions x WHERE session_id=sid AND entity NOT IN ('relato_individual','carta_teste')),'[]'::jsonb),
    'deliveries',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM private.e23_deliveries x WHERE session_id=sid),'[]'::jsonb),
    'materials',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM private.e23_materials x WHERE session_id=sid),'[]'::jsonb));
   IF coalesce((p_payload->>'include_private')::boolean,false) THEN
    v:=v||jsonb_build_object('confidential',true,
     'originals',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM private.e23_experiences x WHERE session_id=sid),'[]'::jsonb),
     'private_versions',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM private.e23_versions x WHERE session_id=sid AND entity IN ('relato_individual','carta_teste')),'[]'::jsonb),
     'researcher_records',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM private.e23_events x WHERE session_id=sid),'[]'::jsonb),
     'recoveries',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM private.e23_recoveries x WHERE session_id=sid),'[]'::jsonb));
   END IF;
   RETURN v;
  ELSIF p_action='file_prepare' THEN
   exp_id:=nullif(p_payload->>'experience_id','')::uuid;
   IF exp_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM private.e23_experiences WHERE id=exp_id AND session_id=sid) THEN RAISE EXCEPTION 'RELATO_INVALIDO'; END IF;
   IF exp_id IS NULL AND NOT EXISTS(SELECT 1 FROM private.e23_materials WHERE session_id=sid AND code=p_payload->>'material_code') THEN RAISE EXCEPTION 'MATERIAL_INVALIDO'; END IF;
   RETURN jsonb_build_object('bucket','por-escrito-e23','prefix',sid::text,'authorized',true);
  ELSIF p_action='file_register' THEN
   exp_id:=nullif(p_payload->>'experience_id','')::uuid;
   IF exp_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM private.e23_experiences WHERE id=exp_id AND session_id=sid) THEN RAISE EXCEPTION 'RELATO_INVALIDO'; END IF;
   IF p_payload->>'path' NOT LIKE sid::text||'/%' OR p_payload->>'path' LIKE '%..%' THEN RAISE EXCEPTION 'ARQUIVO_INVALIDO'; END IF;
   -- Registro só é aceito após o objeto existir no bucket privado, criado pelo servidor.
   IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='por-escrito-e23' AND name=p_payload->>'path') THEN RAISE EXCEPTION 'ARQUIVO_NAO_RECEBIDO'; END IF;
   INSERT INTO private.e23_files(session_id,experience_id,material_code,kind,path,name,mime,bytes,sha256)
    VALUES(sid,exp_id,nullif(p_payload->>'material_code',''),p_payload->>'kind',p_payload->>'path',left(p_payload->>'name',180),p_payload->>'mime',(p_payload->>'bytes')::int,p_payload->>'sha256') RETURNING * INTO f;
   RETURN jsonb_build_object('id',f.id);
  END IF;
  INSERT INTO private.e23_events(session_id,actor_id,type,detail) VALUES(sid,aid,p_action,jsonb_build_object('stage',s.stage));
  RETURN private.e23_snapshot(sid,a);
 END IF;

 IF p_action='file_access' THEN
  SELECT * INTO f FROM private.e23_files WHERE id=(p_payload->>'file_id')::uuid AND session_id=sid;
  IF NOT FOUND THEN RAISE EXCEPTION 'ARQUIVO_INDISPONIVEL'; END IF;
  IF NOT admin AND NOT ((f.material_code IS NOT NULL AND EXISTS(SELECT 1 FROM private.e23_materials WHERE session_id=sid AND code=f.material_code AND status='conferido')) OR
   EXISTS(SELECT 1 FROM private.e23_experiences WHERE id=f.experience_id AND owner_id=aid)) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
  RETURN jsonb_build_object('bucket','por-escrito-e23','path',f.path,'name',f.name,'mime',f.mime);
 END IF;
 IF p_action='letter_load' OR p_action='letter_save' THEN
  IF NOT test_actor OR a->>'role'<>'participante' THEN RAISE EXCEPTION 'USE_CARTA_EXISTENTE'; END IF;
  SELECT * INTO letter FROM private.e23_letters_test WHERE session_id=sid AND actor_id=aid FOR UPDATE;
  IF p_action='letter_save' THEN
   IF letter.sealed_at IS NOT NULL THEN RAISE EXCEPTION 'CARTA_JA_LACRADA'; END IF;
   IF coalesce(letter.revision,0)<>coalesce((p_payload->>'revision')::int,0) THEN RAISE EXCEPTION 'CONFLITO_DE_VERSAO'; END IF;
   IF length(coalesce(p_payload->>'text',''))>60000 OR (submitted AND length(trim(coalesce(p_payload->>'text','')))=0) THEN RAISE EXCEPTION 'TEXTO_INVALIDO'; END IF;
   INSERT INTO private.e23_letters_test(session_id,actor_id,text,revision,sealed_at)
    VALUES(sid,aid,p_payload->>'text',1,CASE WHEN submitted THEN now_at END)
    ON CONFLICT(session_id,actor_id) DO UPDATE SET text=excluded.text,revision=private.e23_letters_test.revision+1,sealed_at=excluded.sealed_at RETURNING * INTO letter;
   INSERT INTO private.e23_versions(session_id,entity,entity_id,revision,payload,actor_id) VALUES(sid,'carta_teste',aid::text,letter.revision,to_jsonb(letter),aid);
  END IF;
  RETURN jsonb_build_object('letter',CASE WHEN letter.actor_id IS NULL THEN NULL ELSE to_jsonb(letter) END,'server_now',now_at);
 END IF;
 IF p_action='incident' THEN
  INSERT INTO private.e23_events(session_id,actor_id,type,detail) VALUES(sid,aid,'ocorrencia_tecnica',jsonb_build_object('code',left(p_payload->>'code',80),'stage',s.stage));
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF a->>'role'<>'participante' OR g IS NULL THEN RAISE EXCEPTION 'GRUPO_NAO_DEFINIDO'; END IF;
 IF p_action='claim_writer' THEN
  IF length(coalesce(p_payload->>'device','')) NOT BETWEEN 20 AND 80 THEN RAISE EXCEPTION 'DISPOSITIVO_INVALIDO'; END IF;
  INSERT INTO private.e23_writers(session_id,group_no,actor_id,device,expires_at) VALUES(sid,g,aid,p_payload->>'device',now_at+interval '35 seconds')
   ON CONFLICT(session_id,group_no) DO UPDATE SET actor_id=excluded.actor_id,device=excluded.device,expires_at=excluded.expires_at
   WHERE private.e23_writers.expires_at<=now_at OR (private.e23_writers.actor_id=aid AND private.e23_writers.device=excluded.device);
  IF NOT FOUND THEN RAISE EXCEPTION 'OUTRA_PESSOA_ESCREVENDO'; END IF;
  RETURN private.e23_snapshot(sid,a);
 END IF;
 IF p_action NOT IN ('save','reopen') THEN RAISE EXCEPTION 'ACAO_INVALIDA'; END IF;
 st:=(p_payload->>'stage')::int;
 IF st IS NULL OR st NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'ETAPA_INVALIDA'; END IF;
 orig:=CASE WHEN st BETWEEN 3 AND 5 THEN (g%s.group_count)+1 ELSE g END;
 payload:=coalesce(p_payload->'payload','{}');
 IF jsonb_typeof(payload)<>'object' OR octet_length(payload::text)>150000 THEN RAISE EXCEPTION 'TEXTO_INVALIDO'; END IF;
 FOR key,value IN SELECT * FROM jsonb_each(payload) LOOP
  IF key<>ALL(CASE st WHEN 1 THEN ARRAY['experience_id'] WHEN 2 THEN ARRAY['q1','q2','q3','q4','q5'] WHEN 3 THEN ARRAY['text'] WHEN 4 THEN ARRAY['material','q1','q2','q3'] WHEN 5 THEN ARRAY['text'] ELSE ARRAY['q1','q2'] END)
    OR jsonb_typeof(value)<>'string' OR length(value::text)>30000 THEN RAISE EXCEPTION 'CAMPO_INVALIDO'; END IF;
 END LOOP;
 -- Retorno após desconexão nunca sobrescreve a produção fechada de uma etapa.
 IF st<>s.stage OR s.state NOT IN ('em_curso','pausado') THEN
  IF p_action='reopen' THEN RAISE EXCEPTION 'ETAPA_ENCERRADA'; END IF;
  IF st>s.stage THEN RAISE EXCEPTION 'ETAPA_NAO_ABERTA'; END IF;
  INSERT INTO private.e23_recoveries(session_id,actor_id,group_no,stage,payload,client_id)
   VALUES(sid,aid,g,st,payload,(p_payload->>'client_id')::uuid) ON CONFLICT(client_id) DO NOTHING;
  RETURN jsonb_build_object('recovered',true,'message','Registro preservado para recuperação pela pesquisadora.','server_now',now_at);
 END IF;
 IF st=1 AND payload ? 'experience_id' THEN
  SELECT * INTO e FROM private.e23_experiences WHERE id=(payload->>'experience_id')::uuid AND session_id=sid AND approved;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXPERIENCIA_NAO_AUTORIZADA'; END IF;
  payload:=payload||jsonb_build_object('experience_snapshot',jsonb_build_object('id',e.id,'title',e.circulation_title,'text',e.circulation_text,'revision',e.revision));
 END IF;
 IF st=4 AND payload ? 'material' THEN
  SELECT to_jsonb(m) INTO v FROM private.e23_materials m WHERE session_id=sid AND code=payload->>'material' AND status='conferido';
  IF v IS NULL THEN RAISE EXCEPTION 'DOCUMENTO_ORIGINAL_PENDENTE'; END IF;
  payload:=payload||jsonb_build_object('material_snapshot',v||jsonb_build_object('files',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'sha256',sha256,'kind',kind)) FROM private.e23_files WHERE session_id=sid AND material_code=v->>'code'),'[]'::jsonb)));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM private.e23_writers WHERE session_id=sid AND group_no=g AND actor_id=aid AND device=p_payload->>'device' AND expires_at>now_at) THEN RAISE EXCEPTION 'ASSUMA_A_ESCRITA'; END IF;
 SELECT * INTO r FROM private.e23_records WHERE session_id=sid AND author_group=g AND stage=st FOR UPDATE;
 IF p_action='reopen' THEN
  IF r.id IS NULL THEN RAISE EXCEPTION 'REGISTRO_INEXISTENTE'; END IF;
  UPDATE private.e23_records SET submitted=false,submitted_at=NULL WHERE id=r.id;
  INSERT INTO private.e23_deliveries(session_id,group_no,stage,record_id,revision,status) VALUES(sid,g,st,r.id,r.revision,'reaberto');
  RETURN private.e23_snapshot(sid,a);
 END IF;
 IF r.id IS NOT NULL AND r.payload=payload AND r.submitted=submitted THEN RETURN private.e23_snapshot(sid,a); END IF;
 IF r.submitted THEN RAISE EXCEPTION 'REGISTRO_ENTREGUE'; END IF;
 IF coalesce(r.revision,0)<>coalesce((p_payload->>'revision')::int,0) THEN RAISE EXCEPTION 'CONFLITO_DE_VERSAO'; END IF;
 IF submitted AND ((st=1 AND NOT payload ? 'experience_snapshot') OR (st=4 AND NOT payload ? 'material_snapshot') OR
  (st<>1 AND EXISTS(SELECT 1 FROM unnest(CASE st WHEN 2 THEN ARRAY['q1','q2','q3','q4','q5'] WHEN 4 THEN ARRAY['q1','q2','q3'] WHEN 6 THEN ARRAY['q1','q2'] ELSE ARRAY['text'] END) k WHERE length(trim(coalesce(payload->>k,'')))=0))) THEN RAISE EXCEPTION 'REGISTRO_INCOMPLETO'; END IF;
 INSERT INTO private.e23_records(session_id,origin_group,author_group,stage,payload,revision,submitted,submitted_at)
  VALUES(sid,orig,g,st,payload,1,submitted,CASE WHEN submitted THEN now_at END)
  ON CONFLICT(session_id,author_group,stage) DO UPDATE SET payload=excluded.payload,revision=private.e23_records.revision+1,
   submitted=excluded.submitted,submitted_at=excluded.submitted_at,updated_at=now_at RETURNING * INTO r;
 INSERT INTO private.e23_versions(session_id,record_id,entity,entity_id,origin_group,author_group,stage,revision,payload,actor_id)
  VALUES(sid,r.id,CASE st WHEN 1 THEN 'escolha' WHEN 2 THEN 'primeiro_olhar' WHEN 3 THEN 'interlocucao' WHEN 4 THEN 'materialidade' WHEN 5 THEN 'articulacao' ELSE 'revisitacao' END,r.id::text,orig,g,st,r.revision,payload,aid);
 IF submitted THEN INSERT INTO private.e23_deliveries(session_id,group_no,stage,record_id,revision,status) VALUES(sid,g,st,r.id,r.revision,'entregue'); END IF;
 UPDATE private.e23_writers SET expires_at=now_at+interval '35 seconds' WHERE session_id=sid AND group_no=g;
 RETURN private.e23_snapshot(sid,a);
END $function$
;
CREATE OR REPLACE FUNCTION private.e23_tick(p_session uuid, p_now timestamp with time zone DEFAULT clock_timestamp())
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.oficina_integrada(p_token text, p_sid uuid, p_acao text DEFAULT 'ler'::text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a jsonb:=private.e23_identify(p_token); uid uuid:=(a->>'id')::uuid; adm boolean:=a->>'role'='pesquisadora';
 s private.e23_sessions; w private.oficina_salas; g int; o int; b int; owner_id uuid; dados jsonb; destinos int[]; rev int;
begin
 select * into s from private.e23_sessions where id=p_sid and is_test;
 if not found or (a->>'is_test')::boolean and (a->>'session_id')::uuid<>p_sid or (not adm and (not (a->>'is_test')::boolean or a->>'role'<>'participante')) then raise exception 'Acesso reservado'; end if;
 select * into strict w from private.oficina_salas where sessao=p_sid for update;
 select group_no into g from private.e23_members where session_id=p_sid and actor_id=uid;
 if p_acao='configurar' and adm and w.fase=0 then
 select array_agg(x::int order by pos) into destinos from jsonb_array_elements_text(p->'pares') with ordinality t(x,pos);
 if cardinality(destinos) is distinct from s.group_count or exists(select 1 from generate_series(1,s.group_count)i where not(i=any(destinos)) or destinos[i]=i or coalesce(p->'materiais'->>i::text,'') not in ('A','B','C')) then raise exception 'Confira os grupos, materialidades e interlocutoras';end if;
 update private.oficina_salas set pares=destinos,materiais=p->'materiais' where sessao=p_sid;
 elsif p_acao='avancar' and adm and w.fase<8 then
 if w.fase=0 and cardinality(w.pares) is distinct from s.group_count then raise exception 'Confirme os grupos antes de iniciar';end if;
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
ALTER TABLE private.e23_members DROP CONSTRAINT e23_members_group_no_check, ADD CONSTRAINT e23_members_group_no_check CHECK (((group_no >= 1) AND (group_no <= 5)));
ALTER TABLE private.e23_sessions DROP CONSTRAINT e23_sessions_group_count_check, ADD CONSTRAINT e23_sessions_group_count_check CHECK (((group_count = ANY (ARRAY[3, 4])) OR (is_test AND (group_count = 5))));
COMMIT;
