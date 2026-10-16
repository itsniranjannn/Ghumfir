import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Globe, Lock, Plus, Trash2 } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import PlaceCard from '../components/PlaceCard.jsx';
import { Chips, CustomSelect, ErrorNote, Photo, Skeleton } from '../components/Bits.jsx';
import { codeOf } from '../components/Itinerary.jsx';
import { SplitWords } from '../components/Motion.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useApi, useDocumentTitle, useMeta, useToast } from '../lib/ui.jsx';
import { fmtDate, npr, plural } from '../lib/format.js';

const TABS = [['trips', 'Trips'], ['wishlist', 'Wishlist'], ['foryou', 'For you'], ['profile', 'Profile']];

export default function Trips() {
  useDocumentTitle('My trips');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'trips';
  const setTab = (k) => setParams(k === 'trips' ? {} : { tab: k }, { replace: true });
  const hour = new Date().getHours();
  return (
    <Page className="container dash">
      <header className="dash-head">
        <div className="stack-sm">
          <span className="eyebrow">{hour < 12 ? 'Subha prabhat' : hour < 18 ? 'Namaste' : 'Subha ratri'}</span>
          <SplitWords>{`${user.name.split(' ')[0]}'s journeys`}</SplitWords>
        </div>
        <Link to="/plan" className="btn btn-primary"><Plus size={16} /> New trip</Link>
      </header>
      <div className="tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}{tab === k && <motion.span layoutId="dash-tab" className="tab-line" />}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        {tab === 'trips' && <TripList />}
        {tab === 'wishlist' && <Wishlist />}
        {tab === 'foryou' && <ForYou />}
        {tab === 'profile' && <Profile />}
      </div>
    </Page>
  );
}

function TripList() {
  const { data, error, loading, reload } = useApi('/trips');
  const toast = useToast();
  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.title}"? This can't be undone.`)) return;
    try { await api(`/trips/${t.id}`, { method: 'DELETE' }); toast('Trip deleted'); reload(); } catch (e) { toast(e.message, 'bad'); }
  };
  if (loading && !data) return <div className="trip-grid">{[1, 2, 3].map((i) => <Skeleton key={i} h={260} r={18} />)}</div>;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data.trips.length) {
    return (
      <div className="empty">
        <h3>No trips yet</h3>
        <p>Your saved itineraries will live here.</p>
        <Link to="/plan" className="btn btn-ink" style={{ marginTop: 16 }}>Plan your first trip</Link>
      </div>
    );
  }
  return (
    <div className="trip-grid">
      {data.trips.map((t, i) => (
        <motion.article key={t.id} className="ticket trip-card" initial={{ opacity: 0, y: 24, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -6 }}>
          <Link to={`/trips/${t.id}`} className="trip-link">
            <Photo src={t.cover} alt="" className="trip-cover" nested />
            <div className="trip-body">
              <div className="trip-codes mono">
                {[t.startCity, ...t.stops].map((s, k) => <span key={k}>{codeOf(null, s)}</span>)}
              </div>
              <h3>{t.title}</h3>
              <p className="small muted">{t.startDate ? fmtDate(t.startDate, { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' : ''}{plural(t.days, 'day')} · {plural(t.travelers, 'traveller')}</p>
            </div>
          </Link>
          <div className="perf" />
          <div className="trip-foot">
            <span className="mono">{npr(t.totalCost)}</span>
            <span className="row" style={{ gap: 4 }}>
              <span className="tag" title={t.isPublic ? 'Anyone with the link can view' : 'Only you'}>{t.isPublic ? <><Globe size={11} /> shared</> : <><Lock size={11} /> private</>}</span>
              <button className="btn btn-quiet btn-icon btn-sm" onClick={() => remove(t)} aria-label={`Delete ${t.title}`}><Trash2 size={15} /></button>
            </span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function Wishlist() {
  const { data, error, loading, reload } = useApi('/me/wishlist');
  if (loading && !data) return <Skeleton h={200} />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data.results.length) return <div className="empty"><h3>Nothing saved yet</h3><p>Tap “Save” on any destination to keep it here.</p><Link className="btn btn-ink" style={{ marginTop: 16 }} to="/explore">Explore places</Link></div>;
  return (
    <div className="stack">
      <div className="place-grid compact">{data.results.map((p, i) => <PlaceCard key={p.id} place={p} index={i} showReasons={false} />)}</div>
      <div><Link className="btn btn-ink" to={`/plan?${new URLSearchParams({ dest: data.results[0].id })}`}>Plan a trip with {data.results[0].name}</Link></div>
    </div>
  );
}

function ForYou() {
  const month = new Date().getMonth() + 1;
  const { data, error, loading, reload } = useApi(`/destinations/recommendations?limit=6&month=${month}`);
  if (loading && !data) return <Skeleton h={200} />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  return (
    <div className="stack">
      <p className="ink-2">Based on your interests, the season, your wishlist and trips other travellers combined with places you've been.</p>
      <div className="place-grid">{data.results.map((p, i) => <PlaceCard key={p.id} place={p} month={month} index={i} />)}</div>
    </div>
  );
}

function Profile() {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const { meta } = useMeta();
  const toast = useToast();
  const fileRef = useRef(null);
  const [name, setName] = useState(user.name);
  const [location, setLocation] = useState(user.location || '');
  const [homeCityId, setHome] = useState(user.homeCityId || '');
  const [interests, setInterests] = useState(user.interests);
  const [busy, setBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [resending, setResending] = useState(false);

  const resendVerification = async () => {
    setResending(true);
    try {
      const res = await api('/auth/resend-verification', { method: 'POST' });
      toast(res.message || 'Verification email sent');
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setResending(false);
    }
  };

  const onPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await uploadAvatar(file);
      toast('Profile picture updated');
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    setUploadingPhoto(true);
    try {
      await updateProfile({ avatarUrl: '' });
      toast('Profile picture removed');
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({ name, location, homeCityId, interests });
      toast('Profile updated');
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel stack profile" onSubmit={save}>
      <div className="profile-avatar-row">
        <div className="profile-avatar-wrap">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="profile-avatar-img" />
          ) : (
            <span className="profile-avatar-fallback">{user.name[0]}</span>
          )}
        </div>
        <div className="profile-avatar-actions">
          <input
            type="file"
            ref={fileRef}
            style={{ display: 'none' }}
            accept="image/jpeg,image/png,image/webp"
            onChange={onPhotoSelect}
          />
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              disabled={uploadingPhoto}
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={14} /> {uploadingPhoto ? 'Uploading…' : 'Change picture'}
            </button>
            {user.avatarUrl && (
              <button
                type="button"
                className="btn btn-sm btn-quiet"
                disabled={uploadingPhoto}
                onClick={removePhoto}
                style={{ color: 'var(--bad)' }}
              >
                Remove
              </button>
            )}
          </div>
          <span className="tiny muted">JPEG, PNG or WebP (max 6 MB).</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="pn">Name</label>
        <input id="pn" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="field">
        <span className="label">Email</span>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span className="mono">{user.email}</span>
          <div className="row" style={{ alignItems: 'center', gap: 8 }}>
            {user.isVerified ? (
              <span className="tag moss">✓ Verified</span>
            ) : (
              <>
                <span className="tag marigold">Unverified</span>
                <button
                  type="button"
                  className="btn btn-sm btn-quiet"
                  disabled={resending}
                  onClick={resendVerification}
                >
                  {resending ? 'Sending…' : 'Resend verification'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="pl">Location</label>
        <input
          id="pl"
          className="input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Kathmandu, Nepal or Lalitpur"
        />
        <span className="tiny muted">Your hometown, current city, or region.</span>
      </div>

      <div className="field">
        <label htmlFor="ph">Trip starting hub (optional)</label>
        <CustomSelect
          id="ph"
          value={homeCityId}
          onChange={setHome}
          ariaLabel="Trip starting hub"
          options={[
            { value: '', label: 'Not set (default to Kathmandu)' },
            ...(meta?.startCities || []).map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <span className="tiny muted">City used as default start city when planning journeys.</span>
      </div>

      <div className="field">
        <span className="label">Interests</span>
        <Chips options={meta?.interests || []} value={interests} onChange={setInterests} max={5} />
      </div>

      <div>
        <button className="btn btn-ink" disabled={busy || uploadingPhoto}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
