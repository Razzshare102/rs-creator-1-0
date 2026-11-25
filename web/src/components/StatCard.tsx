export default function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub ? <p className="text-xs text-slate-500 mt-1">{sub}</p> : null}
    </div>
  );
}
