// Small synthesized grooves: no external samples or commercial sound assets.
export function scheduleRhythm(ctx,output,time,beat,style,volume=.35,beatDuration=.5){
  if(style==='off')return;
  const step=((beat%4)+4)%4;
  const kick=(style==='four')||step===0||step===2;
  if(kick){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(130,time);o.frequency.exponentialRampToValueAtTime(45,time+.12);g.gain.setValueAtTime(volume*.7,time);g.gain.exponentialRampToValueAtTime(.001,time+.18);o.connect(g).connect(output);o.start(time);o.stop(time+.2);}
  if(step===1||step===3){noise(ctx,output,time,.12,volume*.3,900);}
  noise(ctx,output,time,.035,volume*.12,7000);
  if(style==='four')noise(ctx,output,time+beatDuration/2,.025,volume*.06,7000);
}
function noise(ctx,output,time,duration,volume,hz){
  const length=Math.ceil(ctx.sampleRate*duration),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3);
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.value=Math.min(hz,ctx.sampleRate*.45);gain.gain.value=volume;source.connect(filter).connect(gain).connect(output);source.start(time);
}
