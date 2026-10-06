// Procedural audio: the music director picks the right track per phase, crossfades finish and
// release their nodes (also after 50 phase changes), no audio before the first gesture, M mutes,
// Esc pauses the mix. Web Audio is an instrumented stub (test-support/countingAudio).

import { resetHeadless, isHidden, losePointerLock, pressKey, elementText } from './test-support/headless';
import { CountingAudioContext, CountingNode } from './test-support/countingAudio';
import { Driver } from './test-support/driver';
import { GamePhase } from './src/game/GameFlow';
import { MusicDirector, MusicState, TrackId, pickTrack, CROSSFADE } from './src/audio/MusicDirector';
import { ProceduralAudio } from './src/audio/ProceduralAudio';
import { SoundManager } from './src/audio/SoundManager';

(window as any).AudioContext = CountingAudioContext; // before any gesture creates one

let pass = 0;
let fail = 0;
function check(desc: string, cond: boolean, detail = ''): void {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${desc}${!cond && detail ? ` (${detail})` : ''}`);
  if (cond) pass++; else fail++;
}

const state = (phase: GamePhase, extra: Partial<MusicState> = {}): MusicState =>
  ({ phase, paranoia: 0, visitorAtDoor: false, inDialogue: false, ending: null, ...extra });

console.log('--- RUNNING AUDIO TEST ---');

// 1. Track per phase ----------------------------------------------------------------------------
{
  const table: [string, MusicState, TrackId][] = [
    ['Title', state(GamePhase.TITLE), 'musicbox'],
    ['Comic', state(GamePhase.MONTAGE), 'musicbox'],
    ['Act 1 intro', state(GamePhase.ACT1_INTRO), 'explore'],
    ['Act 1 exploring (movie)', state(GamePhase.ACT1_MOVIE), 'explore'],
    ['Blackout', state(GamePhase.ACT1_BLACKOUT), 'blackout'],
    ['Arrival', state(GamePhase.ACT1_ARRIVAL), 'tension'],
    ['Shooting', state(GamePhase.ACT1_SHOOTING), 'tension'],
    ['Cover-up', state(GamePhase.ACT2_COVERUP, { paranoia: 60 }), 'coverup'],
    ['Visitor phase, nobody at the door yet', state(GamePhase.VISITOR_OFFICER), 'coverup'],
    ['Visitor at the door', state(GamePhase.VISITOR_NEIGHBOUR, { visitorAtDoor: true }), 'visitor'],
    ['Dialogue', state(GamePhase.VISITOR_PARTNER, { inDialogue: true }), 'visitor'],
    ['Ending CAUGHT', state(GamePhase.ENDING, { ending: 'caught' }), 'end_caught'],
    ['Ending RUN', state(GamePhase.ENDING, { ending: 'run' }), 'end_run'],
    ['Ending CLEAN', state(GamePhase.ENDING, { ending: 'clean' }), 'end_clean'],
    ['Ending BREAKDOWN', state(GamePhase.ENDING, { ending: 'breakdown' }), 'end_breakdown']
  ];
  const wrong = table.filter(([, s, want]) => pickTrack(s) !== want).map(([name, s]) => `${name} -> ${pickTrack(s)}`);
  check(`Each phase picks its track (${table.length} cases)`, wrong.length === 0, wrong.join('; '));
}

// A director on its own context, stepped like the game does
function makeDirector() {
  const ctx = new CountingAudioContext();
  const bus = ctx.createGain();
  const noise = ctx.createBuffer(1, 16, ctx.sampleRate) as any;
  const dir = new MusicDirector(ctx as any, bus, noise);
  const run = (seconds: number, s: MusicState) => {
    const dt = 1 / 30;
    for (let t = 0; t < seconds - 1e-9; t += dt) { ctx.currentTime += dt; dir.update(dt, s); }
  };
  return { ctx, bus, dir, run };
}

// 2. Crossfades finish ------------------------------------------------------------------------
{
  const { ctx, bus, dir, run } = makeDirector();
  run(2, state(GamePhase.TITLE));
  check('Title: the music box plays', dir.getTrack() === 'musicbox' && dir.getTrackCount() === 1);
  const titleOut = ctx.nodes.find(n => n.kind === 'gain' && n.outputs.has(bus)) as CountingNode; // the music box's track bus
  run(0.5, state(GamePhase.ACT1_MOVIE));
  check('A phase change starts a crossfade: both tracks sound', dir.getTrack() === 'explore' && dir.getTrackCount() === 2 && dir.isCrossfading());
  const outs = ctx.nodes.filter(n => n.kind === 'gain' && n.outputs.has(bus));
  const newOut = outs[outs.length - 1];
  const ramps = newOut.param('gain').events.filter(e => e.kind === 'linear');
  check(`The new track ramps in to full over ${CROSSFADE}s`, ramps.length === 1 && ramps[0].value === 1 && Math.abs(ramps[0].time - ctx.currentTime - (CROSSFADE - 0.5)) < 0.1,
    JSON.stringify(ramps));
  const oldRamp = titleOut ? titleOut.param('gain').events.filter(e => e.kind === 'linear') : [];
  check('The old track ramps out to 0', oldRamp.some(e => e.value === 0));
  run(CROSSFADE - 0.5 + 0.1, state(GamePhase.ACT1_MOVIE));
  check('After the crossfade: only the new track remains', dir.getTrackCount() === 1 && !dir.isCrossfading());
  check('The faded track is stopped and disconnected (its bus too)', !!titleOut && titleOut.disconnected);
  check('Every node the director still holds is one the graph still holds', ctx.connectedNodes().length - 1 /* bus */ === dir.getLiveNodeCount(),
    `${ctx.connectedNodes().length - 1} vs ${dir.getLiveNodeCount()}`);

  // Rapid changes: a fade interrupted by another fade still finishes
  run(0.3, state(GamePhase.ACT1_BLACKOUT));
  run(0.3, state(GamePhase.ACT1_ARRIVAL));
  run(0.3, state(GamePhase.ACT2_COVERUP));
  check('Three changes in 0.9s: four tracks overlapping', dir.getTrackCount() === 4, `${dir.getTrackCount()}`);
  run(CROSSFADE + 0.1, state(GamePhase.ACT2_COVERUP));
  check('...and all the fades finish: one track left', dir.getTrackCount() === 1 && dir.getTrack() === 'coverup');
}

// 3. Cover-up clock: tempo and pitch rise with paranoia ----------------------------------------
{
  const measure = (paranoia: number) => {
    const { ctx, run } = makeDirector();
    run(CROSSFADE + 0.1, state(GamePhase.ACT2_COVERUP, { paranoia }));
    const before = ctx.nodes.length;
    run(10, state(GamePhase.ACT2_COVERUP, { paranoia }));
    const fresh = ctx.nodes.slice(before);
    const ticks = fresh.filter(n => n.kind === 'bufferSource').length;
    const pulseHz = fresh.filter(n => n.kind === 'oscillator').map(n => n.param('frequency').events[0]?.value ?? 0);
    return { ticks, pulse: Math.max(...pulseHz) };
  };
  const calm = measure(0);
  const panic = measure(100);
  check('Cover-up: the clock ticks faster at 100 paranoia than at 0', panic.ticks > calm.ticks * 1.6, `${calm.ticks} vs ${panic.ticks} ticks in 10s`);
  check('Cover-up: the low pulse is higher at 100 paranoia', panic.pulse > calm.pulse + 20, `${calm.pulse} vs ${panic.pulse} Hz`);
}

// 4. Endings play their cue and every track builds without errors -------------------------------
{
  const { dir, run } = makeDirector();
  let ok = true;
  for (const s of [state(GamePhase.TITLE), state(GamePhase.ACT1_MOVIE), state(GamePhase.ACT1_BLACKOUT), state(GamePhase.ACT1_ARRIVAL),
    state(GamePhase.ACT2_COVERUP), state(GamePhase.VISITOR_NEIGHBOUR, { visitorAtDoor: true }),
    state(GamePhase.ENDING, { ending: 'caught' }), state(GamePhase.ENDING, { ending: 'run' }),
    state(GamePhase.ENDING, { ending: 'clean' }), state(GamePhase.ENDING, { ending: 'breakdown' })]) {
    try { run(2, s); dir.sting(); ok = ok && dir.getTrack() === pickTrack(s); } catch (e) { ok = false; console.log(e); }
  }
  check('Every track (and the shot sting) builds and plays', ok);
}

// 5. 50 phase changes: nothing leaks --------------------------------------------------------------
{
  const { ctx, dir, run } = makeDirector();
  const cycle = [state(GamePhase.TITLE), state(GamePhase.ACT1_MOVIE), state(GamePhase.ACT1_BLACKOUT), state(GamePhase.ACT1_ARRIVAL),
    state(GamePhase.ACT2_COVERUP, { paranoia: 80 }), state(GamePhase.VISITOR_OFFICER, { visitorAtDoor: true }),
    state(GamePhase.ENDING, { ending: 'breakdown' }), state(GamePhase.ENDING, { ending: 'run' })];
  for (let i = 0; i < 50; i++) run(i % 3 === 0 ? 0.2 : 2.0, cycle[i % cycle.length]); // some fades interrupted
  const created = ctx.nodes.length;
  run(CROSSFADE + 5, state(GamePhase.ACT1_BLACKOUT)); // settle, then let the one-shots end
  const live = ctx.connectedNodes().length - 1; // minus the bus
  check(`50 phase changes (${created} nodes made): one track left`, dir.getTrackCount() === 1);
  check('...and only its own nodes are still connected (everything else stopped and disconnected)', live === dir.getLiveNodeCount() && live < 30,
    `${live} connected, director holds ${dir.getLiveNodeCount()}`);
  const strays = ctx.nodes.filter(n => (n.kind === 'oscillator' || n.kind === 'bufferSource') && n.started && !n.stopped && n.disconnected);
  check('No disconnected source left running', strays.length === 0, `${strays.length}`);
}

// 6. Mixing: master 0.6, music under the SFX, a limiter before the speakers, heartbeat above 70 ------
{
  const pa = new ProceduralAudio();
  check('No AudioContext until init (the first gesture)', pa.getContext() === null);
  pa.init();
  const ctx = pa.getContext() as unknown as CountingAudioContext;
  const limiter = ctx.nodes.find(n => n.kind === 'compressor')!;
  check('Master volume defaults to 0.6', pa.getMasterVolume() === 0.6 && pa.getOutputLevel() === 0.6);
  check('A limiter sits between the master and the speakers', !!limiter && limiter.outputs.has(ctx.destination) && limiter.param('ratio').value >= 12 && limiter.param('threshold').value <= -3);
  check('Music bus is below the SFX level', (pa.getMusicBus() as any).param('gain').value < 0.5);
  pa.updateHeartbeat(60);
  check('No heartbeat at 60 paranoia', !pa.isHeartbeatOn());
  pa.updateHeartbeat(75);
  check('Heartbeat above 70 paranoia', pa.isHeartbeatOn());
  pa.updateHeartbeat(50);
  check('...and it stops when paranoia falls back', !pa.isHeartbeatOn());
}

// 7. In the game: first gesture, M to mute, Esc pauses --------------------------------------------
{
  resetHeadless();
  const sm = SoundManager.getInstance();
  const d = new Driver();
  d.run(1);
  check('No audio before the first user gesture', sm.getContext() === null && !sm.isUnlocked());
  d.click(); // the first click (on the title screen)
  d.run(0.5);
  const ctx = sm.getContext() as unknown as CountingAudioContext;
  check('The first click creates the audio and starts the title music', !!ctx && ctx.state === 'running' && sm.getDirector()?.getTrack() === 'musicbox');

  check('Speaker icon shows sound on', !isHidden('audio-status') && elementText('audio-status') === '\u{1F50A}');
  pressKey('KeyM');
  check('M mutes: output level 0, icon shows muted', sm.isMuted() && sm.getOutputLevel() === 0 && elementText('audio-status') === '\u{1F507}');
  pressKey('KeyM');
  check('M again unmutes back to the volume', !sm.isMuted() && sm.getOutputLevel() === 0.6 && elementText('audio-status') === '\u{1F50A}');

  d.clickButton('btn-start');
  d.holdKey('Enter', 1.2);
  d.runUntil(() => d.phase === GamePhase.ACT1_INTRO, 3);
  d.clickButton('btn-resume');
  d.holdKey('Space', 1.2);
  check('Free roam: the explore track', d.runUntil(() => d.phase === GamePhase.ACT1_MOVIE, 3) && (d.run(0.1), sm.getDirector()!.getTrack() === 'explore'));

  losePointerLock();
  d.run(0.1);
  const madeBefore = ctx.nodes.length;
  d.run(5);
  check('Esc pauses: the audio context is suspended', d.flow.isPaused && sm.isPaused() && ctx.state === 'suspended');
  check('...and no sound is scheduled while paused', ctx.nodes.length === madeBefore, `${ctx.nodes.length - madeBefore} nodes made`);
  pressKey('KeyM');
  check('M still works while paused', sm.isMuted());
  pressKey('KeyM');
  d.clickButton('btn-resume');
  d.run(4.5); // the explore track places a note every 4s
  check('Resume: the audio carries on', !d.flow.isPaused && ctx.state === 'running' && ctx.nodes.length > madeBefore,
    `paused ${d.flow.isPaused}, ${ctx.state}, ${ctx.nodes.length - madeBefore} new nodes`);

  check('Blackout: the music fades to wind and a slow pulse', d.runUntil(() => d.phase === GamePhase.ACT1_BLACKOUT, 25) && (d.run(0.1), sm.getDirector()!.getTrack() === 'blackout'));
  check('The same AudioContext throughout (never recreated)', sm.getContext() === (ctx as any));
}

console.log(`Audio Test Complete: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
