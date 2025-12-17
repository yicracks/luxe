// Web Audio API Context Singleton
let audioCtx: AudioContext | null = null;
let musicScheduler: number | null = null;
let castleMusicScheduler: number | null = null;
let nextNoteTime = 0;
let scoreIndex = 0;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// --- Engine Rev Sound ---
export const playEngineSound = () => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    // Create a complex textured sound for engine
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    // Rev up curve
    osc1.frequency.setValueAtTime(50, t);
    osc1.frequency.exponentialRampToValueAtTime(300, t + 0.3); // Vroom
    osc1.frequency.exponentialRampToValueAtTime(80, t + 1.5);  // Idle down

    osc2.frequency.setValueAtTime(52, t);
    osc2.frequency.exponentialRampToValueAtTime(305, t + 0.3);
    osc2.frequency.exponentialRampToValueAtTime(82, t + 1.5);

    // Filter to muffly the harsh sawtooth
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.linearRampToValueAtTime(2000, t + 0.3);
    filter.frequency.linearRampToValueAtTime(400, t + 1.5);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2);
    osc2.stop(t + 2);

  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

// --- Firework Sound Effect ---
export const playFireworkSound = () => {
    try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;

        // 1. Launch "Whistle" (optional, kept subtle)
        // 2. Explosion (Noise)
        const bufferSize = ctx.sampleRate * 2; // 2 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, t);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 1);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(0.2, t + 0.05); // Attack
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5); // Decay

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        
        noise.start(t);

    } catch(e) {
        console.error(e);
    }
}

// --- Tree Music (Jingle Bells) ---
const NOTES: Record<string, number> = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
};

type NoteEvent = [string | null, number];
const JINGLE_BELLS: NoteEvent[] = [
    ['E5', 1], ['E5', 1], ['E5', 2], ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', 0.5], ['E5', 4],
];

// --- Disney Style Music (Magical / Upbeat) ---
// Arpeggios and bright melody
const DISNEY_THEME: NoteEvent[] = [
    // Intro Arpeggio (Fast)
    ['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.25], 
    ['E5', 0.25], ['G5', 0.25], ['C6', 0.5], [null, 0.5],
    // Melody
    ['G5', 1], ['E5', 0.5], ['F5', 0.5], ['G5', 2],
    ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 2],
    ['E5', 0.5], ['F5', 0.5], ['G5', 1], ['C5', 1], 
    ['A5', 1.5], ['G5', 0.5], ['C6', 2],
];
const DISNEY_NOTES: Record<string, number> = {
    ...NOTES,
    'C6': 1046.50, 'G5': 783.99, 'A5': 880.00, 'F5': 698.46
};

const TEMPO = 140;
const SECONDS_PER_BEAT = 60 / TEMPO;
const LOOKAHEAD = 0.1; 
const SCHEDULE_AHEAD_TIME = 0.1; 

function scheduleNote(note: string | null, duration: number, time: number, type: 'bell' | 'orchestra' = 'bell') {
    if (!audioCtx) return;
    if (!note) return; 

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (type === 'bell') {
        osc.type = 'triangle'; 
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
        gain.gain.linearRampToValueAtTime(0, time + duration * SECONDS_PER_BEAT);
        osc.frequency.value = NOTES[note] || 440;
    } else {
        // Orchestra / Harp-like
        osc.type = 'sine'; // Pure tone
        // Add harmonics for richness
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = (DISNEY_NOTES[note] || 440); // Same octave
        
        const gain2 = audioCtx.createGain();
        gain2.gain.setValueAtTime(0, time);
        gain2.gain.linearRampToValueAtTime(0.05, time + 0.1);
        gain2.gain.linearRampToValueAtTime(0, time + duration * SECONDS_PER_BEAT);

        osc.frequency.value = DISNEY_NOTES[note] || 440;
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.1); // Slower attack
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration * SECONDS_PER_BEAT + 0.5); // Long sustain
        
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(time);
        osc2.stop(time + duration * SECONDS_PER_BEAT + 1);
    }

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + duration * SECONDS_PER_BEAT + 1);
}

// Tree Scheduler
function treeScheduler() {
    if (!audioCtx) return;
    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
        const [note, duration] = JINGLE_BELLS[scoreIndex];
        scheduleNote(note, duration, nextNoteTime, 'bell');
        nextNoteTime += duration * SECONDS_PER_BEAT;
        scoreIndex = (scoreIndex + 1) % JINGLE_BELLS.length;
    }
    musicScheduler = window.setTimeout(treeScheduler, LOOKAHEAD * 1000);
}

// Castle Scheduler
function castleScheduler() {
    if (!audioCtx) return;
    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
        const [note, duration] = DISNEY_THEME[scoreIndex];
        scheduleNote(note, duration, nextNoteTime, 'orchestra');
        nextNoteTime += duration * SECONDS_PER_BEAT;
        scoreIndex = (scoreIndex + 1) % DISNEY_THEME.length;
    }
    castleMusicScheduler = window.setTimeout(castleScheduler, LOOKAHEAD * 1000);
}

export const toggleChristmasMusic = (shouldPlay: boolean) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (shouldPlay) {
        if (musicScheduler === null && castleMusicScheduler === null) {
            nextNoteTime = ctx.currentTime + 0.1;
            scoreIndex = 0;
            treeScheduler();
        }
    } else {
        if (musicScheduler !== null) {
            clearTimeout(musicScheduler);
            musicScheduler = null;
        }
    }
};

export const toggleDisneyMusic = (shouldPlay: boolean) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (shouldPlay) {
        if (castleMusicScheduler === null && musicScheduler === null) {
            nextNoteTime = ctx.currentTime + 0.1;
            scoreIndex = 0;
            castleScheduler();
        }
    } else {
        if (castleMusicScheduler !== null) {
            clearTimeout(castleMusicScheduler);
            castleMusicScheduler = null;
        }
    }
}
// Removed playBellSound, replaced with playEngineSound
export const playBellSound = () => { playEngineSound(); } 
