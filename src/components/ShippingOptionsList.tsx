import type { ShippingOption } from "../types/order";
import { formatCurrency } from "../utils/formatCurrency";

interface Props {
  options: ShippingOption[];
}

export default function ShippingOptionsList({ options }: Props) {

  return (
    <div className="shipping-list">
      {options.map((opt) => (
        opt.error == null || opt.price === "0,00" ? (
          <div key={opt.id} className="shipping-item" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <img
              src={opt.company.picture}
              alt={opt.company.name}
              style={{ width: 32, height: 32, marginRight: 8 }}
            />
            <div style={{ flex: 1 }}>
              <strong>{opt.name}</strong>
              <div>{opt.company.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{formatCurrency(Number(opt.price))}</div>
              <div style={{ fontSize: 12, color: '#555' }}>
                {opt.delivery_time} dia{opt.delivery_time > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ) : null
      ))}
    </div>
  );
}
