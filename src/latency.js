export function estimatedLatencyMs(context, settings={}, inputCompressor=false) {
  const seconds=(context.baseLatency||0)+(context.outputLatency||0)+(settings.latency||0)+(inputCompressor?.006:0);
  return Math.max(0,Math.min(1000,Math.round(seconds*1000)));
}
export function shiftedCapture(start,end,latencyMs,sampleRate){
 const offset=Math.round(Math.max(0,Math.min(1000,Number(latencyMs)||0))*sampleRate/1000);
 return {start:start+offset,end:end+offset,offset};
}
export function shiftSamples(samples,advanceFrames){
 const out=new Float32Array(samples.length),length=samples.length;
 for(let i=0;i<length;i++)out[i]=samples[((i+advanceFrames)%length+length)%length];
 return out;
}
