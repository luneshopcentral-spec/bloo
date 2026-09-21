"use client";

import * as Dialog from "@radix-ui/react-dialog";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onStartTutorial: () => void;
}

const STEPS = [
  {
    title: "Read the prescription",
    detail:
      "Open the PRESCRIPTION tab on the right edge and read the paper script carefully. Every detail you enter is checked against it — and the details change on every attempt, so always transcribe rather than recall.",
  },
  {
    title: "Find the patient",
    detail:
      "Search by surname and confirm the details match the script (name, date of birth, Medicare). Some cases need a new patient entered from scratch.",
  },
  {
    title: "Select the prescriber and each medicine",
    detail:
      "Pick the prescriber from the directory, then search the drug directory for the exact product — brand versus generic matters. Scripts with two medicines have an item switcher; complete every item.",
  },
  {
    title: "Directions, quantity, repeats and labels",
    detail:
      "Transcribe the directions (abbreviations like tds are accepted), quantity and repeats for each item, then add the applicable warning labels. The label preview shows what the patient would receive.",
  },
  {
    title: "Make the clinical decision and dispense",
    detail:
      "Decide: dispense, hold and contact the prescriber, or do not supply. Some scripts contain a deliberate problem. Enter your initials and submit — an unsafe decision fails the attempt no matter how accurate the transcription.",
  },
  {
    title: "Counsel the patient",
    detail:
      "After submitting you hand over to the patient. Gather information, give safe instructions, use teach-back and invite questions — by text or voice. Dispensing and counselling combine into your final result.",
  },
];

export function OnboardingModal({ open, onClose, onStartTutorial }: OnboardingModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
      <Dialog.Overlay className="fred-onboarding-backdrop">
        <Dialog.Content className="fred-onboarding-dialog" onPointerDownOutside={event => event.preventDefault()}>
          <div className="fred-onboarding-title">
            <Dialog.Title>Welcome to the dispensing workspace</Dialog.Title>
            <Dialog.Close aria-label="Close the walkthrough">✕</Dialog.Close>
          </div>
          <div className="fred-onboarding-body">
            <Dialog.Description className="fred-onboarding-intro">New here? Work through one case with a guide beside you. You will use the real controls, receive feedback at each step and practise speaking to the patient in your own words.</Dialog.Description>
            <div className="fred-onboarding-path">
              <strong>Your first guided case</strong>
              <p>Read and enter the prescription → check the physical pack → talk with the patient → review feedback.</p>
              <p>Learn mode · saved on this device · no effect on your independent progress</p>
            </div>
            <details className="fred-onboarding-reference">
              <summary>What happens in each stage?</summary>
              <ol className="fred-onboarding-steps">
                {STEPS.map((step, index) => <li key={step.title}><span className="fred-onboarding-step-number">{index + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div></li>)}
              </ol>
            </details>
            <p className="fred-onboarding-modes"><strong>Already familiar?</strong> Explore on your own. You can launch the guided tutorial or reopen this overview from the toolbar whenever you need it.</p>
          </div>
          <div className="fred-onboarding-footer">
            <button className="secondary" type="button" onClick={onClose}>Explore on my own</button>
            <button type="button" onClick={onStartTutorial}>Guide me through a case</button>
          </div>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
}
