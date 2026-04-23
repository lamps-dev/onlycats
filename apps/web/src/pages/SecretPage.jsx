import React from 'react';
import { Helmet } from 'react-helmet';

const SecretPage = () => {
  return (
    <>
      <Helmet>
        <title>???</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main
        className="min-h-screen flex flex-col items-center justify-center bg-black text-white"
      >
        <h1
          className="font-mono tracking-widest select-none"
          style={{ fontSize: 'clamp(6rem, 20vw, 16rem)', lineHeight: 1 }}
        >
          ???
        </h1>
        <p
          aria-hidden="true"
          className="mt-8 font-mono text-sm cursor-text"
          style={{ color: '#000', backgroundColor: '#000', userSelect: 'text', WebkitUserSelect: 'text' }}
        >
          uggcf://jjj.lbhghor.pbz/jngpu?i=qVbH7coBc5N
        </p>
      </main>
    </>
  );
};

export default SecretPage;
