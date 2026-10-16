import { useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, BedDouble, ImagePlus, Landmark, MapPin, MessageSquare, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { Page } from '../../components/Layout.jsx';
import { BarChart, Donut, HBars } from '../../components/Charts.jsx';
import { CountUp, CustomSelect, ErrorNote, Modal, Skeleton, Stars } from '../../components/Bits.jsx';
import { api, uploadImage } from '../../lib/api.js';
import { useApi, useDocumentTitle, useMeta, useToast } from '../../lib/ui.jsx';
import { compactNpr, fmtDate, npr } from '../../lib/format.js';

const SECTIONS = [
  { to: '', label: 'Overview', icon: BarChart3 },
  { to: 'destinations', label: 'Destinations', icon: MapPin },
  { to: 'attractions', label: 'Attractions', icon: Landmark },
  { to: 'hotels', label: 'Hotels', icon: BedDouble },
  { to: 'users', label: 'Users', icon: Users },
  { to: 'reviews', label: 'Reviews', icon: MessageSquare },
];

export default function Admin() {
  useDocumentTitle('Admin');
  return (
    <Page className="admin">
      <aside className="admin-side">
        <span className="eyebrow plain">Admin</span>
        <nav className="stack-sm">
          {SECTIONS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={`/admin${to ? `/${to}` : ''}`} end className={({ isActive }) => (isActive ? 'on' : '')}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="destinations" element={<CatalogTable kind="destinations" />} />
          <Route path="attractions" element={<CatalogTable kind="attractions" />} />
          <Route path="hotels" element={<CatalogTable kind="hotels" />} />
          <Route path="users" element={<UsersTable />} />
          <Route path="reviews" element={<ReviewsTable />} />
        </Routes>
      </div>
    </Page>
  );
}

function Overview() {
  const { data, error, loading, reload } = useApi('/admin/stats');
  if (loading && !data) return <Skeleton h={400} r={18} />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const c = data.counts;
  // Always show the last 6 months, with zeros where no trips were planned.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: d.toLocaleDateString('en-GB', { month: 'short' }), value: Number(data.perMonth.find((m) => m.month === key)?.trips || 0) };
  });
  const styleColors = { budget: 'var(--moss)', standard: 'var(--slate)', premium: 'var(--brick)' };
  return (
    <div className="stack">
      <h1>Overview</h1>
      <div className="kpis">
        {[['Travellers', c.travelers], ['Trips planned', c.trips], ['Destinations', c.destinations], ['Reviews', c.reviews]].map(([k, v], i) => (
          <motion.div key={k} className="card kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <span className="label">{k}</span><span className="kpi-v"><CountUp value={Number(v)} /></span>
          </motion.div>
        ))}
        <div className="card kpi"><span className="label">Avg trip cost</span><span className="kpi-v mono">{compactNpr(c.avgCost)}</span></div>
        <div className="card kpi"><span className="label">Avg length</span><span className="kpi-v mono">{c.avgDays} days</span></div>
      </div>
      <div className="admin-charts">
        <section className="card card-pad">
          <span className="label">Trips per month</span>
          <BarChart data={months} />
          <div className="bar-labels mono tiny muted">{months.map((m) => <span key={m.key}>{m.label}</span>)}</div>
        </section>
        <section className="card card-pad">
          <span className="label">Most planned destinations</span>
          <div style={{ marginTop: 12 }}><HBars data={data.topDest.map((d) => ({ label: d.name, value: Number(d.visits) }))} color="var(--brick)" /></div>
        </section>
        <section className="card card-pad">
          <span className="label">Travel style</span>
          <div style={{ marginTop: 12 }}><Donut label="Trips by style" data={data.styles.map((s) => ({ label: s.style, value: Number(s.n), color: styleColors[s.style] }))} /></div>
        </section>
        <section className="card card-pad">
          <span className="label">Budget bands</span>
          <div style={{ marginTop: 12 }}><HBars data={['Under 30k', '30k-75k', '75k-150k', '150k+'].map((b) => ({ label: b, value: Number(data.budgets.find((x) => x.band === b)?.n || 0) }))} color="var(--marigold)" /></div>
        </section>
      </div>
      <section className="stack-sm">
        <h3>Recent trips</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Trip</th><th>By</th><th>Days</th><th style={{ textAlign: 'right' }}>Cost</th><th>Created</th></tr></thead>
            <tbody>
              {data.recentTrips.map((t) => (
                <tr key={t.id}><td>{t.title}</td><td>{t.user}</td><td className="mono">{t.days}</td><td className="mono" style={{ textAlign: 'right' }}>{compactNpr(t.total_cost)}</td><td className="mono tiny">{fmtDate(t.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------- generic catalog CRUD ----------
const CONFIG = {
  destinations: {
    title: 'Destinations',
    columns: [['image_url', '', null, 'thumb'], ['name', 'Name'], ['province', 'Province'], ['altitude_m', 'Altitude', (v) => `${v} m`], ['min_days', 'Min days'], ['tags', 'Tags'], ['is_start_city', 'Start', (v) => (v ? 'Yes' : '')]],
    fields: [
      ['name', 'Name'], ['slug', 'Slug (url)'], ['name_np', 'Name in Nepali'], ['province', 'Province'],
      ['tagline', 'Tagline', 'wide'], ['description', 'Description', 'textarea'],
      ['lat', 'Latitude', 'number'], ['lng', 'Longitude', 'number'], ['altitude_m', 'Altitude (m)', 'number'],
      ['tags', 'Tags (comma separated)', 'wide'], ['best_months', 'Best months (1-12, comma)'],
      ['min_days', 'Min days', 'number'], ['ideal_days', 'Ideal days', 'number'], ['daily_food_cost', 'Food / person / day (Rs)', 'number'],
      ['access_factor', 'Access difficulty (1 = easy, 2.5 = remote)', 'number'], ['permit_fee', 'Permit fee (Rs)', 'number'], ['permit_note', 'Permit note', 'wide'],
      ['image_url', 'Photo', 'image'], ['image_credit', 'Photo credit (author · licence · link, or Own photo)', 'wide'],
      ['has_airport', 'Has airport', 'check'], ['is_start_city', 'Can start trips here', 'check'], ['weather_risk', 'Weather-prone flights', 'check'],
    ],
  },
  attractions: {
    title: 'Attractions',
    columns: [['name', 'Name'], ['destination_id', 'Destination', null, 'dest'], ['category', 'Category'], ['entry_fee', 'Fee', (v) => (v ? npr(v) : 'Free')], ['duration_hours', 'Hours'], ['rating', 'Rating']],
    fields: [
      ['destination_id', 'Destination', 'dest'], ['name', 'Name'], ['category', 'Category', 'interest'], ['description', 'Description', 'textarea'],
      ['entry_fee', 'Entry fee (Rs)', 'number'], ['duration_hours', 'Duration (hours)', 'number'], ['rating', 'Rating (1-5)', 'number'],
      ['lat', 'Latitude', 'number'], ['lng', 'Longitude', 'number'],
    ],
  },
  hotels: {
    title: 'Hotels',
    columns: [['image_url', '', null, 'thumb'], ['name', 'Name'], ['destination_id', 'Destination', null, 'dest'], ['tier', 'Tier'], ['price_per_night', 'Per night', (v) => npr(v)], ['rating', 'Rating']],
    fields: [
      ['destination_id', 'Destination', 'dest'], ['name', 'Name'], ['tier', 'Tier', 'tier'], ['price_per_night', 'Price per room-night (Rs)', 'number'],
      ['rating', 'Rating (1-5)', 'number'], ['amenities', 'Amenities (comma separated)', 'wide'],
      ['image_url', 'Photo', 'image'], ['image_credit', 'Photo credit', 'wide'],
    ],
  },
};

function Thumb({ src }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <span className="thumb thumb-empty" aria-hidden="true" />;
  return <img className="thumb" src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}

/** Photo field: drag-and-drop or pick a file to upload, or paste an image URL. */
function ImageField({ id, value, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const upload = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast('Use a JPEG, PNG or WebP image', 'bad');
    setBusy(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
      toast('Photo uploaded');
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  };
  return (
    <div className="image-field">
      <div
        className={`drop ${over ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      >
        {value ? <img src={value} alt="Preview" referrerPolicy="no-referrer" /> : null}
        <div className="drop-hint">
          {busy ? <span className="spinner" /> : <ImagePlus size={20} />}
          <span>{busy ? 'Uploading…' : value ? 'Replace photo' : 'Drop a photo or click to upload'}</span>
          <span className="tiny muted">JPEG, PNG or WebP · max 6 MB</span>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files[0])} />
      </div>
      <input id={id} className="input" placeholder="…or paste an image URL" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CatalogTable({ kind }) {
  const cfg = CONFIG[kind];
  const { meta } = useMeta();
  const { data, error, loading, reload } = useApi(`/admin/${kind}`);
  const toast = useToast();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // {} for new, row for edit
  const destName = useMemo(() => new Map((meta?.destinations || []).map((d) => [d.id, d.name])), [meta]);
  const rows = (data?.rows || []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.name}? Linked records are removed too.`)) return;
    try { await api(`/admin/${kind}/${row.id}`, { method: 'DELETE' }); toast('Deleted'); reload(); } catch (e) { toast(e.message, 'bad'); }
  };

  return (
    <div className="stack">
      <div className="row between">
        <h1>{cfg.title}</h1>
        <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add</button>
      </div>
      <div className="search admin-search"><Search size={16} className="search-icon" /><input className="input search-input" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter rows" /></div>
      <ErrorNote error={error} onRetry={reload} />
      {loading && !data ? <Skeleton h={300} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>{cfg.columns.map(([k, l]) => <th key={k}>{l}</th>)}<th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {cfg.columns.map(([k, , fmt, type]) => (
                    <td key={k} className={typeof r[k] === 'number' ? 'mono' : ''}>{type === 'thumb' ? <Thumb src={r[k]} /> : type === 'dest' ? destName.get(r[k]) || r[k] : fmt ? fmt(r[k]) : String(r[k] ?? '')}</td>
                  ))}
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button className="btn btn-quiet btn-icon btn-sm" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`}><Pencil size={14} /></button>
                    <button className="btn btn-quiet btn-icon btn-sm" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} label={`Edit ${kind}`}>
        {editing && <EditForm kind={kind} row={editing} meta={meta} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      </Modal>
    </div>
  );
}

function EditForm({ kind, row, meta, onClose, onSaved }) {
  const cfg = CONFIG[kind];
  const toast = useToast();
  const [form, setForm] = useState(() => Object.fromEntries(cfg.fields.map(([k, , t]) => [k, row[k] ?? (t === 'check' ? 0 : '')])));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const body = { ...form };
    for (const [k, , t] of cfg.fields) if ((t === 'number' || t === 'dest') && body[k] !== '') body[k] = Number(body[k]);
    try {
      if (row.id) await api(`/admin/${kind}/${row.id}`, { method: 'PUT', body });
      else await api(`/admin/${kind}`, { method: 'POST', body });
      toast(row.id ? 'Saved' : 'Created');
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <h3>{row.id ? `Edit ${row.name}` : `New ${kind.slice(0, -1)}`}</h3>
      <div className="form-grid">
        {cfg.fields.map(([k, label, type]) => {
          const id = `f-${k}`;
          const wide = type === 'wide' || type === 'textarea' || type === 'image';
          if (type === 'check') {
            return (
              <label key={k} className="check"><input type="checkbox" checked={!!Number(form[k])} onChange={(e) => set(k, e.target.checked ? 1 : 0)} /> {label}</label>
            );
          }
          return (
            <div key={k} className={`field ${wide ? 'wide' : ''}`}>
              <label htmlFor={id}>{label}</label>
              {type === 'image' ? <ImageField id={id} value={form[k]} onChange={(v) => set(k, v)} />
                : type === 'textarea' ? <textarea id={id} className="textarea" value={form[k]} onChange={(e) => set(k, e.target.value)} />
                : type === 'dest' ? (
                  <CustomSelect
                    id={id}
                    value={form[k]}
                    onChange={(v) => set(k, v)}
                    options={[
                      { value: '', label: 'Choose…' },
                      ...(meta?.destinations || []).map((d) => ({ value: d.id, label: d.name })),
                    ]}
                  />
                ) : type === 'interest' ? (
                  <CustomSelect
                    id={id}
                    value={form[k]}
                    onChange={(v) => set(k, v)}
                    options={[
                      { value: '', label: 'Choose…' },
                      ...(meta?.interests || []).map((t) => ({ value: t, label: t })),
                    ]}
                  />
                ) : type === 'tier' ? (
                  <CustomSelect
                    id={id}
                    value={form[k]}
                    onChange={(v) => set(k, v)}
                    options={['', 'budget', 'standard', 'premium'].map((t) => ({ value: t, label: t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Choose…' }))}
                  />
                ) : <input id={id} className="input" type={type === 'number' ? 'number' : 'text'} step="any" value={form[k]} onChange={(e) => set(k, e.target.value)} />}
            </div>
          );
        })}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        <button className="btn btn-ink" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

function UsersTable() {
  const { data, error, loading, reload } = useApi('/admin/users');
  const toast = useToast();
  const toggle = async (u) => {
    try { await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.is_active } }); reload(); } catch (e) { toast(e.message, 'bad'); }
  };
  if (loading && !data) return <Skeleton h={300} />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  return (
    <div className="stack">
      <h1>Users</h1>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Trips</th><th>Reviews</th><th>Joined</th><th>Status</th></tr></thead>
          <tbody>
            {data.rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td className="mono tiny">{u.email}</td><td><span className={`tag ${u.role === 'admin' ? 'brick' : ''}`}>{u.role}</span></td>
                <td className="mono">{u.trips}</td><td className="mono">{u.reviews}</td><td className="mono tiny">{fmtDate(u.created_at, { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                <td>{u.role === 'admin' ? <span className="tag moss">active</span> : (
                  <button className={`btn btn-sm ${u.is_active ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggle(u)}>{u.is_active ? 'Deactivate' : 'Reactivate'}</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewsTable() {
  const { data, error, loading, reload } = useApi('/admin/reviews');
  const toast = useToast();
  const remove = async (r) => {
    if (!window.confirm('Delete this review?')) return;
    try { await api(`/admin/reviews/${r.id}`, { method: 'DELETE' }); toast('Review deleted'); reload(); } catch (e) { toast(e.message, 'bad'); }
  };
  if (loading && !data) return <Skeleton h={300} />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  return (
    <div className="stack">
      <h1>Reviews</h1>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Destination</th><th>By</th><th>Rating</th><th>Comment</th><th>Date</th><th /></tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.destination}</td><td>{r.user}</td><td><Stars value={r.rating} size={12} /></td><td className="small">{r.comment}</td>
                <td className="mono tiny">{fmtDate(r.created_at)}</td>
                <td><button className="btn btn-quiet btn-icon btn-sm" onClick={() => remove(r)} aria-label="Delete review"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
