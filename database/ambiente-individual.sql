-- Ambiente Individual de Registros. Existing participant keys and corpus preserved.
CREATE TABLE private.percurso_modulos (
 id text PRIMARY KEY, titulo text NOT NULL, tipo text NOT NULL,
 liberado boolean NOT NULL DEFAULT false, data_encontro date,
 conteudo jsonb NOT NULL DEFAULT '{}'::jsonb, ordem int NOT NULL
);
CREATE TABLE private.percurso_registros (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), participante_id uuid NOT NULL REFERENCES public.participantes(id),
 modulo text NOT NULL REFERENCES private.percurso_modulos(id),
 respostas jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho','enviado')),
 complemento_de uuid REFERENCES private.percurso_registros(id), revisao int NOT NULL DEFAULT 1,
 criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(), enviado_em timestamptz
);
CREATE INDEX percurso_registros_participante ON private.percurso_registros(participante_id,modulo);
CREATE INDEX percurso_registros_complemento ON private.percurso_registros(complemento_de);
CREATE UNIQUE INDEX percurso_registro_unico ON private.percurso_registros(participante_id,modulo) WHERE modulo<>'livre' AND complemento_de IS NULL;
CREATE TABLE private.percurso_materiais(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),modulo text REFERENCES private.percurso_modulos(id),titulo text NOT NULL,url text NOT NULL CHECK(url ~ '^https://'),liberado boolean NOT NULL DEFAULT false,criado_em timestamptz DEFAULT now());
ALTER TABLE private.percurso_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.percurso_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.percurso_materiais ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.percurso_modulos,private.percurso_registros,private.percurso_materiais FROM public,anon,authenticated;
INSERT INTO private.percurso_modulos(id,titulo,tipo,liberado,data_encontro,ordem) VALUES
('e1','E1 — Entre o que fazemos e o que sabemos','memoria',true,'2026-10-26',1),
('e2','E2 — Tornar-se coordenadora pedagógica','encontro',true,'2026-11-13',2),
('e3','E3 — O que sustenta nossa leitura pedagógica?','encontro',false,'2026-11-25',3),
('e4','E4 — Decisões em situações reais de trabalho','encontro',false,'2026-11-30',4),
('e5','E5 — Construindo referências para o trabalho da coordenação pedagógica','encontro',false,'2026-12-08',5),
('livre','Quero registrar algo','espontaneo',true,null,6),
('carta','Carta de Percurso — O que ainda preciso dizer','carta',false,null,7);
UPDATE public.cartas SET ativa=false WHERE slug='o-que-ainda-preciso-dizer';

-- Capability authentication: existing 256-bit keys, hashes checked on every call.
-- Helpers are private; no auth.uid assumption because existing access is not Supabase Auth.
CREATE FUNCTION private.percurso_identificar(p_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF p_token IS NULL OR trim(p_token) !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'ACESSO_INVALIDO'; END IF;
 SELECT id INTO v_id FROM public.participantes WHERE token_hash=encode(extensions.digest(trim(p_token),'sha256'),'hex') AND participacao_confirmada AND (token_expira_em IS NULL OR token_expira_em>now());
 IF v_id IS NULL THEN RAISE EXCEPTION 'ACESSO_INVALIDO'; END IF;
 RETURN v_id;
END $$;
CREATE FUNCTION private.percurso_admin_validar(p_chave text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_chave IS NULL OR NOT EXISTS(SELECT 1 FROM public.pesquisadora_acessos WHERE ativa AND chave_hash=encode(extensions.digest(trim(p_chave),'sha256'),'hex')) THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.percurso_identificar(text),private.percurso_admin_validar(text) FROM public,anon,authenticated;

CREATE FUNCTION private.percurso_carregar(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_result jsonb;
BEGIN
 v_id:=private.percurso_identificar(p_token);
 UPDATE public.participantes SET primeiro_acesso_em=coalesce(primeiro_acesso_em,now()),ultimo_acesso_em=now() WHERE id=v_id;
 SELECT jsonb_build_object(
 'participante',(SELECT jsonb_build_object('codigo',codigo,'nome',nome_completo) FROM public.participantes WHERE id=v_id),
 'modulos',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY ordem) FROM private.percurso_modulos m WHERE liberado),'[]'::jsonb),
 'registros',coalesce((SELECT jsonb_agg(to_jsonb(r) - 'participante_id' ORDER BY criado_em) FROM private.percurso_registros r WHERE participante_id=v_id),'[]'::jsonb),
 'materiais',coalesce((SELECT jsonb_agg(to_jsonb(m)) FROM private.percurso_materiais m JOIN private.percurso_modulos d ON d.id=m.modulo WHERE m.liberado AND d.liberado),'[]'::jsonb),
 'cartas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'modulo','carta','respostas',jsonb_build_object('texto',r.texto_livre),'status',r.status,'criado_em',r.criado_em,'enviado_em',r.enviado_em,'atualizado_em',r.atualizado_em)) FROM public.respostas r WHERE participante_id=v_id),'[]'::jsonb)
 ) INTO v_result;
 RETURN v_result;
END $$;
CREATE FUNCTION public.percurso_carregar(p_token text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.percurso_carregar(p_token); $$;

CREATE FUNCTION private.percurso_salvar(p_token text,p_id uuid,p_modulo text,p_respostas jsonb,p_enviar boolean,p_revisao int,p_complemento uuid DEFAULT null) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_r private.percurso_registros%rowtype; v_n int;
BEGIN
 v_id:=private.percurso_identificar(p_token);
 PERFORM 1 FROM public.participantes WHERE id=v_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM private.percurso_modulos WHERE id=p_modulo AND liberado AND tipo IN ('encontro','espontaneo')) THEN RAISE EXCEPTION 'MODULO_INDISPONIVEL'; END IF;
 IF p_id IS NULL OR p_respostas IS NULL OR jsonb_typeof(p_respostas)<>'object' OR length(p_respostas::text)>100000 THEN RAISE EXCEPTION 'REGISTRO_INVALIDO'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_respostas) WHERE jsonb_typeof(value)<>'string' OR key NOT IN ('q1','q2','q3','q4','texto')) THEN RAISE EXCEPTION 'CAMPOS_INVALIDOS'; END IF;
 IF p_enviar AND NOT EXISTS(SELECT 1 FROM jsonb_each_text(p_respostas) WHERE length(trim(value))>0) THEN RAISE EXCEPTION 'REGISTRO_VAZIO'; END IF;
 IF p_complemento IS NOT NULL AND NOT EXISTS(SELECT 1 FROM private.percurso_registros WHERE id=p_complemento AND participante_id=v_id AND modulo=p_modulo AND status='enviado') THEN RAISE EXCEPTION 'COMPLEMENTO_INVALIDO'; END IF;
 SELECT * INTO v_r FROM private.percurso_registros WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF v_r.participante_id<>v_id OR v_r.modulo<>p_modulo OR v_r.complemento_de IS DISTINCT FROM p_complemento THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
  IF v_r.status='enviado' THEN
   IF p_enviar AND v_r.respostas=p_respostas THEN RETURN to_jsonb(v_r)-'participante_id'; END IF;
   RAISE EXCEPTION 'REGISTRO_JA_ENVIADO';
  END IF;
  IF v_r.revisao<>p_revisao THEN RAISE EXCEPTION 'REGISTRO_ATUALIZADO_EM_OUTRA_ABA'; END IF;
  UPDATE private.percurso_registros SET respostas=p_respostas,status=CASE WHEN p_enviar THEN 'enviado' ELSE 'rascunho' END,revisao=revisao+1,atualizado_em=now(),enviado_em=CASE WHEN p_enviar THEN now() END WHERE id=p_id RETURNING * INTO v_r;
 ELSE
  INSERT INTO private.percurso_registros(id,participante_id,modulo,respostas,status,complemento_de,enviado_em) VALUES(p_id,v_id,p_modulo,p_respostas,CASE WHEN p_enviar THEN 'enviado' ELSE 'rascunho' END,p_complemento,CASE WHEN p_enviar THEN now() END) RETURNING * INTO v_r;
 END IF;
 RETURN to_jsonb(v_r)-'participante_id';
END $$;
CREATE FUNCTION public.percurso_salvar(p_token text,p_id uuid,p_modulo text,p_respostas jsonb,p_enviar boolean,p_revisao int,p_complemento uuid DEFAULT null) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.percurso_salvar(p_token,p_id,p_modulo,p_respostas,p_enviar,p_revisao,p_complemento); $$;

CREATE FUNCTION private.percurso_admin(p_chave text,p_acao text DEFAULT 'carregar',p_dados jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_token text; v_codigo text;
BEGIN
 PERFORM private.percurso_admin_validar(p_chave);
 IF p_acao='liberar' THEN
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
END $$;
CREATE FUNCTION public.percurso_admin(p_chave text,p_acao text DEFAULT 'carregar',p_dados jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.percurso_admin(p_chave,p_acao,p_dados); $$;
REVOKE ALL ON FUNCTION private.percurso_carregar(text),private.percurso_salvar(text,uuid,text,jsonb,boolean,int,uuid),private.percurso_admin(text,text,jsonb),public.percurso_carregar(text),public.percurso_salvar(text,uuid,text,jsonb,boolean,int,uuid),public.percurso_admin(text,text,jsonb) FROM public,authenticated;
GRANT USAGE ON SCHEMA private TO anon;
GRANT EXECUTE ON FUNCTION private.percurso_carregar(text),private.percurso_salvar(text,uuid,text,jsonb,boolean,int,uuid),private.percurso_admin(text,text,jsonb),public.percurso_carregar(text),public.percurso_salvar(text,uuid,text,jsonb,boolean,int,uuid),public.percurso_admin(text,text,jsonb) TO anon;

UPDATE private.percurso_modulos SET conteudo=$conteudo${"subtitulo": "FOLHA DE PERCURSO", "introducao": ["Pense em uma situação concreta que você viveu na coordenação pedagógica e que tenha sido importante no seu percurso.", "Não precisa ser uma situação extraordinária nem necessariamente positiva. Pode ser algo que marcou, trouxe uma dificuldade, fez você pensar, mudou alguma forma de agir ou que ainda permanece como questão.", "Escolha uma situação e registre a partir dela.", "Mais adiante, vocês irão colocar essas experiências em conversa com o grupo para perceber o que se aproxima entre os percursos, o que aparece de maneira diferente e que questões continuam abertas.", "Por isso, neste primeiro momento, procure registrar a sua própria experiência."], "importante": ["Este é um espaço individual. O que você registrar aqui permanece no seu percurso e não precisará ser apresentado integralmente ao grupo.", "Na conversa coletiva, você poderá compartilhar apenas aquilo que desejar, preservando o que considerar importante manter no seu espaço individual."], "questoes": [{"id": "q1", "titulo": "1. SITUAÇÃO / EXPERIÊNCIA", "pergunta": "Que situação ou experiência você escolheu registrar?"}, {"id": "q2", "titulo": "2. OLHANDO PARA AQUELA SITUAÇÃO", "pergunta": "O que você precisou compreender ou considerar naquela situação?"}, {"id": "q3", "titulo": "3. O QUE ESSA EXPERIÊNCIA PRODUZIU NO SEU PERCURSO", "pergunta": "Depois dessa experiência, você passou a pensar ou fazer alguma coisa de outro jeito como coordenadora? O quê?"}, {"id": "q4", "titulo": "4. OLHANDO HOJE PARA O QUE VIVEU", "pergunta": "Olhando hoje para essa situação, você faria algo diferente? Por quê?"}]}$conteudo$::jsonb WHERE id='e2';
UPDATE private.percurso_modulos SET conteudo=$conteudo${"questoes": [{"id": "texto", "titulo": "Seu registro", "pergunta": "Aconteceu alguma situação, surgiu uma dúvida, uma percepção ou algo que você gostaria de registrar sobre o seu trabalho como coordenadora? Se quiser, escreva aqui."}]}$conteudo$::jsonb WHERE id='livre';

CREATE OR REPLACE FUNCTION public.carta_percurso_salvar(p_token text, p_texto text, p_status text DEFAULT 'rascunho'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_p public.participantes%rowtype;
  v_c public.cartas%rowtype;
  v_existente public.respostas%rowtype;
  v_status text;
  v_agora timestamptz := now();
begin
  if p_token is null or length(trim(p_token))<24 then raise exception 'LINK_INVALIDO'; end if;
  if length(coalesce(p_texto,''))>60000 then raise exception 'TEXTO_MUITO_LONGO'; end if;
  v_status:=case when p_status='enviada' then 'enviada' else 'rascunho' end;
  if v_status='enviada' and length(trim(coalesce(p_texto,'')))=0 then raise exception 'TEXTO_VAZIO'; end if;

  perform set_config('request.carta_token', trim(p_token), true);

  select * into v_p from public.participantes limit 1 for update;
  if not found then raise exception 'LINK_INVALIDO'; end if;

  select * into v_c from public.cartas
  where slug='o-que-ainda-preciso-dizer' and ativa=true
  order by versao desc limit 1;
  if not found then raise exception 'CARTA_INDISPONIVEL'; end if;

  select * into v_existente from public.respostas
  where participante_id=v_p.id and carta_id=v_c.id limit 1;
  if v_existente.id is not null and v_existente.status='enviada' then raise exception 'CARTA_JA_ENVIADA'; end if;

  insert into public.respostas(participante_id,carta_id,texto_livre,respostas,status,enviado_em,criado_em,atualizado_em)
  values(v_p.id,v_c.id,coalesce(p_texto,''),'{}'::jsonb,v_status,
    case when v_status='enviada' then v_agora else null end,v_agora,v_agora)
  on conflict(participante_id,carta_id)
  do update set texto_livre=excluded.texto_livre,status=excluded.status,
    enviado_em=case when excluded.status='enviada' then v_agora else public.respostas.enviado_em end,
    atualizado_em=v_agora;

  if v_status='enviada' then
    update public.participantes set carta_enviada=true,atualizado_em=v_agora where id=v_p.id;
  end if;

  return jsonb_build_object('ok',true,'status',v_status,
    'enviado_em',case when v_status='enviada' then v_agora else null end,
    'atualizado_em',v_agora);
end;
$function$;

CREATE OR REPLACE FUNCTION private.pesquisadora_painel(p_chave text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'extensions', 'pg_temp'
AS $function$
declare
  v_acesso_id uuid;
  v_result jsonb;
begin
  if p_chave is null or length(trim(p_chave)) < 24 then
    raise exception 'ACESSO_NEGADO';
  end if;

  select a.id into v_acesso_id
  from public.pesquisadora_acessos a
  where a.ativa=true
    and a.chave_hash=encode(digest(trim(p_chave),'sha256'),'hex')
  limit 1;

  if v_acesso_id is null then
    raise exception 'ACESSO_NEGADO';
  end if;

  update public.pesquisadora_acessos
  set ultimo_acesso_em=now()
  where id=v_acesso_id;

  select jsonb_build_object(
    'resumo', jsonb_build_object(
      'total', count(*) filter (where p.codigo ~ '^CP[0-9]{2}$'),
      'abertas', count(*) filter (where p.codigo ~ '^CP[0-9]{2}$' and p.primeiro_acesso_em is not null),
      'rascunhos', count(*) filter (where p.codigo ~ '^CP[0-9]{2}$' and r.status='rascunho'),
      'enviadas', count(*) filter (where p.codigo ~ '^CP[0-9]{2}$' and r.status='enviada')
    ),
    'participantes',
    coalesce(jsonb_agg(
      jsonb_build_object(
        'codigo',p.codigo,
        'nome',p.nome_completo,
        'link','https://naneoliveira1005-crypto.github.io/Cartas-de-Percurso/?token='||l.token,
        'mensagem',p.mensagem_personalizada,
        'presente_tipo',p.presente_tipo,
        'presente_titulo',p.presente_titulo,
        'presente_motivo',p.presente_motivo,
        'presente_link',p.presente_link,
        'primeiro_acesso_em',p.primeiro_acesso_em,
        'ultimo_acesso_em',p.ultimo_acesso_em,
        'carta_enviada',p.carta_enviada,
        'status',coalesce(r.status,'nao_iniciada'),
        'texto',r.texto_livre,
        'atualizado_em',r.atualizado_em,
        'enviado_em',r.enviado_em
      ) order by p.codigo
    ) filter (where p.codigo ~ '^CP[0-9]{2}$'),'[]'::jsonb)
  )
  into v_result
  from public.participantes p
  left join public.respostas r on r.participante_id=p.id
  left join private.participante_links l on l.participante_id=p.id;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.pesquisadora_painel(p_chave text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.pesquisadora_painel(p_chave); $$;
REVOKE ALL ON FUNCTION private.pesquisadora_painel(text),public.pesquisadora_painel(text) FROM public,authenticated;
GRANT EXECUTE ON FUNCTION private.pesquisadora_painel(text),public.pesquisadora_painel(text) TO anon;
CREATE FUNCTION private.proteger_registro_enviado() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.status IN ('enviado','enviada') THEN RAISE EXCEPTION 'REGISTRO_ENVIADO_IMUTAVEL'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.proteger_registro_enviado() FROM public,anon,authenticated;
CREATE TRIGGER preservar_envio BEFORE UPDATE OR DELETE ON private.percurso_registros FOR EACH ROW EXECUTE FUNCTION private.proteger_registro_enviado();
CREATE TRIGGER preservar_carta BEFORE UPDATE OR DELETE ON public.respostas FOR EACH ROW EXECUTE FUNCTION private.proteger_registro_enviado();

