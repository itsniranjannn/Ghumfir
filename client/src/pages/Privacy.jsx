import { Page } from '../components/Layout.jsx';
import { useDocumentTitle } from '../lib/ui.jsx';
import { SplitWords } from '../components/Motion.jsx';

export default function Privacy() {
  useDocumentTitle('Privacy Policy');

  return (
    <Page className="container section privacy-policy">
      <div className="stack" style={{ maxWidth: 820, margin: '0 auto', paddingBottom: 60 }}>
        <span className="eyebrow">Legal</span>
        <SplitWords>Privacy Policy</SplitWords>
        <p className="ink-2">Last updated: November 2024</p>

        <section className="stack-sm" style={{ marginTop: 24 }}>
          <h3>1. Introduction</h3>
          <p className="ink-2">
            Welcome to <strong>Ghumfir</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), hosted at{' '}
            <a href="https://ghumfirr.vercel.app/" target="_blank" rel="noreferrer">https://ghumfirr.vercel.app/</a>. 
            Ghumfir is an intelligent Nepal travel itinerary planning platform developed as an academic project. 
            We respect your privacy and are committed to protecting personal information you may provide while using our service.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>2. Information We Collect</h3>
          <p className="ink-2">We only collect information necessary to provide and improve your trip planning experience:</p>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--ink-2, #555)' }}>
            <li><strong>Account Information:</strong> When you register or sign in with Google OAuth, we collect your name, email address, and profile picture provided by your Google account.</li>
            <li><strong>Trip Preferences &amp; Itineraries:</strong> Destination selections, travel duration, budget settings, and saved itineraries created using our planner.</li>
            <li><strong>Technical Information:</strong> Basic browser type, session data, and device information automatically recorded to maintain system reliability.</li>
          </ul>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>3. How We Use Your Information</h3>
          <p className="ink-2">We use the collected information solely for:</p>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--ink-2, #555)' }}>
            <li>Authenticating your access securely via Google Sign-In or email.</li>
            <li>Generating, saving, and managing your personalized Nepal travel itineraries.</li>
            <li>Enabling trip sharing features when you explicitly choose to share a trip link.</li>
            <li>Ensuring technical stability, security, and project evaluation during academic demonstrations.</li>
          </ul>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>4. Google OAuth Data and Permissions</h3>
          <p className="ink-2">
            Ghumfir uses Google Sign-In solely for identity verification. We request basic profile information (email and profile details). 
            We do not sell, rent, or trade your Google account information to third parties, nor do we access personal files or unauthorized scopes.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>5. Data Storage and Security</h3>
          <p className="ink-2">
            Your data is stored securely using industry-standard encryption practices. While no method of electronic transmission is 100% secure, 
            we take standard protective measures to safeguard your personal details.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>6. Your Rights and Data Deletion</h3>
          <p className="ink-2">
            You may view, edit, or delete your saved trips at any time from your account dashboard. If you wish to delete your account or any associated data completely, 
            you can contact us at any time.
          </p>
        </section>

        <section className="stack-sm" style={{ marginTop: 20 }}>
          <h3>7. Contact Us</h3>
          <p className="ink-2">
            If you have questions about this Privacy Policy or Ghumfir, you can contact the project team at{' '}
            <strong>support@ghumfir.app</strong> or visit <a href="https://ghumfirr.vercel.app/">https://ghumfirr.vercel.app/</a>.
          </p>
        </section>
      </div>
    </Page>
  );
}
