import axios from "axios";
import type {
  MelhorEnvioShippingCalculatorRequest,
  ShippingOption,
} from "../types/order";

// Em produção o front chama seu próprio domínio (/api/...) e o vercel.json
// faz o proxy reverso pro backend no Render — o navegador nunca vê o host
// real do Render. Em dev local não existe esse proxy (o Vite não lê
// vercel.json), então seguimos batendo direto no Render (ou troque para o
// backend local, ex: http://localhost:5051/api).
const baseURL = import.meta.env.PROD
  ? "/api"
  //: "https://muranoapp-1.onrender.com/api";
   : "http://localhost:5051/api";

const api = axios.create({
  baseURL,
  // Necessário para o cookie httpOnly de autenticação (murano_auth) ir e
  // voltar nas chamadas — tanto em prod (mesma origem, via proxy) quanto em
  // dev local (cross-origin, direto pro Render).
  withCredentials: true,
});

// Se o backend responder 401 (sessão expirada/ausente), avisa o AuthContext
// para limpar o estado de usuário e mandar a UI de volta pro /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

/**
 * Calculate shipping options via the backend MelhorEnvio integration
 * @param params Request parameters for shipping calculation
 * @returns Array of available shipping options
 */
export async function calculateShipping(
  params: MelhorEnvioShippingCalculatorRequest
): Promise<ShippingOption[]> {
  const res = await api.post<ShippingOption[]>(
    "CalculateShipping",
    params
  );
  const data: ShippingOption[] = [];
  res.data.map((opt) => {
    if (opt.error == null || opt.price === "0,00") {
      data.push(opt);
    }
  });
  return data;
}

export default api;