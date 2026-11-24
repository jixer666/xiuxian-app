// Original synthesized UI chime; no audio files are taken from the reference.
export function playChime(): void {
  // #ifdef H5
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(660, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.08)
    gain.gain.setValueAtTime(0.03, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.2)
    oscillator.onended = () => {
      void context.close()
    }
  }
  catch {
    // Autoplay restrictions must not interrupt an economy action.
  }
  // #endif
}
