import { giorniTra } from './util.js';

// ─── SEDUTE ──────────────────────────────────────────────────────────────────

export const SEDUTE = {

  F1: { codice: 'F1', titolo: 'Forza GAMBE', colore: 'blu', esercizi: [
    { nome: 'Affondo bulgaro', serie: 4, reps: '10-12 per gamba', note: 'manubri 6 kg o zaino, tempo 3-1-1' },
    { nome: 'Affondi all\'indietro', serie: 3, reps: '12 per gamba' },
    { nome: 'Ponte glutei a una gamba', serie: 3, reps: '12-15 per gamba' },
    { nome: 'Polpacci a una gamba', serie: 4, reps: '15-20' },
    { nome: 'Tibiale punta su/giù', serie: 3, reps: '20' },
    { nome: 'Plank', serie: 3, reps: '40 secondi' },
  ]},

  F2: { codice: 'F2', titolo: 'Forza PARTE ALTA (spinta + tirata)', colore: 'blu', esercizi: [
    { nome: 'Piegamenti (push-up)', serie: 4, reps: 'a RIR 2', note: 'tempo 3-1-1' },
    { nome: 'Trazioni con elastico', serie: 4, reps: '8-10', note: 'usa meno elastico col passare delle settimane' },
    { nome: 'Piegamenti a V (pike, per le spalle)', serie: 3, reps: '8-12' },
    { nome: 'Rematore con manubrio 6 kg', serie: 3, reps: '12-15 per braccio' },
    { nome: 'Face pull con elastico', serie: 3, reps: '15-20' },
    { nome: 'Pallof press con elastico', serie: 3, reps: '30 secondi per lato' },
  ]},

  F3: { codice: 'F3', titolo: 'Forza DIETRO + COMPLETA', colore: 'blu', esercizi: [
    { nome: 'Stacco rumeno a una gamba (manubri)', serie: 3, reps: '10 per gamba' },
    { nome: 'Nordic curl assistito con elastico (femorali)', serie: 3, reps: '4-6' },
    { nome: 'Step-up su gradino alto (manubri)', serie: 3, reps: '12 per gamba' },
    { nome: 'Piegamenti in declino (piedi su sedia)', serie: 3, reps: 'a RIR 2' },
    { nome: 'Copenhagen plank (adduttori, parti facile)', serie: 3, reps: '20-30 sec per lato' },
    { nome: 'Hollow hold (addome)', serie: 3, reps: '30 secondi' },
  ]},

  F4: { codice: 'F4', titolo: 'Forza PARTE ALTA n°2 + accessori', colore: 'blu', esercizi: [
    { nome: 'Trazioni con elastico', serie: 4, reps: '6-8', note: 'obiettivo: la prima trazione senza elastico' },
    { nome: 'Piegamenti archer o in declino', serie: 3, reps: 'a RIR 2' },
    { nome: 'Spinte sopra la testa (manubri 6 kg)', serie: 3, reps: '12' },
    { nome: 'Rematore con manubrio', serie: 3, reps: '12 per braccio' },
    { nome: 'Affondi camminati', serie: 3, reps: '12 per gamba' },
    { nome: 'Leg raise', serie: 3, reps: '12' },
    { nome: 'Plank laterale', serie: 3, reps: '30 sec per lato' },
  ]},

  Fm: { codice: 'Fm', titolo: 'Forza MANTENIMENTO (Blocco 2, breve)', colore: 'blu', esercizi: [
    { nome: 'Affondo bulgaro', serie: 3, reps: '8', note: 'carico pieno, esplosivo a salire' },
    { nome: 'Trazioni', serie: 3, reps: '6-8' },
    { nome: 'Piegamenti con zaino', serie: 3, reps: '8' },
    { nome: 'Nordic curl', serie: 3, reps: '5' },
    { nome: 'Polpacci', serie: 3, reps: '15' },
  ]},

  R: { codice: 'R', titolo: 'Riscaldamento (10 min)', colore: 'fuoco', voci: [
    'Corsa o bici leggera 3\'',
    'Mini-band glutei (camminata laterale)',
    'Mobilità anche e caviglie',
    '3-4 allunghi/saltelli che salgono d\'intensità',
  ]},

  V: { codice: 'V', titolo: 'VELOCITÀ + SALITA', colore: 'verde', voci: [
    'R + skip A/B 5\'',
    'Salita: scatti di 20 m × 6-8 (risali camminando = il tuo recupero). Massima qualità, fresco.',
    'Accelerazioni in piano 10-20 m × 4',
    '⚠️ Mai scendere la salita di corsa (fa male alle ginocchia).',
  ]},

  AG: { codice: 'AG', titolo: 'AGILITÀ e CAMBI DI DIREZIONE', colore: 'giallo', voci: [
    'R + mini-band',
    'Decelerazioni: scatto 10 m → frenata in 2-3 passi × 6',
    '5-10-5 (avanti-indietro tra coni) × 4 + slalom a zig-zag tra i cinesini × 4',
    'Blocco 2: parti sullo stimolo — un compagno o la pallina da tennis ti indica la direzione all\'ultimo.',
  ]},

  P: { codice: 'P', titolo: 'POTENZA + PLIOMETRIA (Blocco 2)', colore: 'rosso', voci: [
    'R completo',
    'Balzi in salita 4-6 × 20 m (è la tua pliometria principale: tanta resa, poco impatto)',
    'Salti da fermo (jump squat) 4 × 4 + Affondi esplosivi (6 kg) 3 × 5/gamba + Piegamenti esplosivi 4 × 5',
    'Saltelli reattivi a terra (atterraggio morbido e silenzioso)',
    'Recupero pieno 2-3\', massima esplosività, sempre fresco (mai a stanchezza).',
  ]},

  T: { codice: 'T', titolo: 'TECNICA + PIEDE SINISTRO (30-45 min)', colore: 'bianco', voci: [
    'Per ogni tocco col destro, fanne 2 col sinistro. Scegli 4-5 voci:',
    'Muro: 100+ passaggi di sinistro (interno + suola)',
    'Ball mastery 8\' (suola, tocchi, croqueta…)',
    'Conduzione tra i coni solo sinistro',
    'Tiro di sinistro ai bersagli (coni negli angoli) — 40 tiri, conta i centri',
    'Pivot: ricevi di spalle dal muro → proteggi palla → giro → concludi',
    'Fixo: passaggio lungo coi due piedi (pallone calcio a 11) a bersaglio 15-20 m',
    'Palleggio di sinistro (anche con la pallina da tennis per il controllo fine)',
  ]},

  C: { codice: 'C', titolo: 'CONDIZIONALE (fiato)', colore: 'viola', voci: [
    'Blocco 1 (aerobico): bici a intervalli 1\' forte / 2\' piano × 8, oppure corsa continua 20-25\'.',
    'Blocco 2 (da partita): scatti ripetuti 6-8 × 40 m con 30" di recupero, 2-3 serie.',
  ]},

  REC: { codice: 'REC', titolo: 'RECUPERO ATTIVO', colore: 'grigio', voci: [
    'Bici facile 30-40\'',
    'Mobilità 15\'',
    'Foam roller',
    'Tocco di sinistro per piacere. Niente forza, niente sprint.',
  ]},

  MOB: { codice: 'MOB', titolo: 'Mattina leggera (giorni con la società)', colore: 'grigio', voci: [
    '15-20\': mobilità + 80 tocchi di sinistro al muro. Così arrivi sciolto all\'allenamento del club.',
  ]},
};

// ─── CALENDARIO ──────────────────────────────────────────────────────────────

// Blocco 1: Gio-Mer
// Gio: T AM + F1 PM
// Ven: V AM + F2 PM
// Sab: T AM + C PM
// Dom: REC AM
// Lun: AG AM + F3 PM
// Mar: T AM + F4 PM
// Mer: T AM (leggero/mobilità)
const SCHEMA_B1 = [
  [['T','AM'],['F1','PM']],
  [['V','AM'],['F2','PM']],
  [['T','AM'],['C','PM']],
  [['REC','AM']],
  [['AG','AM'],['F3','PM']],
  [['T','AM'],['F4','PM']],
  [['T','AM']],
];

// Blocco 2: Gio-Mer
// Gio: P AM + Fm PM
// Ven: T AM + AG PM
// Sab: V AM + C PM
// Dom: REC AM
// Lun: P AM + Fm PM
// Mar: T AM + AG PM
// Mer: T AM (mobilità leggera)
const SCHEMA_B2 = [
  [['P','AM'],['Fm','PM']],
  [['T','AM'],['AG','PM']],
  [['V','AM'],['C','PM']],
  [['REC','AM']],
  [['P','AM'],['Fm','PM']],
  [['T','AM'],['AG','PM']],
  [['T','AM']],
];

function aggiungiSettimana(cal, inizioISO, schema) {
  const d = new Date(inizioISO + 'T12:00:00');
  for (const giorno of schema) {
    cal[d.toISOString().slice(0, 10)] = giorno;
    d.setDate(d.getDate() + 1);
  }
}

export const CALENDARIO = {};

// Scarico totale: 2–8 luglio (7 giorni vuoti)
for (let i = 0; i < 7; i++) CALENDARIO[new Date(new Date('2026-07-02T12:00:00').getTime() + i * 864e5).toISOString().slice(0, 10)] = [];

// Blocco 1: settimane A, B, C (Gio 9 lug, Gio 16 lug, Gio 23 lug)
for (const inizio of ['2026-07-09', '2026-07-16', '2026-07-23']) aggiungiSettimana(CALENDARIO, inizio, SCHEMA_B1);

// Blocco 2: settimane D, E, F (Gio 30 lug, Gio 6 ago, Gio 13 ago)
for (const inizio of ['2026-07-30', '2026-08-06', '2026-08-13']) aggiungiSettimana(CALENDARIO, inizio, SCHEMA_B2);

// Taper finale: 20–22 agosto
CALENDARIO['2026-08-20'] = [['V', 'AM']];
CALENDARIO['2026-08-21'] = [['T', 'AM']];
CALENDARIO['2026-08-22'] = [['T', 'AM']];

// ─── FASI ────────────────────────────────────────────────────────────────────

export const FASI = [
  ['2026-07-02', '2026-07-08', 'Scarico totale', null],
  ['2026-07-09', '2026-07-15', 'Blocco 1 — Massa + Motore', 'settimana A'],
  ['2026-07-16', '2026-07-22', 'Blocco 1 — Massa + Motore', 'settimana B'],
  ['2026-07-23', '2026-07-29', 'Blocco 1 — Massa + Motore', 'settimana C'],
  ['2026-07-30', '2026-08-05', 'Blocco 2 — Potenza + Velocità', 'settimana D'],
  ['2026-08-06', '2026-08-12', 'Blocco 2 — Potenza + Velocità', 'settimana E'],
  ['2026-08-13', '2026-08-19', 'Blocco 2 — Potenza + Velocità', 'settimana F'],
  ['2026-08-20', '2026-08-22', 'Taper finale', 'volume dimezzato, arriva fresco'],
];

export function faseCorrente(iso) {
  if (iso >= '2026-08-23') return { nome: 'Stagione', sotto: 'mantenimento con la società', stagione: true };
  for (const [da, a, nome, sotto] of FASI)
    if (iso >= da && iso <= a)
      return { nome, sotto: sotto ?? `giorno ${giorniTra(da, iso) + 1} di 7`, stagione: false };
  return { nome: 'Programma Futsal 2026', sotto: 'inizia il 2 luglio', stagione: false };
}

// ─── PIANO PRECARICATO ───────────────────────────────────────────────────────

export const PIANO_PRECARICATO = {
  id: 'programma-2026',
  nome: 'Programma Futsal 2026',
  tipo: 'allenamento',
  stato: 'attivo',
  origine: 'precaricato',
};

// ─── REGOLE D'ORO ────────────────────────────────────────────────────────────

export const REGOLE_ORO = [
  'Dormi 8,5–10 ore. È quando il muscolo cresce. Vale come un allenamento.',
  'Mangia tanto, con proteine ad ogni pasto. Senza cibo non metti massa, punto.',
  'Sinistro = il doppio del destro. Ogni giorno un po\' di tecnica, sempre più col sinistro.',
  'Migliora di poco ogni settimana (1 ripetizione, 1 scatto in più). Non tutto subito.',
  'Dolore a fitta o a un\'articolazione = STOP. La stanchezza muscolare invece va bene, cercala pure.',
];

// ─── TEMPLATE STAGIONE ───────────────────────────────────────────────────────

export const TEMPLATE_STAGIONE = {
  voci: [
    'Forza: 2 sedute brevi a settimana (Fm), nei giorni lontani dagli allenamenti più duri del club.',
    'Tecnica/sinistro: ogni giorno, anche solo 15-20\'.',
    'Velocità: 1 richiamo breve a settimana, se le gambe sono fresche.',
    'Recupero al massimo (sonno, cibo, foam roller).',
  ],
  regola: 'Se sei scarico e c\'è l\'allenamento col club → salta la forza, non il club.',
};

// ─── PASTI MASSA ─────────────────────────────────────────────────────────────

export const PASTI_MASSA = [
  {
    titolo: 'Colazione',
    voci: [
      'Proteine: 1 palmo (es. uova, yogurt greco, latticini)',
      'Carboidrati: 1-2 pugni (es. pane, cereali, fette biscottate)',
      'Frutta: 1 pugno',
      'Bevi acqua a volontà',
    ],
  },
  {
    titolo: 'Pranzo',
    voci: [
      'Proteine: 1 palmo (carne, pesce, legumi, uova)',
      'Carboidrati: 1-2 pugni (pasta, riso, pane, patate)',
      'Verdura: 1-2 pugni',
      'Un po\' più del solito per crescere (~+0,25-0,5 kg a settimana)',
    ],
  },
  {
    titolo: 'Cena',
    voci: [
      'Proteine: 1 palmo (carne, pesce, legumi)',
      'Carboidrati: 1 pugno (ridotto la sera se non ti alleni)',
      'Verdura: 1-2 pugni',
    ],
  },
  {
    titolo: 'Spuntino pre-allenamento',
    voci: [
      'Carboidrati: 1 pugno (frutta, pane, barretta di cereali)',
      'Proteine leggere: mezzo palmo (yogurt, fetta di formaggio)',
    ],
  },
  {
    titolo: 'Spuntino post-allenamento (entro 1 ora)',
    voci: [
      'Proteine: 1 palmo (latte, yogurt, uova, panino con affettato)',
      'Carboidrati: 1 pugno (frutta, pane)',
      'È il momento più importante: non saltarlo mai',
    ],
  },
];

// ─── PASTI MANTENIMENTO ──────────────────────────────────────────────────────

export const PASTI_MANTENIMENTO = [
  {
    titolo: 'Colazione',
    voci: [
      'Proteine: 1 palmo (es. uova, yogurt greco, latticini)',
      'Carboidrati: 1 pugno (es. pane, cereali, fette biscottate)',
      'Frutta: 1 pugno',
      'Bevi acqua a volontà',
    ],
  },
  {
    titolo: 'Pranzo',
    voci: [
      'Proteine: 1 palmo (carne, pesce, legumi, uova)',
      'Carboidrati: 1 pugno (pasta, riso, pane, patate)',
      'Verdura: 1-2 pugni',
    ],
  },
  {
    titolo: 'Cena',
    voci: [
      'Proteine: 1 palmo (carne, pesce, legumi)',
      'Carboidrati: 1 pugno (ridotto la sera se non ti alleni)',
      'Verdura: 1-2 pugni',
    ],
  },
  {
    titolo: 'Spuntino pre-allenamento',
    voci: [
      'Carboidrati: 1 pugno (frutta, pane, barretta di cereali)',
      'Proteine leggere: mezzo palmo (yogurt, fetta di formaggio)',
    ],
  },
  {
    titolo: 'Spuntino post-allenamento (entro 1 ora)',
    voci: [
      'Proteine: 1 palmo (latte, yogurt, uova, panino con affettato)',
      'Carboidrati: mezzo pugno (frutta)',
    ],
  },
];
