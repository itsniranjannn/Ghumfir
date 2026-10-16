import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Footer, Nav } from './components/Layout.jsx';
import { useAuth } from './lib/auth.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import Place from './pages/Place.jsx';
import Planner from './pages/Planner.jsx';
import { Login, Register, ForgotPassword, ResetPassword, VerifyEmail } from './pages/Auth.jsx';
import Trips from './pages/Trips.jsx';
import TripView from './pages/TripView.jsx';
import SharedTrip from './pages/SharedTrip.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Credits from './pages/Credits.jsx';
import NotFound from './pages/NotFound.jsx';
import Admin from './pages/admin/Admin.jsx';

function RequireAuth({ children, admin }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <main className="container section"><div className="spinner" /></main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const loc = useLocation();
  // Scroll to top once the old page has finished its exit animation (see onExitComplete),
  // otherwise the browser keeps the old scroll position on the new, shorter page.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);
  const bare = loc.pathname.startsWith('/admin');

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Nav />
      <div id="main" />
      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
        <Routes location={loc} key={loc.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/places/:slug" element={<Place />} />
          <Route path="/plan" element={<Planner />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/t/:code" element={<SharedTrip />} />
          <Route path="/trips" element={<RequireAuth><Trips /></RequireAuth>} />
          <Route path="/trips/:id" element={<RequireAuth><TripView /></RequireAuth>} />
          <Route path="/admin/*" element={<RequireAuth admin><Admin /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
      {!bare && <Footer />}
    </>
  );
}
