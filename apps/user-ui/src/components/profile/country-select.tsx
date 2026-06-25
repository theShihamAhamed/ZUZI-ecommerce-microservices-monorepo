"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES } from "@/constants/countries";

interface CountrySelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
}

export function CountrySelect({
  id = "shipping-country",
  value,
  onChange,
  onBlur,
  error = false,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = `${id}-listbox`;

  const filteredCountries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return COUNTRIES;
    }

    return COUNTRIES.filter((country) => {
      return (
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
      );
    });
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        onBlur?.();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onBlur]);

  const handleSelect = (countryName: string) => {
    onChange(countryName);
    setIsOpen(false);
    setSearchTerm("");
    onBlur?.();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={error}
        onClick={() => setIsOpen((current) => !current)}
        onBlur={() => {
          if (!isOpen) {
            onBlur?.();
          }
        }}
        className={`mt-2 flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
          error ? "border-red-300" : "border-stone-200"
        }`}
      >
        <span
          className={`min-w-0 truncate ${
            value ? "text-gray-900" : "text-gray-400"
          }`}
        >
          {value || "Select country"}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 z-[130] mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
          <div className="sticky top-0 z-10 border-b border-stone-100 bg-white p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search country..."
                className="block w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>

          <div
            id={listboxId}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.name === value;

                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(country.name)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                      isSelected
                        ? "bg-amber-50 text-amber-800"
                        : "text-gray-700 hover:bg-amber-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="min-w-0 truncate">{country.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-gray-400">
                        {country.code}
                      </span>
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                No countries found
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
