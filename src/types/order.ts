export interface Product {
  id: number;
  nomeProduto: string;
  preco: number;
}

export interface OrderItem {
  produtoId: number;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
}

export interface Order {
  id: number;
  criadoEm: string;
  clientId: number;
  nomeCliente: string
  cep : string;
  rua : string;
  bairro : string;
  cidade : string;
  estado : string;
  numero : string;
  complemento : string;
  valorTotal: number;
  items: OrderItem[];
}

// Endereço de entrega específico de um pedido, enviado apenas quando o
// cliente não quer usar o endereço cadastrado (checkbox "outro endereço").
export interface EnderecoInput {
  Cep: string;
  Rua: string;
  Bairro: string;
  Cidade: string;
  Estado: string;
  Numero: string;
  Complemento?: string;
}

// MelhorEnvio Shipping Calculator Request DTOs
export interface MelhorEnvioFrom {
  postal_code: string;
}

export interface MelhorEnvioTo {
  postal_code: string;
}

export interface MelhorEnvioProduct {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  insurance_value: number;
  quantity: number;
}

export interface MelhorEnvioOptions {
  receipt: boolean;
  own_hand: boolean;
}

export interface MelhorEnvioShippingCalculatorRequest {
  from: MelhorEnvioFrom;
  to: MelhorEnvioTo;
  products: MelhorEnvioProduct[];
  options: MelhorEnvioOptions;
  services: string;
}

// MelhorEnvio Shipping Calculator Response DTOs
export interface DeliveryRange {
  min: number;
  max: number;
}

export interface ShippingPackageDimensions {
  height: number;
  width: number;
  length: number;
}

export interface ShippingPackageProduct {
  id: string;
  quantity: number;
}

export interface ShippingPackage {
  price: string;
  discount: string;
  format: string;
  weight: string;
  insurance_value: string;
  products: ShippingPackageProduct[];
  dimensions: ShippingPackageDimensions;
}

export interface ShippingAdditionalServices {
  receipt: boolean;
  own_hand: boolean;
  collect: boolean;
}

export interface ShippingCompany {
  id: number;
  name: string;
  picture: string;
}

export interface ShippingOption {
  id: number;
  name: string;
  price: string;
  custom_price: string;
  discount: string;
  currency: string;
  delivery_time: number;
  delivery_range: DeliveryRange;
  custom_delivery_time: number;
  custom_delivery_range: DeliveryRange;
  packages: ShippingPackage[];
  additional_services: ShippingAdditionalServices;
  company: ShippingCompany;
  error: string;
}