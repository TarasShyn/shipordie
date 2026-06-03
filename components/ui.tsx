import { ButtonHTMLAttributes, HTMLAttributes } from 'react';

// Minimal, dependency-free replacements for the few shared-UI primitives the app
// used. Styled for the pirate theme (amber primary button, muted body text).

const cx = (...classes: (string | false | undefined)[]): string => classes.filter(Boolean).join(' ');

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export const Button = ({ fullWidth, className, children, ...props }: ButtonProps) => (
  <button
    className={cx(
      'flex cursor-pointer items-center justify-center rounded-lg bg-amber-400 px-6 py-3 font-sans font-bold text-[#1a2530] transition-colors hover:bg-amber-300 active:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60',
      fullWidth && 'w-full',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export const TextM = ({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cx('font-sans text-base leading-relaxed', className)} {...props}>
    {children}
  </p>
);

export const TextL = ({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cx('font-sans text-lg leading-relaxed', className)} {...props}>
    {children}
  </p>
);

export const HeadingL = ({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cx('font-sans text-3xl font-bold', className)} {...props}>
    {children}
  </h2>
);

export const TwitterIcon = ({ className = 'h-full w-full fill-current' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
