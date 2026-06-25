import sanitizeHtml from "sanitize-html";

interface ProductDescriptionSectionProps {
  description?: string | null;
  customSpecifications?: unknown;
}

interface SpecificationRow {
  name: string;
  value: string;
}

const formatSpecificationValue = (value: unknown): string => {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatSpecificationValue).filter(Boolean).join(", ");
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

const normalizeSpecificationRows = (
  customSpecifications: unknown,
): SpecificationRow[] => {
  if (!customSpecifications) return [];

  if (typeof customSpecifications === "string") {
    const value = customSpecifications.trim();
    return value ? [{ name: "Details", value }] : [];
  }

  if (Array.isArray(customSpecifications)) {
    return customSpecifications.flatMap((item, index) => {
      if (!item) return [];

      if (typeof item === "string") {
        const value = item.trim();
        return value ? [{ name: `Specification ${index + 1}`, value }] : [];
      }

      if (typeof item !== "object") {
        const value = formatSpecificationValue(item);
        return value ? [{ name: `Specification ${index + 1}`, value }] : [];
      }

      const record = item as Record<string, unknown>;
      const name =
        formatSpecificationValue(record.name) ||
        formatSpecificationValue(record.key) ||
        formatSpecificationValue(record.label) ||
        `Specification ${index + 1}`;
      const value =
        formatSpecificationValue(record.value) ||
        formatSpecificationValue(record.details) ||
        formatSpecificationValue(record.description);

      return name && value ? [{ name, value }] : [];
    });
  }

  if (typeof customSpecifications === "object") {
    return Object.entries(customSpecifications as Record<string, unknown>)
      .map(([name, rawValue]) => ({
        name,
        value: formatSpecificationValue(rawValue),
      }))
      .filter((row) => row.name.trim() && row.value.trim());
  }

  const value = formatSpecificationValue(customSpecifications);
  return value ? [{ name: "Details", value }] : [];
};

const normalizeProductDescription = (description: string) =>
  description.replace(/&nbsp;/gi, " ").replace(/\u00A0/g, " ");

const sanitizeProductDescription = (description: string) =>
  sanitizeHtml(normalizeProductDescription(description), {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "blockquote",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });

export function ProductDescriptionSection({
  description,
  customSpecifications,
}: ProductDescriptionSectionProps) {
  // Product descriptions are stored as rich HTML from the seller editor.
  const sanitizedDescription = description
    ? sanitizeProductDescription(description)
    : "";
  const specificationRows = normalizeSpecificationRows(customSpecifications);

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-gray-900">Product description</h2>

      {sanitizedDescription ? (
        <div
          className="mt-4 min-w-0 max-w-full break-words text-sm leading-7 text-gray-700 whitespace-normal sm:text-base [&_*]:max-w-full [&_*]:break-words [&_*]:whitespace-normal [&_a]:font-semibold [&_a]:text-amber-700 [&_a]:underline-offset-4 [&_a:hover]:underline [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-200 [&_blockquote]:bg-amber-50/40 [&_blockquote]:py-2 [&_blockquote]:pl-4 [&_blockquote]:pr-3 [&_blockquote]:text-gray-700 [&_br]:block [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-tight [&_h3]:mb-3 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:leading-tight [&_li]:ml-5 [&_li]:pl-1 [&_li]:leading-7 [&_ol]:my-4 [&_ol]:list-decimal [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />
      ) : (
        <p className="mt-4 text-sm text-gray-600">
          Detailed product information will appear here soon.
        </p>
      )}

      {specificationRows.length > 0 ? (
        <div className="mt-8 border-t border-stone-200 pt-6">
          <h3 className="text-base font-bold text-gray-900">Specifications</h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200">
            <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] bg-stone-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
              <span>Specification</span>
              <span>Details / Value</span>
            </div>
            <div className="divide-y divide-stone-200">
              {specificationRows.map((row) => (
                <div
                  key={`${row.name}-${row.value}`}
                  className="grid grid-cols-1 gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
                >
                  <span className="break-words font-semibold text-gray-900">
                    {row.name}
                  </span>
                  <span className="break-words text-gray-600">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
