import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, Map as MapIcon, Search, X } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import PlaceCard from '../components/PlaceCard.jsx';
import RouteMap from '../components/RouteMap.jsx';
import Contours from '../components/Contours.jsx';
import { SplitWords } from '../components/Motion.jsx';
import { Chips, CustomSelect, ErrorNote, Segmented, Skeleton } from '../components/Bits.jsx';
import { useApi, useDebounced, useDocumentTitle, useMeta } from '../lib/ui.jsx';
import { MONTHS } from '../lib/format.js';

export default function Explore() {
  useDocumentTitle('Explore');
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [interests, setInterests] = useState(params.get('interests')?.split(',').filter(Boolean) || []);
  const [province, setProvince] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [sort, setSort] = useState('recommended');
  const [view, setView] = useState('grid');
  const dq = useDebounced(q, 250);

  // Without chosen chips the server falls back to the logged-in user's saved interests.
  const qs = new URLSearchParams({ q: dq, province, month, sort, ...(interests.length && { interests: interests.join(',') }) });
  const { data, error, loading, reload } = useApi(`/destinations?${qs}`);
  const results = data?.results || [];

  const updateQ = (v) => {
    setQ(v);
    const p = new URLSearchParams(params);
    v ? p.set('q', v) : p.delete('q');
    setParams(p, { replace: true });
  };

  return (
    <Page className="explore">
      <section className="explore-head">
        <Contours seed={21} peaks={2} rings={8} className="head-contours" />
        <div className="container stack">
          <span className="eyebrow">{meta?.destinations?.length || 18} destinations · 7 provinces</span>
          <SplitWords>Where in Nepal?</SplitWords>
          <motion.div className="search" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <Search size={20} className="search-icon" />
            <input className="input search-input" value={q} onChange={(e) => updateQ(e.target.value)}
              placeholder="Try “rhino”, “lake”, “pokhra” or “sunrise”" aria-label="Search destinations" />
            {q && <button className="btn btn-quiet btn-icon search-clear" onClick={() => updateQ('')} aria-label="Clear search"><X size={18} /></button>}
          </motion.div>
          <Chips options={meta?.interests || []} value={interests} onChange={setInterests} />
        </div>
      </section>

      <section className="container explore-body">
        <div className="filters">
          <div className="row">
            <CustomSelect
              value={province}
              onChange={setProvince}
              ariaLabel="Province"
              options={[
                { value: '', label: 'All provinces' },
                ...(meta?.provinces || []).map((p) => ({ value: p, label: p })),
              ]}
            />
            <CustomSelect
              value={month}
              onChange={(val) => setMonth(Number(val))}
              ariaLabel="Travel month"
              options={MONTHS.map((m, i) => ({ value: i + 1, label: `Travelling in ${m}` }))}
            />
          </div>
          <div className="row">
            <Segmented id="sort" value={sort} onChange={setSort} options={[{ key: 'recommended', label: q ? 'Relevance' : 'For you' }, { key: 'rating', label: 'Rating' }, { key: 'altitude', label: 'Altitude' }, { key: 'name', label: 'A–Z' }]} />
            <Segmented id="view" value={view} onChange={setView} options={[{ key: 'grid', label: <LayoutGrid size={16} aria-label="Grid" /> }, { key: 'map', label: <MapIcon size={16} aria-label="Map" /> }]} />
          </div>
        </div>

        <p className="mono small muted result-count" aria-live="polite">
          {loading ? 'Searching…' : `${results.length} ${results.length === 1 ? 'place' : 'places'}`}
          {dq && !loading && results[0]?.match && <> · matched “{results[0].match.join(', ')}”</>}
        </p>

        <ErrorNote error={error} onRetry={reload} />

        <AnimatePresence mode="wait">
          {view === 'grid' ? (
            <motion.div key="grid" className="place-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading && !data && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={360} r={18} />)}
              <AnimatePresence mode="popLayout">
                {results.map((p, i) => <PlaceCard key={p.id} place={p} month={month} index={i} />)}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RouteMap points={results.map((p, i) => ({ ...p, label: i + 1 }))} height={560} scrollWheelZoom />
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !error && !results.length && (
          <div className="empty">
            <h3>No place matches that</h3>
            <p>Try fewer interests, another province, or a different word.</p>
          </div>
        )}
      </section>
    </Page>
  );
}
