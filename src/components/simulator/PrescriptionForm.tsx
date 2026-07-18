import type { PracticeCase } from "@/lib/types/case";

interface PrescriptionFormProps {
  caseData: PracticeCase;
}

function substitutionInstruction(
  productType: "brand" | "generic",
  substitutionAllowed: boolean
): string {
  if (!substitutionAllowed) return "Brand substitution not authorised";
  return productType === "generic"
    ? "Generic medicine prescribed · substitution permitted"
    : "Brand medicine prescribed · substitution permitted";
}

export function PrescriptionForm({ caseData }: PrescriptionFormProps) {
  const patient = caseData.patientLookup.prescriptionPatient;

  return (
    <article className="case-rx" aria-label={`Simulated prescription for case ${caseData.caseNumber}`}>
      <header className="case-rx-header">
        <div>
          <span className="case-rx-eyebrow">DispenseRx training artefact</span>
          <h2>Simulated prescription</h2>
        </div>
        <span className="case-rx-case-number">Case {caseData.caseNumber}</span>
      </header>

      <div className="case-rx-notice" role="note">
        This case document supports workflow practice. It is not a legal prescription
        and must not be used for patient care.
      </div>

      <section className="case-rx-section" aria-labelledby="case-rx-patient-heading">
        <div className="case-rx-section-heading" id="case-rx-patient-heading">Patient</div>
        <div className="case-rx-patient-name">{patient.name}</div>
        {patient.dateOfBirth && (
          <div className="case-rx-data-row">
            <span>Date of birth</span>
            <strong>{patient.dateOfBirth}</strong>
          </div>
        )}
        <div className="case-rx-data-row">
          <span>Address</span>
          <strong>{patient.address}</strong>
        </div>
        <div className="case-rx-data-row">
          <span>Medicare number</span>
          <strong>{patient.mcare}</strong>
        </div>
      </section>

      <section className="case-rx-items" aria-label="Medicines prescribed">
        {caseData.items.map((item, index) => (
          <div className="case-rx-item" key={`${item.correctDrugSeedId}-${index}`}>
            <div className="case-rx-item-heading">
              <span>Prescription item {index + 1}</span>
              <span>{caseData.items.length} item{caseData.items.length === 1 ? "" : "s"} total</span>
            </div>
            <div className="case-rx-medicine">{item.drug}</div>
            <div className="case-rx-directions">{item.directions}</div>
            <div className="case-rx-metrics">
              <div>
                <span>Quantity</span>
                <strong>{item.qty}</strong>
              </div>
              <div>
                <span>Repeats</span>
                <strong>{item.repeats}</strong>
              </div>
            </div>
            <div className="case-rx-substitution">
              {substitutionInstruction(item.prescribedProductType, item.genericSubstitutionAllowed)}
            </div>
          </div>
        ))}
      </section>

      {caseData.authority && (
        <section className="case-rx-section case-rx-authority" aria-labelledby="case-rx-authority-heading">
          <div className="case-rx-section-heading" id="case-rx-authority-heading">Authority details</div>
          <div className="case-rx-data-row">
            <span>{caseData.authority.type === "streamlined" ? "Streamlined code" : "Approval number"}</span>
            <strong>{caseData.authority.number}</strong>
          </div>
          <p>{caseData.authority.indication}</p>
        </section>
      )}

      <section className="case-rx-section" aria-labelledby="case-rx-prescriber-heading">
        <div className="case-rx-section-heading" id="case-rx-prescriber-heading">Prescriber</div>
        <div className="case-rx-prescriber-name">Dr {caseData.doctor}</div>
        <div className="case-rx-data-row">
          <span>Prescriber number shown</span>
          <strong>{caseData.prescriberNo}</strong>
        </div>
        <div className="case-rx-data-row">
          <span>Date prescribed</span>
          <strong>{caseData.date}</strong>
        </div>
        <div className="case-rx-data-row">
          <span>Prescription type</span>
          <strong>{caseData.scriptType}</strong>
        </div>
      </section>

      <footer className="case-rx-footer">
        Transcribe what is shown, then use the Fred-style workspace to complete the dispensing workflow.
      </footer>
    </article>
  );
}
