import { Clock3 } from "lucide-react";

interface ProfileComingSoonProps {
  title: string;
}

export function ProfileComingSoon({ title }: ProfileComingSoonProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
        <Clock3 className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-gray-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        This account section is coming soon.
      </p>
    </section>
  );
}
