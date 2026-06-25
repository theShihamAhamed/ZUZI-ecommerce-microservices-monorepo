"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill-new/dist/quill.snow.css";

// Prevent SSR issues in Next.js
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write product description...",
  height = 250,
}: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link", "image"],
        ["clean"],
      ],
    }),
    [],
  );

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-700 focus-within:border-[#80DEEA] transition-all duration-200">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
        className="custom-quill"
      />

      {/* Component Scoped Styling */}
      <style jsx global>{`
        .custom-quill .ql-toolbar {
          background: #1f2937;
          border: none;
          border-bottom: 1px solid #374151;
        }

        .custom-quill .ql-container {
          background: #111827;
          border: none;
          min-height: ${height}px;
        }

        .custom-quill .ql-editor {
          color: #ffffff;
          font-size: 14px;
          line-height: 1.6;
        }

        .custom-quill .ql-editor.ql-blank::before {
          color: #6b7280; /* <-- Change this */
          font-style: normal;
          opacity: 1;
        }

        .custom-quill .ql-picker {
          color: #e5e7eb;
        }

        .custom-quill .ql-stroke {
          stroke: #e5e7eb;
        }

        .custom-quill .ql-fill {
          fill: #e5e7eb;
        }

        .custom-quill .ql-picker-options {
          background-color: #1f2937;
          border: 1px solid #374151;
        }

        .custom-quill .ql-picker-item {
          color: #e5e7eb;
        }

        .custom-quill .ql-picker-item:hover {
          background-color: #374151;
        }

        .custom-quill .ql-tooltip {
          background-color: #1f2937;
          border: 1px solid #374151;
          color: white;
        }

        .custom-quill .ql-tooltip input {
          background-color: #111827;
          border: 1px solid #374151;
          color: white;
        }

        .custom-quill .ql-tooltip a {
          color: #80deea;
        }
      `}</style>
    </div>
  );
}
