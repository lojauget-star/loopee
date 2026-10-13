import './style.css';
import { microphoneConstraints } from './capture.js';
const icons={grid:'▦',wave:'∿',folder:'▱',record:'●',play:'▶',pause:'Ⅱ',plus:'＋',arrow:'↗'};
let context, playing=false, started=0, sources=[], selected=0;
let loopBars=4, loopFrames=0, recording=null, microphoneBusy=false, takeNumber=0, workletLoaded=false, recordingEpoch=0;
const beatSeconds=()=>60 / +$('#bpm').value;
const loopDuration=()=>loopFrames ? loopFrames/context.sampleRate : loopBars*4*beatSeconds();
const tracks=[];
const effects=[{name:'Reverb',sub:'A little space.',icon:'◌',value:28,on:true},{name:'Delay',sub:'Let it echo.',icon:'≋',value:18,on:false},{name:'Filter',sub:'Shape your sound.',icon:'⌁',value:100,on:false},{name:'Drive',sub:'Add some character.',icon:'ϟ',value:12,on:false},{name:'Chorus',sub:'Make it wider.',icon:'◎',value:20,on:false},{name:'Compressor',sub:'Keep it together.',icon:'⊜',value:35,on:true}];
document.querySelector('#app').innerHTML=`<aside><a class="brand" href="#">loopee<span>®</span></a><div class="workspace">YOUR WORKSPACE</div><nav><button class="active" data-nav="studio">▦ <span>Studio</span><i>01</i></button><button data-nav="sessions">▱ <span>My sessions</span></button><button data-nav="library">∿ <span>Sound library</span></button></nav><div class="side-note"><span class="little-loop">∞</span><h3>Good things<br>come around.</h3><p>Make a little noise.<br>See where it takes you.</p></div><div class="sidebar-bottom"><div class="pro-tag">LOOPEE STUDIO <span>PRO</span></div><button id="settings">⚙ <span>Studio settings</span></button><div class="user"><div class="avatar">JD</div><div>Jamie Davis<small>Personal workspace</small></div><span>⌄</span></div></div></aside><main><header><div><span class="breadcrumb">Workspace <b>/</b> Studio</span></div><div class="top-right"><span class="saved"><i></i> <span id="save-status">All changes saved</span></span><button id="save" class="plain">Save session</button><button id="export" class="dark">↥ &nbsp; Export audio</button></div></header><section class="studio"><div class="heading"><div><div class="eyebrow">YOUR NEXT GOOD IDEA</div><h1 contenteditable="true" spellcheck="false">Sunday kind of feeling<span class="edit">↗</span></h1><p>Escolha os compassos. Grave um som. Crie novas camadas sobre o mesmo loop.</p></div><button class="more" id="more">•••</button></div><div class="transport"><div class="transport-buttons"><button id="play" class="play">▶</button><button id="stop" title="Stop">■</button><button id="record" class="record" title="Gravar nova camada" aria-label="Gravar nova camada">●</button></div><div class="time"><strong id="position">01<span>.</span>1<span>.</span>1</strong><small>BARS · BEATS</small></div><div class="transport-divider"></div><label class="tempo"><input id="bpm" type="number" value="92" min="40" max="240"><small>BPM</small></label><label class="loop-length"> <select id="bars" aria-label="Compassos do loop"><option value="1">1 compasso</option><option value="2">2 compassos</option><option value="4" selected>4 compassos</option><option value="8">8 compassos</option></select><small>LOOP · 4/4</small></label><button class="metronome" id="metronome">♧ <span>Metronome</span><i></i></button><div class="transport-end"><span class="live-dot"></span> <span id="audio-status">Pronto para gravar</span><button id="loop" class="loop active" title="Loop">⇄</button></div></div><div class="capture-settings"><label for="capture-mode">Escuta durante a gravação</label><select id="capture-mode"><option value="speakers">Alto-falantes · reduzir eco</option><option value="headphones">Fones / interface · áudio puro</option></select><p id="capture-note"></p></div><div class="section-title"><h2>Loop canvas <span>0 layers</span></h2><div><button id="new-loop">Novo loop</button><button id="import">↥ &nbsp; Import audio</button><button id="add">＋ &nbsp; Add layer</button></div></div><div class="canvas"><div class="ruler"><span>LAYERS</span><div>${Array.from({length:4},(_,i)=>`<span>${String(i+1).padStart(2,'0')}</span>`).join('')}</div><span>LEVEL</span></div><div id="tracks"></div><div class="canvas-bottom"><span>↳ &nbsp; Drop an audio file here, or record something new.</span><span><span id="loop-summary">4 compassos · 4/4</span> <b>⇄</b></span></div></div><div class="lower"><section class="effects"><div class="section-title"><h2>Make it yours <span>EFFECTS</span></h2><button id="reset">↺ &nbsp; Reset</button></div><div id="effects" class="effect-grid"></div></section><section class="master"><div class="section-title"><h2>Master output</h2><span>↗</span></div><div class="master-body"><div class="master-top"><span>Clean. Balanced. Yours.</span><span class="stereo">STEREO</span></div><div class="levels"><small>L</small><div><i></i></div><small>R</small><div><i></i></div></div><div class="db-scale"><span>−60</span><span>−24</span><span>−12</span><span>−6</span><span>0</span></div><div class="master-volume"><span>Output volume</span><strong id="master-value">80%</strong></div><input id="master" type="range" min="0" max="100" value="80"><div class="master-footer"><span><i></i> No clipping. All good.</span><button id="headphones" title="Monitor headphones">♬</button></div></div></section></div><footer><span><span class="footer-logo">∞</span> Stay in the moment. We'll keep the loop.</span><span>Made for the way you make music. <b>✧</b></span></footer></section></main><input type="file" id="file" accept="audio/*" multiple hidden><div id="toast"></div><dialog id="dialog"><button id="close-dialog">×</button><div id="dialog-content"></div></dialog>`;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);const toast=t=>{$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3500)};
function refreshCaptureMode(){
  const speakers=$('#capture-mode').value==='speakers';
  $('#capture-note').textContent=speakers?'Cancelamento de eco ligado. Para separar melhor as camadas, use fones; a redução de eco depende do navegador e do ambiente.':'Use fones ou saída isolada de uma interface. Sem processamento do microfone para preservar o timbre.';
}
try { const stored=localStorage.getItem('loopee-capture-mode');if(['speakers','headphones'].includes(stored))$('#capture-mode').value=stored; } catch {}
$('#capture-mode').onchange=()=>{refreshCaptureMode();try{localStorage.setItem('loopee-capture-mode',$('#capture-mode').value)}catch{}};
refreshCaptureMode();
function wave(seed,buffer){if(buffer){const data=buffer.getChannelData(0);return Array.from({length:155},(_,i)=>{let peak=0;const start=Math.floor(i*data.length/155),end=Math.floor((i+1)*data.length/155);for(let j=start;j<end;j+=Math.max(1,Math.floor((end-start)/80)))peak=Math.max(peak,Math.abs(data[j]));return `<i style="height:${Math.max(2,Math.min(45,peak*65))}px"></i>`}).join('')} let v=seed;return Array.from({length:155},(_,i)=>{v=(v*9301+49297)%233280;const h=5+(v/233280)*35*(.3+.7*Math.abs(Math.sin(i*.17)));return `<i style="height:${h}px"></i>`}).join('')}
function renderTracks(){$('#tracks').innerHTML=tracks.length?tracks.map((t,i)=>`<div class="track ${selected===i?'selected':''}" style="--track:${t.color}" data-track="${i}"><div class="track-info"><div class="track-icon">${['♬','⠿','∿','≋'][i%4]}</div><div><input value="${escapeHtml(t.name)}" aria-label="Layer name" data-name="${i}"><small>${t.type} <b>·</b> ${t.buffer?t.buffer.duration.toFixed(1)+' SEC':'8 BARS'}</small></div><div class="track-controls"><button data-mute="${i}" class="${t.mute?'enabled':''}">M</button><button data-solo="${i}" class="${t.solo?'enabled':''}">S</button></div></div><div class="wave-wrap"><div class="waveform">${wave(i*125+18,t.buffer)}</div><div class="playhead"></div><span class="clip-label">${escapeHtml(t.name)}</span></div><div class="track-level"><input type="range" min="0" max="100" value="${t.volume}" data-volume="${i}" aria-label="${escapeHtml(t.name)} volume"><span>${t.volume}%</span></div></div>`).join(''):'<div class="empty-canvas"><span>◉</span><h3>Seu primeiro som começa aqui.</h3><p>Pressione gravar. Conte 4 tempos e toque.<br>O loop se repete sozinho; grave novamente para adicionar uma camada.</p><button id="empty-record">● &nbsp; Gravar primeiro loop</button></div>';if($('#empty-record'))$('#empty-record').onclick=()=>$('#record').click();$('.section-title h2 span').textContent=tracks.length+' layers';$('#tracks').querySelectorAll('[data-track]').forEach(el=>el.onclick=e=>{if(e.target.closest('button,input'))return;selected=+el.dataset.track;renderTracks()});$('#tracks').querySelectorAll('[data-mute],[data-solo]').forEach(el=>el.onclick=()=>{let key=el.dataset.mute!==undefined?'mute':'solo',i=+(el.dataset[key]);tracks[i][key]=!tracks[i][key];renderTracks();updateVolumes()});$('#tracks').querySelectorAll('[data-volume]').forEach(el=>el.oninput=()=>{tracks[el.dataset.volume].volume=+el.value;el.nextElementSibling.textContent=el.value+'%';updateVolumes()});$('#tracks').querySelectorAll('[data-name]').forEach(el=>el.onchange=()=>{tracks[el.dataset.name].name=el.value;renderTracks()})}
function renderEffects(){$('#effects').innerHTML=effects.map((e,i)=>`<div class="effect ${e.on?'on':''}"><div class="effect-top"><span class="effect-icon">${e.icon}</span><button class="toggle ${e.on?'on':''}" data-effect="${i}" aria-label="Toggle ${e.name}"></button></div><h3>${e.name}</h3><p>${e.sub}</p><div class="effect-slider"><input type="range" min="0" max="100" value="${e.value}" data-fx="${i}" aria-label="${e.name} amount"><span>${e.value}%</span></div></div>`).join('');document.querySelectorAll('[data-effect]').forEach(el=>el.onclick=()=>{effects[el.dataset.effect].on=!effects[el.dataset.effect].on;renderEffects();applyEffects()});document.querySelectorAll('[data-fx]').forEach(el=>el.oninput=()=>{effects[el.dataset.fx].value=+el.value;el.nextElementSibling.textContent=el.value+'%';applyEffects()})}
let master,filter,drive,compressor,delay,delayGain,reverb,reverbGain,chorus,chorusGain,lfo;
function initAudio(){if(context)return;context=new AudioContext();master=context.createGain();filter=context.createBiquadFilter();filter.type='lowpass';drive=context.createWaveShaper();compressor=context.createDynamicsCompressor();delay=context.createDelay(2);delayGain=context.createGain();reverb=context.createConvolver();reverbGain=context.createGain();chorus=context.createDelay(.1);chorusGain=context.createGain();lfo=context.createOscillator();const lfoDepth=context.createGain();lfo.frequency.value=.8;lfoDepth.gain.value=.003;lfo.connect(lfoDepth).connect(chorus.delayTime);chorus.delayTime.value=.02;lfo.start();const impulse=context.createBuffer(2,context.sampleRate*2,context.sampleRate);for(let c=0;c<2;c++){const d=impulse.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)}reverb.buffer=impulse;filter.connect(drive).connect(compressor).connect(master);compressor.connect(delay).connect(delayGain).connect(master);compressor.connect(reverb).connect(reverbGain).connect(master);compressor.connect(chorus).connect(chorusGain).connect(master);master.connect(context.destination);applyEffects()}
function demo(index){const duration=32*60/92,b=context.createBuffer(2,Math.ceil(duration*context.sampleRate),context.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let n=0;n<d.length;n++){let time=n/context.sampleRate,beat=time/(60/92),phase=beat%1,bar=Math.floor(beat/4)%4;let sample=0;if(index===0){const f=[261.63,220,174.61,196][bar];sample=(Math.sin(2*Math.PI*f*time)+.4*Math.sin(2*Math.PI*f*1.25*time)+.3*Math.sin(2*Math.PI*f*1.5*time))*.09*Math.exp(-(beat%2)*2)}if(index===1){sample=Math.sin(2*Math.PI*(50+100*Math.exp(-phase*30))*time)*Math.exp(-phase*24)*.4;if(Math.floor(beat)%2===1)sample+=(Math.random()*2-1)*Math.exp(-phase*35)*.18;sample+=(Math.random()*2-1)*Math.exp(-(beat%.5)*90)*.035}if(index===2)sample=Math.sin(2*Math.PI*[65.4,55,43.65,49][bar]*time)*.18*Math.exp(-phase*3);if(index===3)sample=(Math.random()*2-1)*.012*(.5+.5*Math.sin(time*2));d[n]=sample}}return b}
function applyEffects(){if(!context)return;filter.frequency.value=effects[2].on?100+effects[2].value**2*2:22000;const k=effects[3].on?effects[3].value*2:0,curve=new Float32Array(44100);for(let i=0;i<curve.length;i++){const x=i*2/curve.length-1;curve[i]=k?(3+k)*x*20*(Math.PI/180)/(Math.PI+k*Math.abs(x)):x}drive.curve=curve;compressor.threshold.value=effects[5].on?-effects[5].value*.6:0;compressor.ratio.value=effects[5].on?4:1;delay.delayTime.value=60/(+$('#bpm').value)/2;delayGain.gain.value=effects[1].on?effects[1].value/100*.7:0;reverbGain.gain.value=effects[0].on?effects[0].value/100*.8:0;chorusGain.gain.value=effects[4].on?effects[4].value/100*.7:0;master.gain.value=+$('#master').value/100}
function updateVolumes(){sources.forEach(({gain,track})=>gain.gain.setTargetAtTime(track.mute||(tracks.some(t=>t.solo)&&!track.solo)?0:track.volume/100,context.currentTime,.01))}
function refreshLoopUI(){
  $('#loop-summary').textContent=`${loopBars} ${loopBars===1?'compasso':'compassos'} · 4/4`;
  $('.ruler>div').innerHTML=Array.from({length:loopBars},(_,i)=>`<span>${String(i+1).padStart(2,'0')}</span>`).join('');
  $('.ruler>div').style.gridTemplateColumns=`repeat(${loopBars},1fr)`;
  $('#bpm').disabled=playing||tracks.some(t=>t.buffer)||!!recording;
  $('#bars').disabled=$('#bpm').disabled;
}
function scheduleTrack(track, when=context.currentTime+.025){
  if(!track.buffer)return;
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=track.buffer;source.loop=true;source.loopStart=0;source.loopEnd=loopDuration();
  source.connect(gain).connect(filter);
  const offset=when<=started?0:(when-started)%loopDuration();
  source.start(Math.max(when,started),offset);
  sources.push({source,gain,track});updateVolumes();
}
async function play(countIn=false){
  initAudio();await context.resume();if(playing)return;
  if(!loopFrames)loopFrames=Math.round(loopBars*4*beatSeconds()*context.sampleRate);
  started=Math.round((context.currentTime+(countIn?4*beatSeconds():.05))*context.sampleRate)/context.sampleRate;
  playing=true;tracks.forEach(t=>scheduleTrack(t,started));
  $('#play').textContent='Ⅱ';$('#audio-status').textContent='Loop tocando';
  document.body.classList.add('playing');lastScheduledBeat=-5;refreshLoopUI();
}
function releaseCapture(){
  if(!recording)return;
  recording.node.port.postMessage({type:'cancel'});
  recording.input.disconnect();recording.node.disconnect();recording.silent.disconnect();
  recording.stream.getTracks().forEach(t=>t.stop());recording=null;
  $('#capture-mode').disabled=false;
  $('#record').classList.remove('recording','armed');$('#record').title='Gravar nova camada';
}
function stop(){
  recordingEpoch++;releaseCapture();sources.forEach(s=>{try{s.source.stop()}catch{}});sources=[];playing=false;
  $('#play').textContent='▶';$('#audio-status').textContent='Pronto para gravar';document.body.classList.remove('playing');
  $('#position').innerHTML='01<span>.</span>1<span>.</span>1';refreshLoopUI();
}
$('#play').onclick=()=>playing?stop():play();$('#stop').onclick=stop;
$('#master').oninput=()=>{$('#master-value').textContent=$('#master').value+'%';applyEffects()};
$('#bpm').onchange=()=>{$('#bpm').value=Math.min(240,Math.max(40,+$('#bpm').value||92));loopFrames=0;applyEffects();refreshLoopUI()};
$('#bars').onchange=()=>{loopBars=+$('#bars').value;loopFrames=0;refreshLoopUI()};
$('#loop').onclick=()=>toast('Todas as camadas repetem o mesmo ciclo de compassos.');
let metro=false,lastScheduledBeat=-5;
$('#metronome').onclick=()=>{metro=!metro;$('#metronome').classList.toggle('enabled',metro)};
function clickAt(when,accent){const o=context.createOscillator(),g=context.createGain();o.frequency.value=accent?1400:900;g.gain.setValueAtTime(.08,when);g.gain.exponentialRampToValueAtTime(.001,when+.06);o.connect(g).connect(context.destination);o.start(when);o.stop(when+.07)}
setInterval(()=>{
  if(!playing)return;
  const now=context.currentTime,beat=(now-started)/beatSeconds(),cycleBeats=loopBars*4;
  const visibleBeat=Math.max(0,beat)%cycleBeats;
  $('#position').innerHTML=`${String(Math.floor(visibleBeat/4)+1).padStart(2,'0')}<span>.</span>${Math.floor(visibleBeat)%4+1}<span>.</span>${Math.floor(visibleBeat%1*4)+1}`;
  document.querySelectorAll('.playhead').forEach(p=>p.style.left=(visibleBeat/cycleBeats*100)+'%');
  // Schedule clicks ahead on the audio clock. Count-in clicks are always audible.
  const first=Math.max(-4,Math.ceil((now-started)/beatSeconds()));
  const last=Math.floor((now+.15-started)/beatSeconds());
  for(let i=Math.max(first,lastScheduledBeat+1);i<=last;i++){
    const when=started+i*beatSeconds();
    if(when>=now&&(metro||(recording&&when<recording.startTime)))clickAt(when,i%4===0);
    lastScheduledBeat=i;
  }
  if(recording){
    if(now<recording.startTime){$('#audio-status').textContent=`Prepare-se · ${Math.ceil((recording.startTime-now)/beatSeconds())} tempos`;}
    else {$('#record').classList.remove('armed');$('#record').classList.add('recording');$('#audio-status').textContent=recording.finishing?'Finalizando no próximo compasso…':`Gravando · compasso ${Math.floor((now-recording.startTime)/beatSeconds()/4)+1}/${loopBars}`;}
  }
},25);
function fitToLoop(buffer){
  if(!loopFrames)loopFrames=Math.round(loopBars*4*beatSeconds()*context.sampleRate);
  const fitted=context.createBuffer(2,loopFrames,context.sampleRate);
  for(let c=0;c<2;c++)fitted.getChannelData(c).set(buffer.getChannelData(Math.min(c,buffer.numberOfChannels-1)).subarray(0,loopFrames));
  return fitted;
}
function addAudioTrack(buffer,name,type='LOOP'){
  const empty=tracks.findIndex(t=>!t.buffer),track={name,type,color:['#aca3dd','#99bcae','#e4b587','#b3c0cc'][tracks.length%4],volume:75,pan:0,mute:false,solo:false,buffer};
  if(empty>=0){Object.assign(tracks[empty],track);selected=empty;}else{tracks.push(track);selected=tracks.length-1;}
  renderTracks();refreshLoopUI();if(playing)scheduleTrack(tracks[selected]);
}
async function importFiles(files){
  initAudio();await context.resume();
  for(const file of files){try{const buffer=await context.decodeAudioData(await file.arrayBuffer());addAudioTrack(fitToLoop(buffer),file.name.replace(/\.[^.]+$/,''),'IMPORTADO');toast('Áudio alinhado ao loop. Sons curtos recebem silêncio; sons longos são cortados.')}catch{toast('Não foi possível ler o áudio. Tente WAV ou MP3.')}}
}
$('#import').onclick=()=>$('#file').click();$('#file').onchange=e=>importFiles(e.target.files);$('.canvas').ondragover=e=>{e.preventDefault();$('.canvas').classList.add('dragging')};$('.canvas').ondragleave=()=>$('.canvas').classList.remove('dragging');$('.canvas').ondrop=e=>{e.preventDefault();$('.canvas').classList.remove('dragging');importFiles(e.dataTransfer.files)};
$('#new-loop').onclick=()=>{if(tracks.some(t=>t.buffer)&&!confirm('Apagar as camadas e começar um novo loop? Exporte antes para guardar o áudio.'))return;stop();tracks.length=0;loopFrames=0;takeNumber=0;renderTracks();refreshLoopUI();toast('Novo loop. Escolha BPM e compassos antes de gravar.');};
$('#add').onclick=()=>{tracks.push({name:'Nova camada',type:'VAZIA',color:'#aca3dd',volume:75,mute:false,solo:false,buffer:null});selected=tracks.length-1;renderTracks();toast('Camada pronta. Pressione gravar para preenchê-la.')};
$('#record').onclick=async()=>{
  if(microphoneBusy)return;
  if(recording){
    if(context.currentTime<recording.startTime){releaseCapture();$('#audio-status').textContent='Loop tocando';toast('Gravação cancelada.');return;}
    if(recording.finishing)return;
    const barFrames=Math.round(4*beatSeconds()*context.sampleRate);
    const elapsed=Math.ceil(context.currentTime*context.sampleRate)-recording.startFrame;
    const end=recording.startFrame+Math.ceil((elapsed+128)/barFrames)*barFrames;
    recording.node.port.postMessage({type:'finish',end:Math.min(end,recording.startFrame+loopFrames)});
    recording.finishing=true;toast('A gravação fecha no próximo compasso. O loop continua tocando.');return;
  }
  microphoneBusy=true;$('#capture-mode').disabled=true;let mic;const epoch=recordingEpoch;
  try{
    initAudio();await context.resume();
    if(!context.audioWorklet)throw new Error('AudioWorklet unavailable');
    if(!workletLoaded){await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}loop-recorder.js`);workletLoaded=true;}
    if(epoch!==recordingEpoch)return;
    const captureMode=$('#capture-mode').value;
    mic=await navigator.mediaDevices.getUserMedia(microphoneConstraints(captureMode));
    if(captureMode==='speakers'&&mic.getAudioTracks()[0]?.getSettings().echoCancellation!==true){$('#capture-note').textContent='Este navegador não confirmou cancelamento de eco. Use fones para evitar regravar as camadas anteriores.';}
    if(epoch!==recordingEpoch){mic.getTracks().forEach(t=>t.stop());return;}
    if(!playing)await play(true);
    const duration=loopDuration(),now=context.currentTime;
    const startTime=now<started?started:started+Math.ceil((now+.06-started)/duration)*duration;
    const startFrame=Math.round(startTime*context.sampleRate);
    const node=new AudioWorkletNode(context,'loop-recorder'),input=context.createMediaStreamSource(mic),silent=context.createGain();silent.gain.value=0;
    input.connect(node).connect(silent).connect(context.destination);
    const take={node,input,silent,stream:mic,startTime:startFrame/context.sampleRate,startFrame,finishing:false};recording=take;
    node.port.onmessage=({data})=>{
      if(data.type!=='complete'||recording!==take)return;
      const buffer=context.createBuffer(2,loopFrames,context.sampleRate);
      buffer.copyToChannel(data.left,0);buffer.copyToChannel(data.right,1);
      releaseCapture();addAudioTrack(buffer,`Take ${++takeNumber}`,'MICROFONE');
      $('#audio-status').textContent='Loop tocando · grave outra camada';toast('Camada em loop. Pressione gravar para tocar por cima.');
    };
    node.port.postMessage({type:'arm',start:startFrame,end:startFrame+loopFrames});
    $('#record').classList.add('armed');$('#record').title='Encerrar gravação no próximo compasso';
    toast('Entre após a contagem. A gravação encerra automaticamente ao completar o loop.');
  }catch(e){mic?.getTracks().forEach(t=>t.stop());releaseCapture();toast(e.name==='NotAllowedError'?'Permita o microfone no navegador para gravar.':'Microfone indisponível. Use HTTPS e um navegador atualizado.');}
  finally{microphoneBusy=false;if(!recording)$('#capture-mode').disabled=false;}
};
$('#reset').onclick=()=>{effects.forEach((e,i)=>{e.value=[28,18,100,12,20,35][i];e.on=i===0||i===5});renderEffects();applyEffects();toast('Effects restored')};
function save(){try{localStorage.setItem('loopee-session',JSON.stringify({name:$('h1').innerText.replace('↗','').trim(),bpm:$('#bpm').value,loopBars,effects,tracks:tracks.map(({buffer,...t})=>t)}));$('#save-status').textContent='Session settings saved';toast('Settings saved on this device. Export audio to keep your recordings.')}catch{toast('Storage unavailable. Export your audio to keep your work.')}}$('#save').onclick=save;
function modal(html){$('#dialog-content').innerHTML=html;$('#dialog').showModal()}$('#close-dialog').onclick=()=>$('#dialog').close();$('#dialog').onclick=e=>{if(e.target===$('#dialog'))$('#dialog').close()};document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{if(b.dataset.nav==='studio')return;if(b.dataset.nav==='sessions'){const saved=localStorage.getItem('loopee-session');modal(`<div class="eyebrow">YOUR WORKSPACE</div><h2>My sessions</h2><p>${saved?escapeHtml(JSON.parse(saved).name):'Your next great session starts here.'}</p><p>Save stores mix settings on this device. Audio recordings are kept through WAV export.</p>${saved?'<button class="dark" id="restore">Restore saved settings</button>':''}`);if(saved)$('#restore').onclick=()=>{let s=JSON.parse(saved);$('h1').textContent=s.name;if(!playing&&!tracks.some(t=>t.buffer)){ $('#bpm').value=s.bpm;loopBars=s.loopBars||4;$('#bars').value=loopBars;loopFrames=0;refreshLoopUI();}s.effects.forEach((e,i)=>Object.assign(effects[i],e));s.tracks.forEach((t,i)=>{if(tracks[i])Object.assign(tracks[i],t)});renderEffects();renderTracks();applyEffects();$('#dialog').close();toast('Session settings restored')}}else{modal('<div class="eyebrow">SONS PARA EXPLORAR</div><h2>Sound library</h2><p>Comece com o seu microfone ou adicione quatro instrumentos de demonstração.</p><button class="dark" id="load-demo">Adicionar demonstração</button>');$('#load-demo').onclick=()=>{initAudio();["Warm keys","Pocket drums","Soft bass","Texture"].forEach((name,i)=>addAudioTrack(fitToLoop(demo(i)),name,'DEMO'));$('#dialog').close()}}});$('#settings').onclick=()=>modal(`<div class="eyebrow">STUDIO SETTINGS</div><h2>Your creative space.</h2><p>Audio engine: Web Audio · Stereo</p><p>Sample rate: ${context?.sampleRate||'Browser default'} Hz</p><p>Microphone capture requires browser permission and a secure connection. Fones evitam que as camadas reproduzidas entrem fisicamente no microfone. O modo alto-falantes solicita cancelamento de eco ao navegador; ele pode alterar o timbre e não garante isolamento total.</p><p>Escolha BPM e 1, 2, 4 ou 8 compassos antes de criar camadas. Gravar inicia após uma contagem e captura um ciclo completo. Cada nova camada começa no início do próximo ciclo. Encerrar manualmente fecha no próximo compasso e preenche o restante com silêncio. Use Stop para cancelar uma gravação. BPM e duração ficam bloqueados enquanto houver áudio. Importações são cortadas ou preenchidas para caber no ciclo, sem alterar a velocidade. WAV export includes volume, mute and solo settings; live effects are not included.</p>`);$('#more').onclick=()=>modal('<h2>About this session</h2><p>Rename your session by clicking its title. Choose a layer to select it, use M to mute and S to solo. Import audio or record a new take to build your sound.</p>');$('#headphones').onclick=()=>{if(recording||microphoneBusy){toast('Finalize a gravação antes de trocar o modo de escuta.');return;}$('#capture-mode').value='headphones';$('#capture-mode').dispatchEvent(new Event('change'));$('#capture-mode').focus();toast('Modo fones selecionado. Conecte seus fones antes de gravar.');};
$('#export').onclick=async()=>{try{initAudio();if(!tracks.some(t=>t.buffer)){toast('Grave ou importe um som antes de exportar.');return;}toast('Rendering your stereo mix…');const length=loopDuration(),rate=context.sampleRate,offline=new OfflineAudioContext(2,Math.ceil(length*rate),rate);tracks.forEach(t=>{if(!t.buffer||t.mute||(tracks.some(x=>x.solo)&&!t.solo))return;const s=offline.createBufferSource(),g=offline.createGain();s.buffer=t.buffer;s.loop=true;g.gain.value=t.volume/100*+$('#master').value/100;s.connect(g).connect(offline.destination);s.start();s.stop(length)});const b=await offline.startRendering(),data=new ArrayBuffer(44+b.length*4),v=new DataView(data);function str(p,s){for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i))}str(0,'RIFF');v.setUint32(4,36+b.length*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,b.length*4,true);for(let i=0;i<b.length;i++)for(let c=0;c<2;c++){const s=Math.max(-1,Math.min(1,b.getChannelData(c)[i]));v.setInt16(44+(i*2+c)*2,s<0?s*32768:s*32767,true)}const url=URL.createObjectURL(new Blob([data],{type:'audio/wav'})),a=document.createElement('a');a.href=url;a.download='loopee-session.wav';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Stereo WAV exported. Live effects are not included.')}catch{toast('Export failed. Try a shorter audio file.')}};
renderTracks();renderEffects();refreshLoopUI();
