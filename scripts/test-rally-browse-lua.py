"""Integration check for the exact production Lua with in-memory Redis fixtures.
Run with a temporary Python environment containing lupa; never touches Upstash.
"""
import json,re
from pathlib import Path
from lupa import LuaRuntime
source=(Path(__file__).resolve().parents[1]/'lib/rally/browse.ts').read_text()
script=re.search(r'export const browseScript=`(.*?)`;',source,re.S).group(1)
lua=LuaRuntime(unpack_returned_tuples=True)
boards={'a':[(f'a{i}',1000+i) for i in range(2300)],'b':[('friend',2000)]}
info={f'a{i}':{'name':'Alice' if i==2157 else f'Driver {i}', 'car':0} for i in range(2300)}
info['friend']={'name':'Alice','car':1}
def to_python(value):
    if hasattr(value,'items'):
        items=list(value.items())
        if all(isinstance(k,int) for k,_ in items):return [to_python(value[i]) for i in range(1,len(items)+1)]
        return {k:to_python(v) for k,v in items}
    return value
def redis_call(command,key,*args):
    if command=='ZRANGE':
        start,end=int(args[0]),int(args[1]);out=[]
        for member,score in boards.get(key,[])[start:end+1]:out.extend([member,str(score)])
        return lua.table_from(out)
    if command=='HGET':return json.dumps(info[args[0]])
    raise AssertionError(command)
lua.globals().redis=lua.table_from({'call':redis_call})
lua.globals().cjson=lua.table_from({'decode':lambda s:lua.table_from(json.loads(s)), 'encode':lambda v:json.dumps(to_python(v))})
def run(cursor='0:0',search=''):
    board,offset=cursor.split(':');lua.globals().KEYS=lua.table_from(['a','b']);lua.globals().ARGV=lua.table_from([board,offset,search,'friend'])
    result=lua.execute(script);return json.loads(result[1]),f'{result[2]}:{result[3]}'
rows,cursor=run();assert len(rows)==20 and rows[0]['rank']==1 and rows[-1]['rank']==20
rows,cursor=run(cursor);assert rows[0]['rank']==21
rows,cursor=run(search='alice');assert not rows and cursor=='0:2000'
rows,cursor=run(cursor,'alice');assert [r['rank'] for r in rows]==[2158,1] and rows[1]['mine'] and cursor=='2:0'
rows,cursor=run('0:2290');assert len(rows)==11 and rows[-1]['board']==1 and rows[-1]['rank']==1
rows,cursor=run(search='.*');assert not rows # literal matching, not a Lua pattern
print('Lua integration: top-20 pagination, search beyond rank 2,000, literal names, cross-board ranks and final cursors pass.')
