import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const DISCONTINUED_POST_PATH = '/blog/onlycats-is-discontinued';

const DiscontinuedBanner = () => {
  return (
    <div
      role="alert"
      className="bg-destructive/15 border-b border-destructive/30 text-destructive-foreground"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-sm text-red-900 dark:text-red-200">
          <span className="flex items-start sm:items-center gap-2 flex-1">
            <AlertTriangle className="w-4 h-4 mt-0.5 sm:mt-0 flex-shrink-0" />
            <span>
              <strong>OnlyCats is discontinued.</strong>{' '}
              This service is no longer maintained, no longer supported, and is not recommended for use by anyone.
            </span>
          </span>
          <Link
            to={DISCONTINUED_POST_PATH}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 whitespace-nowrap hover:no-underline self-start sm:self-auto"
          >
            Read why
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DiscontinuedBanner;
