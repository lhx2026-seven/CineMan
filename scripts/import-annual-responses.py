"""Import annual meeting dialogue as data; reject unrecognised conditions."""
import argparse
import json
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
sheet = openpyxl.load_workbook(ROOT / 'data/source/Event_Annual_Meeting_response.xlsx', data_only=True).active
rows = list(sheet.iter_rows(values_only=True))
assert rows[0] == ('responseID', '發言人', 'trigger', 'response'), 'Unexpected response columns'
roles = {'董事長': 'chairperson', '股東': 'shareholders'}
conditions = {
    '年度損益為正': 'profit',
    '年度損益為負，支出為收入的10倍以上': 'loss10',
    '年度損益為負，支出為收入的5倍以上': 'loss5',
    '年度損益為負，支出為收入的3倍以上': 'loss3',
    '年度損益為負，支出為收入的2倍以上': 'loss2',
    '年度損益為負，支出為收入的200%以內': 'loss200',
    '年度損益為負，支出為收入的150%以內': 'loss150',
    '年度損益為負，支出為收入的105%以內': 'loss105',
}
records = []
seen = set()
for response_id, speaker, trigger, response in rows[1:]:
    if not any((response_id, speaker, trigger, response)):
        continue
    assert response_id and response_id not in seen, 'Missing or duplicate response ID'
    assert speaker in roles and trigger in conditions, 'Unknown speaker or trigger'
    assert isinstance(response, str) and response.strip(), 'Missing response text'
    seen.add(response_id)
    records.append(dict(id=response_id, role=roles[speaker], condition=conditions[trigger], trigger=trigger, text=response))
assert records and all(any(r['role'] == role and r['condition'] == condition for r in records)
                       for role in roles.values() for condition in conditions.values()), 'Incomplete response groups'
data = dict(version=1, responses=records)
payload = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
outputs = {
    ROOT / 'data/annual-responses.json': payload,
    ROOT / 'data/annual-responses.js': "'use strict';\nglobalThis.CinemaAnnualResponses = " + payload.rstrip() + ';\n',
}
for path, contents in outputs.items():
    if args.check:
        assert path.exists() and path.read_text() == contents, f'Regenerate {path.name}'
    else:
        path.write_text(contents)
print(f'{len(records)} annual meeting responses verified' if args.check else f'Imported {len(records)} annual meeting responses')
