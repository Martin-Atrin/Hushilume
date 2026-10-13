import {readFile,writeFile,copyFile,stat} from 'node:fs/promises';
const file='public/library.json';
const library=JSON.parse(await readFile(file,'utf8'));
const measured=await Promise.all(library.tracks.map(async(t:any)=>{
 const m=JSON.parse(await readFile(`artifacts/loudness/${t.id}.json`,'utf8'));
 const s=await stat(`public${t.file}`);
 if(m.bytes!==s.size||m.mtime!==s.mtimeMs)throw Error(`Stale measurement: ${t.id}`);
 return {...t,measurement:m};
}));
const reference=measured.filter((t:any)=>t.station.startsWith('lofi-')).sort((a:any,b:any)=>a.measurement.lufs-b.measurement.lufs);
if(!reference.length)throw Error('Lo-fi reference missing');
const halfway=reference.reduce((n:number,t:any)=>n+t.duration,0)/2;
let accumulated=0,target=0;
for(const t of reference){accumulated+=t.duration;if(accumulated>=halfway){target=t.measurement.lufs;break}}
const report:any={method:'Full-track FFmpeg EBU R128 integrated loudness and true peak. Duration-weighted median Lo-fi reference. Constant per-track gain, linked stereo look-ahead peak limiting during playback.',targetLufs:target,measuredAt:new Date().toISOString(),tracks:[]};
for(const t of library.tracks){const m=measured.find((v:any)=>v.id===t.id).measurement;const gainDb=Math.round((target-m.lufs)*10)/10;
 if(Math.abs(gainDb)>24)throw Error(`Gain needs review: ${t.id} ${gainDb}`);
 t.loudness={integratedLufs:m.lufs,truePeakDb:m.truePeakDb,gainDb,targetLufs:target};
 report.tracks.push({id:t.id,station:t.station,duration:t.duration,...t.loudness,lra:m.lra});
}
report.genres=['nature','lofi','lounge','focus'].map(genre=>{const rows=report.tracks.filter((t:any)=>t.station.startsWith(genre+'-'));return{genre,tracks:rows.length,minLufs:Math.min(...rows.map((t:any)=>t.integratedLufs)),maxLufs:Math.max(...rows.map((t:any)=>t.integratedLufs)),minGainDb:Math.min(...rows.map((t:any)=>t.gainDb)),maxGainDb:Math.max(...rows.map((t:any)=>t.gainDb))}});
library.loudnessNormalization={targetLufs:target,reference:'duration-weighted median of Lo-fi',measuredAt:report.measuredAt};
await copyFile(file,'artifacts/loudness/library-before-normalization.json');
await writeFile(file,JSON.stringify(library,null,2)+'\n');
await writeFile('docs/audio-loudness-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({targetLufs:target,tracks:report.tracks.length,genres:report.genres},null,2));
