type PlaceholderPageProps = {
  title: string;
  blurb: string;
};

export function PlaceholderPage({ title, blurb }: PlaceholderPageProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-2xl font-semibold text-[#0f172a]">{title}</div>
      <p className="max-w-3xl text-sm text-[#4b5563]">{blurb}</p>
      <div className="rounded-lg border border-dashed border-[#d0d7e2] bg-[#f8fafc] p-4 text-sm text-[#4b5563]">
        Responsive content area. Resize the window to see the layout adapt.
      </div>
    </div>
  );
}
