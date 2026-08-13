"use client";

import katex from "katex";
import { useMemo } from "react";

function render(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return tex;
  }
}

/** Inline math: <M>{"W_Q x"}</M> */
export function M({ children }: { children: string }) {
  const html = useMemo(() => render(children, false), [children]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Block (display) math */
export function MB({ children }: { children: string }) {
  const html = useMemo(() => render(children, true), [children]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
