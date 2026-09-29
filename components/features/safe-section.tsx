"use client";

import { Component, type ReactNode } from "react";

/**
 * A page section that leaves itself out when something inside it breaks.
 *
 * A render error in one part of a long page used to take the whole page
 * down to the error screen. This catches it at the section instead: the
 * section drops out, the error goes to the console, and everything around
 * it carries on as if it had never been there.
 */
export function SafeSection({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Boundary>
      <section className={className}>{children}</section>
    </Boundary>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[section left out]", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
