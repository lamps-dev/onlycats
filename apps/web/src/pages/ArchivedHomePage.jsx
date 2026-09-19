import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { DISCONTINUED_POST_PATH } from '@/components/DiscontinuedBanner.jsx';
import { Cat, Heart, DollarSign, Users, ArrowRight, Archive } from 'lucide-react';

// A snapshot of the OnlyCats homepage as it stood before the shutdown, kept as
// a record of what the site used to claim to be. The layout and copy are the
// originals, restored from the last commit before the site was discontinued.
// The only deliberate change is that the calls to action are inert: they used
// to lead to signup and to browsing a live service, and neither of those is a
// thing any more.
const ARCHIVED_FROM = 'April 2026';

const ArchivedHomePage = () => {
  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Creator Profiles',
      description: 'Follow your favorite cat content creators and never miss their latest adorable uploads.',
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Like & Share',
      description: 'Show your appreciation with likes and help spread the pawsome content to other cat lovers.',
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: 'Send Tips',
      description: 'Support creators directly with tips and help them continue sharing their cats with the world.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Archived homepage - OnlyCats</title>
        <meta
          name="description"
          content="An archived copy of the OnlyCats homepage as it looked before the service was discontinued. Nothing on this page works."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Header />

      <main>
        <div className="bg-muted/60 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-3xl mx-auto flex items-start gap-3 text-sm">
              <Archive className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground">
                <strong className="text-foreground">This is an archived page.</strong> Below is the
                OnlyCats homepage as it looked in {ARCHIVED_FROM}, before the service was
                discontinued. Every claim on it is out of date and none of the buttons do anything.{' '}
                <Link to="/" className="text-primary font-medium hover:underline">
                  Current homepage
                </Link>
                {' · '}
                <Link to={DISCONTINUED_POST_PATH} className="text-primary font-medium hover:underline">
                  Why it shut down
                </Link>
              </p>
            </div>
          </div>
        </div>

        <section
          className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1605507678085-acd0e22fa280)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background"></div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Cat className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">The future of cat content is here</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6" style={{letterSpacing: '-0.02em'}}>
                The <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Purrfect Platform</span> for Cat Content Creators
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
                Share your feline friends with the world, build a following, and receive tips from fans who appreciate your cat's unique charm.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" disabled className="text-lg h-14" title="Archived page: this button no longer works">
                  Explore Creators <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" disabled className="text-lg h-14" title="Archived page: signups are closed">
                  Become a Creator
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-mesh">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why OnlyCats is the cat's meow
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands of cat enthusiasts in a community built for creators and their adorable feline companions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {features.map((feature, index) => (
                <Card key={index} className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to share your cat with the world?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Create your creator profile today and start building your following. It's completely free to get started.
              </p>
              <Button size="lg" disabled className="text-lg h-14" title="Archived page: signups are closed">
                Get Started Now <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 border-t bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-3">End of the archived page</h2>
              <p className="text-muted-foreground mb-6">
                That was the pitch. It did not survive contact with an unmaintained database. The
                write-up covers what happened and what it means for anything you uploaded.
              </p>
              <Button asChild variant="outline">
                <Link to={DISCONTINUED_POST_PATH}>
                  Read why OnlyCats is discontinued <ArrowRight className="w-4 h-4 ml-2" />
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

export default ArchivedHomePage;
