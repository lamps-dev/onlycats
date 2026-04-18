import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const LAST_UPDATED = 'April 18, 2026';

const TermsPage = () => {
  return (
    <>
      <Helmet><title>Terms of Service - OnlyCats</title></Helmet>
      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <article className="max-w-3xl mx-auto prose-sm">
            <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

            <section className="space-y-6 text-[0.95rem] leading-relaxed">
              <div>
                <h2 className="text-xl font-semibold mb-2">1. Acceptance of terms</h2>
                <p className="text-muted-foreground">
                  By creating an account or using OnlyCats (the "Service"), you agree to these Terms.
                  If you don't agree, don't use the Service. We may update these Terms; continued use
                  after changes means you accept the updated Terms.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">2. Eligibility</h2>
                <p className="text-muted-foreground">
                  You must be at least 13 years old (or the minimum age in your country) to use OnlyCats.
                  You're responsible for keeping your account credentials safe.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">3. Your content</h2>
                <p className="text-muted-foreground">
                  You keep ownership of what you upload. You grant OnlyCats a worldwide, non-exclusive,
                  royalty-free license to host, display, and distribute your content as needed to run the
                  Service. Only post content you have the right to share, and only post cat-related
                  content — this is a parody platform for cats, not people.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">4. Acceptable use</h2>
                <p className="text-muted-foreground mb-2">Don't:</p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Upload content that infringes someone else's rights.</li>
                  <li>Upload illegal, violent, sexual, or harassing content.</li>
                  <li>Impersonate another person or cat.</li>
                  <li>Abuse the API, scrape at scale, or disrupt the Service.</li>
                  <li>Use the Service to send spam or malware.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">5. Moderation</h2>
                <p className="text-muted-foreground">
                  Moderators and owners may remove content that violates these Terms. Repeat violations
                  may lead to account suspension or deletion. Moderation actions are logged.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">6. Tips</h2>
                <p className="text-muted-foreground">
                  Tips are voluntary and non-refundable. We don't guarantee any specific earnings and
                  may take a platform fee in the future (we'll tell you first).
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">7. Termination</h2>
                <p className="text-muted-foreground">
                  You can delete your account at any time from Settings → Account. We can suspend or
                  terminate accounts that violate these Terms. When your account is deleted, your
                  profile, posts, and uploaded files are removed.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">8. Disclaimer</h2>
                <p className="text-muted-foreground">
                  The Service is provided "as is" without warranties of any kind. We're not liable for
                  any indirect, incidental, or consequential damages arising from your use of the Service.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">9. Contact</h2>
                <p className="text-muted-foreground">
                  Questions about these Terms? Reach out through the support channel listed in the app.
                </p>
              </div>
            </section>
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default TermsPage;
