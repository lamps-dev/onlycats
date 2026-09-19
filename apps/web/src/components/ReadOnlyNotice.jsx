import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { DISCONTINUED_POST_PATH } from '@/components/DiscontinuedBanner.jsx';
import { READ_ONLY_MESSAGE } from '@/lib/readOnly.js';

const ReadOnlyNotice = ({ className = '', message = READ_ONLY_MESSAGE }) => {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm ${className}`}
    >
      <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
      <p className="text-muted-foreground">
        {message}{' '}
        <Link to={DISCONTINUED_POST_PATH} className="text-primary font-medium hover:underline">
          Read why
        </Link>
        .
      </p>
    </div>
  );
};

export default ReadOnlyNotice;
