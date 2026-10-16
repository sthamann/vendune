"""Generate operation input DTOs from the compiled canonical registry, never a second operation/schema list."""
import argparse,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def identifier(name):return ''.join(x.capitalize() for x in re.split('[^a-zA-Z0-9]',name))
def ts(schema):
    if 'const' in schema:return json.dumps(schema['const'])
    if 'enum' in schema:return ' | '.join(json.dumps(v) for v in schema['enum']) or 'never'
    kind=schema.get('type')
    if isinstance(kind,list):return ' | '.join(ts({**schema,'type':t}) for t in kind)
    if kind=='null':return 'null'
    if kind in ['integer','number']:return 'number'
    if kind=='boolean':return 'boolean'
    if kind=='string':return 'string'
    if kind=='array':return 'Array<'+ts(schema.get('items',{}))+'>'
    if kind=='object' and schema.get('properties'):
        required=schema.get('required',[])
        props='; '.join(json.dumps(k)+('' if k in required else '?')+': '+ts(v) for k,v in schema['properties'].items())
        return '{ '+props+(' }' if schema.get('additionalProperties') is False else '; [key: string]: JsonValue | undefined }')
    return 'JsonValue'

class Wit:
    def __init__(self):self.types=[];self.names=set()
    def type(self,schema,name):
        kind=schema.get('type')
        if isinstance(kind,list):
            rest=[k for k in kind if k!='null']
            if len(rest)==1 and len(rest)<len(kind):return 'option<'+self.type({**schema,'type':rest[0]},name)+'>'
            return 'string' # Explicit canonical JSON for unrepresentable JSON unions.
        if kind in ['integer','number','boolean','string']:return {'integer':'s64','number':'float64','boolean':'bool','string':'string'}[kind]
        if kind=='array':return 'list<'+self.type(schema.get('items',{}),name+'-item')+'>'
        if kind=='object' and schema.get('properties'):
            if name in self.names:raise ValueError('Colliding WIT type '+name)
            self.names.add(name);required=schema.get('required',[]);fields=[]
            for k,v in schema['properties'].items():
                key=re.sub(r'([a-z0-9])([A-Z])',r'\1-\2',k).replace('_','-').lower()
                typ=self.type(v,name+'-'+key)
                if k not in required:typ='option<'+typ+'>'
                fields.append('    %'+key+': '+typ+',')
            self.types.append('  record '+name+' {\n'+'\n'.join(fields)+'\n  }');return name
        return 'string' # JSON object without declared fields is an explicitly opaque JSON string.

def outputs():
    registry=json.loads(subprocess.check_output([str(ROOT/'target/debug/veyndo'),'--operation-contracts'],cwd=ROOT))
    ops=registry['operations'];assert len(ops)>100 and len({o['name'] for o in ops})==len(ops)
    out={};prefix='/** Generated native operation input contracts; do not edit. */\n'
    out['extensions/sdk/generated/operations.json']=json.dumps(registry,indent=2)+'\n'
    envelopes=[];w=Wit();functions=[];chunks=[]
    for index in range(0,len(ops),12):
        group=ops[index:index+12];part=str(index//12)
        text=prefix+'/** Native input DTOs; opaque JSON fields remain explicit. */\nimport type { JsonValue } from "./value";\n'
        text+='export interface Inputs'+part+' {\n'+''.join('  '+json.dumps(o['name'])+': '+ts(o['inputSchema'])+';\n' for o in group)+'}\n'
        out['frontend/src/shared/operations/inputs-'+part+'.ts']=text;chunks.append(part)
    out['frontend/src/shared/operations/value.ts']=prefix+'/** JSON values for deliberately open operation fields. */\nexport type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };\n'
    out['frontend/src/shared/operations/index.ts']=prefix+'/** The registry determines operation names and request types; output schemas remain owned by domain DTOs. */\n'+''.join('import type { Inputs'+n+' } from "./inputs-'+n+'";\n' for n in chunks)+'export type OperationInputs = '+' & '.join('Inputs'+n for n in chunks)+';\nexport type OperationName = keyof OperationInputs;\nexport type OperationCall<N extends OperationName> = { name: N; arguments: OperationInputs[N] };\n'
    for o in ops:
        name=o['name'].replace('.','-').replace('_','-');typ=w.type(o['inputSchema'],name+'-input')
        functions.append('  '+name+': func(input: '+typ+') -> result<string, string>;')
        envelopes.append({'type':'object','required':['jsonrpc','id','method','params'],'additionalProperties':False,'properties':{'jsonrpc':{'const':'2.0'},'id':{'type':['string','integer']},'method':{'const':'tools/call'},'params':{'type':'object','required':['name','arguments'],'additionalProperties':False,'properties':{'name':{'const':o['name']},'arguments':o['inputSchema']}}}})
    out['extensions/sdk/generated/operations.wit']='// Generated typed input ABI. Undeclared JSON fields and results are canonical JSON strings.\npackage veyndo:operations@1.0.0;\ninterface inputs {\n'+'\n'.join(w.types+functions)+'\n}\n'
    api={'openapi':'3.1.0','info':{'title':'Veyndo native MCP operations','version':'1.0.0'},'paths':{'/mcp':{'post':{'operationId':'nativeToolsCall','description':'Native operation input contracts. tools/list and full MCP negotiation remain documented separately. Authorization is current per operation.','security':[{'bearerAuth':[]}],'requestBody':{'required':True,'content':{'application/json':{'schema':{'oneOf':envelopes}}}},'responses':{'200':{'description':'MCP JSON-RPC result or operation error; domain output schemas are not yet generated.'},'401':{'description':'Missing or invalid identity'},'403':{'description':'Current access denied'}}}}},'components':{'securitySchemes':{'bearerAuth':{'type':'http','scheme':'bearer'}}}}
    out['extensions/sdk/generated/openapi.json']=json.dumps(api,indent=2)+'\n'
    script="import prettier from 'prettier';let input='';for await(const c of process.stdin)input+=c;const values=JSON.parse(input);for(const [name,text] of Object.entries(values))if(name.endsWith('.ts'))values[name]=await prettier.format(text,{parser:'typescript'});process.stdout.write(JSON.stringify(values));"
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',script],input=json.dumps(out).encode(),cwd=ROOT/'frontend'))

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    for name,text in outputs().items():
        path=ROOT/name
        if args.check:assert path.exists() and path.read_text()==text,'Generated contract drift: '+name
        else:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
    print('PASS compiled registry -> typed TS/WIT inputs and OpenAPI; output-schema boundary explicit')
if __name__=='__main__':main()
