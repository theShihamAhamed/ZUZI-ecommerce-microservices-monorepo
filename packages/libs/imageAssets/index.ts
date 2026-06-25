export type ImageAsset = {
  url: string;
  fileId: string;
};

type NormalizeImageArrayOptions = {
  maxCount?: number;
  requireAtLeastOne?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const normalizeImageAsset = (input: unknown): ImageAsset | null => {
  if (!isRecord(input)) return null;

  const url = getString(input.url) || getString(input.file_url);
  const fileId = getString(input.fileId) || getString(input.file_id);

  if (!url || !fileId) return null;

  return { url, fileId };
};

export const normalizeImageAssetArray = (
  input: unknown,
  options: NormalizeImageArrayOptions = {},
) => {
  const { maxCount, requireAtLeastOne = false } = options;

  if (!Array.isArray(input)) {
    if (requireAtLeastOne) {
      throw new Error("At least one image is required");
    }

    return undefined;
  }

  const assets = input.flatMap((image) => {
    const normalized = normalizeImageAsset(image);
    return normalized ? [normalized] : [];
  });
  const seenFileIds = new Set<string>();

  assets.forEach((asset) => {
    if (seenFileIds.has(asset.fileId)) {
      throw new Error("Duplicate image fileId is not allowed");
    }

    seenFileIds.add(asset.fileId);
  });

  if (requireAtLeastOne && assets.length === 0) {
    throw new Error("At least one image is required");
  }

  if (maxCount && assets.length > maxCount) {
    throw new Error(`A maximum of ${maxCount} images is allowed`);
  }

  return assets;
};

export const getImageUrl = (asset: unknown) => {
  const normalized = normalizeImageAsset(asset);
  return normalized?.url || null;
};

export const getProductThumbnail = (
  product?: { images?: unknown } | null,
) => {
  if (!Array.isArray(product?.images)) return null;

  return getImageUrl(product.images[0]);
};
