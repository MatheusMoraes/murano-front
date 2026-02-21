import { NumericFormat } from "react-number-format";

type Props = {
  value: number;
  onChange: (value: number) => void;
};

export default function MoneyInput({ value, onChange }: Props) {
  return (
    <NumericFormat
      value={value}
      thousandSeparator="."
      decimalSeparator=","
      prefix="R$ "
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      onValueChange={(values) => {
        onChange(values.floatValue || 0);
      }}
      className="input"
    />
  );
}