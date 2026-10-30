"""Import Event.xlsx display data plus reviewed structured rules; never execute spreadsheet text."""
import argparse,json,re
from pathlib import Path
import openpyxl
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('workbook',nargs='?',default=str(ROOT/'data/source/Event.xlsx'));p.add_argument('--check',action='store_true');a=p.parse_args()
sheet=openpyxl.load_workbook(a.workbook,data_only=True).active
headers=[c.value for c in sheet[1]]
required=['eventID','event','trigger','probability','repeatable','result','option 1','option 1 result','option 2','option 2 result']
if headers[:10]!=required:raise ValueError('Event.xlsx 欄位名稱或順序不符')
rules=json.loads((ROOT/'data/event-rules.json').read_text())['rules'];events=[];seen=set()
for row in sheet.iter_rows(min_row=2,values_only=True):
 if not row[0]:continue
 r=dict(zip(headers,row));id=r['eventID']
 if not re.fullmatch(r'e[a-z]\d{3}',id) or id in seen or id not in rules:raise ValueError(f'事件ID重複或缺少可計算規則: {id}')
 if not isinstance(r['event'],str) or not isinstance(r['probability'],(int,float)) or not 0<r['probability']<=1 or r['repeatable'] not in ['Y','N']:raise ValueError(f'事件欄位錯誤: {id}')
 if r.get('enabled') not in [None,'','Y','N']:raise ValueError(f'enabled需填Y或N: {id}')
 seen.add(id);event=dict(id=id,message=r['event'],weight=r['probability'],repeatable=r['repeatable']=='Y',triggerText=r['trigger'],resultText=r['result'],**rules[id])
 event['enabled']=event.get('enabled',True) and r.get('enabled')!='N'
 for column,key in [('cooldown_weeks','cooldown'),('max_per_year','maxPerYear')]:
  if r.get(column) is not None:
   value=r[column]
   if not isinstance(value,(int,float)) or int(value)!=value or value<0:raise ValueError(f'{column}需為非負整數: {id}')
   event[key]=int(value)
 if event.get('choices'):
  event['choices']=[dict(id=k,label=r[f'option {k}'],resultText=r[f'option {k} result'],effects=v) for k,v in event['choices'].items()]
  if any(not c['label'] or not c['resultText'] for c in event['choices']):raise ValueError(f'選項未完整設定: {id}')
 events.append(event)
if set(rules)!=seen:raise ValueError('Excel與event-rules.json事件ID不一致')
result={'version':1,'events':events};serialized=json.dumps(result,ensure_ascii=False,separators=(',',':'))
for name,text in [('events.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n'),('events.js',"'use strict';\nglobalThis.CinemaEventDatabase="+serialized+';\n')]:
 path=ROOT/'data'/name
 if a.check:
  if not path.exists() or path.read_text()!=text:raise ValueError('請執行 python3 scripts/import-events.py 重建事件資料')
 else:path.write_text(text)
print(f'Validated {len(events)} events, unique IDs, choices and structured rules.')
