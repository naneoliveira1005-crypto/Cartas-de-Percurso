-- Regressão nas funções reais da Carta. Tudo é revertido, inclusive as participantes TESTE.
BEGIN;
-- A carta está oculta. Esta ativação só existe nesta transação e nunca é confirmada
-- nem visível às demais conexões; o ROLLBACK preserva o estado de publicação.
UPDATE public.cartas SET ativa=true WHERE slug='o-que-ainda-preciso-dizer';
DO $test$
DECLARE t1 text:=encode(extensions.gen_random_bytes(32),'hex');t2 text:=encode(extensions.gen_random_bytes(32),'hex');
BEGIN
 INSERT INTO public.participantes(codigo,nome_completo,carta_habilitada,token_hash)
 VALUES('TESTE-TRANSACIONAL-'||gen_random_uuid(),'TESTE Carta 1',true,encode(extensions.digest(t1,'sha256'),'hex')),
 ('TESTE-TRANSACIONAL-'||gen_random_uuid(),'TESTE Carta 2',true,encode(extensions.digest(t2,'sha256'),'hex'));
 PERFORM set_config('qa.letter_one',t1,true);PERFORM set_config('qa.letter_two',t2,true);
END $test$;
SET LOCAL ROLE anon;
DO $test$
DECLARE a text:=current_setting('qa.letter_one');b text:=current_setting('qa.letter_two');r jsonb;denied boolean:=false;
BEGIN
 r:=public.carta_percurso_carregar(a);
 IF r->'resposta'<>'null'::jsonb THEN RAISE EXCEPTION 'FAIL carta inicial';END IF;
 PERFORM public.carta_percurso_salvar(a,'TESTE rascunho original','rascunho');
 r:=public.carta_percurso_carregar(a);
 IF r->'resposta'->>'texto'<>'TESTE rascunho original' THEN RAISE EXCEPTION 'FAIL rascunho';END IF;
 r:=public.carta_percurso_carregar(b);
 IF r->'resposta'<>'null'::jsonb THEN RAISE EXCEPTION 'FAIL vazamento entre participantes';END IF;
 PERFORM public.carta_percurso_salvar(a,'TESTE carta revisada','rascunho');
 PERFORM public.carta_percurso_salvar(a,'TESTE carta revisada','enviada');
 r:=public.carta_percurso_carregar(a);
 IF r->'resposta'->>'texto'<>'TESTE carta revisada' OR r->'resposta'->>'status'<>'enviada' THEN RAISE EXCEPTION 'FAIL lacre';END IF;
 BEGIN PERFORM public.carta_percurso_salvar(a,'TESTE alterar depois do lacre','rascunho');
 EXCEPTION WHEN raise_exception THEN denied:=SQLERRM='CARTA_JA_ENVIADA';END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL alteração após lacre';END IF;
 r:=public.carta_percurso_carregar(b);
 IF r->'resposta'<>'null'::jsonb THEN RAISE EXCEPTION 'FAIL carta lacrada alheia';END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'passed' AS result,'Carta existente sob RLS anon: escrita, rascunho, revisão, lacre e isolamento individual; dados TESTE revertidos' AS checks;
