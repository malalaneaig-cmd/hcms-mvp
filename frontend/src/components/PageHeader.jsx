export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="px-8 py-6 border-b border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
