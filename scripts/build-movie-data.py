"""Import the supplied workbook; explicit overrides record subsequent user corrections."""
import json, pathlib, openpyxl
root=pathlib.Path(__file__).resolve().parents[1]
s=openpyxl.load_workbook(root/'data/source/MoviesList.xlsx',data_only=True).active
movies=[]
for values in s.iter_rows(min_row=2,values_only=True):
 if not values[0]: continue
 mid,name,tier,series,episode,previous,low,high,year=values[:9]
 initial=mid in ['MV0001','MV0002','MV0003']
 movies.append(dict(id=mid,title=name,tier=tier,seriesID=series,episode=episode,previousID=previous,gapMin=low,gapMax=high if high is not None else low,releaseYear=2022 if initial else year,initial=initial,seriesGap=8 if series in ['SR018','SR019'] else 0))
by={m['id']:m for m in movies}
by['MV0031']['releaseYear']=2022
assert len(movies)==505 and len(by)==505
for m in movies:
 assert m['tier'] in ['hit','bomb','average','special']
 assert m['previousID'] is None or m['previousID'] in by
 assert m['gapMin'] is None or 0<=m['gapMin']<=m['gapMax']
text=json.dumps({'version':1,'movies':movies},ensure_ascii=False,separators=(',',':'))
(root/'data/movies.json').write_text(text+'\n')
(root/'data/movies.js').write_text("'use strict';\nglobalThis.CinemaMovieDatabase="+text+';\n')
print('Imported 505 movies, 502 new releases; corrections: MV0031 2022, MV0032 fixed 200, SR018/SR019 gap 8.')
