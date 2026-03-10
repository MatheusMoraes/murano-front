import axios from "axios";
import type {
  MelhorEnvioShippingCalculatorRequest,
  ShippingOption,
} from "../types/order";

const api = axios.create({
  baseURL: "http://localhost:5051/api",
});

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