// All prescribers are fictional. Mirrors the rows inserted by migrations
// 0005_prescribers.sql, 0008_complex_cases.sql and 0009_multi_item_case.sql so
// the simulator can fall back to a bundled directory when the database is
// unavailable or has not had the latest migration applied.

export interface SeedPrescriber {
  seed_id: string;
  title: string;
  surname: string;
  firstname: string;
  prescriber_number: string;
  practice_name: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  phone: string;
}

const p = (o: SeedPrescriber): SeedPrescriber => o;

export const PRESCRIBER_LIBRARY: SeedPrescriber[] = [
  p({ seed_id: "prescriber-willis-harry", title: "DR", surname: "WILLIS", firstname: "HARRY", prescriber_number: "8015996", practice_name: "Harbour Family Practice", address: "15 MARKET STREET", suburb: "SYDNEY", state: "NSW", postcode: "2000", phone: "(02) 9000 1101" }),
  p({ seed_id: "prescriber-chen-linda", title: "DR", surname: "CHEN", firstname: "LINDA", prescriber_number: "7029384", practice_name: "Northside Medical Centre", address: "20 MILLER STREET", suburb: "NORTH SYDNEY", state: "NSW", postcode: "2060", phone: "(02) 9000 1102" }),
  p({ seed_id: "prescriber-watson-emily", title: "DR", surname: "WATSON", firstname: "EMILY", prescriber_number: "3847291", practice_name: "Henderson Road Medical", address: "8 HENDERSON ROAD", suburb: "NORTHCOTE", state: "VIC", postcode: "3070", phone: "(03) 9000 1103" }),
  p({ seed_id: "prescriber-kowalski-anna", title: "DR", surname: "KOWALSKI", firstname: "ANNA", prescriber_number: "9012847", practice_name: "Park Health Clinic", address: "11 PARK AVENUE", suburb: "RICHMOND", state: "VIC", postcode: "3121", phone: "(03) 9000 1104" }),
  p({ seed_id: "prescriber-yuen-richard", title: "DR", surname: "YUEN", firstname: "RICHARD", prescriber_number: "5512847", practice_name: "Central Diabetes Clinic", address: "32 GEORGE STREET", suburb: "PARRAMATTA", state: "NSW", postcode: "2150", phone: "(02) 9000 1105" }),
  p({ seed_id: "prescriber-bradley-tom", title: "DR", surname: "BRADLEY", firstname: "TOM", prescriber_number: "6623941", practice_name: "Chapel Street Medical", address: "19 CHAPEL STREET", suburb: "PRAHRAN", state: "VIC", postcode: "3181", phone: "(03) 9000 1106" }),
  p({ seed_id: "prescriber-singh-amrita", title: "DR", surname: "SINGH", firstname: "AMRITA", prescriber_number: "6147283", practice_name: "Yarra Pain and Palliative Clinic", address: "80 SWAN STREET", suburb: "RICHMOND", state: "VIC", postcode: "3121", phone: "(03) 9000 1107" }),
  p({ seed_id: "prescriber-rao-nisha", title: "DR", surname: "RAO", firstname: "NISHA", prescriber_number: "7812456", practice_name: "North Metro Child Psychiatry", address: "40 SYDNEY ROAD", suburb: "BRUNSWICK", state: "VIC", postcode: "3056", phone: "(03) 9000 1108" }),
  p({ seed_id: "prescriber-murphy-ellen", title: "DR", surname: "MURPHY", firstname: "ELLEN", prescriber_number: "3481752", practice_name: "Eastern Specialist Centre", address: "12 WHITEHORSE ROAD", suburb: "BOX HILL", state: "VIC", postcode: "3128", phone: "(03) 9000 1109" }),
  p({ seed_id: "prescriber-lee-jonathan", title: "DR", surname: "LEE", firstname: "JONATHAN", prescriber_number: "5294061", practice_name: "Camberwell Cardiology", address: "88 BURKE ROAD", suburb: "CAMBERWELL", state: "VIC", postcode: "3124", phone: "(03) 9000 1110" }),
  p({ seed_id: "prescriber-reed-elliot", title: "DR", surname: "REED", firstname: "ELLIOT", prescriber_number: "7399488", practice_name: "Sacred Heart General Practice", address: "2 ANGAS STREET", suburb: "ADELAIDE", state: "SA", postcode: "5000", phone: "(08) 8586 0440" }),
];
