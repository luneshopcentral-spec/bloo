import type { PracticeCase } from "@/lib/types/case";
import { PLAN } from "@/lib/billing/plan";

interface LockedCasePanelProps {
  caseData: PracticeCase;
  freeCaseCount: number;
}

/**
 * Shown in place of the dispensing workspace when the selected case is not
 * covered by the user's entitlement. The free demo cases remain fully playable;
 * this is the upgrade prompt for the rest of the library.
 */
export function LockedCasePanel({ caseData, freeCaseCount }: LockedCasePanelProps) {
  const title = caseData.title.replace(/^Case \d+ — /, "");

  return (
    <div className="fred-locked-panel" role="note">
      <div className="fred-locked-card">
        <div className="fred-locked-badge" aria-hidden="true">🔒</div>
        <h2 className="fred-locked-title">Case {caseData.caseNumber} — {title} is part of the full library</h2>
        <p className="fred-locked-copy">
          The first {freeCaseCount} cases are free to practise. Unlock the complete
          set of dispensing scenarios — Schedule 8 authorities, multi-item scripts,
          repeat-timing traps and the full counselling library — with {PLAN.name} for{" "}
          {PLAN.priceDisplay}/{PLAN.interval}.
        </p>
        <form action="/api/checkout" method="post" className="fred-locked-actions">
          <button type="submit" className="fred-locked-upgrade">
            Unlock the full library
          </button>
        </form>
        <p className="fred-locked-footnote">
          Cancel anytime. Already subscribed? Your access appears here once payment
          is confirmed — refresh, or contact support if it hasn&rsquo;t.
        </p>
      </div>
    </div>
  );
}
