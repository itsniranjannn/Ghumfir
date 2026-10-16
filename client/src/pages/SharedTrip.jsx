import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Printer } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import Itinerary from '../components/Itinerary.jsx';
import { ErrorNote, Skeleton } from '../components/Bits.jsx';
import { useApi, useDocumentTitle } from '../lib/ui.jsx';

export default function SharedTrip() {
  const { code } = useParams();
  const { data, error, loading } = useApi(`/trips/shared/${code}`);
  useDocumentTitle(data?.trip.title);
  if (loading && !data) return <Page className="container section"><Skeleton h={300} r={18} /></Page>;
  if (error) return <Page className="container section"><ErrorNote error={error} /></Page>;
  const t = data.trip;
  return (
    <Page className="container planner-result">
      <Itinerary
        plan={t.plan}
        title={t.title}
        subtitle={`Shared by ${t.owner}`}
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} /> Print</button>
            <Link className="btn btn-primary" to={`/plan?${new URLSearchParams({ start: t.plan.start.id, days: t.days, budget: t.budget, travelers: t.travelers })}`}>Plan one like it <ArrowRight size={16} className="arrow" /></Link>
          </>
        }
      />
    </Page>
  );
}
