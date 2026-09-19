import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { DISCONTINUED_POST_PATH } from '@/components/DiscontinuedBanner.jsx';
import { AlertTriangle, Database, Bot, Ban, ArrowRight } from 'lucide-react';

const HomePage = () => {
  const reasons = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: 'It was entirely vibe-coded',
      description:
        'No design, no review, no real testing. Features were bolted on because they sounded fun, including the ones handling accounts and uploads.',
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: 'The database did not survive',
      description:
        'After months of inactivity the backing database went cold, and restoring it turned out to be more work than this site was ever worth.',
    },
    {
      icon: <Ban className="w-8 h-8" />,
      title: 'Read-only, and closed to new accounts',
      description:
        'Signups are removed and the site is read-only. You can still sign in to an old account, download your data, and then leave.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>OnlyCats - Discontinued</title>
        <meta
          name="description"
          content="OnlyCats is discontinued and is no longer recommended for use. Read the full explanation of why the service shut down and why the database is not coming back."
        />
      </Helmet>

      <Header />
      <main>
        <section
          className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1605507678085-acd0e22fa280)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/85 to-background"></div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/30 mb-6">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  This service is permanently shut down
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6" style={{ letterSpacing: '-0.02em' }}>
                OnlyCats is <span className="text-destructive">discontinued</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
                Completely, permanently, and with no replacement. Signups are closed and the whole
                site is read-only. Nothing here can be posted, uploaded, or changed by anyone.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="text-lg h-14">
                  <Link to={DISCONTINUED_POST_PATH}>
                    Read why it shut down <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-mesh">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What happened</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The short version. The full write-up covers all of it, including what it means for
                anything you uploaded here.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {reasons.map((reason, index) => (
                <Card key={index} className="p-8">
                  <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-6">
                    {reason.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{reason.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{reason.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                There is nothing here to sign up for
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                New accounts cannot be created. If you already have one, sign in and use Save your
                data in Settings to take a copy while the database still answers. If you reused your
                OnlyCats password somewhere else, change it there.
              </p>
              <Button size="lg" variant="outline" asChild className="text-lg h-14">
                <Link to={DISCONTINUED_POST_PATH}>
                  Read the full announcement <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default HomePage;
