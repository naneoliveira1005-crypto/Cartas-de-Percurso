-- Executar como transação única. Nenhum registro é preservado após o rollback.
BEGIN;
DO $test$
DECLARE sid uuid:=gen_random_uuid(); aid uuid:=gen_random_uuid(); pid uuid:=gen_random_uuid(); oid uuid:=gen_random_uuid();
 token text:=encode(extensions.gen_random_bytes(32),'hex'); participant_token text:=encode(extensions.gen_random_bytes(32),'hex'); observer_token text:=encode(extensions.gen_random_bytes(32),'hex');
 base timestamptz:=clock_timestamp(); st int; amount int;
BEGIN
 INSERT INTO private.e23_sessions(id,title,is_test,group_count,durations,stage,state,started_at)
 VALUES(sid,'TESTE TRANSACIONAL — relógio',true,3,ARRAY[900,900,900,900,900,900],1,'em_curso',base);
 INSERT INTO private.e23_test_access(id,session_id,token_hash,label,role) VALUES
 (aid,sid,encode(extensions.digest(token,'sha256'),'hex'),'TESTE admin','pesquisadora'),
 (pid,sid,encode(extensions.digest(participant_token,'sha256'),'hex'),'TESTE participante','participante'),
 (oid,sid,encode(extensions.digest(observer_token,'sha256'),'hex'),'TESTE observadora','observadora');
 INSERT INTO private.e23_members VALUES(sid,pid,1);
 INSERT INTO private.e23_records(session_id,origin_group,author_group,stage,payload,revision)
 VALUES(sid,1,1,1,'{"registro":"TESTE incompleto preservado"}',1);
 PERFORM private.e23_tick(sid,base+interval '899 seconds');
 SELECT stage INTO st FROM private.e23_sessions WHERE id=sid; IF st<>1 THEN RAISE EXCEPTION 'FAIL tempo principal';END IF;
 PERFORM private.e23_tick(sid,base+interval '900 seconds');
 SELECT stage INTO st FROM private.e23_sessions WHERE id=sid; IF st<>1 THEN RAISE EXCEPTION 'FAIL início dos dois minutos';END IF;
 PERFORM private.e23_tick(sid,base+interval '1019.999 seconds');
 SELECT stage INTO st FROM private.e23_sessions WHERE id=sid; IF st<>1 THEN RAISE EXCEPTION 'FAIL prazo antecipado';END IF;
 PERFORM private.e23_tick(sid,base+interval '1020 seconds');
 SELECT stage INTO st FROM private.e23_sessions WHERE id=sid; IF st<>2 THEN RAISE EXCEPTION 'FAIL transição sincronizada';END IF;
 SELECT count(*) INTO amount FROM private.e23_deliveries WHERE session_id=sid AND stage=1 AND status='prazo_encerrado';
 IF amount<>3 THEN RAISE EXCEPTION 'FAIL grupos incompletos';END IF;
 IF NOT EXISTS(SELECT 1 FROM private.e23_records WHERE session_id=sid AND payload->>'registro'='TESTE incompleto preservado')THEN RAISE EXCEPTION 'FAIL preservação';END IF;
 PERFORM private.e23_tick(sid,base+interval '3060 seconds');
 SELECT stage INTO st FROM private.e23_sessions WHERE id=sid;IF st<>4 THEN RAISE EXCEPTION 'FAIL recuperação do relógio sem clientes';END IF;
 PERFORM set_config('e23.test_sid',sid::text,true);PERFORM set_config('e23.test_admin',token,true);
 PERFORM set_config('e23.test_participant',participant_token,true);PERFORM set_config('e23.test_observer',observer_token,true);
END $test$;
SET LOCAL ROLE anon;
DO $test$
DECLARE sid uuid:=current_setting('e23.test_sid')::uuid; result jsonb; denied boolean; name text;
BEGIN
 FOREACH name IN ARRAY ARRAY['e23_sessions','e23_test_access','e23_members','e23_writers','e23_experiences','e23_materials','e23_files','e23_records','e23_versions','e23_deliveries','e23_events','e23_recoveries','e23_letters_test'] LOOP
  denied:=false;BEGIN EXECUTE format('SELECT count(*) FROM private.%I',name);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL leitura direta da tabela %',name;END IF;
 END LOOP;
 denied:=false;BEGIN PERFORM private.e23_tick(sid);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL acesso direto ao relógio privilegiado';END IF;
 denied:=false;BEGIN PERFORM private.e23_snapshot(sid,'{"role":"pesquisadora"}');EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL forjar papel na função privada';END IF;
 result:=public.e23_api(current_setting('e23.test_admin'),'load',jsonb_build_object('session_id',sid));
 IF result->'actor'->>'role'<>'pesquisadora' THEN RAISE EXCEPTION 'FAIL pesquisadora autenticada';END IF;
 result:=public.e23_api(current_setting('e23.test_observer'),'load',jsonb_build_object('session_id',sid));
 IF result ? 'records' OR result ? 'private_experiences' OR result ? 'files' THEN RAISE EXCEPTION 'FAIL observadora';END IF;
 denied:=false;BEGIN PERFORM public.e23_api(current_setting('e23.test_participant'),'configure',jsonb_build_object('session_id',sid));EXCEPTION WHEN raise_exception THEN denied:=SQLERRM='ACESSO_NEGADO';END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL elevação de participante';END IF;
 denied:=false;BEGIN PERFORM public.e23_api('invalida','load',jsonb_build_object('session_id',sid));EXCEPTION WHEN raise_exception THEN denied:=SQLERRM='ACESSO_INVALIDO';END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL acesso inválido';END IF;
 denied:=false;BEGIN PERFORM public.percurso_admin(current_setting('e23.test_admin'),'carregar','{}');EXCEPTION WHEN raise_exception THEN denied:=SQLERRM='ACESSO_NEGADO';END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL conta TESTE acessou administração real';END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'passed' AS result, 'Relógio, finalização de dois minutos, recuperação sem clientes, 13 tabelas privadas, funções privilegiadas e separação de contas reais/teste' AS checks;
