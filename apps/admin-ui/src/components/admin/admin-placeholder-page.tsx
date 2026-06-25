type AdminPlaceholderPageProps = {
  title: string;
  description: string;
};

export function AdminPlaceholderPage({
  title,
  description,
}: AdminPlaceholderPageProps) {
  return (
    <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-amber-700">Future module</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </section>
  );
}
