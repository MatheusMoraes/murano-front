// Iniciais do nome (até 2) usadas como avatar — tanto no dropdown do header
// quanto no avatar grande da tela de perfil — já que não existe upload de
// foto de usuário.
export function getIniciais(nome: string | undefined): string {
  if (!nome) return "?";
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}
