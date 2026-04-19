import React from 'react';

const VARIANT = {
  owner: 'bg-primary/15 text-primary border border-primary/35',
  moderator: 'bg-secondary/10 text-secondary-foreground border border-secondary/30',
  bot: 'bg-blue-500/10 text-blue-600 border border-blue-500/35',
};

/**
 * Public indicator for profiles and posts. Shows OWNER / MOD / BOT
 * depending on which signal is set. Bots can also be staff (unlikely), in
 * which case the staff badge wins.
 */
const StaffRoleBadge = ({ role, isBot, className = '' }) => {
  const kind = role === 'owner' || role === 'moderator' ? role : isBot ? 'bot' : null;
  if (!kind) return null;
  const label = kind === 'owner' ? 'OWNER' : kind === 'moderator' ? 'MOD' : 'BOT';
  const title = kind === 'owner' ? 'Site owner' : kind === 'moderator' ? 'Moderator' : 'Automated account';
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${VARIANT[kind]} ${className}`}
      title={title}
    >
      {label}
    </span>
  );
};

export default StaffRoleBadge;
