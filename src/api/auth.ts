import api from "./api";
import type { ChangePasswordRequest, LoginRequest, User } from "../types/auth";

/**
 * Autentica o usuário. O backend valida email/senha, gera o JWT e o envia
 * de volta como cookie httpOnly (Set-Cookie) — o front nunca lê nem guarda
 * o token diretamente.
 */
export async function login(credentials: LoginRequest): Promise<User> {
  const res = await api.post<User>("Login", credentials);
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post("Logout");
}

/**
 * Pergunta ao backend quem é o usuário da sessão atual (cookie).
 * Retorna null se não houver sessão válida (401).
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await api.get<User>("Me");
    return res.data;
  } catch {
    return null;
  }
}

// Exige a senha atual (verificada no backend) — sem confirmação por e-mail,
// a sessão logada já comprova quem é.
export async function changePassword(dto: ChangePasswordRequest): Promise<void> {
  await api.put("ChangePassword", dto);
}
