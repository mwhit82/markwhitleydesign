"""Exercise the production submission Lua with isolated in-memory Redis fixtures."""
import re
from pathlib import Path
from lupa import LuaRuntime
source=(Path(__file__).resolve().parents[1]/'app/api/rally/leaderboard/route.ts').read_text()
script=re.search(r'const saveScript=`(.*?)`;',source,re.S).group(1)
lua=LuaRuntime(unpack_returned_tuples=True)
tokens=set()
scores={}
hashes={}
def call(command,key,*args):
    if command=='GET': return 'run' if key in tokens else None
    if command=='DEL': tokens.discard(key);return 1
    if command=='ZSCORE': return scores.get(key,{}).get(args[0])
    if command=='ZADD': scores.setdefault(key,{})[args[1]]=float(args[0]);return 1
    if command=='HSET': hashes.setdefault(key,{})[args[0]]=args[1];return 1
    if command=='HDEL': hashes.setdefault(key,{}).pop(args[0],None);return 1
    raise AssertionError(command)
lua.globals().redis=lua.table_from({'call':call})
def submit(token,time,week,replay='replay'):
    lua.globals().KEYS=lua.table_from([token,'all','car',f'all:week:{week}',f'car:week:{week}'])
    lua.globals().ARGV=lua.table_from(['driver',time,f'name-{time}',replay])
    return lua.execute(script)
tokens.add('run1');assert submit('run1',30,'one')==1
assert scores['all']['driver']==30 and scores['all:week:one']['driver']==30
assert hashes['all:replays']['driver']=='replay'
assert not hashes.get('all:week:one:replays')
assert submit('run1',20,'two')==0 and 'all:week:two' not in scores
# A slower run in a fresh week must rank, without replacing the all-time PB.
tokens.add('run2');assert submit('run2',40,'two')==1
assert scores['all']['driver']==30 and scores['all:week:two']['driver']==40
assert hashes['all:info']['driver']=='name-30'
tokens.add('run3');assert submit('run3',45,'two')==1
assert scores['car:week:two']['driver']==40
# Improved weekly time remains independent of all time.
tokens.add('run4');assert submit('run4',35,'two')==1
assert scores['car:week:two']['driver']==35 and scores['car']['driver']==30
# A new all-time PB updates both boards and clears an obsolete ghost if none submitted.
tokens.add('run5');assert submit('run5',25,'two','')==1
assert scores['all']['driver']==25 and scores['all:week:two']['driver']==25
assert not hashes['all:replays']
assert scores['all:week:one']['driver']==30
print('Weekly Lua: independent PBs, fresh weeks, atomic run consumption, metadata and all-time ghosts pass.')
