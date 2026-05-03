"use client";

import { SignInButton } from "@clerk/nextjs";
import { Children, isValidElement, useEffect } from "react";

type Props = React.ComponentProps<typeof SignInButton>;

export function InstrumentedSignInButton(props: Props) {
  const { children, ...rest } = props;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const arr = Children.toArray(children);
    const childDescriptions = arr.map((c, i) =>
      typeof c === "string"
        ? {
            i,
            kind: "string" as const,
            len: c.length,
            preview: c.slice(0, 30),
          }
        : isValidElement(c)
          ? {
              i,
              kind: "element" as const,
              type:
                typeof c.type === "string"
                  ? c.type
                  : (c.type as { name?: string }).name ?? "component",
            }
          : { i, kind: typeof c },
    );

    // #region agent log
    fetch("http://127.0.0.1:7441/ingest/60087385-653d-4707-be60-bac86ef036b1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "2a04a1",
      },
      body: JSON.stringify({
        sessionId: "2a04a1",
        runId: "pre-fix",
        hypothesisId: "H1-H5",
        location: "instrumented-sign-in-button.tsx:InstrumentedSignInButton",
        message: "SignInButton children seen on client",
        data: { count: arr.length, childDescriptions },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [children]);

  return <SignInButton {...rest}>{children}</SignInButton>;
}
