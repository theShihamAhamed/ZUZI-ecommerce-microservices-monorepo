import {
  Product,
  ProductOptionGroup,
  SelectedProductOptions,
} from "@/types/product";

const OPTION_KEY_EMPTY = "{}";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const createOptionGroupId = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

const normalizeStringList = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (typeof value !== "string") return [];

    const trimmed = value.trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) return [];

    seen.add(key);
    return [trimmed];
  });
};

const addNormalizedGroup = (
  groups: ProductOptionGroup[],
  seenNames: Set<string>,
  group: Partial<ProductOptionGroup>,
  requiredFallback: boolean,
) => {
  const name = typeof group.name === "string" ? group.name.trim() : "";
  const values = normalizeStringList(group.values);

  if (!name || values.length === 0) return;

  const key = name.toLowerCase();
  if (seenNames.has(key)) return;

  seenNames.add(key);
  groups.push({
    id:
      typeof group.id === "string" && group.id.trim()
        ? group.id.trim()
        : createOptionGroupId(name),
    name,
    values,
    required:
      typeof group.required === "boolean" ? group.required : requiredFallback,
  });
};

export const getProductOptionGroups = (product: Product) => {
  const groups: ProductOptionGroup[] = [];
  const seenNames = new Set<string>();
  const rawOptionGroups = product.custom_properties?.optionGroups;

  if (Array.isArray(rawOptionGroups)) {
    rawOptionGroups.forEach((group) => {
      if (isRecord(group)) {
        addNormalizedGroup(groups, seenNames, group, true);
      }
    });
  }

  addNormalizedGroup(
    groups,
    seenNames,
    {
      id: "legacy-color",
      name: "Color",
      values: product.colors,
      required: false,
    },
    false,
  );

  addNormalizedGroup(
    groups,
    seenNames,
    {
      id: "legacy-size",
      name: "Size",
      values: product.sizes,
      required: false,
    },
    false,
  );

  return groups;
};

export const normalizeSelectedOptions = (
  selectedOptions?: Record<string, unknown> | null,
): SelectedProductOptions => {
  if (!isRecord(selectedOptions)) return {};

  return Object.keys(selectedOptions)
    .sort((a, b) => a.localeCompare(b))
    .reduce<SelectedProductOptions>((result, key) => {
      const value = selectedOptions[key];

      if (typeof value !== "string") return result;

      const optionName = key.trim();
      const optionValue = value.trim();

      if (!optionName || !optionValue) return result;

      result[optionName] = optionValue;
      return result;
    }, {});
};

export const getSelectedOptionsKey = (
  selectedOptions?: Record<string, unknown> | null,
) => {
  const normalizedOptions = normalizeSelectedOptions(selectedOptions);
  const entries = Object.entries(normalizedOptions);

  if (entries.length === 0) return OPTION_KEY_EMPTY;

  return JSON.stringify(entries);
};

export const getCartItemKey = (
  productId: string,
  selectedOptions?: Record<string, unknown> | null,
) => `${productId}:${getSelectedOptionsKey(selectedOptions)}`;

export const getMissingRequiredProductOptions = (
  optionGroups: ProductOptionGroup[],
  selectedOptions?: Record<string, unknown> | null,
) => {
  const normalizedOptions = normalizeSelectedOptions(selectedOptions);

  return optionGroups
    .filter((group) => {
      if (!group.required) return false;

      const selectedValue = normalizedOptions[group.name];
      return !selectedValue || !group.values.includes(selectedValue);
    })
    .map((group) => group.name);
};

export const hasRequiredProductOptions = (
  optionGroups: ProductOptionGroup[],
) => optionGroups.some((group) => group.required);

