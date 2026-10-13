import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
const library=JSON.parse(await readFile('public/library.json','utf8'));
await mkdir('artifacts/loudness',{recursive:true});
let completed=0,next=0;
const tracks=[...new Map(library.tracks.map((t:any)=>[t.file,t])).values()] as any[];
async function measure(t:any){
 const file=`public${t.file}`,info=await stat(file),cache=`artifacts/loudness/${t.id}.json`;
 try{const old=JSON.parse(await readFile(cache,'utf8'));if(old.bytes===info.size&&old.mtime===info.mtimeMs)return;}catch{}
 const log=await new Promise<string>((resolve,reject)=>{let tail='';const p=spawn('ffmpeg',['-hide_banner','-nostats','-threads','1','-i',file,'-vn','-af','ebur128=peak=true:framelog=verbose','-f','null','-']);p.stderr.on('data',b=>{tail=(tail+b).slice(-20000)});p.on('error',reject);p.on('close',code=>code===0?resolve(tail):reject(Error(t.id+': '+tail.slice(-1000))));});
 const lufs=Number(log.match(/Integrated loudness:\s*I:\s*([-\d.]+)/)?.[1]);
 const peak=Number(log.match(/True peak:\s*Peak:\s*([-\d.]+)/)?.[1]);
 const range=Number(log.match(/Loudness range:\s*LRA:\s*([-\d.]+)/)?.[1]);
 if(![lufs,peak,range].every(Number.isFinite))throw Error(`Invalid measurement ${t.id}: ${log.slice(-1000)}`);
 await writeFile(cache,JSON.stringify({id:t.id,file:t.file,bytes:info.size,mtime:info.mtimeMs,lufs,truePeakDb:peak,lra:range,duration:t.duration,measuredAt:new Date().toISOString()},null,2));
}
await Promise.all(Array.from({length:8},async()=>{while(next<tracks.length){const t=tracks[next++];await measure(t);completed++;console.log(`${completed}/${tracks.length} ${t.id}`)}}));
console.log('Full-track loudness scan complete.');
