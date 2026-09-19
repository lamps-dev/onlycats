import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Database, Bot, CalendarX, Skull } from 'lucide-react';

const PUBLISHED = 'September 19, 2026';

const DiscontinuedPostPage = () => {
  return (
    <>
      <Helmet>
        <title>OnlyCats is discontinued, and you should not use it - OnlyCats</title>
        <meta
          name="description"
          content="OnlyCats is shut down for good. Here is the honest explanation: it was a bad idea, it was entirely vibe-coded, it sat unused for months, and the database behind it could not be brought back."
        />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <article className="max-w-3xl mx-auto">
            <p className="text-sm font-medium text-destructive mb-3 inline-flex items-center gap-2">
              <Skull className="w-4 h-4" />
              Service announcement
            </p>

            <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ letterSpacing: '-0.02em' }}>
              OnlyCats is discontinued, and you should not use it
            </h1>

            <p className="text-lg text-muted-foreground mb-2">
              The site is dead, the database is not coming back, and honestly it should never have
              existed in the first place.
            </p>

            <p className="text-sm text-muted-foreground mb-10">Published {PUBLISHED}</p>

            <Card className="p-6 mb-10 border-destructive/30 bg-destructive/5">
              <h2 className="text-lg font-semibold mb-3 inline-flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                The short version
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[0.95rem] text-muted-foreground leading-relaxed">
                <li>OnlyCats is discontinued, completely and permanently.</li>
                <li>
                  It is not recommended for use by anyone, for anything. Signups are removed and the
                  whole site is read-only: nothing can be posted, uploaded, or changed.
                </li>
                <li>
                  If you already have an account, you can still sign in and download a copy of your
                  data from Settings, assuming the database cooperates.
                </li>
                <li>
                  Every part of it was vibe-coded. Nobody reviewed it, nobody hardened it, and nobody
                  ever really understood all of it.
                </li>
                <li>
                  It sat unused for long enough that the database behind it became a problem I could
                  not solve, so I stopped trying.
                </li>
                <li>Assume anything still loading is a leftover shell, not a working product.</li>
              </ul>
            </Card>

            <section className="space-y-10 text-[0.95rem] leading-relaxed">
              <div>
                <h2 className="text-2xl font-semibold mb-3">What OnlyCats actually was</h2>
                <p className="text-muted-foreground mb-3">
                  OnlyCats was a parody of a subscription content platform, except for cats. Creator
                  profiles, a feed, likes, comments, collections, reposts, tipping, an API with keys
                  and bot accounts, a moderation queue, a staff role system, device session tracking.
                  A full social platform, built as a joke, with the feature list of something that
                  had a real team behind it.
                </p>
                <p className="text-muted-foreground">
                  It was funny for about a week. The problem is that a joke does not reduce the
                  maintenance burden of an authentication system, and this one had several.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3 inline-flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  It was vibe-coded, from the first commit to the last
                </h2>
                <p className="text-muted-foreground mb-3">
                  I want to be precise about this, because it matters for anyone deciding whether to
                  trust the thing: OnlyCats was not designed. It was prompted into existence. Feature
                  after feature got bolted on because it sounded fun in the moment, with no plan, no
                  architecture, and no real review of what was being added.
                </p>
                <p className="text-muted-foreground mb-3">
                  That worked until it very much did not. Session handling, device revocation,
                  moderation, API keys, row level security policies: all of it was written fast,
                  accepted on the basis that the happy path seemed fine, and then never seriously
                  tested. The last stretch of real work on this project was not new features. It was
                  me tracking down a bug where signing out on one device silently killed every other
                  session on the account, because a default argument on a sign out call did something
                  nobody had thought about.
                </p>
                <p className="text-muted-foreground">
                  That bug is a decent summary of the whole codebase. There were almost certainly
                  more like it, in places nobody looked, including in the parts that handled accounts
                  and uploads.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3 inline-flex items-center gap-2">
                  <CalendarX className="w-5 h-5 text-primary" />
                  Then it just sat there
                </h2>
                <p className="text-muted-foreground mb-3">
                  Traffic dropped to essentially nothing. The novelty wore off, the people who signed
                  up stopped coming back, and I stopped opening the repo. Months went by where the
                  site was technically online and practically abandoned.
                </p>
                <p className="text-muted-foreground">
                  Abandoned infrastructure does not stay still. Providers pause idle projects,
                  credentials expire, dependencies rot, and platform defaults shift underneath you.
                  By the time I came back to it, the project was not where I left it.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3 inline-flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  The database is what finally ended it
                </h2>
                <p className="text-muted-foreground mb-3">
                  The backing database went cold during the inactivity, and bringing it back turned
                  out to be far more work than the site was ever worth. Restoring it meant untangling
                  a schema that had been changed by whatever seemed convenient at the time, with
                  migrations that did not fully describe the state it ended up in, plus auth data,
                  storage objects, and row level security policies that all had to line up again for
                  anything to function.
                </p>
                <p className="text-muted-foreground mb-3">
                  I gave it a genuine attempt. I could not get it into a state I trusted, and I was
                  not willing to put a half-restored user database with real accounts and real
                  uploads back on the public internet and call it fixed.
                </p>
                <p className="text-muted-foreground">
                  So I gave up. Not paused, not shelved for later. Gave up.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3">Why I am not reviving it</h2>
                <p className="text-muted-foreground mb-3">
                  Because the correct amount of effort to spend rescuing a vibe-coded cat parody of a
                  paywalled content site is zero. Even if I recovered the data perfectly, I would be
                  back to maintaining an unreviewed social platform with user accounts, file uploads,
                  payment-shaped features, and a public API, for an audience of nobody.
                </p>
                <p className="text-muted-foreground">
                  Every hour spent on that is an hour not spent on something that deserves it. The
                  honest move is to say so publicly instead of leaving a zombie site up that looks
                  like it still works.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3">What this means for you</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">You cannot create an account.</strong> Signup
                    has been removed entirely, including the Discord option, and the server refuses
                    the request outright.
                  </li>
                  <li>
                    <strong className="text-foreground">You cannot post anything.</strong> Signing in
                    still works for existing accounts, but uploads, comments, likes, reposts, tips,
                    collections, profile edits, and the API are all disabled.
                  </li>
                  <li>
                    <strong className="text-foreground">You can save your data.</strong> Sign in, open
                    Settings, and use Save your data to download everything the database will still
                    return for your account as a single JSON file. Media comes through as URLs, so
                    grab those files separately while the links still work.
                  </li>
                  <li>
                    <strong className="text-foreground">Assume the rest is gone.</strong> Treat
                    anything you cannot export as unrecoverable. Nobody is coming to restore it.
                  </li>
                  <li>
                    <strong className="text-foreground">Reused passwords matter.</strong> If you used
                    an OnlyCats password anywhere else, change it there. That is good practice for
                    any dead service, and it is especially good practice for one built like this one.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3">Is there a replacement?</h2>
                <p className="text-muted-foreground">
                  No, and there should not be. Post your cat on a platform that has actual engineers,
                  actual backups, and an actual reason to exist. Your cat deserves better hosting
                  than this, and so do you.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3">Closing</h2>
                <p className="text-muted-foreground mb-3">
                  OnlyCats was a stupid idea executed carelessly, kept alive by novelty, and finished
                  off by an outage I did not care enough to fix. That is the whole story. No dramatic
                  final chapter, no acquisition, no pivot.
                </p>
                <p className="text-muted-foreground">
                  Thanks to the handful of people who thought it was funny. It was. It is also over.
                </p>
              </div>
            </section>

            <div className="border-t mt-12 pt-8">
              <p className="text-sm text-muted-foreground">
                Still curious? You can look at{' '}
                <Link to="/" className="text-primary hover:underline">
                  the front page
                </Link>
                , but there is nothing there worth using either.
              </p>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default DiscontinuedPostPage;
