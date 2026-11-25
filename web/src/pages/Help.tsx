export default function Help() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Help</h1>
      <div className="mt-4 space-y-4 text-sm text-slate-300">
        <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <h2 className="font-semibold text-white">Getting started</h2>
          <p className="mt-1">1. Register, then enter your license key. 2. Add your Groq or OpenRouter key in API Settings (or use the admin-managed key). 3. Generate replies in Reply Generator — every draft needs your manual approval before you post it on X.</p>
        </section>
        <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <h2 className="font-semibold text-white">Modules</h2>
          <p className="mt-1">A Reply Generator · B Post Evaluator · C Feed Assistant · D Account Monitor · E Link Queue · F Content Creator · G Activity History.</p>
        </section>
        <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <h2 className="font-semibold text-white">Support</h2>
          <p className="mt-1">RS Creator is an AI assistant for X creators. It never posts on your behalf without your explicit approval, and it never invents statistics — verify every number before posting.</p>
        </section>
      </div>
    </div>
  );
}
