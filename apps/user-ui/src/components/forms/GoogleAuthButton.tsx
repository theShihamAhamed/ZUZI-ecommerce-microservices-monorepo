"use client";

import Image from "next/image";

interface GoogleAuthButtonProps {
  text?: string;
}

const GoogleAuthButton = ({
  text = "Continue with Google",
}: GoogleAuthButtonProps) => {
  return (
    <button
      type="button"
      //   onClick={() => signIn("google")}
      onClick={() => {
        console.log("google");
      }}
      className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-stone-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition"
    >
      <Image src="/google.svg" alt="Google" width={18} height={18} />
      {text}
    </button>
  );
};

export default GoogleAuthButton;
