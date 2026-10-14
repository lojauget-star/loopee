export const effectDefinitions = [
  {name:'Reverb',sub:'A little space.',icon:'◌',value:28},
  {name:'Delay',sub:'Let it echo.',icon:'≋',value:18},
  {name:'Filter',sub:'Shape your sound.',icon:'⌁',value:100},
  {name:'Drive',sub:'Add some character.',icon:'ϟ',value:12},
  {name:'Chorus',sub:'Make it wider.',icon:'◎',value:20},
  {name:'Compressor',sub:'Keep it together.',icon:'⊜',value:35},
];
export const freshEffects = () => effectDefinitions.map(effect => ({...effect,on:false}));
const impulses=new WeakMap();
function impulseFor(ctx){
  if(!impulses.has(ctx)){
    const buffer=ctx.createBuffer(2,ctx.sampleRate*2,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);}
    impulses.set(ctx,buffer);
  }
  return impulses.get(ctx);
}
export function createEffectChain(ctx,settings,bpm){
  const input=ctx.createBiquadFilter(),drive=ctx.createWaveShaper(),compressor=ctx.createDynamicsCompressor(),output=ctx.createGain();
  const delay=ctx.createDelay(2),delayGain=ctx.createGain(),reverb=ctx.createConvolver(),reverbGain=ctx.createGain(),chorus=ctx.createDelay(.1),chorusGain=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();
  input.type='lowpass';reverb.buffer=impulseFor(ctx);chorus.delayTime.value=.02;lfo.frequency.value=.8;depth.gain.value=.003;
  lfo.connect(depth).connect(chorus.delayTime);lfo.start();
  input.connect(drive).connect(compressor).connect(output);
  compressor.connect(delay).connect(delayGain).connect(output);
  compressor.connect(reverb).connect(reverbGain).connect(output);
  compressor.connect(chorus).connect(chorusGain).connect(output);
  function update(e,tempo){
    input.frequency.value=e[2].on?Math.min(ctx.sampleRate/2,100+e[2].value**2*2):ctx.sampleRate/2;
    if(e[3].on){const k=e[3].value*2,curve=new Float32Array(4096);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=(3+k)*x*20*(Math.PI/180)/(Math.PI+k*Math.abs(x));}drive.curve=curve;}else drive.curve=null;
    compressor.threshold.value=e[5].on?-e[5].value*.6:0;compressor.ratio.value=e[5].on?4:1;
    delay.delayTime.value=60/tempo/2;delayGain.gain.value=e[1].on?e[1].value/100*.7:0;
    reverbGain.gain.value=e[0].on?e[0].value/100*.8:0;chorusGain.gain.value=e[4].on?e[4].value/100*.7:0;
  }
  update(settings,bpm);
  return {input,output,update,dispose(){lfo.stop();[input,drive,compressor,output,delay,delayGain,reverb,reverbGain,chorus,chorusGain,lfo,depth].forEach(node=>node.disconnect());}};
}
