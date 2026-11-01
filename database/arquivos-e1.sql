CREATE TABLE private.percurso_arquivos(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),modulo text NOT NULL DEFAULT 'e1' REFERENCES private.percurso_modulos(id),
 participante_id uuid REFERENCES public.participantes(id),coletivo boolean NOT NULL DEFAULT false,
 nome_pendente text,email_pendente text,titulo text NOT NULL,nome_arquivo text NOT NULL,mime text NOT NULL,
 dados bytea NOT NULL,sha256 text UNIQUE NOT NULL,origem text NOT NULL,paginas text,
 importado_em timestamptz NOT NULL DEFAULT now(),data_encontro date NOT NULL DEFAULT '2026-10-26',
 CHECK(NOT coletivo OR participante_id IS NULL),CHECK(coletivo OR participante_id IS NOT NULL OR email_pendente IS NOT NULL)
);
ALTER TABLE private.percurso_arquivos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.percurso_arquivos FROM public,anon,authenticated;
CREATE INDEX percurso_arquivos_participante ON private.percurso_arquivos(participante_id);
CREATE FUNCTION private.percurso_arquivos(p_token text DEFAULT null,p_chave text DEFAULT null,p_id uuid DEFAULT null) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_p uuid;v_admin boolean:=false;v_r jsonb;
BEGIN
 IF p_chave IS NOT NULL THEN PERFORM private.percurso_admin_validar(p_chave);v_admin:=true;
 ELSE v_p:=private.percurso_identificar(p_token); END IF;
 IF p_id IS NULL THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'modulo',a.modulo,'participante_id',CASE WHEN v_admin THEN a.participante_id END,'coletivo',a.coletivo,'titulo',a.titulo,'nome_arquivo',a.nome_arquivo,'mime',a.mime,'origem',a.origem,'paginas',a.paginas,'data_encontro',a.data_encontro,'importado_em',a.importado_em,'pendente',NOT a.coletivo AND a.participante_id IS NULL,'nome_pendente',CASE WHEN v_admin THEN a.nome_pendente END) ORDER BY a.coletivo,a.titulo),'[]'::jsonb) INTO v_r
 FROM private.percurso_arquivos a JOIN private.percurso_modulos m ON m.id=a.modulo
 WHERE v_admin OR (m.liberado AND (a.coletivo OR a.participante_id=v_p));
 ELSE
 SELECT jsonb_build_object('nome_arquivo',a.nome_arquivo,'mime',a.mime,'base64',encode(a.dados,'base64'),'sha256',a.sha256) INTO v_r FROM private.percurso_arquivos a JOIN private.percurso_modulos m ON m.id=a.modulo WHERE a.id=p_id AND (v_admin OR (m.liberado AND (a.coletivo OR a.participante_id=v_p)));
 IF v_r IS NULL THEN RAISE EXCEPTION 'ARQUIVO_INDISPONIVEL'; END IF;
 END IF;
 RETURN v_r;
END $$;
CREATE FUNCTION public.percurso_arquivos(p_token text DEFAULT null,p_chave text DEFAULT null,p_id uuid DEFAULT null) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.percurso_arquivos(p_token,p_chave,p_id);$$;
CREATE FUNCTION private.percurso_arquivo_importar(p_chave text,p_arquivo jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_p uuid;v_dados bytea;v_hash text;v_id uuid;v_coletivo boolean;
BEGIN
 PERFORM private.percurso_admin_validar(p_chave);
 v_coletivo:=(p_arquivo->>'coletivo')::boolean;
 IF p_arquivo->>'mime' NOT IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document') OR length(p_arquivo->>'base64')>14000000 THEN RAISE EXCEPTION 'ARQUIVO_INVALIDO';END IF;
 v_dados:=decode(p_arquivo->>'base64','base64');v_hash:=encode(extensions.digest(v_dados,'sha256'),'hex');
 IF v_hash<>p_arquivo->>'sha256' THEN RAISE EXCEPTION 'HASH_INVALIDO';END IF;
 IF NOT v_coletivo THEN SELECT id INTO v_p FROM public.participantes WHERE lower(email)=lower(p_arquivo->>'email');END IF;
 INSERT INTO private.percurso_arquivos(participante_id,coletivo,nome_pendente,email_pendente,titulo,nome_arquivo,mime,dados,sha256,origem,paginas)
 VALUES(v_p,v_coletivo,CASE WHEN NOT v_coletivo AND v_p IS NULL THEN p_arquivo->>'nome' END,CASE WHEN NOT v_coletivo AND v_p IS NULL THEN p_arquivo->>'email' END,p_arquivo->>'titulo',p_arquivo->>'nome_arquivo',p_arquivo->>'mime',v_dados,v_hash,p_arquivo->>'origem',p_arquivo->>'paginas')
 ON CONFLICT(sha256) DO NOTHING RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'criado',v_id IS NOT NULL,'vinculado',v_p IS NOT NULL,'coletivo',v_coletivo);
END $$;
CREATE FUNCTION public.percurso_arquivo_importar(p_chave text,p_arquivo jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.percurso_arquivo_importar(p_chave,p_arquivo);$$;
REVOKE ALL ON FUNCTION private.percurso_arquivos(text,text,uuid),public.percurso_arquivos(text,text,uuid),private.percurso_arquivo_importar(text,jsonb),public.percurso_arquivo_importar(text,jsonb) FROM public,authenticated;
GRANT EXECUTE ON FUNCTION private.percurso_arquivos(text,text,uuid),public.percurso_arquivos(text,text,uuid),private.percurso_arquivo_importar(text,jsonb),public.percurso_arquivo_importar(text,jsonb) TO anon;
