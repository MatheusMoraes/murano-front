export interface LoginRequest {
  email: string;
  senha: string;
  lembrar: boolean;
}

export interface User {
  id: number;
  nome: string;
  email: string;
  isAdmin: boolean;
}

export interface ChangePasswordRequest {
  senhaAtual: string;
  novaSenha: string;
}
