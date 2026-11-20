import { Page } from '../components/Layout.jsx';
import { useDocumentTitle } from '../lib/ui.jsx';
import { SplitWords } from '../components/Motion.jsx';

export default function Terms() {
  useDocumentTitle('Terms of Service');

  return (
    <Page className="container section terms-of-service">
      <div className="stack" style={{ maxWidth: 820, margin: '0 auto', paddingBottom: 60 }}>
        <span className="eyebrow">Legal</span>
        <SplitWords>Terms of Service</SplitWords>
        <p className="ink-2">Last updated: November 2024</p>

        <section className="stack-sm" style={{ marginTop: 24 }}>
          <h3>1. Acceptance of Terms</h3>
          <p className="ink-2">
            By accessing or using <strong>Ghumfir</strong> (&quot;the Service&quot;), available at{' '}
            <a href="https://ghumfirr.vercel.app/" target="_blank" rel="noreferrer">https://ghumfirr.vercel.app/</a>, 
            you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>2. Description of the Service</h3>
          <p className="ink-2">
            Ghumfir is an automated itinerary planning and travel optimization platform for Nepal, developed as a final-year academic project. 
            The system provides route planning, budget estimation, attraction recommendations, and sample hotel choices.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>3. User Accounts &amp; Authentication</h3>
          <p className="ink-2">
            You may register directly or sign in using Google OAuth. You are responsible for safeguarding your account credentials 
            and for all activities that occur under your account.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>4. Accuracy of Travel Information &amp; Disclaimer</h3>
          <p className="ink-2">
            While Ghumfir uses authentic geographic coordinates, travel times, and realistic pricing models for Nepal, travel conditions 
            (including road status, weather, and opening hours) may change rapidly.
          </p>
          <p className="ink-2">
            Hotel listings and sample costs provided within the application are for demonstration, simulation, and planning estimates. 
            Ghumfir is not a booking engine or travel agency, and users should verify local conditions before traveling.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>5. Intellectual Property</h3>
          <p className="ink-2">
            The software, design, custom algorithms, and user interface of Ghumfir are the intellectual property of the project authors. 
            Third-party assets (such as Wikimedia Commons photographs, OpenStreetMap data, and Google Fonts) are credited under their respective open licenses.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>6. Acceptable Use</h3>
          <p className="ink-2">
            You agree not to misuse the service, attempt unauthorized access, disrupt server operations, or use automated systems 
            to scrape data without permission.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>7. Modifications to the Service</h3>
          <p className="ink-2">
            We reserve the right to update, modify, or discontinue features of the platform at any time for maintenance, evaluation, or improvements.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>8. Contact Information</h3>
          <p className="ink-2">
            For questions regarding these Terms of Service, please reach out via{' '}
            <strong>support@ghumfir.app</strong> or visit <a href="https://ghumfirr.vercel.app/">https://ghumfirr.vercel.app/</a>.
          </p>
        </section>
      </div>
    </Page>
  );
}
