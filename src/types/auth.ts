export interface LoginRequest {
  email: string;
  senha: string;
  lembrar: boolean;
}

export interface User {
  id: number;
  nome: string;
  email: string;
}
