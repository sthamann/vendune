"""Synthetic provider-native wire responses shared by real HTTP integration fixtures; not a model implementation."""
import json

def response(body, value=None, provider='openai'):
    calls=(value or {}).get('tool_calls',[])
    if not isinstance(calls,list):
        return {'status':'completed','output':[{'type':'function_call','call_id':'bad','name':'unknown','arguments':'broken'}]}
    def alias(name):
        for tool in body['tools']:
            t=tool.get('function',tool)
            if t.get('description','').startswith(name+':'):return t['name']
        return name  # Keep injected/unauthorized names invalid rather than silently granting access.
    if provider=='openai-chat':
        return {'choices':[{'finish_reason':'tool_calls' if calls else 'stop','message':{'role':'assistant','content':None,'tool_calls':[{'id':'call_'+str(i),'type':'function','function':{'name':alias(c['name']),'arguments':c['arguments_json']}} for i,c in enumerate(calls)]}}],'usage':{'prompt_tokens':10,'completion_tokens':20}}
    if provider=='anthropic':
        return {'stop_reason':'tool_use' if calls else 'end_turn','content':[{'type':'tool_use','id':'call_'+str(i),'name':alias(c['name']),'input':json.loads(c['arguments_json'])} for i,c in enumerate(calls)] or [{'type':'text','text':'Evidence sufficient.'}],'usage':{'input_tokens':10,'output_tokens':20}}
    if provider=='ollama':
        return {'done':True,'done_reason':'stop','message':{'role':'assistant','content':'','tool_calls':[{'function':{'name':alias(c['name']),'arguments':json.loads(c['arguments_json'])}} for c in calls]},'prompt_eval_count':10,'eval_count':20}
    return {'status':'completed','output':[{'type':'function_call','call_id':'call_'+str(i),'name':alias(c['name']),'arguments':c['arguments_json']} for i,c in enumerate(calls)],'usage':{'input_tokens':10,'output_tokens':20}}
