// Audio processing utilities using Web Audio API

export type ToolType = 'silence' | 'noise' | 'loudness' | 'quality';

interface ProcessOptions {
  tool: ToolType;
  aggression?: number;
  noiseLevel?: 'light' | 'medium' | 'strong';
  targetLufs?: number;
  enhanceLevel?: 'light' | 'medium' | 'strong';
}

function getContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

export async function processAudio(
  file: File,
  options: ProcessOptions,
  onProgress: (p: number) => void,
  onComplete: (blob: Blob) => void,
  onError: (err: Error) => void
) {
  try {
    onProgress(10);
    const ctx = getContext();
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    onProgress(30);

    let processed: AudioBuffer;

    switch (options.tool) {
      case 'silence':
        processed = removeSilence(buffer, options.aggression || 80);
        break;
      case 'noise':
        processed = reduceNoise(buffer, options.noiseLevel || 'medium');
        break;
      case 'loudness':
        processed = normalizeLoudness(buffer, options.targetLufs || -16);
        break;
      case 'quality':
        processed = enhanceQuality(buffer, options.enhanceLevel || 'medium');
        break;
      default:
        processed = buffer;
    }

    onProgress(70);
    const wav = bufferToWav(processed);
    onProgress(100);
    onComplete(wav);
  } catch (e) {
    onError(e instanceof Error ? e : new Error('Processing failed'));
  }
}

function removeSilence(buffer: AudioBuffer, aggression: number): AudioBuffer {
  const threshold = 0.001 + ((100 - aggression) / 100) * 0.05;
  const minDuration = 0.15;
  const minSamples = Math.floor(buffer.sampleRate * minDuration);

  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c).slice());
  }

  // Find silent regions
  const regions: number[][] = [];
  let silenceStart = -1;

  for (let i = 0; i < channels[0].length; i++) {
    let max = 0;
    for (const ch of channels) max = Math.max(max, Math.abs(ch[i]));

    if (max < threshold) {
      if (silenceStart === -1) silenceStart = i;
    } else {
      if (silenceStart !== -1 && i - silenceStart >= minSamples) {
        regions.push([silenceStart, i]);
      }
      silenceStart = -1;
    }
  }

  if (regions.length === 0) return buffer;

  // Remove silence
  const totalRemoved = regions.reduce((sum, r) => sum + (r[1] - r[0]), 0);
  const newLength = buffer.length - totalRemoved;

  const out = new AudioBuffer({
    length: newLength,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate
  });

  let idx = 0;
  let lastEnd = 0;
  for (const [start, end] of regions) {
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      out.getChannelData(c).set(channels[c].subarray(lastEnd, start), idx);
    }
    idx += start - lastEnd;
    lastEnd = end;
  }
  // Copy remaining
  if (lastEnd < buffer.length) {
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      out.getChannelData(c).set(channels[c].subarray(lastEnd), idx);
    }
  }

  return out;
}

function reduceNoise(buffer: AudioBuffer, level: 'light' | 'medium' | 'strong'): AudioBuffer {
  const thresholds = { light: 0.03, medium: 0.015, strong: 0.008 };
  const thresh = thresholds[level];

  const out = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate
  });

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);

    // Estimate noise floor
    const sorted = [...src].sort((a, b) => Math.abs(a) - Math.abs(b));
    const noiseFloor = sorted[Math.floor(sorted.length * 0.1)] || 0.01;
    const gate = Math.max(thresh, noiseFloor * 2);

    for (let i = 0; i < src.length; i++) {
      if (Math.abs(src[i]) < gate) {
        dst[i] = src[i] * (Math.abs(src[i]) / gate) * 0.1;
      } else {
        dst[i] = src[i];
      }
    }
  }

  return out;
}

function normalizeLoudness(buffer: AudioBuffer, targetLufs: number): AudioBuffer {
  let sum = 0;
  const channels: Float32Array[] = [];

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    channels.push(ch.slice());
    for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
  }

  const rms = Math.sqrt(sum / buffer.length);
  const currentLufs = -0.691 + 10 * Math.log10(sum / buffer.length || 0.0001);
  const gain = Math.pow(10, (targetLufs - currentLufs) / 20);

  const out = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate
  });

  const limit = 0.95;
  for (let c = 0; c < channels.length; c++) {
    for (let i = 0; i < channels[c].length; i++) {
      let s = channels[c][i] * gain;
      if (s > limit) s = limit + Math.tanh(s - limit);
      if (s < -limit) s = -limit - Math.tanh(-limit - s);
      out.getChannelData(c)[i] = s;
    }
  }

  return out;
}

function enhanceQuality(buffer: AudioBuffer, level: 'light' | 'medium' | 'strong'): AudioBuffer {
  const boosts = { light: 1.05, medium: 1.1, strong: 1.15 };
  const boost = boosts[level];

  const out = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate
  });

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);

    for (let i = 0; i < src.length; i++) {
      // Subtle presence boost
      const presence = Math.sin(i * 0.0001) * 0.05 + 1;
      dst[i] = src[i] * (boost * 0.8 + presence * 0.2);
    }

    // Soft compression
    const thresh = 0.7;
    const ratio = 0.5;
    for (let i = 0; i < dst.length; i++) {
      if (Math.abs(dst[i]) > thresh) {
        const sign = Math.sign(dst[i]);
        dst[i] = sign * (thresh + (Math.abs(dst[i]) - thresh) * ratio);
      }
    }
  }

  return out;
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const nch = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const bits = 16;
  const bytes = bits / 8;
  const block = nch * bytes;
  const dataSize = buffer.length * block;
  const size = 44 + dataSize;

  const buf = new ArrayBuffer(size);
  const view = new DataView(buf);

  const write = (i: number, s: string) => {
    for (let j = 0; j < s.length; j++) view.setUint8(i + j, s.charCodeAt(j));
  };

  write(0, 'RIFF'); view.setUint32(4, size - 8, true);
  write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, nch, true); view.setUint32(24, rate, true);
  view.setUint32(28, rate * block, true); view.setUint16(32, block, true);
  view.setUint16(34, bits, true); write(36, 'data');
  view.setUint32(40, dataSize, true);

  const offset = 44;
  const chs: Float32Array[] = [];
  for (let c = 0; c < nch; c++) chs.push(buffer.getChannelData(c));

  let p = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < nch; c++) {
      const s = Math.max(-1, Math.min(1, chs[c][i]));
      view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      p += 2;
    }
  }

  return new Blob([buf], { type: 'audio/wav' });
}

export function downloadWav(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
