import { Evidence } from '../core/Evidence';

export type EndingType = 'caught' | 'run' | 'clean' | 'breakdown';

export interface EndingData {
  type: EndingType;
  title: string;
  story: string;
  comicCaption: string;
}

export class Endings {
  public static caught(): EndingData {
    return {
      type: 'caught',
      title: 'ENDING: ARRESTED',
      story: 'Flashing red and blue lights illuminated the suburban street. Heavy boots kicked open the front door. The physical evidence left no doubt. As the handcuffs clicked shut, the dark comedy of errors reached its tragic end.',
      comicCaption: '"A single bloodstain on the floor... and the law closed in."'
    };
  }

  public static calculateEnding(
    paranoia: number,
    evidence: Evidence
  ): EndingData {
    const totalNoise = evidence.getTotalNoise();
    const uncleanedTraces = evidence.getUncleanedTracesCount();
    const exposedBodies = evidence.getExposedBodiesCount();
    const visitorsStruck = evidence.getVisitorsStruck();
    const suspicion = evidence.calculateSuspicion();

    // 1. Breakdown Ending (Paranoia reaches 100 or struck all visitors in panic)
    if (paranoia >= 95 || visitorsStruck >= 3) {
      return {
        type: 'breakdown',
        title: 'ENDING: PSYCHOTIC BREAKDOWN',
        story: 'The line between nightmare and reality completely dissolved. Shadows twisted into howling monstrosities, and the silence of the suburb was broken by endless screaming. You surrendered to the hallucination.',
        comicCaption: '"The monsters were never outside. They were behind his eyes all along."'
      };
    }

    // 2. Run Ending (High paranoia + struck visitors, fled to woods)
    if (paranoia >= 70 && visitorsStruck > 0) {
      return {
        type: 'run',
        title: 'ENDING: ESCAPE TO THE WOODS',
        story: 'With sirens echoing in the distance and blood on your hands, you burst through the back door into the freezing dark forest. You vanished into the pines, running from a crime you could never outrun.',
        comicCaption: '"Into the cold dark woods... running forever."'
      };
    }

    // 3. Caught Ending (Uncleaned evidence, high noise, or high suspicion)
    if (suspicion >= 0.5 || uncleanedTraces > 0 || exposedBodies > 0 || totalNoise >= 60) {
      return Endings.caught();
    }

    // 4. Clean Ending (Got Away With It - The Worst One)
    return {
      type: 'clean',
      title: 'ENDING: THE CLEAN COVER-UP',
      story: 'Every trace was wiped clean. The police left satisfied, and the curtains remained closed. The morning sun shone softly over Oak Street. You got away with it completely... and that single truth will haunt every remaining second of your life.',
      comicCaption: '"The cleanest crime is the dirtiest burden."'
    };
  }
}
