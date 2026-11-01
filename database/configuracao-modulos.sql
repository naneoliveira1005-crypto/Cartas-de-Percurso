CREATE OR REPLACE FUNCTION private.percurso_admin(p_chave text, p_acao text DEFAULT 'carregar'::text, p_dados jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_id uuid; v_token text; v_codigo text;
BEGIN
 PERFORM private.percurso_admin_validar(p_chave);
 IF p_acao='configurar' THEN
  IF p_dados->>'id' NOT IN ('e3','e4','e5') OR EXISTS(SELECT 1 FROM private.percurso_registros WHERE modulo=p_dados->>'id') THEN RAISE EXCEPTION 'MODULO_NAO_EDITAVEL'; END IF;
  IF jsonb_typeof(p_dados#>'{conteudo,questoes}') IS DISTINCT FROM 'array' OR jsonb_array_length(p_dados#>'{conteudo,questoes}') NOT BETWEEN 1 AND 4 THEN RAISE EXCEPTION 'QUESTOES_INVALIDAS'; END IF;
  UPDATE private.percurso_modulos SET conteudo=p_dados->'conteudo' WHERE id=p_dados->>'id';
 ELSIF p_acao='liberar' THEN
  IF p_dados->>'id' IN ('e3','e4','e5') AND (p_dados->>'liberado')::boolean AND NOT EXISTS(SELECT 1 FROM private.percurso_modulos WHERE id=p_dados->>'id' AND conteudo ? 'questoes') THEN RAISE EXCEPTION 'CONTEUDO_AINDA_NAO_CONFIGURADO'; END IF;
  UPDATE private.percurso_modulos SET liberado=(p_dados->>'liberado')::boolean WHERE id=p_dados->>'id';
  IF p_dados->>'id'='carta' THEN UPDATE public.cartas SET ativa=(p_dados->>'liberado')::boolean WHERE slug='o-que-ainda-preciso-dizer'; END IF;
 ELSIF p_acao='material' THEN
  IF coalesce(p_dados->>'titulo','')='' OR coalesce(p_dados->>'url','') !~ '^https://' THEN RAISE EXCEPTION 'MATERIAL_INVALIDO'; END IF;
  INSERT INTO private.percurso_materiais(modulo,titulo,url,liberado) VALUES(p_dados->>'modulo',p_dados->>'titulo',p_dados->>'url',coalesce((p_dados->>'liberado')::boolean,false));
 ELSIF p_acao='material_visibilidade' THEN
  UPDATE private.percurso_materiais SET liberado=(p_dados->>'liberado')::boolean WHERE id=(p_dados->>'id')::uuid;
 ELSIF p_acao='cadastrar' THEN
  PERFORM pg_advisory_xact_lock(350021);
  IF (SELECT count(*) FROM public.participantes WHERE codigo ~ '^CP[0-9]+$')>=35 THEN RAISE EXCEPTION 'LIMITE_35_PARTICIPANTES'; END IF;
  IF length(trim(coalesce(p_dados->>'nome','')))<3 OR coalesce(p_dados->>'email','') !~ '^[^ @]+@[^ @]+\.[^ @]+$' THEN RAISE EXCEPTION 'NOME_EMAIL_INVALIDOS'; END IF;
  IF EXISTS(SELECT 1 FROM public.participantes WHERE lower(email)=lower(trim(p_dados->>'email'))) THEN RAISE EXCEPTION 'EMAIL_JA_CADASTRADO'; END IF;
  SELECT 'CP'||lpad((coalesce(max(substring(codigo from 3)::int),0)+1)::text,2,'0') INTO v_codigo FROM public.participantes WHERE codigo ~ '^CP[0-9]+$';
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO public.participantes(codigo,nome_completo,email,participacao_confirmada,carta_habilitada,token_hash,token_criado_em) VALUES(v_codigo,trim(p_dados->>'nome'),lower(trim(p_dados->>'email')),true,true,encode(extensions.digest(v_token,'sha256'),'hex'),now()) RETURNING id INTO v_id;
  INSERT INTO private.participante_links(participante_id,token) VALUES(v_id,v_token);
  RETURN jsonb_build_object('codigo',v_codigo,'chave',v_token);
 ELSIF p_acao<>'carregar' THEN RAISE EXCEPTION 'ACAO_INVALIDA';
 END IF;
 RETURN jsonb_build_object(
 'participantes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'codigo',codigo,'nome',nome_completo,'email',email,'primeiro_acesso_em',primeiro_acesso_em) ORDER BY codigo) FROM public.participantes WHERE codigo ~ '^CP[0-9]+$'),'[]'::jsonb),
 'modulos',(SELECT jsonb_agg(to_jsonb(m) ORDER BY ordem) FROM private.percurso_modulos m),
 'registros',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY criado_em) FROM private.percurso_registros r),'[]'::jsonb),
 'cartas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'participante_id',participante_id,'modulo','carta','respostas',jsonb_build_object('texto',texto_livre),'status',status,'criado_em',criado_em,'atualizado_em',atualizado_em,'enviado_em',enviado_em)) FROM public.respostas),'[]'::jsonb),
 'materiais',coalesce((SELECT jsonb_agg(to_jsonb(m)) FROM private.percurso_materiais m),'[]'::jsonb));
END $function$
;
