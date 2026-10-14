export function estimatedLatencyMs(context, settings={}, inputCompressor=false) {
  const seconds=(context.baseLatency||0)+(context.outputLatency||0)+(settings.latency||0)+(inputCompressor?.006:0);
  return Math.max(0,Math.min(1000,Math.round(seconds*1000)));
}
export function shiftedCapture(start,end,latencyMs,sampleRate){
 const offset=Math.round(Math.max(0,Math.min(1000,Number(latencyMs)||0))*sampleRate/1000);
 return {start,end,offset};
}
export function shiftSamples(samples,advanceFrames){
 const out=new Float32Array(samples.length),length=samples.length;
 for(let i=0;i<length;i++)out[i]=samples[((i+advanceFrames)%length+length)%length];
 return out;
}
// Keep the hardware estimate stable across tracks in the same session.
export function sessionLatencyMs(sync,context,settings={},inputCompressor=false){
 if(sync.mode==='manual')return Math.max(0,Math.min(1000,Number(sync.ms)||0));
 if(!Number.isFinite(sync.autoBaseMs))sync.autoBaseMs=estimatedLatencyMs(context,settings,false);
 return Math.min(1000,sync.autoBaseMs+(inputCompressor?6:0));
}
export function audibleMetronome(mode,captureMode){return mode==='sound'||(mode==='auto'&&captureMode==='headphones');}
