import { esportaBackup, importaBackup, CHIAVI_BACKUP } from './storage.js';
import { giorniTra } from './util.js';
import { icona } from './icone.js';
import { intestazione, chip } from './ui.js';

// ─── backupInRitardo ──────────────────────────────────────────────────────────
// Pure helper: true se il backup è in ritardo.
// Regole:
//   - Se meta.ultimoBackup è assente: true SOLO se ci sono dati (peso/sedute/registro).
//   - Se meta.ultimoBackup è presente: true se >= 7 giorni fa (indipendentemente dai dati).
export function backupInRitardo(store, oggi) {
  const meta = store.leggi('meta', {});

  if (!meta.ultimoBackup) {
    // Nessun backup mai fatto: controlla se ci sono dati
    const peso = store.leggi('peso', []);
    const sedute = store.leggi('sedute', {});
    const registro = store.leggi('registro', {});
    const haDati = peso.length > 0 ||
      Object.keys(sedute).length > 0 ||
      Object.keys(registro).length > 0;
    return haDati;
  }

  // Backup già fatto: ritardo se >= 7 giorni fa
  return giorniTra(meta.ultimoBackup, oggi) >= 7;
}

// ─── vistaImpostazioni ────────────────────────────────────────────────────────
// Render the settings view. Only runs in browser (DOM required).
export function vistaImpostazioni(stato, radice) {
  const { store, oggi } = stato;
  radice.innerHTML = '';

  // ── Header iOS: frecciaSinistra + "Oggi" + titolo-vista ──────────────────
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:16px;';

  const backBtn = document.createElement('button');
  backBtn.className = 'secondario';
  backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:6px 10px;font-size:15px;margin-bottom:8px;background:none;color:var(--accento);';
  backBtn.appendChild(icona('frecciaSinistra', 17));
  const backTesto = document.createElement('span');
  backTesto.textContent = 'Oggi';
  backBtn.appendChild(backTesto);
  backBtn.addEventListener('click', () => {
    import('./app.js').then(({ naviga }) => naviga('oggi'));
  });
  header.appendChild(backBtn);

  const titoloEl = document.createElement('div');
  titoloEl.className = 'titolo-vista';
  titoloEl.textContent = 'Impostazioni';
  header.appendChild(titoloEl);

  radice.appendChild(header);

  // ── Sezione Profilo ───────────────────────────────────────────────────────
  radice.appendChild(intestazione('PROFILO'));
  const cardProfilo = document.createElement('div');
  cardProfilo.className = 'card';

  const profilo = store.leggi('profilo', {});

  const rigaNome = creaRiga();
  const lblNome = document.createElement('label');
  lblNome.textContent = 'Nome';
  const inpNome = document.createElement('input');
  inpNome.type = 'text';
  inpNome.maxLength = 40;
  inpNome.placeholder = 'Il tuo nome';
  inpNome.value = profilo.nome ?? '';
  inpNome.addEventListener('change', () => {
    const p = store.leggi('profilo', {});
    p.nome = inpNome.value.trim().slice(0, 40);
    store.scrivi('profilo', p);
  });
  rigaNome.appendChild(lblNome);
  rigaNome.appendChild(inpNome);
  cardProfilo.appendChild(rigaNome);

  const rigaAltezza = creaRiga();
  const lblAltezza = document.createElement('label');
  lblAltezza.textContent = 'Altezza (cm)';
  const inpAltezza = document.createElement('input');
  inpAltezza.type = 'number';
  inpAltezza.min = 120;
  inpAltezza.max = 220;
  inpAltezza.step = 1;
  inpAltezza.placeholder = '120–220';
  inpAltezza.value = profilo.altezzaCm ?? '';
  inpAltezza.addEventListener('change', () => {
    const v = parseInt(inpAltezza.value, 10);
    if (isNaN(v) || v < 120 || v > 220) { inpAltezza.value = profilo.altezzaCm ?? ''; return; }
    const p = store.leggi('profilo', {});
    p.altezzaCm = v;
    store.scrivi('profilo', p);
  });
  rigaAltezza.appendChild(lblAltezza);
  rigaAltezza.appendChild(inpAltezza);
  cardProfilo.appendChild(rigaAltezza);

  radice.appendChild(cardProfilo);

  // ── Sezione Backup ────────────────────────────────────────────────────────
  radice.appendChild(intestazione('BACKUP'));
  const cardBackup = document.createElement('div');
  cardBackup.className = 'card';

  // Placeholder per chip esito (errore / successo)
  let chipBackupEl = null;

  function mostraChipRosso(msg) {
    if (chipBackupEl) chipBackupEl.remove();
    chipBackupEl = chip(msg, 'rosso');
    cardBackup.insertBefore(chipBackupEl, cardBackup.firstChild);
  }
  function mostraChipVerde(msg) {
    if (chipBackupEl) chipBackupEl.remove();
    chipBackupEl = chip(msg, 'verde');
    cardBackup.insertBefore(chipBackupEl, cardBackup.firstChild);
  }

  // Meta per "ultimo backup"
  function ultimoBackupTesto() {
    const m = store.leggi('meta', {});
    return m.ultimoBackup ?? 'mai';
  }

  // Esporta backup
  const btnEsporta = document.createElement('button');
  btnEsporta.className = 'primario';
  btnEsporta.textContent = 'Esporta backup';
  btnEsporta.addEventListener('click', () => {
    const dati = esportaBackup(store);
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `futsal-lab-backup-${oggi}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Aggiorna ultimoBackup
    const m = store.leggi('meta', {});
    m.ultimoBackup = oggi;
    store.scrivi('meta', m);

    // Aggiorna testo
    pUltimoBackup.textContent = 'Ultimo backup: ' + oggi;
  });
  cardBackup.appendChild(btnEsporta);

  const pUltimoBackup = document.createElement('p');
  pUltimoBackup.className = 'secondario';
  pUltimoBackup.textContent = 'Ultimo backup: ' + ultimoBackupTesto();
  cardBackup.appendChild(pUltimoBackup);

  // Importa backup
  const rigaImporta = creaRiga();
  const lblImporta = document.createElement('label');
  lblImporta.textContent = 'Importa backup';
  const inputFile = document.createElement('input');
  inputFile.type = 'file';
  inputFile.accept = '.json';
  inputFile.addEventListener('change', () => {
    const file = inputFile.files[0];
    if (!file) return;
    if (!confirm('Sovrascrivere i dati attuali con il backup?')) {
      inputFile.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const obj = JSON.parse(e.target.result);
        importaBackup(store, obj);
        mostraChipVerde('Backup ripristinato.');
        setTimeout(() => {
          import('./app.js').then(({ naviga }) => naviga('oggi'));
        }, 1000);
      } catch (err) {
        mostraChipRosso('Backup non valido: ' + err.message);
      }
      inputFile.value = '';
    };
    reader.readAsText(file);
  });
  rigaImporta.appendChild(lblImporta);
  rigaImporta.appendChild(inputFile);
  cardBackup.appendChild(rigaImporta);

  radice.appendChild(cardBackup);

  // ── Sezione Ponte Whoop ───────────────────────────────────────────────────
  radice.appendChild(intestazione('PONTE WHOOP'));
  const cardWhoop = document.createElement('div');
  cardWhoop.className = 'card';

  const ponte = store.leggi('whoopPonte', {});

  const rigaUrl = creaRiga();
  const lblUrl = document.createElement('label');
  lblUrl.textContent = 'URL Worker';
  const inpUrl = document.createElement('input');
  inpUrl.type = 'url';
  inpUrl.placeholder = 'https://…';
  inpUrl.value = ponte.urlWorker ?? '';
  inpUrl.addEventListener('change', () => {
    const p = store.leggi('whoopPonte', {});
    p.urlWorker = inpUrl.value.trim();
    store.scrivi('whoopPonte', p);
    btnCollega.disabled = !inpUrl.value.trim();
  });
  rigaUrl.appendChild(lblUrl);
  rigaUrl.appendChild(inpUrl);
  cardWhoop.appendChild(rigaUrl);

  const rigaChiave = creaRiga();
  const lblChiave = document.createElement('label');
  lblChiave.textContent = 'Chiave accesso';
  const inpChiave = document.createElement('input');
  inpChiave.type = 'password';
  inpChiave.placeholder = '••••••••';
  inpChiave.value = ponte.chiaveAccesso ?? '';
  inpChiave.addEventListener('change', () => {
    const p = store.leggi('whoopPonte', {});
    p.chiaveAccesso = inpChiave.value;
    store.scrivi('whoopPonte', p);
  });
  rigaChiave.appendChild(lblChiave);
  rigaChiave.appendChild(inpChiave);
  cardWhoop.appendChild(rigaChiave);

  const btnCollega = document.createElement('button');
  btnCollega.className = 'secondario';
  btnCollega.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
  btnCollega.appendChild(icona('esporta', 16));
  const collegaTesto = document.createElement('span');
  collegaTesto.textContent = 'Collega Whoop';
  btnCollega.appendChild(collegaTesto);
  btnCollega.disabled = !(ponte.urlWorker ?? '').trim();
  btnCollega.addEventListener('click', () => {
    const p = store.leggi('whoopPonte', {});
    if (!p.urlWorker) return;
    window.open(p.urlWorker.replace(/\/$/, '') + '/auth', '_blank');
  });
  cardWhoop.appendChild(btnCollega);

  const pUltimaSync = document.createElement('p');
  pUltimaSync.className = 'secondario';
  pUltimaSync.textContent = 'Ultima sincronizzazione: ' + (ponte.ultimaSync ?? 'mai');
  cardWhoop.appendChild(pUltimaSync);

  radice.appendChild(cardWhoop);

  // ── Sezione Dati ──────────────────────────────────────────────────────────
  radice.appendChild(intestazione('DATI'));
  const cardDati = document.createElement('div');
  cardDati.className = 'card';

  const btnAzzera = document.createElement('button');
  btnAzzera.className = 'distruttivo';
  btnAzzera.textContent = 'Azzera tutti i dati';
  btnAzzera.addEventListener('click', () => {
    if (!confirm('Sicuro di voler cancellare TUTTI i dati?')) return;
    if (!confirm('Ultima conferma: questa azione non si può annullare.')) return;
    for (const k of CHIAVI_BACKUP) {
      localStorage.removeItem('fl:' + k);
    }
    location.reload();
  });
  cardDati.appendChild(btnAzzera);

  radice.appendChild(cardDati);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function creaRiga() {
  const r = document.createElement('div');
  r.className = 'riga';
  return r;
}
