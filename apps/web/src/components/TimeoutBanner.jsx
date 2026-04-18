import React from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Clock } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

const TimeoutBanner = () => {
  const { sanction } = useAuth();
  if (sanction?.kind !== 'timeout') return null;

  const untilLabel = sanction.permanent
    ? 'permanent'
    : sanction.expires_at
      ? `for ${formatDistanceToNowStrict(new Date(sanction.expires_at))}`
      : '';

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200">
      <div className="container mx-auto px-4 py-2 flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <p className="flex-1">
          <strong>You're timed out from posting {untilLabel}.</strong>{' '}
          {sanction.reason ? `Reason: ${sanction.reason}` : 'You can still browse and like posts.'}
        </p>
      </div>
    </div>
  );
};

export default TimeoutBanner;
