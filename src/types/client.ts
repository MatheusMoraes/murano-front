import type { Order } from "./order";

export interface Client {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  rua?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  numero?: string | null;
  complemento?: string | null;
  criadoEm: string;
}

export interface ClientWithOrders extends Client {
  orders: Order[];
}
