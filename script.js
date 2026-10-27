/* ETHEREAL WEB VIBE — música procedural original con Tone.js. Sin samples ni canciones copiadas. */
const $ = id => document.getElementById(id);
const PPQ = 192, SWING = 0.18;                        // 4/4 · swing suave

/* ---------- 1. TEORÍA (la receta de "dulce, nostálgico y no agresivo") ----------
   · Acordes Maj7 / m7 / m9 en Fa mayor, uno por compás: colchón cálido sin tensión dura.
   · Melodía: pentatónica de Fa mayor (F G A C D) + Mi (7ª mayor) para el toque nostálgico.
   · Tiempos fuertes = notas del acorde (3ª, 5ª, 7ª, 9ª); tiempos débiles = notas de paso.
   · Saltos pequeños, notas largas y legato. La sección A vuelve (A') con adornos: eso crea "gancho".
   · Forma de ~1 minuto a 80 BPM: Intro · A · B · A' · Puente · Final (20 compases) y vuelve a empezar sin corte. */
const TYPES = { maj7:[0,4,7,11], maj9:[0,4,7,11,14], m7:[0,3,7,10], m9:[0,3,7,10,14], dom7:[0,4,7,10] };
const C = { F7:['Fmaj7',5,'maj7'], F9:['Fmaj9',5,'maj9'], Am:['Am7',9,'m7'], Bb:['Bbmaj7',10,'maj7'], Bb9:['Bbmaj9',10,'maj9'],
            Dm:['Dm9',2,'m9'], Gm:['Gm9',7,'m9'], C7:['C7',0,'dom7'] };
const PA = [[C.F7, C.Am, C.Bb, C.C7], [C.F9, C.Dm, C.Gm, C.C7], [C.F9, C.Dm, C.Bb, C.Am], [C.F7, C.Bb, C.Am, C.Gm]];   // sección A (casa)
const PB = [[C.Bb, C.Am, C.Gm, C.C7], [C.Dm, C.Gm, C.Bb, C.C7], [C.Gm, C.Am, C.Bb, C.C7], [C.Bb9, C.Gm, C.Am, C.Dm]];   // sección B (contraste)
const INTRO = [C.F9, C.F9], BRIDGE = [C.Gm, C.C7], OUTRO = [C.F9, C.Dm, C.Gm, C.F9];
const SECS = [['Intro', 2, .7, .5], ['A', 4, .9, .75], ['B', 4, 1, .95], ["A'", 4, 1, .9], ['Puente', 2, .6, .3], ['Final', 4, .7, .5]]; // nombre, compases, dinámica, densidad del arpegio
const BASS = [[[0,1.5,0],[1.5,1,7],[3,.9,12]], [[0,2.8,0],[3,.9,7]], [[0,1,0],[1.5,.5,12],[2,1.5,7],[3.5,.4,5]]];            // [pulso, duración, intervalo]
const SCALE = [5,7,9,0,2,4];                           // F G A C D + E
const RHYTHMS = [                                      // [inicio, duración] en pulsos, dentro de un compás
  [[0,2],[2,1],[3,1]], [[0,1.5],[1.5,.5],[2,2]], [[0,3],[3,1]], [[0,1],[1,1],[2,2]],
  [[0,2],[2,2]], [[.5,1.5],[2,2]], [[0,1],[1.5,.5],[2,2]],
];
const pick = (r, a) => a[Math.floor(r() * a.length)];
const wpick = (r, a, w) => { let x = r() * w.reduce((p, c) => p + c, 0); for (let i = 0; i < a.length; i++) if ((x -= w[i]) <= 0) return a[i]; return a[a.length - 1]; };
const mulberry = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mod = (n, m) => ((n % m) + m) % m;
const BARS = SECS.reduce((p, s) => p + s[1], 0), BEATS = BARS * 4;

/* ---------- 2. COMPOSITOR: devuelve la canción como lista de eventos (en pulsos) ---------- */
function compose(bpm) {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0], r = mulberry(seed), ev = [];
  const pa = pick(r, PA), pb = pick(r, PB);
  const bar = [...INTRO, ...pa, ...pb, ...pa, ...BRIDGE, ...OUTRO].map(([name, pc, type]) => ({ name, pc, type, pcs:TYPES[type].map(i => (pc + i) % 12) }));
  const sec = []; let st = 0; SECS.forEach(([n, bars, gain, dens]) => { sec.push({ n, bars, gain, dens, start:st }); st += bars; });
  const secAt = b => sec.find(s => b >= s.start && b < s.start + s.bars);
  const add = (i, t, d, m, v) => ev.push({ i, t, d, m, v:Math.min(1, v * secAt(Math.floor(t / 4)).gain) });   // la dinámica de cada sección escala la velocidad
  const sw = t => t % 1 === .5 ? t + SWING * .5 : t;     // swing: la corchea de contratiempo llega un poquito tarde

  // PAD: 3ª-5ª-7ª-9ª sostenidas (une compases con el mismo acorde); la tónica la pone el bajo
  for (let b = 0; b < BARS;) {
    let n = 1; while (b + n < BARS && bar[b + n].name === bar[b].name) n++;
    const c = bar[b], root = 48 + mod(c.pc - 48, 12);
    add('pad', b * 4, n * 4 - .3, TYPES[c.type].slice(1).map(x => root + x), .5); b += n;
  }
  const bpat = sec.map(() => pick(r, BASS));
  for (let b = 0; b < BARS; b++) {
    const c = bar[b], s = secAt(b), si = sec.indexOf(s), last = b === s.start + s.bars - 1;
    if (b >= 2) {                                      // BAJO: patrón suave por sección, sin ataque duro
      const br = 36 + mod(c.pc - 36, 12), pat = ['Puente', 'Final'].includes(s.n) ? BASS[1] : bpat[si];
      pat.forEach(([o, d, iv]) => add('bass', sw(b * 4 + o), d, br + iv, .6));
    }
    if (b >= 1) {                                      // ARP: sube y baja por el acorde; la densidad cambia por sección
      const base = 60 + mod(c.pc - 60, 12), tones = TYPES[c.type].map(x => base + x), seq = tones.concat(tones.slice(1, -1).reverse());
      for (let k = 0; k < 8; k++) if (r() < s.dens) add('arp', sw(b * 4 + k * .5), .5, seq[k % seq.length], .22 + r() * .12);
    }
    if (['A', 'B', "A'"].includes(s.n)) {              // PERCUSIÓN lofi muy suave: bombo, rim y hi-hat con swing
      const t0 = b * 4;
      add('kick', t0, .4, 0, .7); add('kick', sw(t0 + 2.5), .4, 0, .5); if (r() < .3) add('kick', sw(t0 + 3.5), .4, 0, .4);
      add('snare', t0 + 1, .2, 0, .5); add('snare', t0 + 3, .2, 0, .5);
      for (let k = 0; k < 8; k++) if (r() < .92) add('hat', sw(t0 + k * .5), .06, 0, .22 + (k % 2 ? .1 : 0) + r() * .06);
      if (last) { add('snare', t0 + 3.5, .2, 0, .3); if (s.n !== 'B') add('swell', t0, 4, 0, .6); }   // pequeño fill + oleaje de ruido que anuncia lo que viene
    }
    if (s.n === 'Puente' && last) add('swell', b * 4, 4, 0, .6);
  }

  // LEAD (campana tipo Rhodes). genBar crea un compás: tiempos fuertes = notas del acorde, débiles = notas de paso.
  let prev = 76;
  const pool = (c, strong, lo, hi) => { const pcs = strong ? c.pcs : [...new Set([...SCALE, ...c.pcs])], p = []; for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) p.push(m); return p; };
  const near = (p, t) => p.reduce((a, x) => Math.abs(x - t) < Math.abs(a - t) ? x : a);
  const walk = (p, down) => wpick(r, p, p.map(x => Math.exp(-Math.abs(x - prev) / 2.5) * (Math.abs(x - prev) > 9 ? .15 : 1) * (x === prev ? .4 : 1) * (down && x < prev ? 1.8 : 1))); // prefiere grados conjuntos
  const genBar = (b, slots, lo, hi, src, shifts, down) => slots.map(([o, d], k) => {
    const strong = o === 0 || o === 2, p = pool(bar[b], strong, lo, hi);
    const m = src ? near(p, src[k] + pick(r, shifts)) : walk(p, down);   // con src: eco del motivo adaptado al acorde (así vuelve el "gancho")
    prev = m; add('lead', Math.max(0, sw(b * 4 + o) + (r() - .5) * .02), d + .06, m, strong ? .62 : .5); return m;
  });
  const R0 = pick(r, RHYTHMS), R1 = pick(r, RHYTHMS), R4 = pick(r, RHYTHMS), R5 = pick(r, RHYTHMS);
  const mA = []; [R0, R1, R0, R1].forEach((sl, i) => mA.push(genBar(2 + i, sl, 69, 88, i > 1 ? mA[i - 2] : null, [0, 0, 2, -2, 4], 0)));            // A
  const mB = []; [R4, R5, R4, [[0, 2], [2, 2]]].forEach((sl, i) => mB.push(genBar(6 + i, sl, 72, 91, i === 2 ? mB[0] : null, [0, 2, -2], 0)));      // B: más aguda, termina en "pregunta"
  [R0, R1, R0, [[0, 3], [3, 1]]].forEach((sl, i) => genBar(10 + i, sl, 69, 88, i < 3 ? mA[i] : null, [0, 0, 0, 2, -2], 0));                          // A': A con pequeños adornos
  [[[0, 4]], [[0, 4]]].forEach((sl, j) => genBar(14 + j, sl, 72, 84, null, [0], 0));                                                                // Puente: notas muy largas
  [[[0, 2], [2, 2]], [[0, 3], [3, 1]], [[0, 2], [2, 1], [3, 1]], [[0, 3.5]]].forEach((sl, j) => genBar(16 + j, sl, 69, 86, null, [0], 1));         // Final: baja despacio y resuelve

  // BELL: destellos agudos (contramelodía) que aparecen en B, A' y el final
  [1, 6, 7, 8, 9, 10, 11, 12, 13, 16, 18].forEach(b => { if (r() < .8) add('bell', sw(b * 4 + pick(r, [1.5, 2.5, 3])), 1.5, pick(r, pool(bar[b], true, 84, 96)), .3); });

  return { v:2, seed, bpm, swing:SWING, beats:BEATS, sections:sec.map(({ n, bars, start }) => ({ n, bars, start })), chords:bar.map(c => c.name), events:ev.sort((a, b) => a.t - b.t) };
}

/* ---------- 3. MOTOR DE SONIDO (el mismo grafo sirve para tocar en vivo y para exportar offline) ---------- */
async function buildRig(live, bpm) {
  const limiter = new Tone.Limiter(-1).toDestination();
  const vol = new Tone.Volume(-3).connect(limiter);
  const wobble = new Tone.Vibrato({ frequency:.45, depth:.05 }).connect(vol);       // wow & flutter de cinta
  const tape = new Tone.Filter(7800, 'lowpass').connect(wobble);                    // apaga los agudos como un cassette
  const crush = new Tone.WaveShaper(x => Math.round(x * 1024) / 1024, 4096).connect(tape); // bitcrusher leve
  const reverb = new Tone.Reverb({ decay:8, wet:.4, preDelay:.04 }).connect(crush);
  await reverb.generate();
  const delays = [], echo = (beats, fb, wet) => { const d = new Tone.FeedbackDelay(beats * 60 / bpm, fb); d.wet.value = wet; d.beats = beats; delays.push(d); return d; };

  const pad = new Tone.PolySynth(Tone.FMSynth, {                                    // pad tipo Juno: FM suave + chorus
    harmonicity:1, modulationIndex:1.2, oscillator:{ type:'sawtooth' }, modulation:{ type:'sine' },
    envelope:{ attack:1.4, decay:1.5, sustain:.7, release:3.5 }, modulationEnvelope:{ attack:1, decay:1, sustain:.8, release:3 } });
  pad.volume.value = -18;
  pad.chain(new Tone.Filter(1600, 'lowpass', -24), new Tone.Chorus(3, 3.5, .6).start(), reverb);

  const lead = new Tone.FMSynth({                                                    // Rhodes / campana de cristal
    harmonicity:3, modulationIndex:1.5, oscillator:{ type:'sine' }, modulation:{ type:'sine' },
    envelope:{ attack:.05, decay:.8, sustain:.45, release:2.2 }, modulationEnvelope:{ attack:.01, decay:.6, sustain:.1, release:1 } });
  lead.volume.value = -14;
  lead.chain(new Tone.Vibrato(5, .1), echo(.75, .35, .25), reverb);                  // vibrato suave + eco punteado

  const bell = new Tone.AMSynth({ harmonicity:2.5, oscillator:{ type:'sine' }, modulation:{ type:'sine' },   // destellos agudos
    envelope:{ attack:.01, decay:1.2, sustain:0, release:2.5 }, modulationEnvelope:{ attack:.01, decay:.8, sustain:0, release:1 } });
  bell.volume.value = -24; bell.chain(echo(.75, .5, .4), reverb);

  const arp = new Tone.MonoSynth({
    oscillator:{ type:'triangle' }, filter:{ Q:2, type:'lowpass', rolloff:-12 }, envelope:{ attack:.01, decay:.3, sustain:0, release:.6 },
    filterEnvelope:{ attack:.01, decay:.25, sustain:.1, release:.5, baseFrequency:300, octaves:3 } });
  arp.volume.value = -24;
  arp.chain(new Tone.AutoPanner({ frequency:.15, depth:.6 }).start(), echo(.5, .4, .3), reverb);

  const bass = new Tone.FMSynth({                                                    // sub-bajo suave
    harmonicity:1, modulationIndex:.5, oscillator:{ type:'sine' }, modulation:{ type:'sine' },
    envelope:{ attack:.08, decay:.4, sustain:.8, release:1.2 }, modulationEnvelope:{ attack:.2, decay:.3, sustain:.3, release:.8 } });
  bass.volume.value = -10;
  bass.chain(new Tone.Filter(420, 'lowpass'), crush);

  const kick = new Tone.MembraneSynth({ pitchDecay:.05, octaves:3, envelope:{ attack:.005, decay:.4, sustain:0, release:.3 } });   // percusión lofi, muy baja
  kick.volume.value = -14; kick.chain(new Tone.Filter(200, 'lowpass'), crush);
  const snare = new Tone.NoiseSynth({ noise:{ type:'pink' }, envelope:{ attack:.003, decay:.16, sustain:0, release:.1 } });
  snare.volume.value = -26; snare.chain(new Tone.Filter(2200, 'bandpass'), reverb);
  const hat = new Tone.NoiseSynth({ noise:{ type:'white' }, envelope:{ attack:.002, decay:.045, sustain:0, release:.02 } });
  hat.volume.value = -34; hat.chain(new Tone.Filter(7000, 'highpass'), crush);
  const swell = new Tone.NoiseSynth({ noise:{ type:'pink' }, envelope:{ attack:3, decay:.1, sustain:1, release:1.5 } });       // oleaje entre secciones
  swell.volume.value = -34; swell.chain(new Tone.Filter(2500, 'lowpass'), reverb);

  const noise = new Tone.Noise('pink'); noise.volume.value = -46;                    // textura lofi de fondo
  noise.chain(new Tone.Filter(4200, 'lowpass'), tape);

  let analyser = null; if (live) { analyser = new Tone.Analyser('fft', 128); vol.connect(analyser); }
  return { pad, lead, bell, arp, bass, kick, snare, hat, swell, noise, vol, delays, analyser };
}
const hz = m => Tone.Frequency(m, 'midi').toFrequency(), NOISY = new Set(['snare', 'hat', 'swell']);
function trig(rig, e, time, bpm) {
  const x = rig[e.i], d = e.d * 60 / bpm;
  if (e.i === 'kick') x.triggerAttackRelease('G1', d, time, e.v);
  else if (NOISY.has(e.i)) x.triggerAttackRelease(d, time, e.v);
  else x.triggerAttackRelease(Array.isArray(e.m) ? e.m.map(hz) : hz(e.m), d, time, e.v);
}

/* ---------- 4. REPRODUCCIÓN EN LOOP ---------- */
let rig, song = compose(80), part, pending, playing = false, shown = -1;
const T = () => Tone.getTransport(), ticks = b => `${Math.round(b * PPQ)}i`;
const status = t => $('status').textContent = t;
const ui = () => $('play').textContent = playing ? '■ STOP' : '▶ PLAY';
const chips = () => { $('chords').innerHTML = song.sections.map(x => `<span class="chip">${x.n}</span>`).join(''); shown = -1; };
function makePart(s) {
  const p = new Tone.Part((time, e) => trig(rig, e, time, T().bpm.value), s.events.map(e => [ticks(e.t), e]));
  p.loop = true; p.loopEnd = ticks(s.beats); return p;                               // loop exacto de 8 compases, sin clicks
}
async function play() {
  await Tone.start(); status('Cargando sonido…');
  rig = rig || await buildRig(true, song.bpm);
  T().bpm.value = song.bpm; part = makePart(song); part.start(0); T().start('+0.1'); rig.noise.start();
  playing = true; ui(); status(`Sonando · ${Math.round(song.beats * 60 / song.bpm)} s por vuelta, en loop infinito`);
}
function stop() {
  if (pending) song = pending.song;
  T().stop(); T().cancel(); [part, pending?.part].forEach(p => p && p.dispose()); part = pending = null;
  rig.pad.releaseAll(); rig.noise.stop(); playing = false; ui(); chips(); status('Detenido.');
}
function setSong(s) {
  const bpm = Math.min(90, Math.max(70, s.bpm)); s.bpm = bpm; $('bpm').value = bpm; $('bpmv').textContent = bpm;
  if (!playing) { song = s; chips(); return; }
  const L = Math.round(s.beats * PPQ), at = (Math.floor(T().ticks / L) + 1) * L;     // la nueva melodía entra al final del loop actual
  if (pending) pending.part.dispose();
  const np = makePart(s); np.start(`${at}i`); part.stop(`${at}i`); pending = { song:s, part:np, at };
  T().bpm.rampTo(bpm, .4);
}
$('play').onclick = () => playing ? stop() : play();
$('gen').onclick = () => { setSong(compose(+$('bpm').value)); status('Nueva melodía generada ✦'); };
$('vol').oninput = e => { if (rig) rig.vol.volume.rampTo(Math.max(-60, 20 * Math.log10(e.target.value / 100 + 1e-4)) - 3, .05); };
$('bpm').oninput = e => {
  const v = +e.target.value; $('bpmv').textContent = v; song.bpm = v; if (pending) pending.song.bpm = v;
  if (rig) { T().bpm.rampTo(v, .4); rig.delays.forEach(d => d.delayTime.rampTo(d.beats * 60 / v, .4)); }
};
addEventListener('keydown', e => { if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); $('play').click(); } });

/* ---------- 5. VISUALIZER ---------- */
const cv = $('viz'), g = cv.getContext('2d');
const stars = Array.from({ length:70 }, () => ({ x:Math.random(), y:Math.random(), s:Math.random() * 1.6 + .4, v:Math.random() * .4 + .1 }));
const fit = () => { const d = devicePixelRatio || 1; cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; };
addEventListener('resize', fit); fit();
let level = 0, phase = 0;
function draw() {
  requestAnimationFrame(draw); phase += .02;
  const W = cv.width, H = cv.height, N = 48, bw = W / 2 / N;
  g.fillStyle = 'rgba(20,8,42,.3)'; g.fillRect(0, 0, W, H);
  const fft = playing && rig?.analyser ? rig.analyser.getValue() : null; let sum = 0;
  for (let i = 0; i < N; i++) {
    const a = fft ? Math.min(1, Math.max(0, (fft[i] + 95) / 65)) : .05 + .03 * Math.sin(phase * 3 + i * .4);
    if (i < 6) sum += a;
    const h = a * H * .7 + 3; g.fillStyle = `hsla(${320 - i * 3.2},95%,72%,.85)`;
    g.fillRect(W / 2 + i * bw + 1, H / 2 - h / 2, bw - 2, h); g.fillRect(W / 2 - (i + 1) * bw + 1, H / 2 - h / 2, bw - 2, h);
  }
  level += (sum / 6 - level) * .15;
  const R = Math.min(W, H) * (.16 + level * .18), gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R * 2.2);
  gr.addColorStop(0, 'rgba(255,170,230,.55)'); gr.addColorStop(1, 'rgba(120,180,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(W / 2, H / 2, R * 2.2, 0, 7); g.fill();
  g.fillStyle = '#fff';
  for (const s of stars) { s.y -= s.v * (.0006 + level * .004); if (s.y < 0) { s.y = 1; s.x = Math.random(); } g.globalAlpha = .3 + .5 * Math.abs(Math.sin(phase + s.x * 9)); g.fillRect(s.x * W, s.y * H, s.s, s.s); }
  g.globalAlpha = 1;
  if (playing) {
    if (pending && T().ticks >= pending.at) { part.dispose(); part = pending.part; song = pending.song; pending = null; chips(); }
    const b = Math.floor((T().ticks % (song.beats * PPQ)) / (4 * PPQ));
    if (b !== shown) { shown = b; const si = song.sections.findIndex(x => b >= x.start && b < x.start + x.bars);
      document.querySelectorAll('.chip').forEach((c, i) => { c.classList.toggle('on', i === si); c.textContent = i === si ? `${song.sections[i].n} · ${song.chords[b]}` : song.sections[i].n; }); }
  }
}
chips(); draw();

/* ---------- 6. EXPORTAR ---------- */
// Render offline del loop: se toca 2 veces y se guarda la 2ª vuelta, así la cola de la reverb queda dentro y el loop empalma perfecto.
let cache;
async function renderLoop() {
  const key = song.seed + '|' + song.bpm; if (cache?.key === key) return cache;
  const bpm = song.bpm, secs = song.beats * 60 / bpm, s = song;
  status('Renderizando el loop de ~1 minuto… (puede tardar medio minuto)');
  const buf = await Tone.Offline(async () => {
    Tone.getTransport().bpm.value = bpm;
    const o = await buildRig(false, bpm); o.noise.start(0);
    for (let k = 0; k < 2; k++) s.events.forEach(e => trig(o, e, k * secs + e.t * 60 / bpm, bpm));
  }, secs * 2, 2, 44100);
  const sr = buf.sampleRate, a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a;
  const i0 = Math.round(secs * sr), i1 = Math.round(secs * 2 * sr);
  return cache = { key, sr, L:a.slice(i0, i1), R:b.slice(i0, i1) };
}
function wavBlob({ L, R, sr }) {
  const n = L.length, v = new DataView(new ArrayBuffer(44 + n * 4)), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
  let o = 44; for (let i = 0; i < n; i++) for (const ch of [L, R]) { const x = Math.max(-1, Math.min(1, ch[i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
  return new Blob([v], { type:'audio/wav' });
}
function mp3Blob({ L, R, sr }) {
  if (typeof lamejs === 'undefined') throw new Error('No cargó lamejs (revisa tu conexión).');
  const enc = new lamejs.Mp3Encoder(2, sr, 192), i16 = a => Int16Array.from(a, x => Math.max(-1, Math.min(1, x)) * 0x7fff), l = i16(L), r = i16(R), out = [];
  for (let i = 0; i < l.length; i += 1152) { const b = enc.encodeBuffer(l.subarray(i, i + 1152), r.subarray(i, i + 1152)); if (b.length) out.push(new Uint8Array(b)); }
  const f = enc.flush(); if (f.length) out.push(new Uint8Array(f));
  return new Blob(out, { type:'audio/mpeg' });
}
async function oggBlob({ L, R, sr }) {          // MediaRecorder graba el loop en tiempo real (silencioso, no sale por tus bocinas)
  const type = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
  if (!type) throw new Error('Tu navegador no puede grabar audio comprimido.');
  const ctx = new AudioContext({ sampleRate:sr }); await ctx.resume();
  const ab = ctx.createBuffer(2, L.length, sr); ab.copyToChannel(L, 0); ab.copyToChannel(R, 1);
  const dest = ctx.createMediaStreamDestination(), src = ctx.createBufferSource(); src.buffer = ab; src.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType:type }), chunks = []; rec.ondataavailable = e => chunks.push(e.data);
  const done = new Promise(res => rec.onstop = res); rec.start(); src.start(); src.onended = () => rec.stop();
  status(`Grabando OGG en tiempo real (~${Math.round(L.length / sr)} s)…`); await done; ctx.close();
  return { blob:new Blob(chunks, { type }), ext:type.includes('ogg') ? 'ogg' : 'webm' };
}
function midiBlob(s) {                          // escritor MIDI propio (formato 1), sin librerías
  const Q = 480, tempo = Math.round(6e7 / s.bpm), txt = t => [...t].map(c => c.charCodeAt(0)), u32 = n => [n >>> 24, n >>> 16 & 255, n >>> 8 & 255, n & 255];
  const vlq = n => { const b = [n & 127]; while (n >>= 7) b.unshift(n & 127 | 128); return b; };
  const chunk = (id, d) => [...txt(id), ...u32(d.length), ...d];
  const track = list => { list.sort((a, b) => a.t - b.t || a.o - b.o); let last = 0; const out = []; for (const e of list) { out.push(...vlq(e.t - last), ...e.b); last = e.t; } out.push(0, 255, 47, 0); return chunk('MTrk', out); };
  const tracks = [track([{ t:0, o:0, b:[255, 81, 3, tempo >> 16, tempo >> 8 & 255, tempo & 255] }, { t:0, o:0, b:[255, 88, 4, 4, 2, 24, 8] }])];
  const DR = { kick:36, snare:37, hat:42 };
  [[['pad'], 0, 89], [['lead'], 1, 4], [['arp'], 2, 11], [['bass'], 3, 38], [['bell'], 4, 9], [['kick', 'snare', 'hat'], 9, 0]].forEach(([names, ch, prog]) => {
    const list = [{ t:0, o:-1, b:[0xC0 | ch, prog] }];
    s.events.filter(e => names.includes(e.i)).forEach(e => [].concat(DR[e.i] || e.m).forEach(m => {
      const t = Math.round(e.t * Q); list.push({ t, o:1, b:[0x90 | ch, m, Math.round(e.v * 127)] }, { t:t + Math.max(1, Math.round(e.d * Q)), o:0, b:[0x80 | ch, m, 0] });
    }));
    tracks.push(track(list));
  });
  return new Blob([new Uint8Array([...chunk('MThd', [0, 1, 0, tracks.length, Q >> 8, Q & 255]), ...tracks.flat()])], { type:'audio/midi' });
}
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };
const save = (blob, ext) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ethereal-loop-${stamp()}.${ext}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const EXPORTS = {
  wav:  async () => save(wavBlob(await renderLoop()), 'wav'),
  mp3:  async () => save(mp3Blob(await renderLoop()), 'mp3'),
  ogg:  async () => { const o = await oggBlob(await renderLoop()); save(o.blob, o.ext); if (o.ext !== 'ogg') status('Tu navegador graba Opus en contenedor WebM (se guardó .webm). Para OGG real usa Firefox.'); },
  midi: async () => save(midiBlob(song), 'mid'),
  json: async () => save(new Blob([JSON.stringify(song, null, 1)], { type:'application/json' }), 'json'),
};
document.querySelectorAll('[data-export]').forEach(btn => btn.onclick = async () => {
  const all = document.querySelectorAll('[data-export]'); all.forEach(b => b.disabled = true);
  try { await EXPORTS[btn.dataset.export](); if (!$('status').textContent.startsWith('Tu navegador')) status('Listo ✓ Archivo descargado.'); } catch (err) { status('Error: ' + err.message); }
  all.forEach(b => b.disabled = false);
});
$('import').onchange = async e => {                                                  // re-importar un JSON exportado antes
  try { const s = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(s.events) || !s.beats || !s.sections) throw 0; setSong(s); status('JSON importado ✓'); }
  catch { status('Ese JSON no es válido (o es de la versión anterior).'); }
  e.target.value = '';
};
