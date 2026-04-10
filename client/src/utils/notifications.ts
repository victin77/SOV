function getAudioContext() {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextCtor ? new AudioContextCtor() : null;
}

export function playReminderTone() {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(523.25, audioContext.currentTime + 0.55);

  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.6);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.62);
}

export function playWhatsAppTone() {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  const t = audioContext.currentTime;

  // First note — short pop
  const osc1 = audioContext.createOscillator();
  const gain1 = audioContext.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(660, t);
  gain1.gain.setValueAtTime(0.0001, t);
  gain1.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
  gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  osc1.connect(gain1);
  gain1.connect(audioContext.destination);
  osc1.start(t);
  osc1.stop(t + 0.15);

  // Second note — higher pop
  const osc2 = audioContext.createOscillator();
  const gain2 = audioContext.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, t + 0.12);
  gain2.gain.setValueAtTime(0.0001, t + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.2, t + 0.135);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  osc2.connect(gain2);
  gain2.connect(audioContext.destination);
  osc2.start(t + 0.12);
  osc2.stop(t + 0.32);
}

export function getReminderStorageKey(appointmentId: string) {
  return `crm_appointment_reminder_${appointmentId}`;
}
