"use client";

import { ImagePlus, X } from "lucide-react";
import { ChangeEvent, useRef } from "react";

interface ImageUploadPreviewProps {
  file: File | null;
  previewUrl: string | null;
  isUploading?: boolean;
  onChange: (file: File | null) => void;
}

export function ImageUploadPreview({
  file,
  previewUrl,
  isUploading,
  onChange,
}: ImageUploadPreviewProps) {
  return (
    <div className="min-w-0">
      {previewUrl ? (
        <div className="mb-3 flex min-w-0 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-2">
          <img
            src={previewUrl}
            alt={file?.name || "Selected chat image"}
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {file?.name || "Selected image"}
            </p>
            <p className="text-xs text-gray-500">
              {isUploading ? "Uploading..." : "Ready to send"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Remove selected image"
            onClick={() => onChange(null)}
            disabled={isUploading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface ImageUploadButtonProps {
  isUploading?: boolean;
  onChange: (file: File | null) => void;
}

export function ImageUploadButton({
  isUploading,
  onChange,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    onChange(selectedFile);
    event.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        aria-label="Attach image"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ImagePlus className="h-5 w-5" />
      </button>
    </>
  );
}
