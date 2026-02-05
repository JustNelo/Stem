import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function PlusIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="square" strokeWidth={2} d="M12 5v14m-7-7h14" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        strokeLinecap="square"
        strokeWidth={2}
        d="M19 7l-1 12H6L5 7m5 4v6m4-6v6m1-10V4H9v3M4 7h16"
      />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="square" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="square" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="square" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function LoaderIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        strokeLinecap="square"
        strokeWidth={2}
        d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M8.76 15.24l-2.83 2.83m11.14 0l-2.83-2.83M8.76 8.76L5.93 5.93"
      />
    </svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        strokeLinecap="square"
        strokeWidth={2}
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      />
      <path strokeLinecap="square" strokeWidth={2} d="M14 2v6h6M16 13H8m8 4H8m2-8H8" />
    </svg>
  );
}
