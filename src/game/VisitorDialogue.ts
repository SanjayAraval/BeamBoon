// Visitor dialogue: three questions per visitor, three answers each, and a DOUBT meter.
// Pure logic and lines (no DOM): Game shows it through DialogueUI and applies the outcome with
// the same success / fail / forced-entry branches the old talk roll used.

export type VisitorType = 'neighbour' | 'officer' | 'partner';
export type AnswerStyle = 'calm' | 'lie' | 'deflect' | 'aggressive';
export type AnswerQuality = 'good' | 'neutral' | 'bad';

export interface DialogueAnswer {
  text: string;
  style: AnswerStyle;
  quality: AnswerQuality;
  doubt: number; // base doubt change
  reply: string; // the visitor's follow-up
}

export interface DialogueRound {
  question: string;
  answers: [DialogueAnswer, DialogueAnswer, DialogueAnswer];
}

// --- Balance -------------------------------------------------------------------------------
export const DIALOGUE_ROUNDS = 3;
export const DOUBT_START_BASE = 10;
export const DOUBT_START_SEVERITY = 40;   // x evidence severity (0..1)
export const DOUBT_START_SUSPICION = 30;  // x evidence suspicion (0..1)
export const DOUBT_START_MAX = 70;
export const DOUBT_START_MAX_HIGH_SEVERITY = 80; // cap when evidence severity is above HIGH_SEVERITY
export const HIGH_SEVERITY = 0.5;
export const DOUBT_FAIL = 100;            // reaching this ends the talk at once (FAIL)
export const DOUBT_PASS_BELOW = 50;       // after the last round, below this is SUCCESS
export const LIE_HIGH_SEVERITY = 0.5;     // a lie with severity above this...
export const LIE_HIGH_SEVERITY_DOUBT = 10; // ...adds this much doubt
export const NERVOUS_PARANOIA = 70;       // above this every answer...
export const NERVOUS_DOUBT = 5;           // ...adds this much doubt
export const CALM_PARANOIA = 40;          // below this a calm answer...
export const CALM_BONUS = -5;             // ...gets this extra
export const ANSWER_PARANOIA: Record<AnswerQuality, number> = { good: -3, neutral: 0, bad: 4 };

const A = (text: string, style: AnswerStyle, quality: AnswerQuality, doubt: number, reply: string): DialogueAnswer =>
  ({ text, style, quality, doubt, reply });

export const DIALOGUES: Record<VisitorType, { name: string; rounds: DialogueRound[] }> = {
  neighbour: {
    name: 'Mr. Henderson (neighbour)',
    rounds: [
      { question: 'Son? I heard a bang a while ago. Sounded like a gunshot. Everything alright in there?', answers: [
        A('Gunshot? No sir, nothing here.', 'lie', 'neutral', 5, 'Hm. Sure sounded close.'),
        A('The storm blew a transformer. Scared me half to death too.', 'calm', 'good', -20, 'The transformer, eh? That\'d explain the lights.'),
        A('Why are you snooping around our house at night?', 'aggressive', 'bad', 25, 'Snooping? I\'m checking on you, young man!')
      ] },
      { question: 'Are your folks home? Their car\'s in the drive.', answers: [
        A('They\'re asleep. Dad had a long shift.', 'calm', 'good', -20, 'Lucky them, sleeping through this racket.'),
        A('Uh... they\'re out. No, home. They\'re... out.', 'deflect', 'bad', 25, 'Which is it, son?'),
        A('They took a cab to a party.', 'lie', 'neutral', 5, 'In this weather? Odd night for it.')
      ] },
      { question: 'What\'s that smell? Like... pennies.', answers: [
        A('Dad was cleaning his fishing gear in the kitchen.', 'lie', 'neutral', 5, 'Fishing gear. At midnight.'),
        A('I don\'t smell anything. Goodnight, Mr. Henderson.', 'deflect', 'bad', 20, 'Don\'t you shut that door on me, young man!'),
        A('I cut my hand on a glass. It\'s bandaged, it\'s fine.', 'calm', 'good', -20, 'Oh dear. Keep it clean, son.')
      ] }
    ]
  },
  officer: {
    name: 'Patrol Officer Davis',
    rounds: [
      { question: 'Evening. We had a report of a disturbance at this address. Anything to report?', answers: [
        A('What, are you arresting me? I didn\'t do anything!', 'aggressive', 'bad', 30, 'Nobody said anything about an arrest, son.'),
        A('Maybe it was next door?', 'deflect', 'neutral', 5, 'Dispatch was specific. This house.'),
        A('Just the storm, officer. A branch hit the window.', 'calm', 'good', -20, 'Noted. Storm\'s been bad all over.')
      ] },
      { question: 'Your father\'s radio went quiet in the middle of his shift. Is he here?', answers: [
        A('He\'s asleep upstairs. His radio\'s on the charger.', 'calm', 'good', -25, 'Alright. That\'d explain the static.'),
        A('He\'s... not taking calls tonight.', 'deflect', 'neutral', 5, 'That\'s not like him.'),
        A('Haven\'t seen him all night. Maybe he\'s dead in a ditch.', 'aggressive', 'bad', 30, 'That\'s not funny, son. Not funny at all.')
      ] },
      { question: 'I\'ll need to note this down. Mind if I step inside a moment?', answers: [
        A('It\'s late. Could you come back when Dad\'s up in the morning?', 'calm', 'good', -20, 'Fair enough. I\'ll swing by tomorrow.'),
        A('Now\'s not a good time. The house is a mess.', 'deflect', 'neutral', 5, 'Messes don\'t bother me.'),
        A('You need a warrant for that.', 'aggressive', 'bad', 25, 'Interesting thing for a kid to say.')
      ] }
    ]
  },
  partner: {
    name: "Sgt. Miller (Dad's partner)",
    rounds: [
      { question: 'Hey kiddo. Your dad\'s not picking up his phone. He in?', answers: [
        A('He went out. Didn\'t say where.', 'lie', 'neutral', 5, 'Your dad always says where.'),
        A('Hey Sarge. He crashed early, double shift.', 'calm', 'good', -20, 'Ha. The man could sleep through a riot.'),
        A('Why does everyone keep asking about him?!', 'aggressive', 'bad', 25, 'Whoa. Easy. Who\'s everyone?')
      ] },
      { question: 'Funny thing. I\'d swear I heard a service weapon go off earlier. You know the sound as well as I do.', answers: [
        A('That was the TV. Zombie movie, volume way up.', 'calm', 'good', -20, 'Those movies\'ll rot your brain, kid.'),
        A('Dad was cleaning it and it went off. Nobody got hurt.', 'lie', 'bad', 20, 'Your dad? Twenty years and never one misfire.'),
        A('What gun? Dad doesn\'t keep it at home.', 'lie', 'neutral', 5, 'He keeps it in the safe upstairs. You know that.')
      ] },
      { question: 'Tell him to call me first thing. And kid... you look pale. You okay?', answers: [
        A('I\'m fine. Just leave me alone!', 'aggressive', 'bad', 25, 'Alright, alright. Touchy.'),
        A('Just tired. The storm kept me up.', 'calm', 'good', -20, 'Get some sleep. I\'ll see you around.'),
        A('Why, do I look like I did something?', 'deflect', 'neutral', 5, '...Funny thing to ask.')
      ] }
    ]
  }
};

export interface DialogueContext {
  severity: number;  // visible evidence severity, 0..1 (Evidence.getVisibleSeverity() / 100)
  suspicion: number; // Evidence.calculateSuspicion(), 0..1
  paranoia: number;  // 0..100, read when each answer is given
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function startingDoubtCap(severity: number): number {
  return severity > HIGH_SEVERITY ? DOUBT_START_MAX_HIGH_SEVERITY : DOUBT_START_MAX;
}

// The formula tops out at 10 + 40 + 30 = 80, which is the high-severity cap
export function startingDoubt(severity: number, suspicion: number): number {
  return clamp(DOUBT_START_BASE + DOUBT_START_SEVERITY * severity + DOUBT_START_SUSPICION * suspicion, 0, startingDoubtCap(severity));
}

// Doubt change for one answer, with the lie / nervous / calm modifiers
export function answerDoubt(answer: DialogueAnswer, severity: number, paranoia: number): number {
  let d = answer.doubt;
  if (answer.style === 'lie' && severity > LIE_HIGH_SEVERITY) d += LIE_HIGH_SEVERITY_DOUBT;
  if (paranoia > NERVOUS_PARANOIA) d += NERVOUS_DOUBT;
  if (answer.style === 'calm' && paranoia < CALM_PARANOIA) d += CALM_BONUS;
  return d;
}

export interface AnswerResult {
  reply: string;
  doubtChange: number;
  paranoiaChange: number;
  finished: boolean;
  success: boolean | null; // set once finished
}

export class DialogueSession {
  readonly visitor: VisitorType;
  readonly name: string;
  private rounds: DialogueRound[];
  private severity: number;
  round = 0;
  doubt: number;
  finished = false;
  success: boolean | null = null;

  constructor(visitor: VisitorType, severity: number, suspicion: number) {
    this.visitor = visitor;
    this.name = DIALOGUES[visitor].name;
    this.rounds = DIALOGUES[visitor].rounds;
    this.severity = severity;
    this.doubt = startingDoubt(severity, suspicion);
  }

  get current(): DialogueRound | null {
    return this.finished ? null : this.rounds[this.round];
  }

  // Pick answer 0..2. Paranoia is read now (nervous / calm modifiers).
  answer(index: number, paranoia: number): AnswerResult | null {
    const round = this.current;
    if (!round || index < 0 || index > 2) return null;
    const a = round.answers[index];
    const change = answerDoubt(a, this.severity, paranoia);
    this.doubt = clamp(this.doubt + change, 0, DOUBT_FAIL);
    this.round++;
    if (this.doubt >= DOUBT_FAIL) {
      this.finished = true;
      this.success = false;
    } else if (this.round >= DIALOGUE_ROUNDS) {
      this.finished = true;
      this.success = this.doubt < DOUBT_PASS_BELOW;
    }
    return { reply: a.reply, doubtChange: change, paranoiaChange: ANSWER_PARANOIA[a.quality], finished: this.finished, success: this.success };
  }
}

// Index of the best / worst answer in a round (for tests and scripted play)
export function bestAnswer(round: DialogueRound): number {
  return round.answers.findIndex(a => a.quality === 'good');
}
export function worstAnswer(round: DialogueRound): number {
  return round.answers.findIndex(a => a.quality === 'bad');
}
