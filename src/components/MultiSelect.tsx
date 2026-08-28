import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface MultiSelectProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  allLabel?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder,
  allLabel = "Todas as Bases",
  className = "",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Label display logic
  const getDisplayLabel = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === options.length) {
      return `${allLabel} (${selectedValues.length})`;
    }
    if (selectedValues.length <= 2) {
      return selectedValues.join(", ");
    }
    return `${selectedValues.length} selecionadas`;
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all gap-2 text-left cursor-pointer min-w-[170px] max-w-[240px]"
      >
        <span className="truncate flex-1">{getDisplayLabel()}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-80 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Quick Actions & Search */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 space-y-1.5">
            <div className="flex items-center justify-between gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Filtro de Bases</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Todos
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>
            {options.length > 5 && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Options list */}
          <div className="overflow-y-auto py-1 divide-y divide-slate-50 max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">
                Nenhuma base encontrada.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt);
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    <span className="truncate pr-2">{opt}</span>
                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all shrink-0 ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}>
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
