"use client";
import { useCheckoutAvailability } from "@/hooks/usePaidAvailability";
import type { PracticeCase } from "@/lib/types/case";
import { PLAN_OPTIONS } from "@/lib/billing/plan";

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
  const { available: paidAvailable, testMode } = useCheckoutAvailability();
  const title = caseData.title.replace(/^Case \d+ — /, "");

  return (
    <div className="fred-locked-panel" role="note">
      <div className="fred-locked-card">
        <div className="fred-locked-badge" aria-hidden="true">🔒</div>
        <h2 className="fred-locked-title">Case {caseData.caseNumber} — {title} is part of the full library</h2>
        <p className="fred-locked-copy">
          The first {freeCaseCount} cases are free to practise. Unlock the complete
          set of dispensing scenarios — Schedule 8 authorities, multi-item scripts,
          repeat-timing traps and the full counselling library.
        </p>
        <div className="fred-locked-actions">
          {testMode && <p>Stripe sandbox · use a test card. No real payments are taken.</p>}
          {paidAvailable ? PLAN_OPTIONS.map((plan) => (
            <form action="/api/checkout" method="post" key={plan.id}>
              <input type="hidden" name="plan" value={plan.id} />
              <button type="submit" className="fred-locked-upgrade">
                {plan.priceDisplay}/{plan.interval}
                {plan.badge ? ` · ${plan.badge}` : ""}
              </button>
            </form>
          )) : <p>Paid access is not open yet. Continue with the free cases while clinical and launch reviews are completed.</p>}
        </div>
        <p className="fred-locked-footnote">
          Subscriptions renew automatically. Cancel in the Stripe portal; access continues to the end of the paid period. Already subscribed? Refresh, or <a href="/support">contact support</a> if access has not appeared.
        </p>
      </div>
    </div>
  );
}
