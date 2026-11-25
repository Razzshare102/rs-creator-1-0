import { useState } from 'react';

type Mode = 'tag' | 'news';
type RunState = 'stopped' | 'running' | 'paused';

export default function FeedAssistant() {
  const [mode, setMode] = useState<Mode>('tag');
  const [keyword, setKeyword] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [maxAgeHours, setMaxAgeHours] = useState(24);
  const [scanInterval, setScanInterval] = useState(15);
  const [maxPosts, setMaxPosts] = useState(50);
  const [runState, setRunState] = useState<RunState>('stopped');

  function addKeyword() {
    const k = keyword.trim();
    if (!k) return;
    // Case-insensitive dedupe.
    if (keywords.some((x) => x.toLowerCase() === k.toLowerCase())) return;
    setKeywords([...keywords, k]);
    setKeyword('');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Feed Assistant — Module C</h1>
      <p className="text-slate-400 mt-1 text-sm">Tag mode watches keywords; News Feed mode scans your feed. Posts are deduplicated — each post is processed once per session.</p>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setMode('tag')} className={`px-4 py-2 rounded-lg ${mode === 'tag' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Tag mode</button>
        <button onClick={() => setMode('news')} className={`px-4 py-2 rounded-lg ${mode === 'news' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>News Feed mode</button>
      </div>
      <div className="mt-4 flex gap-2">
        <input className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" placeholder="Add a keyword…" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addKeyword(); }} />
        <button onClick={addKeyword} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Add</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {keywords.map((k) => (
          <span key={k.toLowerCase()} className="inline-flex items-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-sm text-white">
            {k}
            <button onClick={() => setKeywords(keywords.filter((x) => x !== k))} aria-label={`Remove ${k}`}>×</button>
          </span>
        ))}
        {keywords.length === 0 ? <p className="text-sm text-slate-500">No keywords yet.</p> : null}
      </div>
      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <label className="text-sm text-slate-300">Max post age (hours): {maxAgeHours}
          <input type="number" min={1} value={maxAgeHours} onChange={(e) => setMaxAgeHours(Number(e.target.value))} className="block w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" />
        </label>
        <label className="text-sm text-slate-300">Scan interval (minutes): {scanInterval}
          <input type="number" min={1} value={scanInterval} onChange={(e) => setScanInterval(Number(e.target.value))} className="block w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" />
        </label>
        <label className="text-sm text-slate-300">Max posts / session: {maxPosts}
          <input type="number" min={1} value={maxPosts} onChange={(e) => setMaxPosts(Number(e.target.value))} className="block w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" />
        </label>
      </div>
      <p className="mt-4 text-sm text-slate-400">Status: <span className="text-white">{runState}</span> — controls are local state; live scanning starts once the backend is connected.</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setRunState('running')} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Start</button>
        <button onClick={() => setRunState('paused')} className="rounded-lg bg-slate-700 px-4 py-2 text-white">Pause</button>
        <button onClick={() => setRunState('running')} className="rounded-lg bg-slate-700 px-4 py-2 text-white">Resume</button>
        <button onClick={() => setRunState('stopped')} className="rounded-lg bg-slate-700 px-4 py-2 text-white">Stop</button>
      </div>
    </div>
  );
}
