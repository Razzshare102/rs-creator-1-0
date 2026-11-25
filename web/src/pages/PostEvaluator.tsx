import { useState } from 'react';
import { aiEvaluate } from '../lib/api';
import type { AiEvaluateResponse } from '../lib/types';

export default function PostEvaluator() {
  const [postText, setPostText] = useState('');
  const [result, setResult] = useState<AiEvaluateResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function evaluate() {
    setError('');
    setResult(null);
    setBusy(true);
    try {
      setResult(await aiEvaluate(postText));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Post Evaluator — Module B</h1>
      <p className="text-slate-400 mt-1 text-sm">Analyse quality, relevance, sentiment, topic and spam risk, then get a Reply / Like / Skip recommendation.</p>
      <textarea className="mt-4 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white min-h-28" placeholder="Paste the X post text here…" value={postText} onChange={(e) => setPostText(e.target.value)} />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button disabled={busy || !postText.trim()} onClick={() => void evaluate()} className="mt-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Analysing…' : 'Analyse post'}</button>
      {result ? (
        <div className="mt-4 rounded-xl bg-slate-800 border border-slate-700 p-4">
          <p className="text-white font-semibold">Recommendation: {result.recommendation}</p>
          <p className="text-sm text-slate-400 mt-1">{result.explanation}</p>
          <dl className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div><dt className="text-slate-500">Quality</dt><dd className="text-white">{result.quality}</dd></div>
            <div><dt className="text-slate-500">Relevance</dt><dd className="text-white">{result.relevance}</dd></div>
            <div><dt className="text-slate-500">Sentiment</dt><dd className="text-white">{result.sentiment}</dd></div>
            <div><dt className="text-slate-500">Topic</dt><dd className="text-white">{result.topic}</dd></div>
            <div><dt className="text-slate-500">Spam score</dt><dd className="text-white">{result.spam_score}</dd></div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
