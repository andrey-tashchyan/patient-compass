export interface PastEncounter {
  id: string;
  date: string;
  reason: string;
  type: 'consultation' | 'urgence' | 'hospitalisation' | 'examen';
  provider: string;
  specialty: string;
  summary: string;
  outcome?: string;
  documents: EncounterDocument[];
}

export interface EncounterDocument {
  id: string;
  name: string;
  type: 'compte-rendu' | 'ordonnance' | 'résultat' | 'imagerie' | 'courrier' | 'consentement';
  date: string;
  content: string; // raw text content
}

export const encountersByPatient: Record<string, PastEncounter[]> = {
  "P-001": [
    {
      id: "E1",
      date: "2025-02-18",
      reason: "Suivi insuffisance cardiaque — réévaluation diurétiques",
      type: "consultation",
      provider: "Dr. Sarah Chen",
      specialty: "Cardiologie",
      summary: "Patient toujours en surcharge volémique malgré furosémide 80mg IV BID. Augmentation à 120mg. Echocardiographie de contrôle prévue. BNP en baisse à 1 240 (vs 1 800 à l'admission).",
      outcome: "Ajustement thérapeutique — surveillance rapprochée",
      documents: [
        {
          id: "D1",
          name: "Compte-rendu de consultation cardiologique",
          type: "compte-rendu",
          date: "2025-02-18",
          content: `COMPTE-RENDU DE CONSULTATION — CARDIOLOGIE
Date : 18/02/2025
Patient : James MORRISON (MRN-2024-00847)
Praticien : Dr. Sarah Chen — Cardiologie, Portland Heart Center

MOTIF : Suivi insuffisance cardiaque aiguë sur chronique, J8 d'hospitalisation.

HISTOIRE DE LA MALADIE :
Patient de 67 ans, ATCD de CABG x3 (2019), IC systolique chronique (FEVG 30% au dernier ETT du 15/02), DT2, IRC stade 3. Hospitalisé le 10/02 pour exacerbation d'IC avec dyspnée de repos, orthopnée et œdèmes bilatéraux des MI.

EXAMEN CLINIQUE :
- PA : 158/94 mmHg, FC : 104 bpm, SpO2 : 91% AA
- Cardiovasculaire : B3 présent, souffle de régurgitation mitrale 2/6, TJ positive
- Pulmonaire : Crépitants bibasilaires, diminution du MV aux bases
- Membres inférieurs : Œdèmes prenant le godet 2+ bilatéraux
- Poids : 198 lbs (poids sec estimé 185 lbs)

BIOLOGIE :
- BNP : 1 240 pg/mL (admission 1 800) — en amélioration
- Créatinine : 1.8 mg/dL (stable)
- K+ : 5.4 mEq/L — à surveiller
- Troponine I : 0.08 ng/mL

CONCLUSION :
Insuffisance cardiaque aiguë décompensée en cours d'amélioration sous diurétiques IV mais objectif de poids sec non atteint. Hyperkaliémie modérée à surveiller.

CONDUITE À TENIR :
1. Majoration furosémide à 120mg IV BID
2. Restriction hydrique 1.5L/j maintenue
3. Contrôle ionogramme à 24h
4. ETT de contrôle à J10
5. Discussion ICD si FEVG reste < 35% à distance

Dr. Sarah Chen
Cardiologue — Heart Failure Specialist`
        },
        {
          id: "D2",
          name: "Résultats biologiques du 18/02",
          type: "résultat",
          date: "2025-02-18",
          content: `RÉSULTATS DE LABORATOIRE
Date de prélèvement : 18/02/2025 — 08:00
Patient : James MORRISON (MRN-2024-00847)

═══════════════════════════════════════════
HÉMATOLOGIE
  WBC .............. 7.2 K/uL      [4.5-11.0]     ✓
  Hémoglobine ...... 11.8 g/dL     [13.5-17.5]     ▼ BAS
  Hématocrite ...... 35.2 %        [38.8-50.0]     ▼ BAS
  Plaquettes ....... 198 K/uL      [150-400]       ✓

BIOCHIMIE
  BNP .............. 1,240 pg/mL   [<100]          ▲▲ CRITIQUE
  Troponine I ...... 0.08 ng/mL    [<0.04]         ▲ ÉLEVÉ
  Créatinine ....... 1.8 mg/dL     [0.7-1.3]       ▲ ÉLEVÉ
  DFG estimé ....... 38 mL/min     [>60]           ▼ BAS
  Sodium ........... 138 mEq/L     [136-145]       ✓
  Potassium ........ 5.4 mEq/L     [3.5-5.0]       ▲ ÉLEVÉ
  Chlorures ........ 101 mEq/L     [98-106]        ✓
  Bicarbonates ..... 22 mEq/L      [22-29]         ✓
  Urée ............. 42 mg/dL      [7-20]          ▲ ÉLEVÉ
  Glucose .......... 162 mg/dL     [70-100]        ▲ ÉLEVÉ

BILAN HÉPATIQUE
  ASAT ............. 28 U/L        [10-40]         ✓
  ALAT ............. 32 U/L        [7-56]          ✓
  Albumine ......... 3.2 g/dL      [3.5-5.5]       ▼ BAS

Validé par : Laboratoire central — St. Vincent Medical Center`
        }
      ]
    },
    {
      id: "E2",
      date: "2025-02-15",
      reason: "Échocardiographie transthoracique de contrôle",
      type: "examen",
      provider: "Dr. Mark Wilson",
      specialty: "Imagerie cardiaque",
      summary: "ETT montrant FEVG 30% (vs 35% en décembre 2024), régurgitation mitrale modérée, dilatation VG. Pas de thrombus intracavitaire. Épanchement péricardique minime.",
      outcome: "Dégradation de la FEVG — à réévaluer à distance",
      documents: [
        {
          id: "D3",
          name: "Compte-rendu ETT",
          type: "imagerie",
          date: "2025-02-15",
          content: `ÉCHOCARDIOGRAPHIE TRANSTHORACIQUE
Date : 15/02/2025
Patient : James MORRISON (MRN-2024-00847)
Opérateur : Dr. Mark Wilson

INDICATION : Insuffisance cardiaque décompensée — évaluation FEVG.

RÉSULTATS :
Ventricule gauche :
  - DTDVG : 62 mm (N < 56)  — dilaté
  - FEVG : 30% (Simpson biplan) — altération sévère
  - Hypokinésie globale, akinésie antéro-septale
  - Pas de thrombus intracavitaire

Valve mitrale :
  - Régurgitation mitrale modérée (grade II/IV)
  - Mécanisme fonctionnel par dilatation de l'anneau

Ventricule droit :
  - TAPSE : 16 mm — limite inférieure
  - PAPs estimée : 45 mmHg — HTAP modérée

Péricarde :
  - Épanchement péricardique minime, non compressif

Aorte :
  - Racine aortique : 34 mm — normale
  - Pas de valvulopathie aortique significative

CONCLUSION :
Cardiopathie dilatée avec FEVG sévèrement altérée à 30% (dégradation par rapport à 35% en 12/2024). IM modérée fonctionnelle. HTAP modérée. Pas de thrombus. Réévaluation recommandée à 3 mois ou après optimisation thérapeutique.

Dr. Mark Wilson
Imagerie Cardiaque — St. Vincent Medical Center`
        }
      ]
    },
    {
      id: "E3",
      date: "2025-02-10",
      reason: "Admission aux urgences — dyspnée aiguë, œdèmes",
      type: "urgence",
      provider: "Dr. Robert Kim",
      specialty: "Médecine d'urgence",
      summary: "Arrivée en dyspnée de repos, orthopnée à 3 oreillers, œdèmes bilatéraux en aggravation depuis 4 jours. BNP 1 800. Radiographie thoracique : surcharge vasculaire bilatérale. Mise sous furosémide IV et oxygénothérapie.",
      outcome: "Admission en cardiologie — IC aiguë décompensée",
      documents: [
        {
          id: "D4",
          name: "Compte-rendu d'admission urgences",
          type: "compte-rendu",
          date: "2025-02-10",
          content: `COMPTE-RENDU D'ADMISSION — SERVICE D'URGENCES
Date : 10/02/2025 — 22:45
Patient : James MORRISON, 67 ans (MRN-2024-00847)
Praticien : Dr. Robert Kim — Médecine d'urgence

MOTIF D'ADMISSION : Dyspnée aiguë d'aggravation progressive.

HISTOIRE :
Le patient rapporte une aggravation progressive de sa dyspnée depuis 4-5 jours avec apparition d'une orthopnée (3 oreillers), d'œdèmes des membres inférieurs bilatéraux et d'une prise de poids de 6 kg. Il signale un écart de régime (repas salés) et une observance thérapeutique incomplète (oubli de furosémide pendant 2 jours).

ANTÉCÉDENTS PERTINENTS :
- IC systolique chronique (FEVG 35%, 12/2024), CABG x3 (2019)
- DT2 sous metformine + empagliflozine
- IRC stade 3 (créatinine baseline 1.5)
- HTA, dyslipidémie

EXAMEN À L'ARRIVÉE :
- PA : 172/98 mmHg, FC : 112 bpm, SpO2 : 88% AA → 93% sous O2 4L
- Détresse respiratoire modérée, tirage intercostal
- Crépitants bilatéraux jusqu'aux 2/3 des champs
- OMI 3+ bilatéraux, TJ à 45°
- Abdomen : hépatomégalie à 3 travers de doigt

BIOLOGIE INITIALE :
- BNP : 1 800 pg/mL
- Troponine I : 0.06 ng/mL
- Créatinine : 2.0 mg/dL
- K+ : 5.1 mEq/L

IMAGERIE :
- RX thorax : cardiomégalie, surcharge vasculaire bilatérale, épanchement pleural droit minime

PRISE EN CHARGE :
1. Furosémide 80mg IV bolus puis 80mg IV BID
2. O2 4L lunettes nasales
3. Restriction hydrique 1.5L/j
4. Monitoring continu
5. Avis cardiologie demandé

ORIENTATION : Admission en cardiologie (chambre 412)

Dr. Robert Kim
Médecin urgentiste — St. Vincent Medical Center`
        },
        {
          id: "D5",
          name: "Radiographie thoracique",
          type: "imagerie",
          date: "2025-02-10",
          content: `COMPTE-RENDU DE RADIOGRAPHIE THORACIQUE
Date : 10/02/2025 — 23:15
Patient : James MORRISON (MRN-2024-00847)
Incidence : Face, au lit

RÉSULTATS :
- Cardiomégalie (index cardiothoracique > 0.55)
- Redistribution vasculaire vers les sommets
- Opacités alvéolo-interstitielles bilatérales prédominant aux bases
- Lignes de Kerley B visibles
- Épanchement pleural droit de faible abondance
- Pas de foyer parenchymateux individualisable
- Matériel post-CABG en place, sternotomie ancienne

CONCLUSION :
Aspect en faveur d'un œdème pulmonaire cardiogénique avec épanchement pleural droit minime. Pas de foyer infectieux patent. Corrélation au contexte d'insuffisance cardiaque décompensée.

Dr. A. Nguyen — Radiologue`
        }
      ]
    },
    {
      id: "E4",
      date: "2024-12-05",
      reason: "Suivi cardiologique de routine — IC stable",
      type: "consultation",
      provider: "Dr. Sarah Chen",
      specialty: "Cardiologie",
      summary: "Patient stable sous traitement. FEVG 35%, NYHA II. Pas de décompensation récente. Bilan biologique satisfaisant. Poursuite du traitement actuel.",
      outcome: "Stable — prochain RDV dans 3 mois",
      documents: [
        {
          id: "D6",
          name: "Compte-rendu de consultation",
          type: "compte-rendu",
          date: "2024-12-05",
          content: `COMPTE-RENDU DE CONSULTATION — CARDIOLOGIE
Date : 05/12/2024
Patient : James MORRISON (MRN-2024-00847)
Praticien : Dr. Sarah Chen

MOTIF : Suivi trimestriel insuffisance cardiaque chronique.

Le patient va globalement bien. Dyspnée stade II NYHA stable. Bonne observance thérapeutique rapportée. Pas d'orthopnée, pas d'œdèmes. Poids stable à 192 lbs.

EXAMEN : PA 132/78, FC 72, SpO2 97%. Pas de signe de surcharge. Examen cardio-pulmonaire sans particularité.

BNP : 280 pg/mL (stable). Créatinine 1.5. K+ 4.8. HbA1c 7.8%.

CONCLUSION : IC systolique stable sous traitement médical optimal. Poursuite à l'identique. RDV dans 3 mois avec ETT de contrôle.

Dr. Sarah Chen`
        }
      ]
    },
    {
      id: "E5",
      date: "2024-08-15",
      reason: "Chute à domicile — fracture du col fémoral gauche",
      type: "urgence",
      provider: "Dr. Amy Liu",
      specialty: "Urgences / Orthopédie",
      summary: "Chute mécanique à domicile. Radiographie confirmant fracture du col fémoral gauche Garden III. Opéré le jour même (ORIF par Dr. James Park). Suites simples.",
      outcome: "ORIF hanche gauche — rééducation post-opératoire",
      documents: [
        {
          id: "D7",
          name: "Compte-rendu opératoire — ORIF hanche",
          type: "compte-rendu",
          date: "2024-08-15",
          content: `COMPTE-RENDU OPÉRATOIRE
Date : 15/08/2024
Patient : James MORRISON (MRN-2024-00847)
Chirurgien : Dr. James Park — Orthopédie
Anesthésiste : Dr. K. Williams — Rachianesthésie

INTERVENTION : Réduction ouverte et fixation interne (ORIF) — fracture du col fémoral gauche

INDICATION : Fracture du col fémoral gauche Garden III suite à chute mécanique à domicile.

TECHNIQUE : Voie d'abord antéro-latérale. Réduction anatomique sous amplificateur de brillance. Fixation par 3 vis canulées 7.0mm. Bonne stabilité en per-opératoire. Hémostase soigneuse. Fermeture plan par plan. Drain de Redon.

DURÉE : 1h15
PERTES SANGUINES : 200 mL estimés
COMPLICATIONS : Aucune

POST-OPÉRATOIRE : Appui partiel J1. Thromboprophylaxie par HBPM. Kinésithérapie précoce.

Dr. James Park — Chirurgien orthopédiste`
        }
      ]
    }
  ],
  "P-002": [
    {
      id: "E1",
      date: "2025-02-17",
      reason: "Suivi thyroïde — aggravation thyrotoxicose",
      type: "consultation",
      provider: "Dr. Anna Volkov",
      specialty: "Endocrinologie",
      summary: "TSH effondrée à 0.15, T4L élevée à 2.8. Palpitations et tremblements persistants. Introduction propranolol 20mg TID pour contrôle symptomatique. Discussion méthimazole à revoir selon évolution.",
      outcome: "Propranolol débuté — contrôle TSH à 4 semaines",
      documents: [
        {
          id: "D1",
          name: "Compte-rendu endocrinologie",
          type: "compte-rendu",
          date: "2025-02-17",
          content: `COMPTE-RENDU DE CONSULTATION — ENDOCRINOLOGIE
Date : 17/02/2025
Patiente : Aisha RAHMAN (MRN-2024-01293)
Praticien : Dr. Anna Volkov

MOTIF : Suivi thyrotoxicose post-partum — aggravation symptomatique.

Patiente de 40 ans, ATCD de thyroïdite du post-partum diagnostiquée en 01/2024. Phase hyperthyroïdienne persistante. Allaitement en cours.

Symptômes : palpitations quotidiennes, tremblements des mains, intolérance à la chaleur, perte de poids de 2.5 kg en 1 mois, anxiété majorée.

TSH : 0.15 mIU/L (effondré), T4L : 2.8 ng/dL (élevé).
Échographie thyroïdienne du 15/02 : thyroïde diffusément augmentée, pas de nodule.

DÉCISION : Introduction propranolol 20mg TID (compatible allaitement). Surveillance TSH à 4 semaines. Si persistance > 6 mois, discussion méthimazole faible dose.

Dr. Anna Volkov`
        }
      ]
    },
    {
      id: "E2",
      date: "2025-02-15",
      reason: "Échographie thyroïdienne",
      type: "examen",
      provider: "Dr. Anna Volkov",
      specialty: "Imagerie",
      summary: "Thyroïde diffusément augmentée de volume, hyper-vascularisée. Pas de nodule individualisable. Aspect compatible avec thyroïdite.",
      outcome: "Thyroïdite confirmée — pas de nodule suspect",
      documents: [
        {
          id: "D2",
          name: "Compte-rendu échographie thyroïdienne",
          type: "imagerie",
          date: "2025-02-15",
          content: `ÉCHOGRAPHIE THYROÏDIENNE
Date : 15/02/2025
Patiente : Aisha RAHMAN (MRN-2024-01293)

Lobe droit : 22 x 20 x 52 mm — augmenté
Lobe gauche : 20 x 18 x 48 mm — augmenté
Isthme : 5 mm — normal

Échostructure : hypoéchogène diffuse, hyper-vascularisation au Doppler couleur (aspect « thyroid inferno »). Pas de nodule individualisable. Pas d'adénopathie cervicale.

CONCLUSION : Thyroïde diffusément augmentée et hyper-vascularisée, compatible avec thyroïdite auto-immune en phase active. Pas de lésion focale suspecte.`
        }
      ]
    }
  ],
  "P-003": [
    {
      id: "E1",
      date: "2025-02-19",
      reason: "Avis gériatrique — délirium sur démence",
      type: "consultation",
      provider: "Dr. Helen Wu",
      specialty: "Gériatrie",
      summary: "Confusion en amélioration sous antibiothérapie. CAM positif mais score en baisse. Mesures non pharmacologiques renforcées (orientation, présence familiale, rythme veille-sommeil).",
      outcome: "Délirium en résolution — plan de sortie en préparation",
      documents: [
        {
          id: "D1",
          name: "Note gériatrique",
          type: "compte-rendu",
          date: "2025-02-19",
          content: `NOTE DE CONSULTATION GÉRIATRIQUE
Date : 19/02/2025
Patiente : Eleanor WHITFIELD (MRN-2024-00312)
Praticien : Dr. Helen Wu — Gériatrie

MOTIF : Délirium superposé sur maladie d'Alzheimer, J3 d'hospitalisation pour IU.

La patiente est plus calme ce jour. Orientée dans le temps partiellement (sait qu'on est en hiver, ne donne pas la date). Reconnaît son fils. CAM toujours positif mais amélioration nette vs J1.

MMSE : 14/30 (baseline pré-morbide : 18/30).

RECOMMANDATIONS :
1. Poursuivre ceftriaxone jusqu'à J7
2. Mesures non-pharma : réorientation fréquente, lunettes et appareil auditif en place, mobilisation douce, présence familiale encouragée
3. Éviter benzodiazépines et anticholinergiques
4. Réévaluation MMSE à J7 pour évaluer retour au baseline
5. Discussion avec fils pour renforcement aide à domicile au retour (passage de 4h à 8h/jour)

Dr. Helen Wu`
        }
      ]
    },
    {
      id: "E2",
      date: "2025-02-16",
      reason: "Admission — infection urinaire avec confusion aiguë",
      type: "urgence",
      provider: "Dr. James Park",
      specialty: "Médecine interne",
      summary: "Amenée par son fils pour confusion aiguë depuis 24h. ECBU positif, CRP élevée. Diagnostic d'IU compliquée de délirium sur terrain de maladie d'Alzheimer. Antibiothérapie IV débutée.",
      outcome: "Admission — ceftriaxone IV, surveillance neurologique",
      documents: [
        {
          id: "D2",
          name: "Compte-rendu d'admission",
          type: "compte-rendu",
          date: "2025-02-16",
          content: `COMPTE-RENDU D'ADMISSION
Date : 16/02/2025
Patiente : Eleanor WHITFIELD, 83 ans (MRN-2024-00312)
Praticien : Dr. James Park

MOTIF : Confusion aiguë, agitation.

Amenée par son fils David pour confusion d'apparition brutale depuis environ 24h. Dysurie et pollakiurie rapportées les jours précédents. Baseline : Alzheimer stade léger, MMSE 18/30, vit avec fils + aide 4h/jour.

EXAMEN : T 38.8°C, PA 134/82, FC 92. Confuse, orientée x1 (personne), agitée par moments. Sensibilité sus-pubienne. Urines troubles.

ECBU : leucocyturie massive, E. coli > 10^5 UFC/mL.
WBC : 15.8 K/uL. CRP : 82 mg/L.

DIAGNOSTIC : Infection urinaire à E. coli compliquée de délirium (CAM positif) sur terrain de maladie d'Alzheimer.

TRAITEMENT : Ceftriaxone 1g IV/j. Hydratation. Surveillance neurologique. Précautions chute (alarme lit). Avis gériatrique demandé.

Dr. James Park`
        }
      ]
    }
  ]
};
