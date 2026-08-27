import React, { useState, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Product name that clamps to a fixed number of lines with a "Read more" toggle.
// Keeps cards / rows a consistent height by default; expands only on click, and
// always exposes the full name via a native tooltip too.
//
// Clamping is done with an inline `-webkit-line-clamp` style (NOT a Tailwind
// arbitrary class) on purpose: this app loads a static, pre-compiled Tailwind
// stylesheet, so arbitrary utilities like `max-w-[150px]` are silently dropped.
// Inline styles always apply, so truncation actually works here.
export default function ExpandableName({ name, lines = 2, valueClass = 'text-sm font-medium text-slate-900' }) {
  const text = name || 'Unknown Product';
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !expanded) {
      // The text is being clamped if its full height exceeds the visible box.
      setClamped(el.scrollHeight > el.clientHeight + 1);
    }
  }, [text, expanded]);

  const clampStyle = expanded ? undefined : {
    display: '-webkit-box',
    WebkitLineClamp: String(lines),
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  return (
    <div className="min-w-0">
      <div ref={ref} className={`${valueClass} break-words`} style={clampStyle} title={text}>
        {text}
      </div>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-0.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
