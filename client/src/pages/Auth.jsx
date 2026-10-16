import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { Page, Brand } from '../components/Layout.jsx';
import Contours from '../components/Contours.jsx';
import { Chips, CustomSelect } from '../components/Bits.jsx';
import { SplitWords } from '../components/Motion.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle, useMeta, useToast } from '../lib/ui.jsx';

function AuthShell({ title, np, children, aside }) {
  return (
    <Page className="auth">
      <div className="auth-art" aria-hidden="true">
        <Contours seed={17} peaks={3} rings={12} />
        <div className="auth-art-copy">
          <span className="np auth-np">
            {np.split(' ').map((w, i) => (
              <motion.span
                key={i}
                style={{ display: 'inline-block', marginRight: '0.25em' }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1], duration: 0.8 }}
              >
                {w}
              </motion.span>
            ))}
          </span>
          <p className="mono small">{aside}</p>
        </div>
      </div>
      <div className="auth-form">
        <motion.div
          className="auth-inner stack"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="auth-brand" style={{ marginBottom: 8 }}>
            <Brand />
          </div>
          <SplitWords key={title}>{title}</SplitWords>
          {children}
        </motion.div>
      </div>
    </Page>
  );
}

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

export function Login() {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setResendStatus('');
    setBusy(true);
    try {
      const u = await login(email, password);
      nav(next || (u.role === 'admin' ? '/admin' : '/trips'), { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.unverified || (err.message && err.message.toLowerCase().includes('verify'))) {
        setUnverifiedEmail(email);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    setResendStatus('');
    try {
      const res = await api('/auth/resend-verification', { method: 'POST', body: { email: unverifiedEmail } });
      setResendStatus(res.message || 'Verification email resent! Please check your inbox.');
    } catch (e) {
      setResendStatus(e.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      np="फेरि स्वागत छ"
      aside="Log in to save trips, share them and get picks based on where you've been."
    >
      {params.get('reason') === 'save' && (
        <p className="hint">Log in or create a free account to keep this trip. Your draft is safe in the meantime.</p>
      )}
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="em">Email</label>
          <input
            id="em"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="pw">Password</label>
            <Link to="/forgot-password" className="small muted" style={{ textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <input
            id="pw"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="form-error stack-sm" role="alert">
            <p style={{ margin: 0 }}>{error}</p>
            {unverifiedEmail && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-quiet"
                  style={{ background: 'var(--card)' }}
                  disabled={resending}
                  onClick={handleResend}
                >
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
                {resendStatus && (
                  <p className="tiny" style={{ marginTop: 6, color: 'var(--ink)' }}>
                    {resendStatus}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'} <ArrowRight size={18} className="arrow" />
        </button>
      </form>
      <p className="small muted">
        New here? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>
      </p>
      <p className="tiny muted mono">Demo: demo@ghumfir.test / demo123</p>
    </AuthShell>
  );
}

export function Register() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const { meta } = useMeta();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', homeCityId: '', interests: [] });
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      setRegisteredEmail(form.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!registeredEmail) return;
    setResending(true);
    try {
      const res = await api('/auth/resend-verification', { method: 'POST', body: { email: registeredEmail } });
      toast(res.message || 'Verification email resent!');
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Make an account"
      np="यात्रा सुरु गरौं"
      aside="Free. Keeps your trips, wishlist and reviews in one place."
    >
      {registeredEmail ? (
        <div className="stack">
          <div className="form-success" role="status">
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
              <Mail size={18} />
              <strong style={{ fontSize: 'var(--t-md)' }}>Check your email</strong>
            </div>
          </div>
          <p>
            We've sent a verification link to <strong>{registeredEmail}</strong>.
          </p>
          <p className="small muted">
            Please check your inbox (and spam folder) and click the link to verify your email. Once verified, you can log in.
          </p>
          <div className="row" style={{ marginTop: 12, gap: 10 }}>
            <Link to="/login" className="btn btn-primary">
              Go to log in <ArrowRight size={16} className="arrow" />
            </Link>
            <button type="button" className="btn btn-quiet" disabled={resending} onClick={resend}>
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          </div>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="nm">Name</label>
            <input id="nm" className="input" autoComplete="name" value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label htmlFor="em2">Email</label>
            <input
              id="em2"
              className="input"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
            />
          </div>
          <div className="field">
            <label htmlFor="pw2">Password (6+ characters)</label>
            <input
              id="pw2"
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
            />
          </div>
          <div className="field">
            <label htmlFor="hc">Home city</label>
            <CustomSelect
              id="hc"
              value={form.homeCityId}
              onChange={set('homeCityId')}
              ariaLabel="Home city"
              options={[
                { value: '', label: 'Choose…' },
                ...(meta?.startCities || []).map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div className="field">
            <span className="label">What do you travel for?</span>
            <Chips options={meta?.interests || []} value={form.interests} onChange={set('interests')} max={5} />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'} <ArrowRight size={18} className="arrow" />
          </button>
        </form>
      )}
      {!registeredEmail && (
        <p className="small muted">
          Already have one? <Link to="/login">Log in</Link>
        </p>
      )}
    </AuthShell>
  );
}

export function ForgotPassword() {
  useDocumentTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const res = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setSuccess(res.message || 'If an account exists with that email, we have sent password reset instructions.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      np="पासवर्ड बिर्सनुभयो?"
      aside="Enter your email address and we'll send you instructions to set a new password."
    >
      {success ? (
        <div className="stack">
          <div className="form-success" role="status">
            <p style={{ margin: 0, fontWeight: 500 }}>{success}</p>
          </div>
          <p className="small muted">
            Please check your inbox (and spam folder) for an email from Ghumfir with your reset link.
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <Link to="/login" className="btn btn-primary">
              Back to log in <ArrowRight size={16} className="arrow" />
            </Link>
          </div>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="fp-em">Email</label>
            <input
              id="fp-em"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg" disabled={busy || !email.trim()}>
            {busy ? 'Sending link…' : 'Send reset link'} <ArrowRight size={18} className="arrow" />
          </button>
          <p className="small muted">
            Remembered your password? <Link to="/login">Log in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  useDocumentTitle('Choose new password');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password needs at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      const res = await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setSuccess(res.message || 'Your password has been reset successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="New password"
      np="नयाँ पासवर्ड"
      aside="Choose a strong password with at least 6 characters to secure your Ghumfir account."
    >
      {!token ? (
        <div className="stack">
          <p className="form-error" role="alert">
            No reset token was found in the link. Please request a new password reset link.
          </p>
          <Link to="/forgot-password" className="btn btn-primary">
            Request reset link <ArrowRight size={16} className="arrow" />
          </Link>
        </div>
      ) : success ? (
        <div className="stack">
          <div className="form-success" role="status">
            <p style={{ margin: 0, fontWeight: 500 }}>{success}</p>
          </div>
          <p className="small muted">You can now sign in to your account with your new password.</p>
          <div className="row" style={{ marginTop: 8 }}>
            <Link to="/login" className="btn btn-primary">
              Log in now <ArrowRight size={16} className="arrow" />
            </Link>
          </div>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="npw">New password (6+ characters)</label>
            <input
              id="npw"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="cpw">Confirm new password</label>
            <input
              id="cpw"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg" disabled={busy || !password}>
            {busy ? 'Updating password…' : 'Update password'} <ArrowRight size={18} className="arrow" />
          </button>
          <p className="small muted">
            Remembered your password? <Link to="/login">Log in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmail() {
  useDocumentTitle('Verify email');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token was provided in the link.');
      return;
    }
    let active = true;
    api(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (active) {
          setStatus('success');
          setMessage(res.message || 'Email verified successfully! You can now log in to access all features.');
        }
      })
      .catch((err) => {
        if (active) {
          setStatus('error');
          setMessage(err.message || 'Verification link is invalid or has already expired.');
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthShell
      title="Verify email"
      np="इमेल प्रमाणीकरण"
      aside="Confirming your email keeps your saved trips, reviews and account secure."
    >
      <div className="stack">
        {status === 'pending' && (
          <div className="row" style={{ alignItems: 'center', gap: 12, padding: '16px 0' }}>
            <div className="spinner" />
            <span>Verifying your email address…</span>
          </div>
        )}
        {status === 'success' && (
          <>
            <div className="form-success" role="status">
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} />
                <p style={{ margin: 0, fontWeight: 500 }}>{message}</p>
              </div>
            </div>
            <p className="small muted">
              Your account email is verified. You can now log in and plan, customize, and save your Nepal journeys.
            </p>
            <div className="row" style={{ marginTop: 8 }}>
              <Link to="/login" className="btn btn-primary">
                Log in now <ArrowRight size={16} className="arrow" />
              </Link>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="form-error" role="alert">
              <p style={{ margin: 0, fontWeight: 500 }}>{message}</p>
            </div>
            <p className="small muted">
              The verification link might have already been used, or it may have expired.
            </p>
            <div className="row" style={{ marginTop: 8, gap: 12 }}>
              <Link to="/login" className="btn btn-primary">
                Go to Log in
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  );
}
