# usage: python3 news.py <version> "<what's new sentence, lower-case start>" "<short NEWS line>"
import sys,re
p='/home/claude/plat/template.html';L=open(p).read().split('\n')
v,t,n=sys.argv[1],sys.argv[2],sys.argv[3]
k=[i for i,l in enumerate(L) if l.startswith('const WHATS_NEW = ')]; assert len(k)==1
L[k[0]]="const WHATS_NEW = { v: %s, t: %s };" % (v, "'"+t.replace("'","\\'")+"'")
i=L.index('const NEWS = [')
items=L[i+1:i+11]; assert items[-1].endswith('];'), items[-1]
items[-1]=items[-1][:-2]
L[i+1:i+11]=["  '"+n.replace("'","\\'")+"',"]+items[:8]+[items[8].rstrip(',')+',];']
open(p,'w').write('\n'.join(L)); print('ok', L[k[0]][:70])
