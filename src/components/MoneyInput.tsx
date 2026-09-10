import { NumericFormat } from "react-number-format";

type Props = {
  value: number;
  onChange: (value: number) => void;
};

export default function MoneyInput({ value, onChange }: Props) {
  return (
    <NumericFormat
      // Trata 0 como "vazio": em vez do campo mostrar "R$ 0,00" como se
      // fosse texto digitado (o que não some ao clicar e bagunça a posição
      // do cursor), ele fica realmente vazio e usa o placeholder nativo do
      // HTML — que some assim que o campo ganha foco.
      value={value === 0 ? "" : value}
      placeholder="R$ 0,00"
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
