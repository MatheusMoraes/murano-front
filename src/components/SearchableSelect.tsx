import { useEffect, useRef, useState } from "react";
import { normalizeName } from "../utils/normalizeName";

interface SearchableSelectProps<T> {
  items: T[];
  value: number | undefined;
  onChange: (id: number) => void;
  getId: (item: T) => number;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string | undefined;
  placeholder?: string;
}

// Combobox de busca genérico: em vez de rolar um <select> gigante pra achar
// um produto/cliente, digita e filtra pelo nome. Usado na montagem do
// pedido (produto e cliente), onde a lista pode crescer bastante.
export default function SearchableSelect<T>({
  items,
  value,
  onChange,
  getId,
  getLabel,
  getSubLabel,
  placeholder = "Buscar...",
}: SearchableSelectProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = items.find((item) => getId(item) === value);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const normalizedQuery = normalizeName(query);
  const filtered = normalizedQuery
    ? items.filter((item) => normalizeName(getLabel(item)).includes(normalizedQuery))
    : items;

  function handleSelect(item: T) {
    onChange(getId(item));
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="searchable-select" ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={open ? query : (selected ? getLabel(selected) : "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
      />

      {open && (
        <ul className="searchable-select__list">
          {filtered.length === 0 && (
            <li className="searchable-select__empty">Nenhum resultado</li>
          )}
          {filtered.map((item) => (
            <li
              key={getId(item)}
              className={`searchable-select__item ${getId(item) === value ? "selected" : ""}`}
              onClick={() => handleSelect(item)}
            >
              <span className="searchable-select__label">{getLabel(item)}</span>
              {getSubLabel?.(item) && (
                <span className="searchable-select__sub">{getSubLabel(item)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
