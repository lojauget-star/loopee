// A single presentation state derived from the scheduled audio take.
// The interface never controls timing; the audio clock remains authoritative.
export function recordingView({ busy, take, now, beatDuration, loopDuration, playing, layers }) {
  if (take) {
    const end = take.endTime;
    if (now < take.startTime) {
      const beats = Math.max(1, Math.ceil((take.startTime - now) / beatDuration));
      return { phase: 'waiting', title: 'Prepare-se para entrar', action: 'Cancelar entrada',
        detail: `${beats} ${beats === 1 ? 'tempo' : 'tempos'} até começar · a base continua tocando`,
        counter: String(beats), unit: 'TEMPOS PARA ENTRAR', progress: 0, beat: beats % 4, step: 1 };
    }
    if(now>=end)return {phase:'finishing',title:'Alinhando áudio ao loop',action:'Alinhando…',detail:'A captura recebe o final do som e compensa o atraso do dispositivo.',counter:'0.0',unit:'FECHANDO O TAKE',progress:1,beat:-1,step:2};
    const remaining = Math.max(0, end - now);
    return { phase: take.finishing ? 'finishing' : 'recording',
      title: take.finishing ? 'Fechando no próximo compasso' : 'Gravando — toque agora',
      action: take.finishing ? 'Finalizando…' : 'Concluir no próximo compasso',
      detail: `Camada ${take.layer} · ${remaining.toFixed(1)} s para entrar em loop automaticamente`,
      counter: remaining.toFixed(1), unit: 'SEGUNDOS RESTANTES',
      progress: Math.min(1, Math.max(0, (now - take.startTime) / loopDuration)),
      beat: Math.floor((now - take.startTime) / beatDuration) % 4, step: 2 };
  }
  if (busy) return { phase: 'requesting', title: 'Preparando o microfone', action: 'Preparando…', detail: 'Permita o acesso ao microfone quando o navegador pedir.', counter: '…', unit: 'MICROFONE', progress: 0, beat: -1, step: 1 };
  return { phase: playing ? 'looping' : 'idle', title: playing ? (layers ? 'Suas camadas estão em loop' : 'Loop pronto para receber seu som') : 'Pronto para criar',
    action: layers ? '＋ Gravar nova camada' : '● Gravar primeira camada',
    detail: layers ? 'Um toque prepara a próxima camada. Ela começa na virada do loop, junto com a base.' : 'Escolha BPM e compassos. Um toque inicia a contagem de 4 tempos; depois, é só tocar.',
    counter: layers ? String(layers) : '4', unit: layers ? 'CAMADAS CRIADAS' : 'TEMPOS DE PREPARAÇÃO', progress: 0, beat: -1, step: playing && layers ? 3 : 0 };
}
