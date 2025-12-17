// Web Audio API Context Singleton
let audioCtx: AudioContext | null = null;
let musicScheduler: number | null = null;
let nextNoteTime = 0;
let scoreIndex = 0;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// --- Wind Chime Effect (Crisp, High-Pitched, Metallic) ---
export const playBellSound = () => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    // Fundamental frequencies for a "crystal/glass" chime feel
    // Using high frequencies with slight dissonance
    const freqs = [2000, 2600, 3200, 4100]; 

    freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        // Add slight randomization to simulate natural variation
        osc.frequency.setValueAtTime(f + (Math.random() * 50 - 25), t);
        
        // Envelope: Very fast attack, long exponential decay
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1 - (i * 0.015), t + 0.01); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5 + (Math.random()));

        // Stereo Pan (Randomized)
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.random() * 2 - 1;

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 4);
    });

  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

// --- Christmas Music Sequencer (Simple Jingle Bells) ---

// Frequencies for the melody
const NOTES: Record<string, number> = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
};

// [Note, Duration (beats)]
// E E E - | E E E - | E G C D | E - - -
type NoteEvent = [string | null, number];
const JINGLE_BELLS: NoteEvent[] = [
    ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', 0.5],
    ['E5', 4],
    ['F5', 1], ['F5', 1], ['F5', 1.5], ['F5', 0.5],
    ['F5', 1], ['E5', 1], ['E5', 1], ['E5', 1],
    ['E5', 1], ['D5', 1], ['D5', 1], ['E5', 1],
    ['D5', 2], ['G5', 2]
];

const TEMPO = 140;
const SECONDS_PER_BEAT = 60 / TEMPO;
const LOOKAHEAD = 0.1; // Seconds
const SCHEDULE_AHEAD_TIME = 0.1; // Seconds

function scheduleNote(note: string | null, duration: number, time: number) {
    if (!audioCtx) return;
    if (!note) return; // Rest

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle'; // Softer, flute-like/bell-like tone
    osc.frequency.value = NOTES[note] || 440;

    // Envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
    gain.gain.linearRampToValueAtTime(0.1, time + duration * SECONDS_PER_BEAT * 0.8);
    gain.gain.linearRampToValueAtTime(0, time + duration * SECONDS_PER_BEAT);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + duration * SECONDS_PER_BEAT);
}

function scheduler() {
    if (!audioCtx) return;
    
    // While there are notes that will need to play before the next interval, schedule them
    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
        const [note, duration] = JINGLE_BELLS[scoreIndex];
        scheduleNote(note, duration, nextNoteTime);

        // Advance time and index
        nextNoteTime += duration * SECONDS_PER_BEAT;
        scoreIndex++;
        if (scoreIndex >= JINGLE_BELLS.length) {
            scoreIndex = 0; // Loop
        }
    }
    musicScheduler = window.setTimeout(scheduler, LOOKAHEAD * 1000);
}

export const toggleChristmasMusic = (shouldPlay: boolean) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (shouldPlay) {
        if (musicScheduler === null) {
            nextNoteTime = ctx.currentTime + 0.1;
            scoreIndex = 0;
            scheduler();
        }
    } else {
        if (musicScheduler !== null) {
            clearTimeout(musicScheduler);
            musicScheduler = null;
        }
    }
};
