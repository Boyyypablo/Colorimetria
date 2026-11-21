import { DESK_FILTERS, type DeskFilterId } from "../../lib/desk-format";

type FilterTabsProps = {
  value: DeskFilterId;
  onChange: (id: DeskFilterId) => void;
};

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <div className="filter-tabs" role="tablist" aria-label="Filtro de chats">
      {DESK_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={value === f.id}
          className={
            value === f.id ? "filter-tab filter-tab--on" : "filter-tab"
          }
          onClick={() => onChange(f.id)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
