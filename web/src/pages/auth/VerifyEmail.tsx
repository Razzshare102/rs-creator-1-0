import { Link } from 'react-router-dom';
import Logo from '../../components/Logo';

export default function VerifyEmail() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6">
        <Logo />
        <h1 className="text-xl font-bold text-white mt-4">Check your email</h1>
        <p className="mt-2 text-sm text-slate-400">
          If you registered with RS Creator, a verification link was sent to your email address. Click it, then sign in.
        </p>
        <p className="mt-4 text-sm text-slate-400"><Link className="text-sky-400" to="/login">Back to sign in</Link></p>
      </div>
    </div>
  );
}
