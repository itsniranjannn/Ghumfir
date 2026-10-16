import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import Contours from '../components/Contours.jsx';
import { Reveal } from '../components/Bits.jsx';
import { SplitWords } from '../components/Motion.jsx';
import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useDocumentTitle } from '../lib/ui.jsx';

const STEPS = [
  {
    n: '01', title: 'Rank destinations', algo: 'Hybrid recommender',
    body: 'Each destination gets a score from four signals: how well its tags match your interests (cosine similarity of tag vectors), its rating pulled toward the overall average when it has few reviews (Bayesian average), whether your month is in its best season, and how often other travellers combined it with places you liked (item-to-item co-occurrence).',
    formula: 'score = 0.40·interest + 0.25·rating + 0.20·season + 0.15·co-visit',
  },
  {
    n: '02', title: 'Price every leg', algo: 'Road graph + Haversine',
    body: 'Known road links store real kilometres and bus hours. Pairs without a stored link fall back to the great-circle (Haversine) distance times a 1.55 winding factor at 30 km/h, scaled by how hard the area is to reach. Monsoon months add 30%. Each leg is priced for bus, private jeep and, between airports linked to Kathmandu or Pokhara, a flight.',
    formula: 'd = 2R·asin(√(sin²(Δφ/2) + cosφ₁·cosφ₂·sin²(Δλ/2)))',
  },
  {
    n: '03', title: 'Order the stops', algo: 'Nearest neighbour + 2-opt',
    body: 'Finding the shortest loop through every stop is the Travelling Salesman Problem. We build a first tour by always going to the closest unvisited stop, then repeatedly reverse any section of the route that makes the loop shorter (2-opt) until no reversal helps.',
    formula: 'Δ = c(a,c) + c(b,d) − c(a,b) − c(c,d);  reverse if Δ < 0',
  },
  {
    n: '04', title: 'Fit the days', algo: 'Greedy allocation',
    body: 'Legs over five hours become their own travel day. Every stop starts at its minimum days; spare days go one at a time to the stop with the highest value per day, up to its ideal length. If the days run out, the lowest-value stop is dropped and you are told.',
    formula: 'next day → argmax(value ÷ days already given)',
  },
  {
    n: '05', title: 'Choose sights', algo: '0/1 knapsack (DP)',
    body: 'Inside each stop, sights are items with a weight (hours, in half-hour units) and a value (rating² × 1.8 when it matches your interests). Dynamic programming picks the set with the most value that fits your sightseeing hours. It runs three times: everything, without pricey extras, and free only.',
    formula: 'dp[i][w] = max(dp[i−1][w], dp[i−1][w−wᵢ] + vᵢ)',
  },
  {
    n: '06', title: 'Fit the budget', algo: 'Multiple-choice knapsack (DP)',
    body: 'Transport, food and permits are fixed costs. What is left must cover exactly one (hotel × sight package) option per stop. A second dynamic program over rupees (in Rs 100 steps) picks the combination with the most value that still fits. If nothing fits, transport is downgraded, then (for auto-picked trips) a stop is removed.',
    formula: 'best[g][b] = maxₒ(best[g−1][b − costₒ] + valueₒ)',
  },
  {
    n: '07', title: 'Write the days', algo: 'Nearest-neighbour walk + first-fit',
    body: 'Chosen sights are visited in a nearest-neighbour walk from the town centre and packed into days with first-fit. Sunrise viewpoints go to dawn, sunset spots to the evening, and every day gets its own cost line.',
    formula: '',
  },
];

/** Vertical line that draws itself as you scroll through the steps. */
function StepsLine({ children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div ref={ref} className="how-wrap">
      <motion.span className="how-line" style={{ scaleY }} aria-hidden="true" />
      {children}
    </div>
  );
}

export default function HowItWorks() {
  useDocumentTitle('How the planner works');
  return (
    <Page className="how">
      <section className="explore-head">
        <Contours seed={31} peaks={2} rings={9} className="head-contours" />
        <div className="container stack">
          <span className="eyebrow">Under the hood</span>
          <SplitWords>How a trip gets planned</SplitWords>
          <p className="lede">Seven steps run in about 20 milliseconds on the server. All of them are written from scratch for this project, with no planning or optimisation libraries.</p>
        </div>
      </section>
      <section className="container section">
        <StepsLine>
        <ol className="how-steps">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.03} className="how-step">
              <span className="how-n mono">{s.n}</span>
              <div className="stack-sm">
                <span className="tag slate">{s.algo}</span>
                <h2>{s.title}</h2>
                <p className="ink-2">{s.body}</p>
                {s.formula && <code className="formula">{s.formula}</code>}
              </div>
            </Reveal>
          ))}
        </ol>
        </StepsLine>
        <div className="row" style={{ marginTop: 48 }}>
          <Link to="/plan" className="btn btn-primary btn-lg">Try it <ArrowRight size={18} className="arrow" /></Link>
        </div>
      </section>
    </Page>
  );
}
