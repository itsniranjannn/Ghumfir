import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Globe, Lock, Mail, Pencil, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import Itinerary from '../components/Itinerary.jsx';
import { ErrorNote, Modal, Skeleton } from '../components/Bits.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useApi, useDocumentTitle, useToast } from '../lib/ui.jsx';
import { fmtDate } from '../lib/format.js';

export default function TripView() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/trips/${id}`);
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  useDocumentTitle(data?.trip.title);

  if (loading && !data) return <Page className="container section"><Skeleton h={300} r={18} /></Page>;
  if (error) return <Page className="container section"><ErrorNote error={error} onRetry={reload} /></Page>;
  const t = data.trip;
  const shareUrl = `${window.location.origin}/t/${t.shareCode}`;

  const toggleShare = async () => {
    try {
      const r = await api(`/trips/${t.id}/share`, { method: 'PATCH', body: { isPublic: !t.isPublic } });
      if (r.isPublic) {
        try { await navigator.clipboard.writeText(shareUrl); toast('Public link copied'); } catch { toast('Trip is now public'); }
      } else toast('Trip is private again');
      reload();
    } catch (e) { toast(e.message, 'bad'); }
  };

  const rename = async (e) => {
    e.preventDefault();
    try { await api(`/trips/${t.id}`, { method: 'PUT', body: { title } }); setRenaming(false); reload(); } catch (err) { toast(err.message, 'bad'); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    try { await api(`/trips/${t.id}`, { method: 'DELETE' }); toast('Trip deleted'); nav('/trips'); } catch (e) { toast(e.message, 'bad'); }
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo.trim()) return;
    setSendingEmail(true);
    try {
      const res = await api(`/trips/${t.id}/email`, { method: 'POST', body: { email: emailTo.trim() } });
      toast(res.message || 'Itinerary emailed successfully');
      setEmailModal(false);
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Page className="container planner-result">
      <Itinerary
        plan={t.plan}
        title={t.title}
        subtitle={`Saved ${fmtDate(t.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}${t.isPublic ? ' · shared publicly' : ''}`}
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => { setTitle(t.title); setRenaming(true); }}><Pencil size={14} /> Rename</button>
            <button className="btn btn-ghost btn-sm" onClick={() => nav(`/plan?trip=${t.id}`)}><RefreshCw size={14} /> Re-plan</button>
            <button className="btn btn-ghost btn-sm" onClick={toggleShare}>{t.isPublic ? <><Lock size={14} /> Make private</> : <><Globe size={14} /> Share</>}</button>
            {t.isPublic && <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => toast('Link copied'))}><Copy size={14} /> Copy link</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => { setEmailTo(user?.email || ''); setEmailModal(true); }}><Mail size={14} /> Email</button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={14} /> Print</button>
            <button className="btn btn-quiet btn-sm btn-icon" onClick={remove} aria-label="Delete trip"><Trash2 size={15} /></button>
          </>
        }
      />
      <Modal open={renaming} onClose={() => setRenaming(false)} label="Rename trip">
        <form className="stack" onSubmit={rename}>
          <h3>Rename trip</h3>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} autoFocus />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-quiet" onClick={() => setRenaming(false)}>Cancel</button>
            <button className="btn btn-ink" disabled={!title.trim()}>Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={emailModal} onClose={() => setEmailModal(false)} label="Email itinerary">
        <form className="stack" onSubmit={sendEmail}>
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'var(--brick-wash)', color: 'var(--brick)', borderRadius: '50%', width: 36, height: 36, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Mail size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Email itinerary</h3>
              <p className="tiny muted" style={{ margin: 0 }}>Send this trip's full schedule, stops, and budget breakdown</p>
            </div>
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label htmlFor="email-recip">Recipient email</label>
            <input
              id="email-recip"
              className="input"
              type="email"
              placeholder="traveller@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              required
              autoFocus
            />
            <span className="tiny muted">
              We'll send a branded, mobile-friendly itinerary with all stop highlights.
            </span>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-quiet" onClick={() => setEmailModal(false)}>Cancel</button>
            <button className="btn btn-ink" disabled={sendingEmail || !emailTo.trim()}>
              {sendingEmail ? 'Sending…' : 'Send email'}
            </button>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
