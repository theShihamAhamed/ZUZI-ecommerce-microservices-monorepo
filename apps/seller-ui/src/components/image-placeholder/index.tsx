import { ImagePlus, Loader2, Pencil, X } from "lucide-react";
import Image from "next/image";
import React from "react";
import { ImageAsset } from "@/types/product";

interface Props {
  size: string;
  small?: boolean;
  onImageChange: (file: File | null, index: number) => void;
  onRemove?: (index: number) => void;
  image?: ImageAsset | null;
  index?: number | null;
  isUploading?: boolean;
  isRemoving?: boolean;
}

const ImagePlaceHolder = ({
  size,
  small,
  onImageChange,
  onRemove,
  image,
  index = null,
  isUploading = false,
  isRemoving = false,
}: Props) => {
  const inputId = `image-upload-${index}`;
  const isBusy = isUploading || isRemoving;
  const uploadLabel = image ? "Change image" : small ? "Add image" : "Upload image";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      onImageChange(file, index!);
      event.target.value = "";
    }
  };

  return (
    <div
      className={`relative ${
        small ? "h-[180px]" : "h-[450px]"
      } flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-900 transition hover:border-emerald-300`}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        id={inputId}
        onChange={handleFileChange}
        disabled={isBusy}
      />

      {image ? (
        <>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRemove?.(index!)}
            aria-label="Remove image"
            className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={16} />
          </button>

          <Image
            width={400}
            height={300}
            src={image.url}
            alt="uploaded"
            className="h-full w-full rounded-2xl object-cover"
          />

          <div className="absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-lg backdrop-blur">
            <p className="min-w-0 text-xs font-semibold text-slate-600">
              JPG, PNG, WEBP up to 5MB
            </p>
            <label
              htmlFor={inputId}
              className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 ${
                isBusy ? "pointer-events-none opacity-50" : "cursor-pointer"
              }`}
            >
              <Pencil size={14} />
              {uploadLabel}
            </label>
          </div>
        </>
      ) : (
        <>
          <label
            htmlFor={inputId}
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 ${
              isBusy ? "pointer-events-none opacity-50" : "cursor-pointer"
            }`}
          >
            <ImagePlus size={16} />
            {uploadLabel}
          </label>

          <p
            className={`mt-4 font-semibold text-slate-500 ${
              small ? "text-sm" : "text-lg"
            }`}
          >
            Recommended {size}
          </p>

          <p
            className={`px-4 pt-2 text-center text-slate-500 ${
              small ? "text-xs" : "text-sm"
            }`}
          >
            JPG, PNG, WEBP up to 5MB
          </p>
        </>
      )}

      {isBusy && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-slate-950/60">
          <Loader2 className="mb-2 animate-spin text-white" size={28} />
          <p className="text-sm font-medium text-white">
            {isRemoving ? "Removing..." : "Uploading..."}
          </p>
        </div>
      )}
    </div>
  );
};

export default ImagePlaceHolder;
