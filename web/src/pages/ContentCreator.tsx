import { useState } from 'react';
import { aiGenerate } from '../lib/api';

export default function ContentCreator() {
  const [topic, setTopic] = useState('');
  const [kind, setKind] = useState<'post' | 'thread' | 'rewrite' | 'hook'>('post');
  const [tone, setTone] = useState('Natural');
  const [length, setLength] = useState('Short');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate() {
    setError('');
    setBusy(true);
    try {
      const prompt = `Write a ${kind} for X about: ${topic}. Tone: ${tone}. Length: ${length}. Crypto/Web3 audience. Do not invent statistics, prices, or quotes — only use facts supplied in the topic; if a fact is missing, leave it out.`;
      const res = await aiGenerate({ prompt, provider: 'groq', model: 'llama-3.3-70b-versatile', style: tone });
      setDraft(res.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Content Creator — Module F</h1>
      <p className="text-slate-400 mt-1 text-sm">Post / thread generator, rewrite, and hook generator for crypto &amp; Web3. RS Creator never fabricates statistics — check every number before posting.</p>
      <div className="mt-4 flex gap-2">
        {(['post', 'thread', 'rewrite', 'hook'] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`px-4 py-2 rounded-lg capitalize ${kind === k ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{k}</button>
        ))}
      </div>
      <textarea className="mt-4 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white min-h-24" placeholder="Topic or text to rewrite…" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <div className="mt-3 grid md:grid-cols-2 gap-4">
        <label className="text-sm text-slate-300">Tone
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="block w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white">
            <option>Natural</option><option>Professional</option><option>Casual</option><option>Educational</option><option>Crypto Native</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">Length
          <select value={length} onChange={(e) => setLength(e.target.value)} className="block w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white">
            <option>Short</option><option>Medium</option><option>Long</option>
          </select>
        </label>
      </div>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button disabled={busy || !topic.trim()} onClick={() => void generate()} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Generating…' : 'Generate'}</button>
        {draft ? <button onClick={() => void navigator.clipboard.writeText(draft)} className="rounded-lg bg-slate-700 px-4 py-2 text-white">Copy</button> : null}
      </div>
      {draft ? <textarea className="mt-4 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white min-h-32" value={draft} onChange={(e) => setDraft(e.target.value)} /> : null}
    </div>
  );
}
