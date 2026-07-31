import axios from "axios";
import type {
  MelhorEnvioShippingCalculatorRequest,
  ShippingOption,
} from "../types/order";

const api = axios.create({
  baseURL: "http://localhost:5051/api",
  // Sem autenticação por cookie no fluxo atual, então não enviamos credenciais.
  withCredentials: false,
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