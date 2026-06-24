import type { PracticeCase } from "@/lib/types/case";

interface DrugDetailsBoxProps {
  typedDrug: string;
  caseData: PracticeCase;
}

export function DrugDetailsBox({ typedDrug, caseData }: DrugDetailsBoxProps) {
  const firstWord = caseData.drug.toLowerCase().split(" ")[0];
  const isMatched =
    typedDrug.trim() !== "" &&
    typedDrug.trim().toLowerCase().includes(firstWord);

  const d = isMatched ? caseData.drugDetails : null;

  return (
    <div className="fred-drug-details">
      <div className="fred-dd-title">{d ? d.name : "Drug Details"}</div>

      <div className="fred-dd-row">
        <strong>Schedule:</strong>{" "}
        <span className="fred-dd-blue">{d ? d.schedule : "—"}</span>
      </div>
      <div className="fred-dd-row">
        <strong>PBS:</strong>{" "}
        <span className="fred-dd-blue">{d ? d.pbs : "—"}</span>
      </div>
      <div className="fred-dd-row">
        <strong>Class:</strong> {d ? d.pbsClass : "—"}
      </div>
      <div className="fred-dd-row">
        <strong>Claimable:</strong>{" "}
        {d ? (
          <span
            className={
              d.claimable.includes("Not") ? "fred-dd-red" : "fred-dd-green"
            }
          >
            {d.claimable}
          </span>
        ) : (
          "—"
        )}
      </div>
      {d?.f2t && (
        <div className="fred-dd-row">
          <strong>F2T:</strong>{" "}
          <span className="fred-dd-blue">{d.f2t}</span>
        </div>
      )}
      <div className="fred-dd-row">
        <strong>Manufacturer:</strong>{" "}
        <span className="fred-dd-green">{d ? d.manufacturer : "—"}</span>
      </div>
      <div className="fred-dd-row">
        <strong>Cost:</strong> {d ? d.cost : "—"}
      </div>
      <div className="fred-dd-row">
        <strong>Retail:</strong> {d ? d.retail : "—"}
      </div>
      {d && (
        <>
          <div className="fred-dd-row">
            <strong>CMI:</strong> {d.cmi ? "Yes" : "No"}
          </div>
          {d.newDrug && (
            <div className="fred-dd-row fred-dd-green">★ New drug for patient</div>
          )}
          {d.warn1 && <div className="fred-dd-warn">{d.warn1}</div>}
          {d.warn2 && <div className="fred-dd-warn">{d.warn2}</div>}
          {caseData.allergyAlert && (
            <div className="fred-dd-allergy">⚠ {caseData.allergyAlert}</div>
          )}
        </>
      )}
    </div>
  );
}
