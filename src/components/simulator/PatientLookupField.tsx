"use client";
import { useState, useRef, useEffect } from "react";
import type { Patient } from "@/lib/types/patient";
import { PatientSelectionModal } from "./PatientSelectionModal";

interface Props {
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient) => void;
  onAddNew: (surname: string) => void;
  onStatusUpdate: (msg: string) => void;
}

export function PatientLookupField({
  selectedPatient,
  onPatientSelect,
  onAddNew,
  onStatusUpdate,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset input when selection is cleared externally (case change)
  useEffect(() => {
    if (!selectedPatient) {
      setInputValue("");
      setModalOpen(false);
    }
  }, [selectedPatient]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase();
    setInputValue(val);
    clearTimeout(debounceRef.current);
    if (val.length >= 1) {
      debounceRef.current = setTimeout(() => setModalOpen(true), 200);
    } else {
      setModalOpen(false);
    }
  }

  function handleSelect(patient: Patient) {
    setModalOpen(false);
    setInputValue("");
    onPatientSelect(patient);
    onStatusUpdate(`Patient selected: ${patient.surname}, ${patient.firstname}`);
  }

  function handleAddNew(surname: string) {
    setModalOpen(false);
    onAddNew(surname);
  }

  if (selectedPatient) {
    return (
      <div className="fred-patient-lookup-row">
        <span className="fred-patient-selected-name">
          {selectedPatient.surname}, {selectedPatient.firstname}
        </span>
        <button
          type="button"
          id="patient-lookup"
          className="fred-patient-change-btn"
          onClick={() => {
            setInputValue(selectedPatient.surname);
            setModalOpen(true);
          }}
        >
          Change
        </button>
        <PatientSelectionModal
          open={modalOpen}
          initialSurname={inputValue}
          onSelect={handleSelect}
          onAddNew={handleAddNew}
          onClose={() => setModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="fred-patient-lookup-row">
      <input
        id="patient-lookup"
        className="fred-patient-lookup-input"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Type surname to search..."
        autoComplete="off"
        onFocus={() => {
          if (inputValue.length >= 1) setModalOpen(true);
        }}
      />
      <PatientSelectionModal
        open={modalOpen}
        initialSurname={inputValue}
        onSelect={handleSelect}
        onAddNew={handleAddNew}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
