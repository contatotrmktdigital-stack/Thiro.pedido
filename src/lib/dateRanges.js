export function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

export function hojeString() {
  return toDateInputValue(new Date());
}

export function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInputValue(d);
}

export function inicioDoMes() {
  const d = new Date();
  return toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1));
}
