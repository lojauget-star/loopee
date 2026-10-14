import './style.css';
import { microphoneConstraints } from './capture.js';
import { recordingView } from './recording-state.js';
import { freshEffects, createEffectChain } from './effects.js';
import { commitBuffer, undoTrack, redoTrack, mixSamples } from './track-history.js';
import { saveAudioSession, listAudioSessions, loadAudioSession } from './sessions.js';
import { scheduleRhythm } from './rhythm.js';
import { estimatedLatencyMs, shiftedCapture, shiftSamples } from './latency.js';
const icons={grid:'▦',wave:'∿',folder:'▱',record:'●',play:'▶',pause:'Ⅱ',plus:'＋',arrow:'↗'};
let context, playing=false, started=0, sources=[], selected=0;
let loopBars=4, loopFrames=0, recording=null, microphoneBusy=false, takeNumber=0, workletLoaded=false, recordingEpoch=0;
const beatSeconds=()=>60 / +$('#bpm').value;
const loopDuration=()=>loopFrames ? loopFrames/context.sampleRate : loopBars*4*beatSeconds();
const tracks=[];
let inputEffects=freshEffects(), fxScope='track', sessionId=crypto.randomUUID();
const nextEmptySlot=()=>[1,2,3,4,5].find(slot=>!tracks.some(t=>t.slot===slot&&t.buffer));

document.querySelector('#app').innerHTML=`<aside><a class="brand" href="#">loopee<span>®</span></a><div class="workspace">YOUR WORKSPACE</div><nav><button class="active" data-nav="studio">▦ <span>Studio</span><i>01</i></button><button data-nav="sessions">▱ <span>My sessions</span></button><button data-nav="library">∿ <span>Sound library</span></button></nav><div class="side-note"><span class="little-loop">∞</span><h3>Good things<br>come around.</h3><p>Make a little noise.<br>See where it takes you.</p></div><div class="sidebar-bottom"><div class="pro-tag">LOOPEE STUDIO <span>PRO</span></div><button id="settings">⚙ <span>Studio settings</span></button><div class="user"><div class="avatar">JD</div><div>Jamie Davis<small>Personal workspace</small></div><span>⌄</span></div></div></aside><main><header><div><span class="breadcrumb">Workspace <b>/</b> Studio</span></div><div class="top-right"><span class="saved"><i></i> <span id="save-status">All changes saved</span></span><button id="sessions-open" class="plain session-save">Sessões</button><button id="save" class="plain session-save">Salvar sessão</button><button id="export" class="dark">↥ &nbsp; Export audio</button></div></header><section class="studio"><div class="heading"><div><div class="eyebrow">FIVE TRACKS. ENDLESS POSSIBILITIES.</div><h1 contenteditable="true" spellcheck="false">Minha loop station<span class="edit">↗</span></h1><p>Escolha os compassos. Grave um som. Crie novas camadas sobre o mesmo loop.</p></div><button class="more" id="more">•••</button></div><div class="transport"><div class="transport-buttons"><button id="play" class="play">▶</button><button id="stop" title="Stop">■</button><button id="record" class="record" title="Gravar nova camada" aria-label="Gravar nova camada">●</button></div><div class="time"><strong id="position">01<span>.</span>1<span>.</span>1</strong><small>BARS · BEATS</small></div><div class="transport-divider"></div><label class="tempo"><input id="bpm" aria-label="BPM" inputmode="numeric" type="number" value="92" min="40" max="240"><small>BPM</small></label><label class="loop-length"> <select id="bars" aria-label="Compassos do loop"><option value="1">1 compasso</option><option value="2">2 compassos</option><option value="4" selected>4 compassos</option><option value="8">8 compassos</option></select><small>LOOP · 4/4</small></label><button class="metronome" id="metronome" aria-pressed="false">♧ <span>Metrônomo</span><i></i></button><button id="tap-tempo" class="tap-tempo">Tap tempo</button><p class="timing-note" id="timing-note"></p><div class="transport-end"><span class="live-dot"></span> <span id="audio-status">Pronto para gravar</span><button id="loop" class="loop active" title="Loop">⇄</button></div></div><section class="station"><div class="station-heading"><div><span class="eyebrow">LOOPEE · LIVE STATION</span><h2>Cinco pistas. Um só fluxo.</h2></div><span class="sync-badge">● Loop sync</span></div><div id="station-slots" class="station-slots"></div><div class="station-tools"><button id="all-start">▶ Tocar todas</button><button id="all-stop">■ Parar todas</button><label>Ritmo <select id="rhythm"><option value="off">Desligado</option><option value="pocket">Pocket · 4/4</option><option value="four">Four on the floor</option></select></label><label class="rhythm-volume">Volume <input id="rhythm-volume" type="range" min="0" max="100" value="35" aria-label="Volume do ritmo"></label><span>Ritmo e metrônomo não entram na gravação.</span></div></section><section class="recording-guide" id="recording-guide" data-phase="idle"><div class="guide-main"><div class="guide-copy"><span class="guide-eyebrow" id="guide-phase">CONSTRUA SEU LOOP</span><h2 id="guide-title">Pronto para criar</h2><p id="guide-detail"></p></div><div class="guide-count"><strong id="guide-counter">4</strong><small id="guide-unit">TEMPOS DE PREPARAÇÃO</small><div id="guide-beats"><i></i><i></i><i></i><i></i></div></div></div><div class="guide-progress" role="progressbar" aria-label="Progresso da gravação" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="guide-progress"></i></div><div class="guide-bottom"><div class="guide-steps"><span data-step="1"><b>1</b> Prepare-se</span><span data-step="2"><b>2</b> Grave</span><span data-step="3"><b>3</b> Em loop</span></div><button id="add" class="record-action">● Gravar primeira camada</button></div><div id="guide-live" class="sr-only" aria-live="polite"></div></section><div class="capture-settings"><label for="capture-mode">Escuta durante a gravação</label><select id="capture-mode"><option value="speakers">Alto-falantes · reduzir eco</option><option value="headphones">Fones / interface · áudio puro</option></select><label class="input-gain-control" for="input-gain">Ganho do microfone <input id="input-gain" type="range" min="0" max="200" value="100" aria-label="Ganho do microfone"><span id="input-gain-value">100%</span></label><label class="latency-control">Sincronia <select id="latency-mode"><option value="auto">Compensação estimada</option><option value="manual">Ajuste manual</option></select><input id="latency-ms" type="number" min="0" max="1000" value="0" step="5" aria-label="Compensação de latência em milissegundos"><span>ms</span></label><p id="latency-note">A estimativa depende do dispositivo. Se o take ainda atrasar, aumente o ajuste manual. Bluetooth costuma ter maior atraso.</p><p id="capture-note"></p></div><div class="section-title"><h2>Loop canvas <span>0 layers</span></h2><div><button id="new-loop">Novo loop</button><button id="import">↥ &nbsp; Import audio</button></div></div><div class="canvas"><div class="ruler"><span>LAYERS</span><div>${Array.from({length:4},(_,i)=>`<span>${String(i+1).padStart(2,'0')}</span>`).join('')}</div><span>LEVEL</span></div><div id="tracks"></div><div class="canvas-bottom"><span>↳ &nbsp; Drop an audio file here, or record something new.</span><span><span id="loop-summary">4 compassos · 4/4</span> <b>⇄</b></span></div></div><div class="lower"><section class="effects"><div class="section-title"><h2>Efeitos da faixa</h2><button id="reset">↺ &nbsp; Reset</button></div><div class="fx-scope"><button id="track-fx-tab" class="active">Efeitos da pista</button><button id="input-fx-tab">Efeitos de entrada</button></div><label class="effects-target">Editando <select id="effects-track" aria-label="Faixa para editar efeitos"></select></label><p class="effects-help" id="effects-help">Selecione uma faixa. Os efeitos são exclusivos dela.</p><div id="effects" class="effect-grid"></div></section><section class="master"><div class="section-title"><h2>Master output</h2><span>↗</span></div><div class="master-body"><div class="master-top"><span>Clean. Balanced. Yours.</span><span class="stereo">STEREO</span></div><div class="levels"><small>L</small><div><i></i></div><small>R</small><div><i></i></div></div><div class="db-scale"><span>−60</span><span>−24</span><span>−12</span><span>−6</span><span>0</span></div><div class="master-volume"><span>Output volume</span><strong id="master-value">80%</strong></div><input id="master" type="range" min="0" max="100" value="80"><div class="master-footer"><span><i></i> Ouça sua mixagem.</span><button id="headphones" title="Monitor headphones">♬</button></div></div></section></div><footer><span><span class="footer-logo">∞</span> Stay in the moment. We'll keep the loop.</span><span>Made for the way you make music. <b>✧</b></span></footer></section></main><input type="file" id="file" accept="audio/*" multiple hidden><div id="toast"></div><dialog id="dialog"><button id="close-dialog">×</button><div id="dialog-content"></div></dialog>`;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);const toast=t=>{$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3500)};
function refreshCaptureMode(){
  const speakers=$('#capture-mode').value==='speakers';
  $('#capture-note').textContent=speakers?'Cancelamento de eco ligado. Para separar melhor as camadas, use fones; a redução de eco depende do navegador e do ambiente.':'Use fones ou saída isolada de uma interface. Sem processamento do microfone para preservar o timbre.';
}
try { const stored=localStorage.getItem('loopee-capture-mode');if(['speakers','headphones'].includes(stored))$('#capture-mode').value=stored; } catch {}
$('#capture-mode').onchange=()=>{refreshCaptureMode();try{localStorage.setItem('loopee-capture-mode',$('#capture-mode').value)}catch{}};
refreshCaptureMode();$('#input-gain').oninput=()=>{$('#input-gain-value').textContent=$('#input-gain').value+'%';if(recording)recording.microphoneGain.gain.setTargetAtTime(+$('#input-gain').value/100,context.currentTime,.01);};
function refreshLatencyControl(){const auto=$('#latency-mode').value==='auto';$('#latency-ms').disabled=auto||!!recording||microphoneBusy;$('#latency-mode').disabled=!!recording||microphoneBusy;}
try{const setting=JSON.parse(localStorage.getItem('loopee-latency')||'null');if(setting){$('#latency-mode').value=setting.mode==='manual'?'manual':'auto';$('#latency-ms').value=Math.max(0,Math.min(1000,+setting.ms||0));}}catch{}
for(const id of ['#latency-mode','#latency-ms'])$(id).onchange=()=>{$('#latency-ms').value=Math.max(0,Math.min(1000,+$('#latency-ms').value||0));refreshLatencyControl();try{localStorage.setItem('loopee-latency',JSON.stringify({mode:$('#latency-mode').value,ms:+$('#latency-ms').value}))}catch{}};
refreshLatencyControl();
function wave(seed,buffer){if(!buffer)return '<i style="height:2px"></i>'.repeat(155);if(buffer){const data=buffer.getChannelData(0);return Array.from({length:155},(_,i)=>{let peak=0;const start=Math.floor(i*data.length/155),end=Math.floor((i+1)*data.length/155);for(let j=start;j<end;j+=Math.max(1,Math.floor((end-start)/80)))peak=Math.max(peak,Math.abs(data[j]));return `<i style="height:${Math.max(2,Math.min(45,peak*65))}px"></i>`}).join('')} let v=seed;return Array.from({length:155},(_,i)=>{v=(v*9301+49297)%233280;const h=5+(v/233280)*35*(.3+.7*Math.abs(Math.sin(i*.17)));return `<i style="height:${h}px"></i>`}).join('')}
function renderStation(){
  $('#station-slots').innerHTML=[1,2,3,4,5].map(slot=>{
    const track=tracks.find(t=>t.slot===slot),active=recording?.slot===slot,hasAudio=!!track?.buffer;
    return `<article class="station-slot ${hasAudio?'filled':''} ${active?'capturing':''}" data-slot="${slot}" style="--slot-color:${track?.color||'#9eae8c'}"><button class="slot-select" data-select-slot="${slot}"><span class="slot-number">${String(slot).padStart(2,'0')}</span><strong>${hasAudio?escapeHtml(track.name):'Pista livre'}</strong></button><div class="slot-ring"><span class="slot-state">${active?'Prepare-se':hasAudio?(track.stopped||!playing?'Parada':'Em loop'):'Pronta'}</span></div><button class="slot-record" data-arm-slot="${slot}">${hasAudio?'● Overdub':'● Gravar'}</button><input class="slot-volume" type="range" min="0" max="100" value="${track?.volume??75}" data-slot-volume="${slot}" ${!hasAudio?'disabled':''} aria-label="Volume da pista ${slot}"></article>`;
  }).join('');
  document.querySelectorAll('[data-arm-slot]').forEach(button=>button.onclick=()=>{const slot=+button.dataset.armSlot;handleRecord({slot,track:tracks.find(t=>t.slot===slot)});});
  document.querySelectorAll('[data-select-slot]').forEach(button=>button.onclick=()=>{const index=tracks.findIndex(t=>t.slot===+button.dataset.selectSlot);if(index>=0){selected=index;fxScope='track';renderTracks();renderEffects();}});
  document.querySelectorAll('[data-slot-volume]').forEach(input=>input.oninput=()=>{const track=tracks.find(t=>t.slot===+input.dataset.slotVolume);if(track){track.volume=+input.value;updateVolumes();const row=$(`[data-volume="${tracks.indexOf(track)}"]`);if(row){row.value=input.value;row.nextElementSibling.textContent=input.value+'%';}}});
}
function playbackBuffer(track){
  if(!track.reverse)return track.buffer;
  if(!track.reversedBuffer&&track.buffer){const buffer=context.createBuffer(track.buffer.numberOfChannels,track.buffer.length,track.buffer.sampleRate);for(let c=0;c<buffer.numberOfChannels;c++)buffer.copyToChannel(track.buffer.getChannelData(c).slice().reverse(),c);track.reversedBuffer=buffer;}
  return track.reversedBuffer;
}
function nextBoundary(){return started+Math.ceil((context.currentTime+.06-started)/loopDuration())*loopDuration();}
function replaceTrackAudio(track,quantized=false){
  if(!playing)return;
  const when=quantized?nextBoundary():context.currentTime+.03;
  sources.filter(entry=>entry.track===track&&!entry.retiring).forEach(entry=>{entry.retiring=true;try{entry.source.stop(when);}catch{}});
  if(track.buffer)scheduleTrack(track,when);
}
async function queueTrackStop(track){
  if(!track.buffer)return;
  if(recording){toast('Finalize a gravação antes de parar uma pista.');return;}
  if(!playing){await play();tracks.forEach(t=>{t.stopped=t!==track;t.pending=null;});updateVolumes();renderTracks();return;}
  if(track.pending){track.pending=null;updateVolumes();renderTracks();return;}
  track.pending={when:nextBoundary(),stopped:!track.stopped};updateVolumes();renderTracks();
}
function wireTrackActions(){
  const locked=!!recording||microphoneBusy;
  $('#tracks').querySelectorAll('[data-track-play]').forEach(b=>b.onclick=()=>queueTrackStop(tracks[+b.dataset.trackPlay]));
  $('#tracks').querySelectorAll('[data-overdub]').forEach(b=>b.onclick=()=>{const track=tracks[+b.dataset.overdub];handleRecord({slot:track.slot,track});});
  for(const [key,action] of [['undo',undoTrack],['redo',redoTrack]])$('#tracks').querySelectorAll(`[data-${key}]`).forEach(b=>{if(locked)b.disabled=true;b.onclick=()=>{if(locked)return;const track=tracks[+b.dataset[key]];if(action(track)){replaceTrackAudio(track);renderTracks();renderEffects();refreshLoopUI();}};});
  for(const [key,property] of [['reverse','reverse'],['half','halfSpeed']])$('#tracks').querySelectorAll(`[data-${key}]`).forEach(b=>{b.disabled=locked||!tracks[+b.dataset[key]].buffer;b.onclick=()=>{if(locked)return;const track=tracks[+b.dataset[key]];track[property]=!track[property];replaceTrackAudio(track,true);renderTracks();};});
  for(const [key,direction] of [['align-early',1],['align-late',-1]])$('#tracks').querySelectorAll(`[data-${key}]`).forEach(button=>{const index=+button.getAttribute(`data-${key}`);button.disabled=locked||!tracks[index].buffer;button.onclick=()=>{const track=tracks[index],buffer=context.createBuffer(2,track.buffer.length,track.buffer.sampleRate);for(let c=0;c<2;c++)buffer.copyToChannel(shiftSamples(track.buffer.getChannelData(c),direction*Math.round(.01*buffer.sampleRate)),c);commitBuffer(track,buffer);replaceTrackAudio(track);renderTracks();};});
  $('#tracks').querySelectorAll('[data-clear]').forEach(b=>{b.disabled=locked||!tracks[+b.dataset.clear].buffer;b.onclick=()=>{if(locked)return;const track=tracks[+b.dataset.clear];if(!confirm(`Limpar ${track.name}? Você pode desfazer com Undo.`))return;commitBuffer(track,null);replaceTrackAudio(track);renderTracks();renderEffects();refreshLoopUI();};});
}
function renderTracks(){$('#tracks').innerHTML=tracks.length?tracks.map((t,i)=>`<div class="track ${selected===i?'selected':''}" style="--track:${t.color}" data-track="${i}"><div class="track-info"><div class="track-icon">${['♬','⠿','∿','≋'][i%4]}</div><div><input value="${escapeHtml(t.name)}" aria-label="Layer name" data-name="${i}"><small>${t.pending?'NA PRÓXIMA VIRADA':!t.buffer?'VAZIA':t.stopped?'PARADA':playing?'EM LOOP':'PRONTA'} <b>·</b> ${t.buffer?t.buffer.duration.toFixed(1)+' SEC':loopBars+' COMPASSOS'}</small></div><div class="track-controls"><button data-track-fx="${i}" class="track-fx" aria-label="Efeitos de ${escapeHtml(t.name)}">FX</button><button data-mute="${i}" class="${t.mute?'enabled':''}">M</button><button data-solo="${i}" class="${t.solo?'enabled':''}">S</button></div></div><div class="wave-wrap"><div class="waveform">${wave(i*125+18,t.reverse?playbackBuffer(t):t.buffer)}</div><div class="playhead"></div><span class="clip-label">${escapeHtml(t.name)}</span></div><div class="track-level"><input type="range" min="0" max="100" value="${t.volume}" data-volume="${i}" aria-label="${escapeHtml(t.name)} volume"><span>${t.volume}%</span></div></div><div class="track-actions" data-actions="${i}"><button data-track-play="${i}">${t.stopped||!playing?'▶ Tocar':'■ Parar'}</button><button data-overdub="${i}">${t.buffer?'● Overdub':'● Gravar'}</button><button data-undo="${i}" ${!t.undoAvailable?'disabled':''}>↶ Undo</button><button data-redo="${i}" ${!t.redoAvailable?'disabled':''}>↷ Redo</button><details class="track-extra"><summary>Mais</summary><button data-reverse="${i}" class="${t.reverse?'enabled':''}">Reverse</button><button data-half="${i}" class="${t.halfSpeed?'enabled':''}">½ speed</button><button data-align-early="${i}">Adiantar 10 ms</button><button data-align-late="${i}">Atrasar 10 ms</button><button data-clear="${i}">Limpar</button></details></div>`).join(''):'<div class="empty-canvas"><span>◉</span><h3>Seu primeiro som começa aqui.</h3><p>Use o botão “Gravar primeira camada” acima.<br>Acompanhe a contagem e toque quando aparecer “Gravando”.</p></div>';if(recording){$('#tracks').querySelector('.empty-canvas')?.remove();$('#tracks').insertAdjacentHTML('beforeend',`<div class="pending-track"><div><span class="pending-dot"></span><strong>Camada ${recording.layer}</strong><small id="pending-status">Preparando entrada</small></div><div class="pending-timeline"><i id="pending-progress"></i><span id="pending-label">Começa na próxima virada do loop</span></div></div>`);}$('.section-title h2 span').textContent=tracks.filter(t=>t.buffer).length+' / 5 pistas';wireTrackActions();renderStation();$('#tracks').querySelectorAll('[data-track-fx]').forEach(el=>el.onclick=()=>{selected=+el.dataset.trackFx;fxScope='track';renderTracks();renderEffects();$('.effects').scrollIntoView({behavior:'smooth',block:'start'});});$('#tracks').querySelectorAll('[data-track]').forEach(el=>el.onclick=e=>{if(e.target.closest('button,input'))return;selected=+el.dataset.track;renderTracks();renderEffects()});$('#tracks').querySelectorAll('[data-mute],[data-solo]').forEach(el=>el.onclick=()=>{let key=el.dataset.mute!==undefined?'mute':'solo',i=+(el.dataset[key]);tracks[i][key]=!tracks[i][key];renderTracks();updateVolumes()});$('#tracks').querySelectorAll('[data-volume]').forEach(el=>el.oninput=()=>{tracks[el.dataset.volume].volume=+el.value;el.nextElementSibling.textContent=el.value+'%';const pad=$(`[data-slot-volume="${tracks[el.dataset.volume].slot}"]`);if(pad)pad.value=el.value;updateVolumes()});$('#tracks').querySelectorAll('[data-name]').forEach(el=>el.onchange=()=>{tracks[el.dataset.name].name=el.value;renderTracks()})}
function renderEffects(){
  const input=fxScope==='input',track=tracks[selected];$('.effects-target').hidden=input;
  $('#track-fx-tab').classList.toggle('active',!input);$('#input-fx-tab').classList.toggle('active',input);
  $('.effects h2').textContent=input?'Efeitos de entrada':'Efeitos da pista';
  $('#effects-track').innerHTML=tracks.map((t,i)=>`<option value="${i}" ${i===selected?'selected':''}>${escapeHtml(t.name)}</option>`).join('');
  $('#effects-track').disabled=input||!track;$('#reset').disabled=!input&&!track;
  $('#effects-help').textContent=input?'Processa apenas o microfone e fica gravado no take. As pistas em loop não passam por estes efeitos.':track?`Ajustando apenas ${track.name}. As outras faixas mantêm seus próprios efeitos.`:'Grave ou importe uma faixa para ajustar seus efeitos.';
  if(!input&&!track){$('#effects').innerHTML='<div class="effects-empty">Cada camada tem seu próprio som. Seus efeitos aparecerão aqui.</div>';return;}
  const effects=input?inputEffects:track.effects;
  $('#effects').innerHTML=effects.map((e,i)=>`<div class="effect ${e.on?'on':''}"><div class="effect-top"><span class="effect-icon">${e.icon}</span><button class="toggle ${e.on?'on':''}" data-effect="${i}" aria-label="Toggle ${e.name}" aria-pressed="${e.on}"></button></div><h3>${e.name}</h3><p>${e.sub}</p><div class="effect-slider"><input type="range" min="0" max="100" value="${e.value}" data-fx="${i}" aria-label="${e.name} amount"><span>${e.value}%</span></div></div>`).join('');
  document.querySelectorAll('[data-effect]').forEach(el=>el.onclick=()=>{effects[el.dataset.effect].on=!effects[el.dataset.effect].on;renderEffects();applyEffects()});
  document.querySelectorAll('[data-fx]').forEach(el=>el.oninput=()=>{effects[el.dataset.fx].value=+el.value;el.nextElementSibling.textContent=el.value+'%';applyEffects()});
}
$('#track-fx-tab').onclick=()=>{fxScope='track';renderEffects()};$('#input-fx-tab').onclick=()=>{fxScope='input';renderEffects()};
$('#effects-track').onchange=()=>{selected=+$('#effects-track').value;renderTracks();renderEffects()};
let master,analyserL,analyserR;const meterSamples=new Float32Array(256);
function initAudio(){if(context)return;context=new AudioContext({latencyHint:'interactive'});master=context.createGain();master.connect(context.destination);const splitter=context.createChannelSplitter(2);analyserL=context.createAnalyser();analyserR=context.createAnalyser();analyserL.fftSize=256;analyserR.fftSize=256;master.connect(splitter);splitter.connect(analyserL,0);splitter.connect(analyserR,1);applyEffects()}
function refreshOutputMeter(){
  let peak=0;[analyserL,analyserR].forEach((analyser,i)=>{let level=0;if(analyser){analyser.getFloatTimeDomainData(meterSamples);for(const sample of meterSamples)level=Math.max(level,Math.abs(sample));}peak=Math.max(peak,level);const db=20*Math.log10(Math.max(level,1e-8));$('.levels').querySelectorAll('i')[i].style.width=`${Math.max(0,Math.min(100,(db+60)/60*100))}%`;});
  $('.master-footer>span').textContent=peak>=.999?'Nível alto — reduza o volume':peak>.001?'Saída ativa · estéreo':'Saída em silêncio';
}

function demo(index){const duration=32*60/92,b=context.createBuffer(2,Math.ceil(duration*context.sampleRate),context.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let n=0;n<d.length;n++){let time=n/context.sampleRate,beat=time/(60/92),phase=beat%1,bar=Math.floor(beat/4)%4;let sample=0;if(index===0){const f=[261.63,220,174.61,196][bar];sample=(Math.sin(2*Math.PI*f*time)+.4*Math.sin(2*Math.PI*f*1.25*time)+.3*Math.sin(2*Math.PI*f*1.5*time))*.09*Math.exp(-(beat%2)*2)}if(index===1){sample=Math.sin(2*Math.PI*(50+100*Math.exp(-phase*30))*time)*Math.exp(-phase*24)*.4;if(Math.floor(beat)%2===1)sample+=(Math.random()*2-1)*Math.exp(-phase*35)*.18;sample+=(Math.random()*2-1)*Math.exp(-(beat%.5)*90)*.035}if(index===2)sample=Math.sin(2*Math.PI*[65.4,55,43.65,49][bar]*time)*.18*Math.exp(-phase*3);if(index===3)sample=(Math.random()*2-1)*.012*(.5+.5*Math.sin(time*2));d[n]=sample}}return b}
function applyEffects(){if(!context)return;if(recording?.inputChain)recording.inputChain.update(inputEffects,+$('#bpm').value);master.gain.value=+$('#master').value/100;sources.forEach(({track,chain})=>chain.update(track.effects,+$('#bpm').value))}
function trackLevel(track,stopped=track.stopped){return track.mute||stopped||(tracks.some(t=>t.solo)&&!track.solo)?0:track.volume/100;}
function updateVolumes(){sources.forEach(({gain,track})=>{gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setTargetAtTime(trackLevel(track),context.currentTime,.01);if(track.pending)gain.gain.setValueAtTime(trackLevel(track,track.pending.stopped),track.pending.when);})}

let lastGuidePhase='';
function refreshRecordingGuide(){
  const view=recordingView({busy:microphoneBusy,take:recording,now:context?.currentTime||0,beatDuration:beatSeconds(),loopDuration:loopDuration(),playing,layers:tracks.filter(t=>t.buffer).length});
  $('#recording-guide').dataset.phase=view.phase;
  $('#guide-title').textContent=view.title;$('#guide-detail').textContent=view.detail;
  $('#guide-counter').textContent=view.counter;$('#guide-unit').textContent=view.unit;
  $('#guide-phase').textContent=({idle:'CONSTRUA SEU LOOP',requesting:'MICROFONE',waiting:'ENTRADA SINCRONIZADA',recording:'CAPTURANDO SEU SOM',finishing:'FECHANDO A CAMADA',looping:'PRONTA PARA A PRÓXIMA'})[view.phase];
  $('#add').textContent=view.action;$('#add').disabled=view.phase==='requesting'||view.phase==='finishing';
  if(!recording&&!microphoneBusy&&!nextEmptySlot()){$('#add').textContent='Use Overdub em uma pista';$('#add').disabled=true;}
  $('#record').title=view.action;$('#record').setAttribute('aria-label',view.action);$('#record').disabled=$('#add').disabled;
  $('#guide-progress').style.width=`${view.progress*100}%`;$('.guide-progress').setAttribute('aria-valuenow',String(Math.round(view.progress*100)));
  $('#guide-beats').querySelectorAll('i').forEach((dot,i)=>dot.classList.toggle('current',i===view.beat));
  document.querySelectorAll('[data-step]').forEach(step=>step.classList.toggle('current',+step.dataset.step===view.step));
  if($('#pending-progress')){$('#pending-progress').style.width=`${view.progress*100}%`;$('#pending-status').textContent=view.phase==='waiting'?'AGUARDANDO A VIRADA':'GRAVANDO';$('#pending-label').textContent=view.phase==='waiting'?`Entrada em ${view.counter} tempos`:`${view.counter} s para repetir com as outras camadas`;}
  if(lastGuidePhase!==view.phase){$('#guide-live').textContent=view.title;lastGuidePhase=view.phase;}
}
function refreshLoopUI(){
  $('#loop-summary').textContent=`${loopBars} ${loopBars===1?'compasso':'compassos'} · 4/4`;
  $('.ruler>div').innerHTML=Array.from({length:loopBars},(_,i)=>`<span>${String(i+1).padStart(2,'0')}</span>`).join('');
  $('.ruler>div').style.gridTemplateColumns=`repeat(${loopBars},1fr)`;
  $('#bpm').disabled=playing||tracks.some(t=>t.buffer)||!!recording;
  $('#bars').disabled=$('#bpm').disabled;$('#tap-tempo').disabled=$('#bpm').disabled;$('#timing-note').textContent=tracks.some(t=>t.buffer)?'BPM e compassos estão fixos para manter as faixas sincronizadas. Use Novo loop para alterar.':playing?'Pare a reprodução para alterar BPM e compassos.':'Escolha BPM e compassos antes da primeira gravação.';refreshRecordingGuide();
}
function scheduleTrack(track, when=context.currentTime+.025){
  if(!track.buffer)return;
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=playbackBuffer(track);source.playbackRate.value=track.halfSpeed?.5:1;source.loop=true;source.loopStart=0;source.loopEnd=loopDuration();
  const chain=createEffectChain(context,track.effects,+$('#bpm').value);
  source.connect(chain.input);chain.output.connect(gain).connect(master);
  const rate=track.halfSpeed?.5:1;const offset=when<=started?0:((when-started)*rate)%loopDuration();
  source.start(Math.max(when,started),offset);
  const entry={source,gain,track,chain};sources.push(entry);source.onended=()=>{chain.dispose();gain.disconnect();sources=sources.filter(item=>item!==entry);};updateVolumes();
}
async function play(countIn=false){
  initAudio();await context.resume();if(playing)return;
  if(!loopFrames)loopFrames=Math.round(loopBars*4*beatSeconds()*context.sampleRate);
  started=Math.round((context.currentTime+(countIn?4*beatSeconds():.05))*context.sampleRate)/context.sampleRate;
  playing=true;tracks.forEach(t=>{t.stopped=false;t.pending=null;scheduleTrack(t,started);});
  $('#play').textContent='Ⅱ';$('#audio-status').textContent='Loop tocando';
  document.body.classList.add('playing');lastScheduledBeat=-5;renderTracks();refreshLoopUI();
}
function releaseCapture(){
  if(!recording)return;
  recording.node.port.postMessage({type:'cancel'});
  recording.input.disconnect();recording.microphoneGain.disconnect();recording.inputChain.dispose();recording.node.disconnect();recording.silent.disconnect();
  recording.stream.getTracks().forEach(t=>t.stop());recording=null;
  $('#capture-mode').disabled=false;$('#import').disabled=false;
  $('#record').classList.remove('recording','armed');renderTracks();refreshRecordingGuide();
}
function stop(){
  recordingEpoch++;releaseCapture();tracks.forEach(t=>t.pending=null);sources.forEach(s=>{try{s.source.stop()}catch{}s.chain.dispose();s.gain.disconnect();});sources=[];playing=false;
  $('#play').textContent='▶';$('#audio-status').textContent='Pronto para gravar';document.body.classList.remove('playing');
  $('#position').innerHTML='01<span>.</span>1<span>.</span>1';renderTracks();refreshLoopUI();
}
$('#play').onclick=()=>playing?stop():play();$('#stop').onclick=stop;$('#all-stop').onclick=stop;$('#all-start').onclick=()=>{if(!playing){play();return;}tracks.forEach(t=>{t.stopped=false;t.pending=null;});updateVolumes();renderTracks();};
let tempoTaps=[];$('#tap-tempo').onclick=()=>{if($('#bpm').disabled){toast('Use Novo loop antes de alterar o tempo.');return;}const now=performance.now();if(tempoTaps.length&&now-tempoTaps.at(-1)>2000)tempoTaps=[];tempoTaps.push(now);tempoTaps=tempoTaps.slice(-5);if(tempoTaps.length>=2){const bpm=Math.round(60000*(tempoTaps.length-1)/(tempoTaps.at(-1)-tempoTaps[0]));$('#bpm').value=Math.max(40,Math.min(240,bpm));$('#bpm').dispatchEvent(new Event('change'));}};
$('#master').oninput=()=>{$('#master-value').textContent=$('#master').value+'%';applyEffects()};
$('#bpm').onchange=()=>{$('#bpm').value=Math.min(240,Math.max(40,+$('#bpm').value||92));loopFrames=0;applyEffects();refreshLoopUI()};
$('#bars').onchange=()=>{loopBars=+$('#bars').value;loopFrames=0;refreshLoopUI()};
$('#loop').onclick=()=>toast('Todas as camadas repetem o mesmo ciclo de compassos.');
let metro=false,lastScheduledBeat=-5;
$('#metronome').onclick=()=>{metro=!metro;$('#metronome').classList.toggle('enabled',metro);$('#metronome').setAttribute('aria-pressed',String(metro))};
function clickAt(when,accent){const o=context.createOscillator(),g=context.createGain();o.frequency.value=accent?1400:900;g.gain.setValueAtTime(.08,when);g.gain.exponentialRampToValueAtTime(.001,when+.06);o.connect(g).connect(context.destination);o.start(when);o.stop(when+.07)}
setInterval(()=>{
  refreshRecordingGuide();refreshLatencyControl();refreshOutputMeter();if(!playing)return;
  const now=context.currentTime,beat=(now-started)/beatSeconds(),cycleBeats=loopBars*4;
  const visibleBeat=Math.max(0,beat)%cycleBeats;
  document.querySelectorAll('[data-slot]').forEach(card=>{const slot=+card.dataset.slot,track=tracks.find(t=>t.slot===slot);const active=recording?.slot===slot;card.classList.toggle('capturing',active);const progress=active?Math.max(0,(now-recording.startTime)/loopDuration())*100:track?.buffer&&!track.stopped?((Math.max(0,now-started)*(track.halfSpeed?.5:1))%loopDuration())/loopDuration()*100:0;card.style.setProperty('--loop-progress',`${Math.min(100,progress)}%`);card.querySelector('.slot-state').textContent=active?(now<recording.startTime?'Prepare-se':'Gravando'):track?.buffer?(track.pending?'Na virada':track.stopped?'Parada':'Em loop'):'Pronta';});
  $('#position').innerHTML=`${String(Math.floor(visibleBeat/4)+1).padStart(2,'0')}<span>.</span>${Math.floor(visibleBeat)%4+1}<span>.</span>${Math.floor(visibleBeat%1*4)+1}`;
  document.querySelectorAll('.playhead').forEach(p=>{const track=tracks[+p.closest('[data-track]').dataset.track];p.style.left=(((Math.max(0,now-started)*(track.halfSpeed?.5:1))%loopDuration())/loopDuration()*100)+'%';p.style.opacity=track.stopped?'0':'1';});
  // Schedule clicks ahead on the audio clock. Count-in clicks are always audible.
  const first=Math.max(-4,Math.ceil((now-started)/beatSeconds()));
  const last=Math.floor((now+.15-started)/beatSeconds());
  for(let i=Math.max(first,lastScheduledBeat+1);i<=last;i++){
    const when=started+i*beatSeconds();
    if(when>=now&&(metro||(recording&&when<recording.startTime)))clickAt(when,i%4===0);
    if(when>=now&&i>=0)scheduleRhythm(context,master,when,i,$('#rhythm').value,+$('#rhythm-volume').value/100,beatSeconds());
    lastScheduledBeat=i;
  }
  for(const track of tracks){if(track.pending&&now>=track.pending.when){track.stopped=track.pending.stopped;track.pending=null;renderTracks();}}
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
function addAudioTrack(buffer,name,type='LOOP',slot=nextEmptySlot()){
  if(!slot){toast('As cinco pistas estão ocupadas. Use Overdub ou limpe uma pista.');return;}

  const empty=tracks.findIndex(t=>t.slot===slot),track={name,type,color:['#aca3dd','#99bcae','#e4b587','#b3c0cc'][tracks.length%4],volume:75,pan:0,mute:false,solo:false,buffer:null,slot,stopped:false,reverse:false,halfSpeed:false,effects:freshEffects()};commitBuffer(track,buffer);
  if(empty>=0){Object.assign(tracks[empty],track);selected=empty;}else{tracks.push(track);selected=tracks.length-1;}
  renderTracks();renderEffects();refreshLoopUI();if(playing)scheduleTrack(tracks[selected]);
}
async function importFiles(files){
  if(recording||microphoneBusy){toast('Finalize a gravação antes de importar áudio.');return;}
  initAudio();await context.resume();
  for(const file of files){try{const buffer=await context.decodeAudioData(await file.arrayBuffer());addAudioTrack(fitToLoop(buffer),file.name.replace(/\.[^.]+$/,''),'IMPORTADO');toast('Áudio alinhado ao loop. Sons curtos recebem silêncio; sons longos são cortados.')}catch{toast('Não foi possível ler o áudio. Tente WAV ou MP3.')}}
}
$('#import').onclick=()=>$('#file').click();$('#file').onchange=e=>importFiles(e.target.files);$('.canvas').ondragover=e=>{e.preventDefault();$('.canvas').classList.add('dragging')};$('.canvas').ondragleave=()=>$('.canvas').classList.remove('dragging');$('.canvas').ondrop=e=>{e.preventDefault();$('.canvas').classList.remove('dragging');importFiles(e.dataTransfer.files)};
$('#new-loop').onclick=()=>{if(tracks.some(t=>t.buffer)&&!confirm('Apagar as camadas e começar um novo loop? Exporte antes para guardar o áudio.'))return;stop();tracks.length=0;sessionId=crypto.randomUUID();loopFrames=0;takeNumber=0;renderTracks();renderEffects();refreshLoopUI();toast('Novo loop. Escolha BPM e compassos antes de gravar.');};
$('#add').onclick=()=>$('#record').click();
async function handleRecord(target=null){
  if(microphoneBusy)return;
  if(recording){
    if(target&&target.slot!==recording.slot){toast('Finalize ou cancele a pista atual antes de gravar outra.');return;}
    if(context.currentTime<recording.startTime){releaseCapture();$('#audio-status').textContent='Loop tocando';toast('Gravação cancelada.');return;}
    if(recording.finishing)return;
    const barFrames=Math.round(4*beatSeconds()*context.sampleRate);
    const elapsed=Math.ceil(context.currentTime*context.sampleRate)-recording.startFrame;
    const end=recording.startFrame+Math.ceil((elapsed+128)/barFrames)*barFrames;
    const endFrame=Math.min(end,recording.startFrame+loopFrames);recording.endTime=endFrame/context.sampleRate;
    recording.node.port.postMessage({type:'finish',end:endFrame});
    recording.finishing=true;refreshRecordingGuide();return;
  }
  const slot=target?.slot||nextEmptySlot();if(!slot){toast('Cinco pistas preenchidas. Toque em Overdub para gravar sobre uma delas.');return;}
  const overdub=target?.track?.buffer?target.track:null;if(overdub&&(overdub.reverse||overdub.halfSpeed)){toast('Desligue Reverse e ½ speed antes de fazer overdub nesta pista.');return;}
  microphoneBusy=true;refreshRecordingGuide();$('#capture-mode').disabled=true;$('#import').disabled=true;let mic;const epoch=recordingEpoch;
  try{
    initAudio();await context.resume();
    if(!context.audioWorklet)throw new Error('AudioWorklet unavailable');
    if(!workletLoaded){await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}loop-recorder.js`);workletLoaded=true;}
    if(epoch!==recordingEpoch)return;
    const captureMode=$('#capture-mode').value;
    mic=await navigator.mediaDevices.getUserMedia(microphoneConstraints(captureMode));
    if(captureMode==='speakers'&&mic.getAudioTracks()[0]?.getSettings().echoCancellation!==true){$('#capture-note').textContent='Este navegador não confirmou cancelamento de eco. Use fones para evitar regravar as camadas anteriores.';}
    if(epoch!==recordingEpoch){mic.getTracks().forEach(t=>t.stop());return;}
    if(!tracks.some(t=>t.buffer)&&playing)stop();
    if(!playing)await play(true);
    const duration=loopDuration(),now=context.currentTime;
    const startTime=now<started?started:started+Math.ceil((now+.6-started)/duration)*duration;
    const startFrame=Math.round(startTime*context.sampleRate);
    const latencyMs=$('#latency-mode').value==='auto'?estimatedLatencyMs(context,mic.getAudioTracks()[0]?.getSettings(),inputEffects[5].on):+$('#latency-ms').value;$('#latency-ms').value=latencyMs;
    const capture=shiftedCapture(startFrame,startFrame+loopFrames,latencyMs,context.sampleRate);
    const node=new AudioWorkletNode(context,'loop-recorder'),input=context.createMediaStreamSource(mic),silent=context.createGain();silent.gain.value=0;
    const microphoneGain=context.createGain();microphoneGain.gain.value=+$('#input-gain').value/100;const inputChain=createEffectChain(context,inputEffects,+$('#bpm').value);input.connect(microphoneGain).connect(inputChain.input);inputChain.output.connect(node).connect(silent).connect(context.destination);
    const take={node,input,microphoneGain,inputChain,silent,stream:mic,slot,overdub,startTime:startFrame/context.sampleRate,startFrame,captureOffset:capture.offset,endTime:(startFrame+loopFrames)/context.sampleRate,layer:slot,finishing:false};recording=take;renderTracks();refreshRecordingGuide();$('#recording-guide').scrollIntoView({behavior:'smooth',block:'center'});
    node.port.onmessage=({data})=>{
      if(data.type!=='complete'||recording!==take)return;
      const buffer=context.createBuffer(2,loopFrames,context.sampleRate);
      buffer.copyToChannel(shiftSamples(data.left,take.captureOffset),0);buffer.copyToChannel(shiftSamples(data.right,take.captureOffset),1);
      releaseCapture();if(take.overdub){const merged=context.createBuffer(2,loopFrames,context.sampleRate);for(let c=0;c<2;c++)merged.copyToChannel(mixSamples(take.overdub.buffer.getChannelData(c),buffer.getChannelData(c)),c);commitBuffer(take.overdub,merged);replaceTrackAudio(take.overdub);selected=tracks.indexOf(take.overdub);renderTracks();renderEffects();}else addAudioTrack(buffer,`Pista ${slot}`,'MICROFONE',slot);
      $('#audio-status').textContent='Loop tocando · grave outra camada';
    };
    node.port.postMessage({type:'arm',start:capture.start,end:capture.end});
    $('#record').classList.add('armed');$('#record').title='Encerrar gravação no próximo compasso';

  }catch(e){mic?.getTracks().forEach(t=>t.stop());releaseCapture();toast(e.name==='NotAllowedError'?'Permita o microfone no navegador para gravar.':'Microfone indisponível. Use HTTPS e um navegador atualizado.');}
  finally{microphoneBusy=false;if(!recording){$('#capture-mode').disabled=false;$('#import').disabled=false;}refreshRecordingGuide();}
}
$('#record').onclick=()=>handleRecord();
$('#reset').onclick=()=>{if(fxScope==='input')inputEffects=freshEffects();else if(tracks[selected])tracks[selected].effects=freshEffects();else return;renderEffects();applyEffects();toast(fxScope==='input'?'Efeitos de entrada desativados. O áudio já gravado permanece igual.':'Efeitos desta pista desativados.');};
async function save(){
  if(recording||microphoneBusy){toast('Finalize a gravação antes de salvar a sessão.');return;}
  try{
    const session={id:sessionId,name:$('h1').innerText.replace('↗','').trim(),updatedAt:Date.now(),bpm:+$('#bpm').value,loopBars,inputEffects:inputEffects.map(e=>({...e})),rhythm:$('#rhythm').value,inputGain:+$('#input-gain').value,tracks:tracks.map(({buffer,undoBuffer,redoBuffer,reversedBuffer,pending,...t})=>({...t,undoAvailable:false,redoAvailable:false,audio:buffer?{sampleRate:buffer.sampleRate,channels:Array.from({length:buffer.numberOfChannels},(_,c)=>buffer.getChannelData(c).slice())}:null}))};
    await saveAudioSession(session);$('#save-status').textContent='Áudio e ajustes salvos';toast('Sessão salva neste dispositivo, incluindo o áudio.');
  }catch{toast('Não foi possível salvar. Verifique o espaço disponível ou exporte WAV.');}
}$('#save').onclick=save;$('#sessions-open').onclick=showSessions;
async function showSessions(){
  try{const sessions=await listAudioSessions();modal(`<div class="eyebrow">MEMÓRIAS DO SEU ESTÚDIO</div><h2>Suas sessões</h2><p>Áudio e ajustes ficam neste navegador e dispositivo. Exporte WAV para manter uma cópia fora dele.</p><div class="session-list">${sessions.map(session=>`<button data-session="${session.id}"><strong>${escapeHtml(session.name)}</strong><small>${session.layers} pistas · ${new Date(session.updatedAt).toLocaleDateString('pt-BR')}</small><span>Abrir ↗</span></button>`).join('')||'<p>Nenhuma sessão salva ainda. Use Salvar sessão para guardar seu áudio.</p>'}</div>`);
    document.querySelectorAll('[data-session]').forEach(button=>button.onclick=async()=>{
      if(tracks.some(t=>t.buffer)&&!confirm('Abrir esta sessão substitui o loop atual. Salve antes para guardar suas alterações.'))return;
      try{const session=await loadAudioSession(button.dataset.session);if(!session)throw new Error('Missing session');stop();initAudio();sessionId=session.id;$('h1').textContent=session.name;$('#bpm').value=session.bpm;loopBars=session.loopBars;$('#bars').value=loopBars;loopFrames=Math.round(loopBars*4*beatSeconds()*context.sampleRate);inputEffects=session.inputEffects||freshEffects();$('#rhythm').value=session.rhythm||'off';$('#input-gain').value=session.inputGain??100;$('#input-gain-value').textContent=$('#input-gain').value+'%';tracks.length=0;
        for(const saved of session.tracks){const {audio,...track}=saved;track.buffer=null;if(audio){track.buffer=context.createBuffer(audio.channels.length,audio.channels[0].length,audio.sampleRate);audio.channels.forEach((data,c)=>track.buffer.copyToChannel(data,c));if(track.buffer.sampleRate!==context.sampleRate||track.buffer.length!==loopFrames){const resampler=new OfflineAudioContext(2,loopFrames,context.sampleRate),source=resampler.createBufferSource();source.buffer=track.buffer;source.connect(resampler.destination);source.start();track.buffer=await resampler.startRendering();}}tracks.push(track);}selected=0;renderTracks();renderEffects();refreshLoopUI();$('#dialog').close();toast('Sessão restaurada com áudio. Pressione tocar para começar.');
      }catch{toast('Não foi possível abrir esta sessão.');}
    });
  }catch{toast('O armazenamento de sessões não está disponível neste navegador.');}
}

function modal(html){$('#dialog-content').innerHTML=html;$('#dialog').showModal()}$('#close-dialog').onclick=()=>$('#dialog').close();$('#dialog').onclick=e=>{if(e.target===$('#dialog'))$('#dialog').close()};document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{if(b.dataset.nav==='studio')return;if(b.dataset.nav==='sessions'){showSessions()}else{modal('<div class="eyebrow">SONS PARA EXPLORAR</div><h2>Sound library</h2><p>Comece com o seu microfone ou adicione quatro instrumentos de demonstração.</p><button class="dark" id="load-demo">Adicionar demonstração</button>');$('#load-demo').onclick=()=>{if(recording||microphoneBusy){toast('Finalize a gravação primeiro.');return;}initAudio();["Warm keys","Pocket drums","Soft bass","Texture"].forEach((name,i)=>addAudioTrack(fitToLoop(demo(i)),name,'DEMO'));$('#dialog').close()}}});$('#settings').onclick=()=>modal(`<div class="eyebrow">STUDIO SETTINGS</div><h2>Your creative space.</h2><p>Audio engine: Web Audio · Stereo</p><p>Sample rate: ${context?.sampleRate||'Browser default'} Hz</p><p>Microphone capture requires browser permission and a secure connection. Fones evitam que as camadas reproduzidas entrem fisicamente no microfone. O modo alto-falantes solicita cancelamento de eco ao navegador; ele pode alterar o timbre e não garante isolamento total.</p><p>Escolha BPM e 1, 2, 4 ou 8 compassos antes de criar camadas. Gravar inicia após uma contagem e captura um ciclo completo. Cada nova camada começa no início do próximo ciclo. Encerrar manualmente fecha no próximo compasso e preenche o restante com silêncio. Use Stop para cancelar uma gravação. BPM e duração ficam bloqueados enquanto houver áudio. Importações são cortadas ou preenchidas para caber no ciclo, sem alterar a velocidade. Cada faixa tem sua própria cadeia de efeitos. A exportação WAV inclui os efeitos, volume, mute e solo.</p>`);$('#more').onclick=()=>modal('<h2>About this session</h2><p>Rename your session by clicking its title. Choose a layer to select it, use M to mute and S to solo. Import audio or record a new take to build your sound.</p>');$('#headphones').onclick=()=>{if(recording||microphoneBusy){toast('Finalize a gravação antes de trocar o modo de escuta.');return;}$('#capture-mode').value='headphones';$('#capture-mode').dispatchEvent(new Event('change'));$('#capture-mode').focus();toast('Modo fones selecionado. Conecte seus fones antes de gravar.');};
$('#export').onclick=async()=>{try{initAudio();if(!tracks.some(t=>t.buffer)){toast('Grave ou importe um som antes de exportar.');return;}toast('Rendering your stereo mix…');const length=loopDuration()*(tracks.some(t=>t.halfSpeed&&t.buffer&&!t.mute&&!t.stopped)?2:1),rate=context.sampleRate,offline=new OfflineAudioContext(2,Math.ceil(length*rate),rate);tracks.forEach(t=>{if(!t.buffer||t.mute||t.stopped||(tracks.some(x=>x.solo)&&!t.solo))return;const s=offline.createBufferSource(),g=offline.createGain();s.buffer=playbackBuffer(t);s.playbackRate.value=t.halfSpeed?.5:1;s.loop=true;g.gain.value=t.volume/100*+$('#master').value/100;const chain=createEffectChain(offline,t.effects,+$('#bpm').value);s.connect(chain.input);chain.output.connect(g).connect(offline.destination);s.start();s.stop(length)});if($('#rhythm').value!=='off'){const rhythmOut=offline.createGain();rhythmOut.gain.value=+$('#master').value/100;rhythmOut.connect(offline.destination);for(let beat=0;beat<Math.round(length/beatSeconds());beat++)scheduleRhythm(offline,rhythmOut,beat*beatSeconds(),beat,$('#rhythm').value,+$('#rhythm-volume').value/100,beatSeconds());}const b=await offline.startRendering(),data=new ArrayBuffer(44+b.length*4),v=new DataView(data);function str(p,s){for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i))}str(0,'RIFF');v.setUint32(4,36+b.length*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,b.length*4,true);for(let i=0;i<b.length;i++)for(let c=0;c<2;c++){const s=Math.max(-1,Math.min(1,b.getChannelData(c)[i]));v.setInt16(44+(i*2+c)*2,s<0?s*32768:s*32767,true)}const url=URL.createObjectURL(new Blob([data],{type:'audio/wav'})),a=document.createElement('a');a.href=url;a.download='loopee-session.wav';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('WAV estéreo exportado com os efeitos de cada faixa.')}catch{toast('Export failed. Try a shorter audio file.')}};
renderTracks();renderEffects();refreshLoopUI();
