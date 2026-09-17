export const PATIENT_SCRIPTS: Record<
  string,
  Array<{ script_date: string; drug: string; qty: string; repeats: number; rx_number: string }>
> = {
  "patient-john-smith-abbotsford": [
    { script_date: "20/03/17", drug: "SIMVASTATIN (AN) TAB 10mg", qty: "30", repeats: 5, rx_number: "1083" },
    { script_date: "15/01/17", drug: "AMLODIPINE TAB 5mg", qty: "30", repeats: 5, rx_number: "987" },
  ],
  "patient-margaret-jones-fitzroy": [
    { script_date: "01/06/17", drug: "WARFARIN TAB 5mg", qty: "30", repeats: 0, rx_number: "2201" },
    { script_date: "01/05/17", drug: "WARFARIN TAB 5mg", qty: "30", repeats: 0, rx_number: "2198" },
    { script_date: "01/04/17", drug: "WARFARIN TAB 5mg", qty: "30", repeats: 0, rx_number: "2189" },
  ],
  "patient-david-park-hawthorn": [
    { script_date: "15/03/17", drug: "TEMAZEPAM TAB 10mg", qty: "30", repeats: 0, rx_number: "P-441" },
    { script_date: "10/01/17", drug: "TEMAZEPAM TAB 10mg", qty: "30", repeats: 0, rx_number: "P-398" },
  ],
  "patient-carol-simmons-carlton": [
    { script_date: "01/06/17", drug: "METFORMIN TAB 500mg", qty: "60", repeats: 5, rx_number: "3301" },
    { script_date: "01/06/17", drug: "RAMIPRIL TAB 5mg", qty: "56", repeats: 2, rx_number: "3302" },
    { script_date: "20/06/17", drug: "CIMETIDINE TAB 400mg", qty: "28", repeats: 0, rx_number: "3389" },
  ],
  "patient-peter-morales-richmond": [
    { script_date: "17/06/26", drug: "OXYCONTIN MR TAB 20mg", qty: "28", repeats: 0, rx_number: "S8-7741" },
    { script_date: "20/05/26", drug: "OXYCONTIN MR TAB 20mg", qty: "28", repeats: 0, rx_number: "S8-7480" },
    { script_date: "20/05/26", drug: "OXYCODONE IR TAB 5mg", qty: "20", repeats: 0, rx_number: "S8-7481" },
  ],
  "patient-helen-brooks-kew": [
    { script_date: "03/07/26", drug: "PARACETAMOL TAB 500mg", qty: "100", repeats: 2, rx_number: "6112" },
  ],
  "patient-noah-williams-brunswick": [
    { script_date: "18/06/26", drug: "ASPEN DEXAMFETAMINE TAB 5mg", qty: "100", repeats: 0, rx_number: "S8-8201" },
    { script_date: "19/05/26", drug: "ASPEN DEXAMFETAMINE TAB 5mg", qty: "100", repeats: 0, rx_number: "S8-7940" },
  ],
  "patient-grace-lim-box-hill": [
    { script_date: "21/06/26", drug: "METHOTREXATE TAB 10mg — once weekly", qty: "12", repeats: 2, rx_number: "7012" },
    { script_date: "21/06/26", drug: "FOLIC ACID TAB 5mg", qty: "20", repeats: 5, rx_number: "7013" },
  ],
  "patient-rahul-mehta-footscray": [
    { script_date: "15/06/26", drug: "QUILONUM SR TAB 450mg", qty: "100", repeats: 2, rx_number: "7182" },
    { script_date: "12/07/26", drug: "IBUPROFEN TAB 400mg", qty: "30", repeats: 0, rx_number: "7241" },
  ],
  "patient-evelyn-scott-camberwell": [
    { script_date: "16/06/26", drug: "ELIQUIS TAB 2.5mg", qty: "60", repeats: 5, rx_number: "7318" },
    { script_date: "16/06/26", drug: "NAPROXEN TAB 500mg", qty: "50", repeats: 1, rx_number: "7319" },
  ],
  "patient-john-smith-richmond": [
    { script_date: "10/05/17", drug: "ATORVASTATIN TAB 20mg", qty: "30", repeats: 5, rx_number: "4001" },
  ],
  "patient-fred-health": [
    { script_date: "01/03/17", drug: "LISINOPRIL TAB 10mg", qty: "30", repeats: 5, rx_number: "5001" },
    { script_date: "15/04/17", drug: "ASPIRIN TAB 100mg", qty: "30", repeats: 11, rx_number: "5002" },
  ],
};
PATIENT_SCRIPTS["patient-john-smith-abbotsford"].push({script_date:"23/06/17",drug:"ERYTHROMYCIN (MAYNE PHARMA) CAP 250mg",qty:"25",repeats:1,rx_number:"5001"});
PATIENT_SCRIPTS["patient-carol-simmons-carlton"].push({script_date:"25/05/17",drug:"METFORMIN (AN) TAB 1000mg",qty:"60",repeats:5,rx_number:"5002"});
PATIENT_SCRIPTS["patient-christopher-carruthers-adelaide"] = [{script_date:"10/07/25",drug:"METEX XR ER TAB 500mg",qty:"120",repeats:5,rx_number:"5003"},{script_date:"10/07/25",drug:"JANUVIA TAB 100mg",qty:"28",repeats:5,rx_number:"5004"}];
