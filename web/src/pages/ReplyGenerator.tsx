import { useState } from 'react';
import { aiGenerate } from '../lib/api';
import { REPLY_STYLES } from '../lib/types';
import type { ReplyStyle } from '../lib/types';

export default function ReplyGenerator() {
  const [postText, setPostText] = useState('');
  const [style, setStyle] = useState<ReplyStyle>('Natural');
  const [length, setLength] = useState(120);
  const [emoji, setEmoji] = useState(false);
  const [hashtags, setHashtags] = useState(false);
  const [links, setLinks] = useState(false);
  const [bannedWords, setBannedWords] = useState('');
  const [language, setLanguage] = useState('English');
  const [manualApproval, setManualApproval] = useState(true);
  const [provider, setProvider] = useState<'groq' | 'openrouter'>('groq');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate() {
    setError('');
    setBusy(true);
    try {
      const prompt = [
        `Reply to this X post in ${style} style, max ~${length} characters, language: ${language}.`,
        emoji ? 'Use emoji sparingly.' : 'No emoji.',
        hashtags ? 'May include hashtags.' : 'No hashtags.',
        links ? 'May include links.' : 'No links.',
        bannedWords ? `Banned words (never use): ${bannedWords}.` : '',
        `Post: ${postText}`,
      ].join(' ');
      const res = await aiGenerate({ prompt, provider, model, style });
      setDraft(res.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Reply Generator — Module A</h1>
      <p className="text-slate-400 mt-1 text-sm">Manual approval is ON by default: nothing is posted automatically. Review and edit every draft.</p>
      <div className="mt-4 grid gap-4">
        <textarea className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white min-h-28" placeholder="Paste the X post text here…" value={postText} onChange={(e) => setPostText(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {REPLY_STYLES.map((s) => (
            <button key={s} onClick={() => setStyle(s)} className={`px-3 py-1.5 rounded-full text-sm ${style === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>{s}</button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm text-slate-300">Length: {length} chars
            <input type="range" min={40} max={280} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full" />
          </label>
          <label className="text-sm text-slate-300">Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="block w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white">
              <option>English</option><option>Spanish</option><option>French</option><option>German</option><option>Bengali</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">Provider
            <select value={provider} onChange={(e) => setProvider(e.target.value as 'groq' | 'openrouter')} className="block w-full mt-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white">
              <option value="groq">Groq</option><option value="openrouter">OpenRouter</option>
            </select>
          </label>
          <input className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <input className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" placeholder="Banned words (comma separated)" value={bannedWords} onChange={(e) => setBannedWords(e.target.value)} />
        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <label><input type="checkbox" checked={emoji} onChange={(e) => setEmoji(e.target.checked)} /> Emoji</label>
          <label><input type="checkbox" checked={hashtags} onChange={(e) => setHashtags(e.target.checked)} /> Hashtags</label>
          <label><input type="checkbox" checked={links} onChange={(e) => setLinks(e.target.checked)} /> Links</label>
          <label><input type="checkbox" checked={manualApproval} onChange={(e) => setManualApproval(e.target.checked)} /> Manual approval (default ON)</label>
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex gap-2">
          <button disabled={busy || !postText.trim()} onClick={() => void generate()} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Generating…' : 'Generate reply'}</button>
          {draft ? <button onClick={() => void generate()} className="rounded-lg bg-slate-700 px-4 py-2 text-white">Regenerate</button> : null}
          {draft ? <button onClick={() => void navigator.clipboard.writeText(draft)} className="rounded-lg bg-slate-700 px-4 py-2 text-white">Copy</button> : null}
        </div>
        {draft ? (
          <div>
            <h2 className="font-semibold text-white">Draft (edit before use)</h2>
            <textarea className="mt-2 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white min-h-24" value={draft} onChange={(e) => setDraft(e.target.value)} />
            {manualApproval ? <p className="text-xs text-slate-500 mt-1">Manual approval on — this draft is not posted anywhere by RS Creator.</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
