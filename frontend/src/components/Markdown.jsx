import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const mdComponents = {
  a: (props) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline break-words" />
  ),
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="rounded px-1 bg-[rgba(59,73,73,0.28)] text-[0.88rem]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`text-sm ${className || ''}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="rounded p-3 bg-[rgba(59,73,73,0.16)] overflow-x-auto text-sm my-2">{children}</pre>
  ),
  p: (props) => <p className="mb-2 leading-relaxed last:mb-0" {...props} />,
  h1: (props) => <h1 className="font-bold text-xl mt-4 mb-2 first:mt-0" {...props} />,
  h2: (props) => <h2 className="font-bold text-lg mt-4 mb-2 first:mt-0" {...props} />,
  h3: (props) => <h3 className="font-bold mt-4 mb-2 first:mt-0" {...props} />,
  h4: (props) => <h4 className="font-bold mt-3 mb-2 first:mt-0" {...props} />,
  h5: (props) => <h5 className="font-bold mt-3 mb-2 first:mt-0" {...props} />,
  h6: (props) => <h6 className="font-bold mt-3 mb-2 first:mt-0" {...props} />,
  ul: (props) => <ul className="list-disc ml-5 mt-2 mb-3 space-y-1" {...props} />,
  ol: (props) => <ol className="list-decimal ml-5 mt-2 mb-3 space-y-1" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-primary pl-4 italic text-on-surface-variant mb-3 mt-2"
      {...props}
    />
  ),
  hr: (props) => <hr className="my-4 border-[rgba(59,73,73,0.2)]" {...props} />,
  table: (props) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse text-sm border border-[rgba(59,73,73,0.2)]" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-[rgba(59,73,73,0.12)]" {...props} />,
  th: (props) => (
    <th className="border border-[rgba(59,73,73,0.2)] px-3 py-2 text-left font-semibold" {...props} />
  ),
  td: (props) => (
    <td className="border border-[rgba(59,73,73,0.2)] px-3 py-2 align-top" {...props} />
  ),
};

export function Markdown({ text }) {
  if (!text) return null;

  return (
    <div className="markdown-body break-words [&>*:first-child]:mt-0">
      <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
