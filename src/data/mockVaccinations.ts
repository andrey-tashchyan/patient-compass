import type { Vaccination } from "@/components/layers/VaccinationLayer";

export const vaccinationsByPatient: Record<string, Vaccination[]> = {
  "P-001": [
    { name: "Grippe saisonnière", date: "2024-10-15", lot: "FL-2024-8834", site: "Bras gauche", nextDue: "2025-10-01", status: "à jour", provider: "Dr. Patel" },
    { name: "Pneumocoque (PCV20)", date: "2023-03-20", lot: "PV20-44821", site: "Bras droit", status: "à jour", provider: "Dr. Patel" },
    { name: "COVID-19 (bivalent)", date: "2023-11-10", lot: "CV-BV-90312", site: "Bras gauche", nextDue: "2024-11-01", status: "en retard", provider: "Dr. Patel" },
    { name: "Tétanos-Diphtérie-Coqueluche (dTca)", date: "2020-06-15", lot: "TDAP-22190", site: "Bras droit", nextDue: "2030-06-15", status: "à jour", provider: "Dr. Patel" },
    { name: "Zona (Shingrix)", date: "2021-09-01", lot: "SHX-77453", site: "Bras gauche", status: "à jour", provider: "Dr. Patel" },
    { name: "Hépatite B", date: "2019-07-10", lot: "HBV-33120", site: "Bras droit", status: "à jour", provider: "Dr. Chen" },
  ],
  "P-002": [
    { name: "Grippe saisonnière", date: "2024-10-20", lot: "FL-2024-9012", site: "Bras gauche", nextDue: "2025-10-01", status: "à jour", provider: "Dr. Patel" },
    { name: "COVID-19 (bivalent)", date: "2024-10-20", lot: "CV-BV-91205", site: "Bras droit", nextDue: "2025-10-01", status: "à jour", provider: "Dr. Patel" },
    { name: "Tétanos-Diphtérie-Coqueluche (dTca)", date: "2022-03-10", lot: "TDAP-28844", site: "Bras gauche", nextDue: "2032-03-10", status: "à jour", provider: "Dr. Patel" },
    { name: "ROR (Rougeole-Oreillons-Rubéole)", date: "1986-09-22", lot: "—", status: "à jour" },
    { name: "Coqueluche (rappel grossesse)", date: "2023-06-15", lot: "TDAP-30122", site: "Bras droit", status: "à jour", provider: "Dr. Patel" },
  ],
  "P-003": [
    { name: "Grippe saisonnière", date: "2024-10-01", lot: "FL-2024-7710", site: "Bras gauche", nextDue: "2025-10-01", status: "à jour", provider: "Dr. Wu" },
    { name: "Pneumocoque (PCV20)", date: "2022-11-15", lot: "PV20-41200", site: "Bras droit", status: "à jour", provider: "Dr. Wu" },
    { name: "COVID-19 (bivalent)", date: "2023-10-05", lot: "CV-BV-88440", site: "Bras gauche", nextDue: "2024-10-01", status: "en retard", provider: "Dr. Wu" },
    { name: "Zona (Shingrix) — dose 1", date: "2020-01-15", lot: "SHX-65321", site: "Bras droit", status: "à jour", provider: "Dr. Patel" },
    { name: "Zona (Shingrix) — dose 2", date: "2020-04-15", lot: "SHX-65890", site: "Bras droit", status: "à jour", provider: "Dr. Patel" },
    { name: "Tétanos-Diphtérie (dT)", date: "2018-05-20", lot: "DT-19283", site: "Bras gauche", nextDue: "2028-05-20", status: "à jour", provider: "Dr. Patel" },
  ],
};
