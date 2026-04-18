import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components = {
  h1: (props) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
  h2: (props) => <h2 className="text-lg font-bold mt-4 mb-2" {...props} />,
  h3: (props) => <h3 className="text-base font-semibold mt-3 mb-2" {...props} />,
  h4: (props) => <h4 className="text-sm font-semibold mt-3 mb-1" {...props} />,
  p:  (props) => <p className="mb-2 leading-relaxed whitespace-pre-wrap" {...props} />,
  a:  ({ node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="text-primary underline underline-offset-2 hover:opacity-80 break-words"
    />
  ),
  ul: (props) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-2 border-muted-foreground/40 pl-3 italic text-muted-foreground my-2" {...props} />
  ),
  code: ({ inline, className, children, ...props }) => (
    inline
      ? <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono" {...props}>{children}</code>
      : <code className={`${className ?? ''} block bg-muted rounded p-3 text-xs font-mono overflow-x-auto`} {...props}>{children}</code>
  ),
  pre: (props) => <pre className="mb-2" {...props} />,
  hr: () => <hr className="my-3 border-border" />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  table: (props) => (
    <div className="overflow-x-auto mb-2">
      <table className="text-sm border-collapse" {...props} />
    </div>
  ),
  th: (props) => <th className="border px-2 py-1 bg-muted/50 text-left font-semibold" {...props} />,
  td: (props) => <td className="border px-2 py-1 align-top" {...props} />,
  img: (props) => (
    <img {...props} className="max-w-full rounded my-2" loading="lazy" referrerPolicy="no-referrer" />
  ),
};

const MarkdownContent = ({ children, className = '' }) => {
  if (!children) return null;
  return (
    <div className={`text-sm break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        skipHtml
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
