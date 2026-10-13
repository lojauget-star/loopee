// Capture on the audio render clock, independently of UI timers.
class LoopRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.take = null;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'arm') {
        this.take = { start: data.start, end: data.end, length: data.end - data.start, left: new Float32Array(data.end - data.start), right: new Float32Array(data.end - data.start) };
      } else if (data.type === 'finish' && this.take) {
        this.take.end = Math.min(this.take.end, data.end);
      } else if (data.type === 'cancel') {
        this.take = null;
      }
    };
  }
  process(inputs) {
    const take = this.take;
    if (!take) return true;
    const channels = inputs[0];
    const blockLength = channels[0]?.length || 128;
    for (let i = 0; i < blockLength; i++) {
      const frame = currentFrame + i;
      if (frame >= take.start && frame < take.end) {
        take.left[frame - take.start] = channels[0]?.[i] || 0;
        take.right[frame - take.start] = (channels[1] || channels[0])?.[i] || 0;
      }
    }
    if (currentFrame + blockLength >= take.end) {
      this.take = null;
      this.port.postMessage({ type: 'complete', left: take.left, right: take.right }, [take.left.buffer, take.right.buffer]);
    }
    return true;
  }
}
registerProcessor('loop-recorder', LoopRecorder);
