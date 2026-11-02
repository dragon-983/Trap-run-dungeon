/** Tiny synthesized sound engine. No audio files, no dependencies. */

export type Sfx =
  | 'move'
  | 'bump'
  | 'locked'
  | 'key'
  | 'door'
  | 'lever'
  | 'near'
  | 'hit'
  | 'win'
  | 'lose'
  | 'tick'
  | 'go'
  | 'place'
  | 'erase'
  | 'error'
  | 'click'
  | 'levelup'

let ctx: AudioContext | null = null
let enabled = true
let volume = 0.6

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number): void {
  const c = context()
  if (!c) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  const peak = Math.max(0.0002, gain * volume)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise(dur: number, gain: number, delay = 0): void {
  const c = context()
  if (!c) return
  const t0 = c.currentTime + delay
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.value = gain * volume
  src.connect(g).connect(c.destination)
  src.start(t0)
}

const BANK: Record<Sfx, () => void> = {
  move: () => tone(220, 0.07, 'square', 0.07, 0, 330),
  bump: () => tone(110, 0.08, 'triangle', 0.12),
  locked: () => {
    tone(160, 0.09, 'square', 0.09)
    tone(130, 0.12, 'square', 0.09, 0.08)
  },
  key: () => {
    tone(660, 0.1, 'square', 0.1)
    tone(990, 0.16, 'square', 0.1, 0.07)
  },
  door: () => {
    noise(0.18, 0.12)
    tone(300, 0.22, 'sawtooth', 0.08, 0, 600)
  },
  lever: () => {
    tone(180, 0.08, 'square', 0.12)
    tone(420, 0.2, 'triangle', 0.12, 0.07, 840)
  },
  near: () => tone(900, 0.12, 'sine', 0.1, 0, 1500),
  hit: () => {
    noise(0.3, 0.25)
    tone(180, 0.35, 'sawtooth', 0.18, 0, 40)
  },
  win: () => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.11, i * 0.09))
    tone(1318, 0.5, 'triangle', 0.12, 0.4)
  },
  lose: () => {
    ;[392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.1, i * 0.14))
  },
  tick: () => tone(440, 0.09, 'square', 0.09),
  go: () => {
    tone(880, 0.25, 'square', 0.12)
    tone(1320, 0.3, 'triangle', 0.1, 0.05)
  },
  place: () => tone(520, 0.05, 'square', 0.06, 0, 680),
  erase: () => tone(300, 0.06, 'triangle', 0.07, 0, 180),
  error: () => tone(140, 0.2, 'sawtooth', 0.1),
  click: () => tone(600, 0.04, 'square', 0.05),
  levelup: () => {
    ;[392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, i * 0.07))
  },
}

export const sfx = {
  configure(opts: { enabled: boolean; volume: number }): void {
    enabled = opts.enabled
    volume = Math.min(1, Math.max(0, opts.volume))
  },
  play(name: Sfx): void {
    if (!enabled || volume <= 0) return
    try {
      BANK[name]()
    } catch {
      /* audio is best-effort */
    }
  },
}
