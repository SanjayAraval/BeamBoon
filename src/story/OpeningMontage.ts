import * as THREE from 'three';

export interface MontageStep {
  id: string;
  title: string;
  text: string;
  clueHint: string;
  cameraPos: THREE.Vector3;
  cameraLookAt: THREE.Vector3;
  clueFound: boolean;
}

export class OpeningMontage {
  private steps: MontageStep[] = [
    {
      id: 'step1',
      title: '1. THE SHADOW IN THE HALLWAY',
      text: 'Every creak of the floorboards felt like a warning. He kept seeing tall, twisted figures swaying in the hallway...',
      clueHint: 'Look closely at the shadow cast on the living room wall.',
      cameraPos: new THREE.Vector3(-1.5, 1.6, -1.0),
      cameraLookAt: new THREE.Vector3(-4.4, 1.5, -2.25),
      clueFound: false
    },
    {
      id: 'step2',
      title: '2. THE LATE NIGHT BROADCAST',
      text: 'Emergency alert tones blared from the television screen. Reports of bizarre, erratic attacks spread across neighboring towns...',
      clueHint: 'Examine the flickering television screen in the dark.',
      cameraPos: new THREE.Vector3(-2.25, 1.5, -2.5),
      cameraLookAt: new THREE.Vector3(-2.25, 0.85, -4.0),
      clueFound: false
    },
    {
      id: 'step3',
      title: '3. BLACKOUT OVER OAK STREET',
      text: 'Without warning, the streetlights went dark. The hum of the refrigerator died, leaving the house submerged in pitch shadow...',
      clueHint: 'Look out the front door window into the pitch black yard.',
      cameraPos: new THREE.Vector3(0, 1.6, 2.0),
      cameraLookAt: new THREE.Vector3(0, 1.6, 4.5),
      clueFound: false
    },
    {
      id: 'step4',
      title: '4. EYES IN THE SHADOWS',
      text: 'A low growl echoed from the bushes outside. Pair of glowing yellow eyes stared back through the living room glass...',
      clueHint: 'Scan the darkness outside the living room window.',
      cameraPos: new THREE.Vector3(-3.0, 1.6, -2.25),
      cameraLookAt: new THREE.Vector3(-4.5, 1.6, -2.25),
      clueFound: false
    },
    {
      id: 'step5',
      title: '5. THE FORTRESS KITCHEN',
      text: 'Panicked, he barricaded the back door and stacked canned goods on the counter. The apocalypse was coming...',
      clueHint: 'Inspect the barricaded kitchen counter.',
      cameraPos: new THREE.Vector3(1.5, 1.6, -2.5),
      cameraLookAt: new THREE.Vector3(2.5, 1.1, -3.8),
      clueFound: false
    },
    {
      id: 'step6',
      title: '6. FATHER\'S BADGE & THE LOCKED CLOSET',
      text: 'His father was a veteran police officer. Upstairs in the master bedroom closet rested his heavy steel service pistol...',
      clueHint: 'Find the gleaming police badge resting on the dresser.',
      cameraPos: new THREE.Vector3(-2.5, 4.5, -2.0),
      cameraLookAt: new THREE.Vector3(-3.8, 4.1, -2.4),
      clueFound: false
    }
  ];

  private currentStepIndex = 0;
  private camera: THREE.PerspectiveCamera;
  private onCompleteCallback: (startingParanoia: number) => void;

  constructor(camera: THREE.PerspectiveCamera, onComplete: (startingParanoia: number) => void) {
    this.camera = camera;
    this.onCompleteCallback = onComplete;
  }

  public start(): void {
    this.currentStepIndex = 0;
    this.showCurrentStep();
  }

  public showCurrentStep(): void {
    const step = this.steps[this.currentStepIndex];
    if (!step) return;

    // Move camera to diorama viewing position
    this.camera.position.copy(step.cameraPos);
    this.camera.lookAt(step.cameraLookAt);

    // Update UI Card
    const montageOverlay = document.getElementById('montage-overlay');
    const stepLabel = document.getElementById('montage-step');
    const titleLabel = document.getElementById('montage-title');
    const textLabel = document.getElementById('montage-text');
    const hintLabel = document.getElementById('clue-status');
    const btnNext = document.getElementById('btn-montage-next');

    if (montageOverlay) montageOverlay.classList.remove('hidden');
    if (stepLabel) stepLabel.innerText = `PANEL ${this.currentStepIndex + 1} OF 6`;
    if (titleLabel) titleLabel.innerText = step.title;
    if (textLabel) textLabel.innerText = step.text;
    if (hintLabel) hintLabel.innerText = step.clueHint;

    if (btnNext) {
      btnNext.classList.remove('hidden');
      btnNext.onclick = () => {
        this.nextStep();
      };
    }
  }

  public nextStep(): void {
    const currentStep = this.steps[this.currentStepIndex];
    if (currentStep) currentStep.clueFound = true;

    this.currentStepIndex++;
    if (this.currentStepIndex >= this.steps.length) {
      // Calculate starting paranoia level based on clues found
      const cluesFoundCount = this.steps.filter(s => s.clueFound).length;
      const startingParanoia = 15 + cluesFoundCount * 5; // e.g. 15 to 45

      const montageOverlay = document.getElementById('montage-overlay');
      if (montageOverlay) montageOverlay.classList.add('hidden');

      this.onCompleteCallback(startingParanoia);
    } else {
      this.showCurrentStep();
    }
  }
}
