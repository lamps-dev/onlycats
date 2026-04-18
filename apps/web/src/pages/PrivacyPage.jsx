import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const LAST_UPDATED = 'April 18, 2026';

const PrivacyPage = () => {
  return (
    <>
      <Helmet><title>Privacy Policy - OnlyCats</title></Helmet>
      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <article className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

            <section className="space-y-6 text-[0.95rem] leading-relaxed">
              <div>
                <h2 className="text-xl font-semibold mb-2">1. What we collect</h2>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li><strong>Account:</strong> email, display name, and (if you use Discord login) your Discord avatar and ID.</li>
                  <li><strong>Profile:</strong> bio, about me, country, location, social links, and notification preferences you provide.</li>
                  <li><strong>Content:</strong> posts you upload (images, videos, captions) and collections you create.</li>
                  <li><strong>Activity:</strong> likes, follows, tips, and API usage tied to your account.</li>
                  <li><strong>Technical:</strong> session tokens, device type, and request logs for security and debugging.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">2. How we use it</h2>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>To run the Service: serve your profile, posts, and feed.</li>
                  <li>To authenticate you and keep your account secure.</li>
                  <li>To enforce our Terms and moderate content.</li>
                  <li>To send notifications you've opted into (see Settings → Notifications).</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">3. What is public</h2>
                <p className="text-muted-foreground">
                  Your profile (display name, avatar, bio, about me, country, location, social links,
                  follower count) and your posts are visible to anyone. Your email, password, API keys,
                  and tip history are not public.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">4. Storage and processors</h2>
                <p className="text-muted-foreground">
                  We use Supabase for authentication and database storage, and Cloudflare R2 for file
                  storage. These providers process your data on our behalf under their own terms.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">5. Cookies and local storage</h2>
                <p className="text-muted-foreground">
                  We store a session token and your theme preference in your browser. We don't use
                  third-party advertising cookies.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">6. Your rights</h2>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li><strong>Access & export:</strong> you can view and edit your profile in Settings.</li>
                  <li><strong>Deletion:</strong> delete your account from Settings → Account. This removes your profile, posts, and uploaded files.</li>
                  <li><strong>Opt-out:</strong> turn off notification categories in Settings → Notifications.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">7. Children</h2>
                <p className="text-muted-foreground">
                  OnlyCats isn't intended for users under 13. If we learn we've collected data from
                  someone under 13, we'll delete it.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">8. Changes</h2>
                <p className="text-muted-foreground">
                  We may update this Policy. When we do, we'll update the "Last updated" date above.
                  Continued use after changes means you accept the updated Policy.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">9. Contact</h2>
                <p className="text-muted-foreground">
                  Questions about this Policy or your data? Reach out through the support channel
                  listed in the app.
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

export default PrivacyPage;
