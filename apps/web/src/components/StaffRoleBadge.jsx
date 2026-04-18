import React from 'react';

const VARIANT = {
  owner: 'bg-primary/15 text-primary border border-primary/35',
  moderator: 'bg-secondary/10 text-secondary-foreground border border-secondary/30',
};

/**
 * Public staff indicator for profiles and posts. Only shows for owner / moderator roles.
 */
const StaffRoleBadge = ({ role, className = '' }) => {
  if (role !== 'owner' && role !== 'moderator') return null;
  const label = role === 'owner' ? 'OWNER' : 'MOD';
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${VARIANT[role]} ${className}`}
      title={role === 'owner' ? 'Site owner' : 'Moderator'}
    >
      {label}
    </span>
  );
};

export default StaffRoleBadge;
