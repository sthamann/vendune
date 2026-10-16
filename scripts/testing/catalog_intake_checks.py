"""Native catalogue intake through HTTP/MCP; real stage saves, exact replay, current rights and selected release, no model calls."""
import copy,uuid

def check_catalog_intake(req, merchant, foreign):
    context=req('/api/merchant/catalog/intake',h=merchant)
    assert not context['sandbox']
    preview=req('/api/merchant/catalog/intake',{'mode':'csv','source':'\ufeffname;price;description\r\n"Oak; chair";"19,90";"Line 1\nLine ""2"""\r\n','count':3},merchant)
    assert preview['drafts'][0]['price']==19.9 and preview['drafts'][0]['name']=='Oak; chair' and not preview['saved']
    assert preview['mainLocale']==context['mainLocale']
    stage=req('/api/environments',{'name':'Catalogue intake review'},merchant)['id']
    sh={**merchant,'x-tenant':stage}
    assert req('/api/merchant/catalog/intake',h=sh)['sandbox']
    pid=str(uuid.uuid4());save={'id':pid,'approve':True,'settingsRevision':preview['settingsRevision'],'mainLocale':preview['mainLocale'],'currency':preview['currency'],'taxRate':19,'demo':False,'draft':preview['drafts'][0]}
    req('/api/merchant/catalog/intake/save',save,merchant,expected=400)
    req('/api/merchant/catalog/intake/save',{**save,'approve':False},sh,expected=400)
    req('/api/merchant/catalog/intake/save',{**save,'mainLocale':'not-enabled'},sh,expected=409)
    req('/api/merchant/catalog/intake/save',{**save,'currency':'ZZZ'},sh,expected=409)
    req('/api/merchant/catalog/intake/save',{**save,'settingsRevision':preview['settingsRevision']+1},sh,expected=409)
    result=req('/api/merchant/catalog/intake/save',save,sh);assert result['id']==pid
    assert req('/api/merchant/catalog/intake/save',save,sh)['replayed']
    req('/api/merchant/catalog/intake/save',{**save,'draft':{**save['draft'],'name':'overwrite'}},sh,expected=409)
    pd=req('/api/merchant/products/'+pid,h=sh);assert pd['commerce']['stock']==0 and pd['commerce']['price']==19.9
    assert len([p for p in req('/api/merchant/products?search=Oak',h=sh)['elements'] if p['id']==pid])==1
    req('/api/merchant/products/'+pid,h=merchant,expected=404)
    req('/api/merchant/catalog/intake/save',save,{**merchant,'x-tenant':foreign['workspace']},expected=403)
    for csv in ['name,price\na,1\nb,no','name,price\n"unclosed,1','name,price\n'+('a,1\n'*51),'name,price,tenant\na,1,victim']:
        req('/api/merchant/catalog/intake',{'mode':'csv','source':csv,'count':1},sh,expected=400)
    invalid=req('/api/merchant/catalog/intake',{'mode':'csv','source':'name,price\na,1\nb,no','count':1},sh,expected=400)
    assert invalid['errors'][0]['pointer']=='/catalogIntake/rows/3',invalid
    tool=req('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'merchant.catalog.prepare','arguments':{'mode':'csv','source':'name,price\nMCP draft,7','count':1}}},sh)['result']
    assert tool['structuredContent']['drafts'][0]['name']=='MCP draft'
    changes=req('/api/environments/'+stage+'/diff',h=merchant)['changes']
    selection=[{'key':c['key'],'digest':c['digest']} for c in changes if c['key']=='product:'+pid]
    assert len(selection)==1
    req('/api/environments/'+stage+'/release',{'approve':True,'selections':selection},merchant)
    live=req('/api/merchant/products/'+pid,h=merchant);assert live['commerce']['price']==19.9 and live['commerce']['stock']==0
    print('PASS merchant CSV -> editable native draft -> approved private product -> replay without duplicate/overwrite -> selected native publication; live/foreign/unapproved/stale context denied')
