// Re-encode existing artwork at useful responsive widths; never crop or redraw.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),assets=path.join(root,'assets/cinemas'),slugs=['baogong','century','broadway','ylc','arthouse'];
const sources=[];
for(const slug of slugs){
 const exterior=slug+'-exterior'+(['century','broadway','ylc'].includes(slug)?'-v2':'');
 for(const stem of[exterior,slug+'-interior'])sources.push({folder:'landscape',stem,widths:[960,1280]});
 const counter=slug+'-counter'+(slug==='century'?'':slug==='baogong'?'-v4':'-v2');
 sources.push({folder:'counters',stem:counter,widths:[1280]});
 sources.push({folder:'tickets',stem:slug+`-ticket-scene-v${slug==='baogong'?2:1}`,widths:[1280]});
 if(slug!=='baogong')sources.push({folder:'tickets',stem:slug+'-ticket-scene-v1-2024',widths:[640,960,1280]});
}
let total=0;
for(const {folder,stem,widths}of sources)for(const width of widths){
 const source=path.join(assets,folder,stem+'.webp'),target=path.join(assets,'optimized',`${stem}-${width}.webp`);
 execFileSync('convert',[source,'-resize',`${width}x`,'-quality','80',target]);total+=fs.statSync(target).size;
}
console.log(`Built ${sources.reduce((n,s)=>n+s.widths.length,0)} responsive WebP files (${Math.round(total/1024)} KiB).`);
