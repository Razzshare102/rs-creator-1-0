export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="RS Creator logo">
        <rect width="32" height="32" rx="8" fill="#4f46e5" />
        <path d="M9 22V10h6a4 4 0 0 1 0 8H9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 18l6 4" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="23" cy="10" r="2.4" fill="#38bdf8" />
      </svg>
      <span className="font-bold text-lg text-white">RS Creator</span>
    </span>
  );
}
