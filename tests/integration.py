"""Integração real, exclusivamente com sessões/contas TESTE provisionadas fora do repositório.
Uso: E23_TEST_CREDENTIALS=/caminho/privado.json python3 tests/integration.py
"""
import os,json,uuid,hashlib,pathlib,concurrent.futures,io,wave
import requests
BASE='https://zpsjuxusydfbptjotyxo.supabase.co'
KEY='sb_publishable_n7giA7FAUqRmj1zv2JF8og_VQbjrxa7'
ACCOUNTS=json.loads(pathlib.Path(os.environ['E23_TEST_CREDENTIALS']).read_text())
MATERIALS=pathlib.Path(os.environ['E23_MATERIALS'])
results=[]
def checked(label,condition=True):
 assert condition,label
 results.append(label);print('PASS',label,flush=True)
def call(ctx,who,action,payload=None,expected=None,device=None):
 r=requests.post(BASE+'/rest/v1/rpc/e23_api',headers={'apikey':KEY},json={'p_token':ctx['actors'][who]['token'],'p_action':action,'p_payload':{'session_id':ctx['session_id'],'device':device or ctx['actors'][who]['id'],**(payload or {})}},timeout=30)
 body=r.json()
 if expected:
  assert not r.ok and body.get('message')==expected,(action,r.status_code,body.get('message'));return body
 assert r.ok,(action,r.status_code,body.get('message'))
 return body
def upload(ctx,name,kind,material=None,experience=None,raw=None,mime='application/pdf'):
 content=raw if raw is not None else (MATERIALS/name).read_bytes()
 data={'token':ctx['actors']['admin']['token'],'session_id':ctx['session_id'],'kind':kind}
 if material:data['material_code']=material
 if experience:data['experience_id']=experience
 r=requests.post(BASE+'/functions/v1/por-escrito-e23-files',data=data,files={'file':(name,content,mime)},timeout=60)
 assert r.ok,(r.status_code,r.text)
 value=r.json();assert value['sha256']==hashlib.sha256(content).hexdigest()
 return value['id']
def prepare(ctx):
 for code,name,kind in [('A','A_planejamento_G5.pdf','material'),('B','B_atividades_3_e_4.pdf','material'),('B','B_caderno_consulta.pdf','completo'),('C','C_CNCA_Ciclo_II.pdf','material')]:
  upload(ctx,name,kind,material=code)
 for code in 'ABC':call(ctx,'admin','material',{'code':code,'status':'conferido','note':'Original recuperado e conferido. Documento preparado fielmente para homologação; sem relatos reais.'})
 r=call(ctx,'admin','experience',{'owner_id':ctx['actors']['g1']['id'],'original_text':'ORIGINAL PRIVADO DE TESTE — não é dado de campo.','transcription':'TRANSCRIÇÃO PRIVADA DE TESTE.','title':'Registro técnico de teste','text':'Este texto está identificado como TESTE e serve apenas para verificar a escolha, a circulação e a preservação dos registros. Não representa uma experiência de coordenadora.','authorization_note':'Autorização técnica restrita a homologação, sem dado empírico.','approved':True})
 exp=r['private_experiences'][-1]['id']
 call(ctx,'admin','experience',{'owner_id':ctx['actors']['g2']['id'],'original_text':'NÃO AUTORIZADO — TESTE','title':'NÃO PUBLICAR — TESTE','text':'Texto de teste não autorizado','approved':False})
 return exp
def record(state,group,stage):return next((r for r in state['records'] if r['author_group']==group and r['stage']==stage),None)
def write(ctx,who,stage,payload,submit=True,revision=0,expected=None):
 # A interface renova o controle a cada três segundos; simular a renovação antes da escrita.
 call(ctx,who,'claim_writer')
 return call(ctx,who,'save',{'stage':stage,'payload':payload,'submit':submit,'revision':revision,'client_id':str(uuid.uuid4())},expected=expected)

for label in ['simulacao_3','simulacao_4']:
 ctx=ACCOUNTS[label];count=ctx['count'];groups=[f'g{i}'for i in range(1,count+1)]
 s=call(ctx,'admin','load');assert s['session']['is_test']
 if s['session']['stage']==0:
  exp=prepare(ctx)
  call(ctx,'admin','configure',{'group_count':count,'durations':[900]*6})
 else:
  assert s['session']['stage']==1,'Use uma nova sessão de teste após a etapa 1.'
  exp=next(e['id']for e in s['private_experiences']if e['approved'])
  assert len(s['files'])>=4
 checked(f'{count} grupos: quatro PDFs privados enviados e SHA-256 conferidos')
 for who in ['observer','advisor']:
  ro=call(ctx,who,'load');assert not any(k in ro for k in ['records','private_experiences','people','files'])
  call(ctx,who,'experience',{'owner_id':ctx['actors']['g1']['id']},expected='SOMENTE_LEITURA')
 checked(f'{count} grupos: observadora e orientadora sem acesso novo a conteúdo protegido ou escrita')
 p2=call(ctx,'g2','load');assert len(p2['experiences'])==1 and p2['experiences'][0]['id']==exp and 'owner_id' not in p2['experiences'][0]
 assert all(e['owner_id']==ctx['actors']['g2']['id']for e in p2['my_experiences'])
 checked(f'{count} grupos: relato original, transcrição e versão não autorizada fora da galeria')
 if s['session']['stage']==0:call(ctx,'admin','start')
 for who in groups:call(ctx,who,'claim_writer')
 call(ctx,'g1b','claim_writer',expected='OUTRA_PESSOA_ESCREVENDO')
 checked(f'{count} grupos: exclusão de escrita simultânea no mesmo grupo')
 with concurrent.futures.ThreadPoolExecutor(max_workers=count) as executor:
  list(executor.map(lambda who:write(ctx,who,1,{'experience_id':exp}),groups))
 checked(f'{count} grupos: salvamento e entrega simultâneos em grupos diferentes')
 state=call(ctx,'g1','load');assert state['session']['stage']==1
 checked(f'{count} grupos: entrega antecipada aguarda o prazo comum')
 call(ctx,'admin','advance')
 state=write(ctx,'g1',2,{'q1':'TESTE versão 1'},False);assert record(state,1,2)['revision']==1
 write(ctx,'g1',2,{'q1':'TESTE sobrescrita atrasada'},False,0,'CONFLITO_DE_VERSAO')
 checked(f'{count} grupos: revisão esperada impede perda de dados entre abas')
 for i,who in enumerate(groups,1):
  values={f'q{j}':f'TESTE Grupo {i}, pergunta {j}, primeira construção'for j in range(1,6)}
  write(ctx,who,2,values,i!=count,1 if i==1 else 0)
 state=call(ctx,'g1','load');assert all(r['author_group']==1 for r in state['records'])
 checked(f'{count} grupos: produções alheias ainda não circulam na primeira análise')
 call(ctx,'admin','advance')
 for i,who in enumerate(groups,1):
  state=call(ctx,who,'load');origin=i%count+1
  assert record(state,origin,2) is not None
  write(ctx,who,3,{'text':f'TESTE interlocução do Grupo {i} sobre Grupo {origin}.'})
 checked(f'{count} grupos: circulação completa, somente leitura da análise original')
 # Texto atrasado é preservado separadamente, sem reescrever a primeira construção.
 before=call(ctx,'g1','load');first=record(before,1,2)['payload']
 late=write(ctx,'g1',2,{'q1':'TESTE recuperado após queda de conexão'},False,0)
 assert late['recovered'] and record(call(ctx,'g1','load'),1,2)['payload']==first
 checked(f'{count} grupos: reconexão após prazo encaminha versão separada para recuperação')
 call(ctx,'admin','advance')
 for i,who in enumerate(groups):write(ctx,who,4,{'material':'ABC'[i%3],**{f'q{j}':'TESTE leitura da materialidade'for j in range(1,4)}})
 checked(f'{count} grupos: seleção e análise das três materialidades')
 call(ctx,'admin','advance')
 for who in groups:write(ctx,who,5,{'text':'TESTE articulação preservada em registro próprio.'})
 call(ctx,'admin','advance')
 for i,who in enumerate(groups,1):
  state=call(ctx,who,'load');own=[r for r in state['records']if r['origin_group']==i];assert len(own)==5
  write(ctx,who,6,{'q1':'TESTE revisitação com diferenças preservadas.','q2':'TESTE registro do grupo, sem síntese automática.'})
 call(ctx,'admin','advance');checked(f'{count} grupos: devolução completa e revisitação sem sobrescrever versões')
 exported=call(ctx,'admin','export');assert len(exported['records'])==6*count and len(exported['versions'])>=6*count
 assert 'originals' not in exported and 'private_versions' not in exported
 assert any(d['status']=='prazo_encerrado'for d in exported['deliveries'])
 checked(f'{count} grupos: exportação estruturada, procedência e entrega incompleta preservadas')
 l=call(ctx,'g1','letter_load');assert l['letter'] is None
 l=call(ctx,'g1','letter_save',{'text':'TESTE de carta individual.','revision':0});assert l['letter']['revision']==1
 call(ctx,'g1','letter_save',{'text':'TESTE conflito','revision':0},expected='CONFLITO_DE_VERSAO')
 assert call(ctx,'g2','letter_load')['letter'] is None
 call(ctx,'g1','letter_save',{'text':'TESTE de carta individual revisada.','revision':1,'submit':True})
 call(ctx,'g1','letter_save',{'text':'TESTE alterar lacre','revision':2},expected='CARTA_JA_LACRADA')
 checked(f'{count} grupos: carta de teste individual, revisão, conflito e lacre protegidos')

ctx=ACCOUNTS['homologacao'];exp=prepare(ctx)
bio=io.BytesIO()
with wave.open(bio,'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(8000);w.writeframes(b'\x00\x00'*8000)
audio=upload(ctx,'TESTE_silencio.wav','audio',experience=exp,raw=bio.getvalue(),mime='audio/wav')
for who,expected in [('g1',200),('g2',403),('observer',403),('advisor',403)]:
 r=requests.post(BASE+'/functions/v1/por-escrito-e23-files',json={'token':ctx['actors'][who]['token'],'session_id':ctx['session_id'],'file_id':audio},timeout=30);assert r.status_code==expected,(who,r.status_code)
 if expected==200:assert requests.get(r.json()['url'],timeout=30).content==bio.getvalue()
checked('Áudio protegido: autora acessa; colega, observadora e orientadora são recusadas')
r=requests.post(BASE+'/functions/v1/por-escrito-e23-files',json={'token':'invalido','session_id':ctx['session_id'],'file_id':audio},timeout=30);assert r.status_code==403
checked('Endpoint de arquivos nega acesso sem credencial válida')
pathlib.Path(os.environ.get('E23_TEST_REPORT','/tmp/e23-integration-results.json')).write_text(json.dumps({'passed':len(results),'results':results},indent=2,ensure_ascii=False))
print('TOTAL',len(results),'verificações de integração aprovadas.',flush=True)
