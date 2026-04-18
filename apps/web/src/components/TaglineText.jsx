import React from 'react';

const CATLICK_TOKEN = ':catlick:';
const CATLICK_URL = 'https://cdn.discordapp.com/emojis/805265117477863474.webp?size=32&animated=true';

const TaglineText = ({ text, isOwnerTagline = false, className = '' }) => {
  if (!text) return null;

  if (!isOwnerTagline || !text.includes(CATLICK_TOKEN)) {
    return <span className={className}>{text}</span>;
  }

  const parts = text.split(CATLICK_TOKEN);

  return (
    <span className={className}>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          {part}
          {idx < parts.length - 1 && (
            <img
              src={CATLICK_URL}
              alt=":catlick:"
              title=":catlick:"
              className="inline-block w-5 h-5 align-text-bottom mx-0.5"
              loading="lazy"
              decoding="async"
            />
          )}
        </React.Fragment>
      ))}
    </span>
  );
};

export default TaglineText;
