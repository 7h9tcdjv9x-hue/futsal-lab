export function slugEsercizio(nome) {
  return nome.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function dataISO(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function giornoSettimana(iso) {
  return (new Date(iso + 'T12:00:00').getDay() + 6) % 7;
}
export function giorniTra(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
}
export function formattaSerie({ kg, reps } = {}, unita = 'reps') {
  if (!isFinite(reps) || reps == null) return '—';
  const hasCaricoKg = Number(kg) > 0;
  if (unita === 'sec') {
    return hasCaricoKg ? `${kg} kg × ${reps} sec` : `${reps} sec`;
  }
  if (!isFinite(reps)) return '—';
  return hasCaricoKg ? `${kg} kg × ${reps}` : `${reps} reps`;
}
