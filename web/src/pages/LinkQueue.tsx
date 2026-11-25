import { useState } from 'react';
import type { QueueItem } from '../lib/types';

const POST_ID_RE = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i;

export function extractPostId(url: string): string | null {
  const m = POST_ID_RE.exec(url.trim());
  return m ? m[1] : null;
}

const STATUSES: QueueItem['status'][] = ['Pending', 'Processing', 'Draft Ready', 'Approved', 'Completed', 'Skipped', 'Failed'];

export default function LinkQueue() {
  const [raw, setRaw] = useState('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState('');

  function addLinks() {
    setError('');
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const next: QueueItem[] = [...items];
    const invalid: string[] = [];
    for (const url of lines) {
      const postId = extractPostId(url);
      if (!postId) {
        invalid.push(url);
        continue;
      }
      if (next.some((i) => i.post_id === postId)) continue; // Dedupe by post ID.
      next.push({ id: crypto.randomUUID(), url, post_id: postId, status: 'Pending', created_at: new Date().toISOString() });
    }
    if (invalid.length > 0) setError(`Could not extract a post ID from: ${invalid.join(', ')}`);
    setItems(next);
    setRaw('');
  }

  function setStatus(id: string, status: QueueItem['status']) {
    setItems(items.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Link Queue — Module E</h1>
      <p className="text-slate-400 mt-1 text-sm">Paste X post URLs, one per line. Post IDs are extracted with a regex, validated, and deduplicated.</p>
      <textarea className="mt-4 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white min-h-28" placeholder={'https://x.com/user/status/123…\nhttps://twitter.com/user/status/456…'} value={raw} onChange={(e) => setRaw(e.target.value)} />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button onClick={addLinks} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-white">Add to queue</button>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Queue is empty. Local demo list — saved to the backend once connected.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead><tr className="text-left text-slate-400"><th className="py-2">Post ID</th><th>URL</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-slate-800 text-white">
                <td className="py-2">{i.post_id}</td>
                <td className="text-slate-400 break-all">{i.url}</td>
                <td>
                  <select value={i.status} onChange={(e) => setStatus(i.id, e.target.value as QueueItem['status'])} className="rounded bg-slate-800 border border-slate-700 px-2 py-1">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td><button onClick={() => setItems(items.filter((x) => x.id !== i.id))} className="text-red-400">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
