// Mesma normalização usada no backend (ProductService.NormalizeNome): tira
// espaços das pontas, colapsa espaços repetidos em um só e ignora
// maiúsculas/minúsculas — "batata quente" e "BaTaTa   QUENTE" contam como o
// mesmo nome.
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
