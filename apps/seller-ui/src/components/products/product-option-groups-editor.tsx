"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { SellerProductOptionGroup } from "@/types/product";

export type ProductOptionGroup = SellerProductOptionGroup;

interface ProductOptionGroupsEditorProps {
  value: ProductOptionGroup[];
  onChange: (value: ProductOptionGroup[]) => void;
  error?: string;
}

const PRESET_GROUPS = [
  { name: "Size", values: ["S", "M", "L", "XL"] },
  { name: "Color", values: ["Black", "White", "Red"] },
  { name: "Capacity", values: ["128GB", "256GB"] },
  { name: "Material", values: ["Cotton", "Leather"] },
];

const createGroupId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const normalizeValue = (value: string) => value.trim();

const getNormalizedValues = (values: string[]) => {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    const trimmed = normalizeValue(value);
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) return [];

    seen.add(key);
    return [trimmed];
  });
};

export function normalizeProductOptionGroupsForSubmit(
  optionGroups: ProductOptionGroup[],
) {
  const seenNames = new Set<string>();

  return optionGroups.flatMap((group) => {
    const name = normalizeValue(group.name);
    const values = getNormalizedValues(group.values);

    if (!name && values.length === 0) return [];

    if (!name) {
      throw new Error("Every option group needs a name.");
    }

    if (values.length === 0) {
      throw new Error(`${name} needs at least one value.`);
    }

    const key = name.toLowerCase();

    if (seenNames.has(key)) {
      throw new Error(`${name} is duplicated. Use each option name once.`);
    }

    seenNames.add(key);

    return [
      {
        id: group.id || createGroupId(),
        name,
        values,
        required: group.required !== false,
      },
    ];
  });
}

export function getOptionGroupValues(
  optionGroups: ProductOptionGroup[],
  groupName: string,
) {
  const group = optionGroups.find(
    (optionGroup) => optionGroup.name.toLowerCase() === groupName.toLowerCase(),
  );

  return group?.values || [];
}

export function ProductOptionGroupsEditor({
  value,
  onChange,
  error,
}: ProductOptionGroupsEditorProps) {
  const [customGroupName, setCustomGroupName] = useState("");
  const [pendingValues, setPendingValues] = useState<Record<string, string>>(
    {},
  );
  const existingNames = useMemo(
    () => new Set(value.map((group) => group.name.trim().toLowerCase())),
    [value],
  );

  const addGroup = (name: string, values: string[] = []) => {
    const trimmedName = normalizeValue(name);
    if (!trimmedName || existingNames.has(trimmedName.toLowerCase())) return;

    onChange([
      ...value,
      {
        id: createGroupId(),
        name: trimmedName,
        values: getNormalizedValues(values),
        required: true,
      },
    ]);
    setCustomGroupName("");
  };

  const updateGroup = (
    groupId: string,
    updater: (group: ProductOptionGroup) => ProductOptionGroup,
  ) => {
    onChange(value.map((group) => (group.id === groupId ? updater(group) : group)));
  };

  const removeGroup = (groupId: string) => {
    onChange(value.filter((group) => group.id !== groupId));
  };

  const addValue = (groupId: string) => {
    const nextValue = normalizeValue(pendingValues[groupId] || "");

    if (!nextValue) return;

    updateGroup(groupId, (group) => ({
      ...group,
      values: getNormalizedValues([...group.values, nextValue]),
    }));
    setPendingValues((current) => ({
      ...current,
      [groupId]: "",
    }));
  };

  const removeValue = (groupId: string, optionValue: string) => {
    updateGroup(groupId, (group) => ({
      ...group,
      values: group.values.filter((value) => value !== optionValue),
    }));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Product options
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Add choices customers must select before adding this product to cart.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESET_GROUPS.map((preset) => {
          const isAdded = existingNames.has(preset.name.toLowerCase());

          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => addGroup(preset.name, preset.values)}
              disabled={isAdded}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {preset.name}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={customGroupName}
          onChange={(event) => setCustomGroupName(event.target.value)}
          placeholder="Custom option name, e.g. Storage"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
        />
        <button
          type="button"
          onClick={() => addGroup(customGroupName)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Add group
        </button>
      </div>

      {value.length > 0 ? (
        <div className="mt-5 space-y-4">
          {value.map((group) => (
            <div
              key={group.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={group.name}
                  onChange={(event) =>
                    updateGroup(group.id, (currentGroup) => ({
                      ...currentGroup,
                      name: event.target.value,
                    }))
                  }
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  aria-label="Option group name"
                />

                <label className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={group.required}
                    onChange={(event) =>
                      updateGroup(group.id, (currentGroup) => ({
                        ...currentGroup,
                        required: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Required
                </label>

                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${group.name || "option"} group`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={pendingValues[group.id] || ""}
                  onChange={(event) =>
                    setPendingValues((current) => ({
                      ...current,
                      [group.id]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addValue(group.id);
                    }
                  }}
                  placeholder={`Add ${group.name || "option"} value`}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                />
                <button
                  type="button"
                  onClick={() => addValue(group.id)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  Add value
                </button>
              </div>

              {group.values.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.values.map((optionValue) => (
                    <span
                      key={optionValue}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    >
                      {optionValue}
                      <button
                        type="button"
                        onClick={() => removeValue(group.id, optionValue)}
                        className="text-emerald-600 transition hover:text-red-600"
                        aria-label={`Remove ${optionValue}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  Add at least one value, or remove this group.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No product options yet. This product can still be created without
          options.
        </p>
      )}

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
    </section>
  );
}
