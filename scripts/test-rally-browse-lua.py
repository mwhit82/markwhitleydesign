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
    if command=='ZCARD':return len(boards.get(key,[]))
    if command=='ZRANGE':
        start,end=int(args[0]),int(args[1]);out=[]
        for member,score in boards.get(key,[])[start:(None if end==-1 else end+1)]:out.extend([member,str(score)])
        return lua.table_from(out)
    if command=='HGET':return json.dumps(info[args[0]])
    raise AssertionError(command)
lua.globals().redis=lua.table_from({'call':redis_call})
lua.globals().cjson=lua.table_from({'decode':lambda s:lua.table_from(json.loads(s)), 'encode':lambda v:json.dumps(to_python(v))})
def run(offset=0,search=''):
    lua.globals().KEYS=lua.table_from(['a','b']);lua.globals().ARGV=lua.table_from([0,offset,search,'friend'])
    result=lua.execute(script);return json.loads(result[1]),result[2],result[3],json.loads(result[4])
rows,total,cursor,mine=run();assert len(rows)==20 and rows[0]['rank']==1 and rows[-1]['rank']==20
assert total==2301 and mine[0]['rank']==1002
rows,total,cursor,mine=run(cursor);assert rows[0]['rank']==21
rows,total,cursor,mine=run(search='alice');assert [r['rank'] for r in rows]==[1,2] and rows[0]['mine'] and rows[0]['board']==1
rows,total,cursor,mine=run(2290);assert len(rows)==11 and rows[-1]['rank']==2301
rows,total,cursor,mine=run(search='.*');assert not rows
rows,total,cursor,mine=run(995);assert rows[5]['time']==rows[6]['time'] and rows[5]['board']==0 and rows[6]['board']==1
boards['a']=[('x',1)]*20001
assert run()[1]==-1
print('Lua integration: global ordering, pagination, filtered rank, own rank, equal-time ordering, literal search and bounded overflow pass.')
