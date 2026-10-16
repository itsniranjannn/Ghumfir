import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Mountain } from 'lucide-react';
import { Photo, SeasonStrip, Stars } from './Bits.jsx';
import { Tilt } from './Motion.jsx';

const PlaceCard = forwardRef(function PlaceCard({ place, month, showReasons = true, index = 0 }, ref) {
  return (
    <motion.article
      ref={ref}
      layout
      className="place-card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Tilt max={5} className="place-tilt">
        <Link to={`/places/${place.slug}`} className="place-link">
          <Photo src={place.image_url} alt={place.name} credit={place.image_credit} np={place.name_np} className="place-photo" nested />
          <div className="place-alt mono"><Mountain size={12} /> {Number(place.altitude_m).toLocaleString('en-IN')} m</div>
          <span className="place-go" aria-hidden="true"><ArrowUpRight size={18} /></span>
          <div className="pc-body">
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <h3>{place.name}</h3>
              <span className="np place-np">{place.name_np}</span>
            </div>
            <p className="small ink-2 place-tagline">{place.tagline}</p>
            <div className="row between place-meta">
              <SeasonStrip best={place.best_months || []} month={month} />
              {place.review_count > 0 && (
                <span className="row" style={{ gap: 6 }}>
                  <Stars value={place.avg_rating} size={12} />
                  <span className="mono tiny muted">{place.avg_rating}</span>
                </span>
              )}
            </div>
            {showReasons && place.reasons?.length > 0 && (
              <ul className="reasons">
                {place.reasons.slice(0, 2).map((r) => <li key={r}>{r}</li>)}
              </ul>
            )}
          </div>
        </Link>
      </Tilt>
    </motion.article>
  );
});

export default PlaceCard;
