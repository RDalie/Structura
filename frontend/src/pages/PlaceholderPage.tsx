type PlaceholderPageProps = {
  title: string;
  blurb: string;
};

export function PlaceholderPage({ title, blurb }: PlaceholderPageProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-2xl font-semibold text-slate-50">{title}</div>
      <p className="max-w-3xl text-sm text-slate-300">{blurb}</p>
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
        Responsive content area. Resize the window to see the layout adapt.
      </div>
    </div>
  );
}
