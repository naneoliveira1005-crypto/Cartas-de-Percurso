BEGIN;
DO $test$
DECLARE sid uuid:=gen_random_uuid();aid uuid:=gen_random_uuid();pid uuid:=gen_random_uuid();token text:=encode(extensions.gen_random_bytes(32),'hex');ptoken text:=encode(extensions.gen_random_bytes(32),'hex');before timestamptz;after timestamptz;r jsonb;
BEGIN
 INSERT INTO private.e23_sessions(id,title,is_test,group_count,durations,stage,state,started_at) VALUES(sid,'TESTE contingências',true,3,ARRAY[900,900,900,900,900,900],2,'em_curso',clock_timestamp());
 INSERT INTO private.e23_test_access(id,session_id,token_hash,label,role) VALUES(aid,sid,encode(extensions.digest(token,'sha256'),'hex'),'TESTE admin','pesquisadora'),(pid,sid,encode(extensions.digest(ptoken,'sha256'),'hex'),'TESTE participante','participante');
 INSERT INTO private.e23_members VALUES(sid,pid,1);
 r:=public.e23_api(token,'pause',jsonb_build_object('session_id',sid));
 IF r->'session'->>'state'<>'pausado' THEN RAISE EXCEPTION 'FAIL pausa';END IF;
 PERFORM private.e23_tick(sid,clock_timestamp()+interval '4 hours');
 IF (SELECT stage FROM private.e23_sessions WHERE id=sid)<>2 THEN RAISE EXCEPTION 'FAIL relógio pausado';END IF;
 PERFORM public.e23_api(token,'extend',jsonb_build_object('session_id',sid,'seconds',300));
 IF (SELECT extra_seconds FROM private.e23_sessions WHERE id=sid)<>300 THEN RAISE EXCEPTION 'FAIL prorrogação';END IF;
 SELECT started_at INTO before FROM private.e23_sessions WHERE id=sid;
 UPDATE private.e23_sessions SET paused_at=paused_at-interval '1 minute' WHERE id=sid;
 PERFORM public.e23_api(token,'resume',jsonb_build_object('session_id',sid));
 SELECT started_at INTO after FROM private.e23_sessions WHERE id=sid;
 IF after-before<interval '1 minute' THEN RAISE EXCEPTION 'FAIL retomada';END IF;
 PERFORM public.e23_api(token,'advance',jsonb_build_object('session_id',sid));
 r:=public.e23_api(ptoken,'save',jsonb_build_object('session_id',sid,'stage',2,'payload',jsonb_build_object('q1','TESTE offline sem reserva de escrita'),'client_id',gen_random_uuid()));
 IF NOT (r->>'recovered')::boolean THEN RAISE EXCEPTION 'FAIL recuperação tardia';END IF;
 IF EXISTS(SELECT 1 FROM private.e23_records WHERE session_id=sid) THEN RAISE EXCEPTION 'FAIL sobrescreveu registro';END IF;
END $test$;
ROLLBACK;
SELECT 'passed' AS result,'Pausar, prorrogar, retomar, liberação excepcional e recuperação após perda da reserva de escrita' AS checks;
