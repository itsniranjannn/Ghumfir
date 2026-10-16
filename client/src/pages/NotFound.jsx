import { Link } from 'react-router-dom';
import { Page } from '../components/Layout.jsx';
import Contours from '../components/Contours.jsx';
import { useDocumentTitle } from '../lib/ui.jsx';
import { SplitWords } from '../components/Motion.jsx';

export default function NotFound() {
  useDocumentTitle('Off the map');
  return (
    <Page className="notfound">
      <Contours seed={404} peaks={2} rings={12} className="head-contours" />
      <div className="container stack" style={{ alignItems: 'flex-start' }}>
        <span className="eyebrow">Error 404 · 0.0000° N</span>
        <SplitWords>You've wandered off the map.</SplitWords>
        <p className="lede np" style={{ fontSize: '1.6rem' }}>बाटो बिराउनुभयो।</p>
        <div className="row">
          <Link className="btn btn-primary" to="/">Back to start</Link>
          <Link className="btn btn-ghost" to="/explore">Explore places</Link>
        </div>
      </div>
    </Page>
  );
}
