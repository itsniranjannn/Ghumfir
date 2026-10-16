import { motion } from 'framer-motion';
import { Page } from '../components/Layout.jsx';
import { useApi, useDocumentTitle } from '../lib/ui.jsx';
import { SplitWords } from '../components/Motion.jsx';

function CreditRow({ name, image, credit, i }) {
  const [author, licence, link] = credit.split(' · ');
  return (
    <motion.li initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
      {image ? <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" className="credit-thumb" /> : <strong>{name}</strong>}
      <span>{author} · {licence}</span>
      {link && <a href={link} target="_blank" rel="noreferrer" className="mono tiny">source</a>}
    </motion.li>
  );
}

export default function Credits() {
  useDocumentTitle('Credits');
  const { data } = useApi('/destinations/credits');
  return (
    <Page className="container section credits">
      <div className="stack" style={{ maxWidth: 820 }}>
        <span className="eyebrow">Credits</span>
        <SplitWords>Photos, maps and type</SplitWords>
        <p className="ink-2">Everything here is free to use with attribution. Thank you to the photographers and projects below.</p>

        <h3 style={{ marginTop: 24 }}>Destination photos (Wikimedia Commons)</h3>
        <ul className="credit-list">
          {(data?.destinations || []).map((d, i) => <CreditRow key={d.id} name={d.name} credit={d.image_credit} i={i} />)}
        </ul>

        <h3 style={{ marginTop: 24 }}>Sample hotel photos (Wikimedia Commons)</h3>
        <p className="small ink-2">The hotels in Ghumfir are fictional sample listings. These photos show real Nepali lodges, guesthouses and hotels and are used only to illustrate each tier.</p>
        <ul className="credit-list">
          {(data?.hotels || []).map((h, i) => <CreditRow key={h.image_url} image={h.image_url} credit={h.image_credit} i={i} />)}
        </ul>

        <h3 style={{ marginTop: 24 }}>Maps</h3>
        <p className="small ink-2">Map data and tiles © OpenStreetMap contributors (ODbL), rendered with Leaflet. The small survey-style Nepal plots and the footer skyline are drawn from the destinations' own coordinates and altitudes.</p>

        <h3 style={{ marginTop: 24 }}>Typefaces (Google Fonts, SIL Open Font License)</h3>
        <p className="small ink-2">Bricolage Grotesque, Instrument Sans, IBM Plex Mono and Tiro Devanagari Hindi.</p>

        <h3 style={{ marginTop: 24 }}>Icons</h3>
        <p className="small ink-2">Lucide (ISC licence).</p>

        <h3 style={{ marginTop: 24 }}>Data notes</h3>
        <p className="small ink-2">Destinations, attractions and road links describe real places; entry fees and road times are approximate. Hotel names and prices are sample data for demonstration.</p>
      </div>
    </Page>
  );
}
