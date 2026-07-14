import type { PracticeCase } from "@/lib/types/case";

interface PrescriptionFormProps {
  caseData: PracticeCase;
}

export function PrescriptionForm({ caseData }: PrescriptionFormProps) {
  // Stable pseudo-random prescription number seeded by caseNumber
  const prescNo = String(
    ((caseData.caseNumber * 7919 + 12345) % 9000000) + 1000000
  );
  const pbsApproval = `0846${caseData.caseNumber}J`;

  // Valid-to: one year after script date
  const dateParts = caseData.date.split("/");
  const dd = dateParts[0] ?? "";
  const mm = dateParts[1] ?? "";
  const yy = dateParts[2] ?? "";
  const validTo = `${dd}/${mm}/${String(Number(yy) + 1).padStart(2, "0")}`;

  // PBS item code from drugDetails
  const pbsItem = caseData.drugDetails.pbs.replace(/^NHS:\s*/i, "").trim();
  const isPrivate = !caseData.price.startsWith("$");
  const priceDisplay = isPrivate ? "Private" : caseData.price;
  const qtyDisplay = String(caseData.qty);
  const pp = caseData.patientLookup.prescriptionPatient;

  return (
    <div className="pbs-root">

      {/* ── SECTION 1: Header ────────────────────────────────── */}
      <div className="pbs-section pbs-header">
        <div className="pbs-header-left pbs-right-border">
          <div className="pbs-scheme-name">
            Pharmaceutical Benefits Scheme — PBS/RPBS
          </div>
          <div className="pbs-repeat-badge">REPEAT AUTHORISATION</div>
          <div className="pbs-disclaimer">
            Valid only if the patient&rsquo;s entitlement card or duplicate
            prescription is attached
          </div>
        </div>

        <div className="pbs-header-centre pbs-right-border">
          <div className="pbs-cr-label">CR</div>
          <div className="pbs-cr-number">{prescNo}</div>
        </div>

        <div className="pbs-header-right">
          <div className="pbs-x-box">X</div>
          <div className="pbs-x-legend">Most relevant box</div>
        </div>
      </div>

      {/* ── SECTION 2: Provider row ──────────────────────────── */}
      <div className="pbs-section pbs-provider-row pbs-yellow">
        <div className="pbs-fcell pbs-fcell-narrow">
          <div className="pbs-tiny">Serial No.</div>
          <div className="pbs-faded">—</div>
        </div>
        <div className="pbs-fcell pbs-fcell-wide">
          <div className="pbs-tiny">Prescriber No.</div>
          <div className="pbs-bold">{caseData.prescriberNo}</div>
        </div>
        <div className="pbs-fcell pbs-fcell-narrow">
          <div className="pbs-tiny">Gen</div>
          <div className="pbs-bold">{caseData.genericSubstitutionAllowed ? "✓" : "—"}</div>
        </div>
        <div className="pbs-fcell pbs-fcell-narrow">
          <div className="pbs-tiny">Con</div>
          <div className="pbs-faded">—</div>
        </div>
      </div>

      {/* ── SECTION 3: Patient block + Priced items ─────────── */}
      <div className="pbs-section pbs-main-body">
        <div className="pbs-patient-col">
          <div className="pbs-patient-block pbs-yellow pbs-bottom-border">
            <div className="pbs-tiny">Patient&rsquo;s Medicare No.</div>
            <div className="pbs-bold" style={{ marginBottom: "4px" }}>
              {pp.mcare}
            </div>
            <div className="pbs-tiny">Patient&rsquo;s name &amp; address</div>
            <div className="pbs-patient-name-val">{pp.name}</div>
            {pp.dateOfBirth && (
              <div className="pbs-patient-dob">DOB: {pp.dateOfBirth}</div>
            )}
            <div className="pbs-patient-addr">{pp.address}</div>
          </div>
          <div className="pbs-auth-fields pbs-yellow">
            <div className="pbs-fcell">
              <div className="pbs-tiny">Authority No.</div>
              <div className="pbs-faded">—</div>
            </div>
            <div className="pbs-fcell">
              <div className="pbs-tiny">Entitlement No.</div>
              <div className="pbs-faded">—</div>
            </div>
          </div>
        </div>

        <div className="pbs-items-col pbs-yellow">
          <div className="pbs-items-header">Items dispensed this supply</div>
          <div className="pbs-items-price">{priceDisplay}</div>
          {!isPrivate && (
            <div>
              <div className="pbs-items-code-label">PBS Item</div>
              <div className="pbs-items-code-val">{pbsItem}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4: Drug block ────────────────────────────── */}
      <div className="pbs-section pbs-drug-block pbs-yellow">
        <div className="pbs-drug-transcription-label">
          Original prescription transcription (item, strength, quantity,
          directions and deferred supply if applicable)
        </div>
        <div className="pbs-drug-name-display">{caseData.drug}</div>
        <div className="pbs-product-instruction">
          {caseData.prescribedProductType === "generic" ? "Generic product prescribed" : "Brand product prescribed"}
          {caseData.genericSubstitutionAllowed
            ? " · Generic substitution permitted"
            : " · Substitution not authorised"}
        </div>
        <div className="pbs-drug-dirs">{caseData.directions}</div>
        <div className="pbs-drug-meta-row">
          <span>
            <span className="pbs-tiny">Qty</span>{" "}
            <span className="pbs-bold">{qtyDisplay}</span>
          </span>
          <span className="pbs-meta-sep">|</span>
          <span>
            <span className="pbs-tiny">Rpts</span>{" "}
            <span className="pbs-bold">{caseData.repeats}</span>
          </span>
          <span className="pbs-meta-sep">|</span>
          <span>Dr {caseData.doctor}</span>
        </div>
        <div className="pbs-drug-rpt-ref">
          Rpt #{caseData.caseNumber}00{prescNo.slice(-3)}
        </div>
      </div>

      {/* ── SECTION 5: Date / PBS Approval / Repeats ─────────── */}
      <div className="pbs-section pbs-date-row pbs-yellow">
        <div className="pbs-fcell">
          <div className="pbs-tiny">Date of prescription</div>
          <div className="pbs-bold">{caseData.date}</div>
        </div>
        <div className="pbs-fcell">
          <div className="pbs-tiny">PBS Approval No.</div>
          <div className="pbs-bold">{pbsApproval}</div>
        </div>
        <div className="pbs-fcell">
          <div className="pbs-tiny">No. of repeats authorised</div>
          <div className="pbs-bold">{caseData.repeats}</div>
        </div>
      </div>

      {/* ── SECTION 6: Doctor block ───────────────────────────── */}
      <div className="pbs-section pbs-doctor-block">
        <div className="pbs-tiny">Name and address of medical practitioner</div>
        <div className="pbs-doctor-name-display">Dr {caseData.doctor}</div>
        <div className="pbs-doctor-prescriber">
          Prescriber No: {caseData.prescriberNo}
        </div>
        <div className="pbs-doctor-cert">
          I certify this prescription was written as part of my professional
          practice.
        </div>
        <div className="pbs-sig-line" style={{ marginTop: "4px" }}>
          Signature:&nbsp;
        </div>
      </div>

      {/* ── SECTION 7: Authority pharmacist row ──────────────── */}
      <div className="pbs-section pbs-auth-pharm-row">
        <div className="pbs-fcell pbs-auth-pharm-wide">
          <div className="pbs-tiny">
            Name and PBS number of pharmacist dispensing this supply
          </div>
          <div className="pbs-sig-line" style={{ marginTop: "4px" }}>
            &nbsp;
          </div>
        </div>
        <div className="pbs-fcell">
          <div className="pbs-tiny">Valid to</div>
          <div className="pbs-bold">{validTo}</div>
        </div>
        <div className="pbs-fcell">
          <div className="pbs-tiny">Reg25</div>
          <div>123{caseData.caseNumber}45</div>
        </div>
        <div className="pbs-fcell">
          <div className="pbs-tiny">Prescription No. this supply</div>
          <div>CR{prescNo}</div>
        </div>
      </div>

      {/* ── SECTION 8: Pharmacy stamp ────────────────────────── */}
      <div className="pbs-section pbs-stamp-block pbs-yellow">
        <div className="pbs-stamp-name">Community Pharmacy</div>
        <div className="pbs-stamp-line">
          PBS Approval: {pbsApproval}
        </div>
        <div className="pbs-stamp-line">Ph (02) 9289 4699</div>
        <div className="pbs-stamp-line">Level 17, 24 Campbell Street</div>
        <div className="pbs-stamp-line">SYDNEY NSW 2000</div>
        <div className="pbs-sig-line" style={{ marginTop: "5px" }}>
          Date:&nbsp;
        </div>
      </div>

      {/* ── SECTION 9: Supply / Signature row ─────────────────── */}
      <div className="pbs-section pbs-supply-row">
        <div className="pbs-fcell">
          <div className="pbs-tiny">Date of supply</div>
          <div className="pbs-sig-line" style={{ marginTop: "4px" }}>
            &nbsp;
          </div>
        </div>
        <div className="pbs-fcell">
          <div className="pbs-tiny">Patient&rsquo;s signature</div>
          <div className="pbs-sig-line" style={{ marginTop: "4px" }}>
            &nbsp;
          </div>
        </div>
        <div className="pbs-fcell">
          <div className="pbs-tiny">
            Agent&rsquo;s name &amp; address (if applicable)
          </div>
          <div className="pbs-sig-line" style={{ marginTop: "4px" }}>
            &nbsp;
          </div>
        </div>
      </div>

      {/* ── SECTION 10: Declaration ─────────────────────────── */}
      <div className="pbs-section pbs-declaration">
        I certify that I have received the medication and the information
        relating to any entitlement to free or reduced pharmaceutical benefits
        is not false or misleading.
      </div>

      {/* ── SECTION 11: Privacy notice ──────────────────────── */}
      <div className="pbs-privacy">
        Privacy Notice: Your personal information may be collected, used and
        disclosed to the Department of Health and Aged Care for the purposes
        of administering the Pharmaceutical Benefits Scheme (PBS) and the
        Repatriation Pharmaceutical Benefits Scheme (RPBS). This includes
        verification of entitlement, assessment of claims, audit purposes, and
        reporting to the Government as required by the National Health Act
        1953. The collection of this information is authorised under the
        National Health Act 1953. For information about privacy, visit
        www.health.gov.au
      </div>

      {/* ── Form code ───────────────────────────────────────── */}
      <div className="pbs-form-code">4010 (10/05)</div>
    </div>
  );
}
