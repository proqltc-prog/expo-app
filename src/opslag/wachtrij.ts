// Eén wachtrij voor alle wijzigingen aan de opslag op het toestel.
// Zo kunnen een wijziging van de gebruiker en een wijziging van een ander gezinslid
// (via de synchronisatie) elkaar nooit overschrijven: ze lopen strikt na elkaar.
let staart: Promise<unknown> = Promise.resolve();

export function naElkaar<T>(stap: () => Promise<T>): Promise<T> {
  const resultaat = staart.then(stap);
  staart = resultaat.catch(() => undefined);
  return resultaat;
}
