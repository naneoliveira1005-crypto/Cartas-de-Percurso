BEGIN;
DO $test$
DECLARE a text:=encode(extensions.gen_random_bytes(32),'hex');p text:=encode(extensions.gen_random_bytes(32),'hex');
BEGIN
 INSERT INTO public.pesquisadora_acessos(rotulo,chave_hash) VALUES('TESTE TRANSACIONAL',encode(extensions.digest(a,'sha256'),'hex'));
 INSERT INTO public.participantes(codigo,nome_completo,token_hash) VALUES('TESTE-TRANSACIONAL-'||gen_random_uuid(),'TESTE novo encontro',encode(extensions.digest(p,'sha256'),'hex'));
 PERFORM set_config('qa.reserved_admin',a,true);PERFORM set_config('qa.reserved_person',p,true);
END $test$;
SET LOCAL ROLE anon;
DO $test$
DECLARE r jsonb;sid uuid;denied boolean:=false;
BEGIN
 r:=public.e23_api(current_setting('qa.reserved_admin'),'create_session','{"title":"TESTE transacional reservado","is_test":false}');sid:=(r->>'id')::uuid;
 r:=public.e23_api(current_setting('qa.reserved_admin'),'load',jsonb_build_object('session_id',sid));
 IF (r->'session'->>'published')::boolean OR jsonb_array_length(r->'materials')<>3 THEN RAISE EXCEPTION 'FAIL preparação reservada';END IF;
 BEGIN PERFORM public.e23_api(current_setting('qa.reserved_person'),'load',jsonb_build_object('session_id',sid));
 EXCEPTION WHEN raise_exception THEN denied:=SQLERRM='ENCONTRO_NAO_LIBERADO';END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL participante entrou sem liberação';END IF;
 r:=public.e23_api(current_setting('qa.reserved_person'),'sessions');
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'sessions') e WHERE e->>'id'=sid::text) THEN RAISE EXCEPTION 'FAIL encontro reservado listado';END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'passed' AS result,'Criação reservada pela pesquisadora; três materialidades pendentes; participante sem acesso até liberação' AS checks;
