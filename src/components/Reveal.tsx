import type { CSSProperties, ElementType, ReactNode } from "react";
import { useReveal } from "../hooks";

export type Direction = "left" | "right" | "up";

interface Props {
  from?: Direction;
  /** Milliseconds to wait before sliding in, for staggered groups. */
  delay?: number;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/** Slides its children in from the left, right or below when scrolled into view. */
export default function Reveal({ from = "up", delay = 0, as: Tag = "div", className = "", children }: Props) {
  const [ref, seen] = useReveal<HTMLElement>();
  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;
  return (
    <Tag
      ref={ref}
      style={style}
      className={`reveal from-${from} ${seen ? "is-visible" : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
