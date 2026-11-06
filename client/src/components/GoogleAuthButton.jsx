import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '175952988903-8be1e4f76k013qlfo750nno28m5a0fm4.apps.googleusercontent.com';

export default function GoogleAuthButton({ onSuccess, onError, text = 'signin_with' }) {
  const { googleLogin } = useAuth();
  const btnContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCredentialResponse = async (response) => {
    if (!response?.credential) {
      setErrorMsg('No credential received from Google.');
      if (onError) onError('No credential received');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const user = await googleLogin(response.credential);
      if (onSuccess) onSuccess(user);
    } catch (err) {
      const msg = err.message || 'Google sign-in failed. Please try again.';
      setErrorMsg(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let checkInterval = null;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !btnContainerRef.current) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        btnContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(btnContainerRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        });
        return true;
      } catch (e) {
        console.error('[GoogleAuth] Init failed:', e);
        return false;
      }
    };

    if (!renderButton()) {
      checkInterval = setInterval(() => {
        if (renderButton()) clearInterval(checkInterval);
      }, 250);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [text]);

  return (
    <div className="google-auth-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0' }}>
      <div
        ref={btnContainerRef}
        style={{ minHeight: 44, display: 'flex', justifyContent: 'center', width: '100%' }}
      />
      {loading && (
        <p className="tiny muted" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
          Connecting with Google…
        </p>
      )}
      {errorMsg && (
        <p className="form-error" role="alert" style={{ marginTop: 6, fontSize: 13, textAlign: 'center' }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
