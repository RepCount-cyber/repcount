import './brand.css';

type BrandProps = {
  variant?: 'header' | 'footer' | 'phone' | 'signature' | 'mark';
  tone?: 'dark' | 'light';
  className?: string;
};

/** Original RepCount identity: a forward-cut R with an open, rising leg. */
export function RepCountMark({className = ''}: {className?: string}) {
  return <svg className={`rc-brand-mark ${className}`} viewBox="0 0 44 48" fill="none" aria-hidden="true" focusable="false">
    <path fill="currentColor" fillRule="evenodd" d="M5 4H25.3C35.1 4 41 9.1 41 17.4C41 23.5 37.5 27.8 31.7 29.8L42.5 44H29.9L19.2 29.4H12.7L11.2 44H0.7L5 4ZM14.4 13L13.6 21.1H23.8C27.8 21.1 30.1 19.5 30.1 16.8C30.1 14.2 28.1 13 24.2 13H14.4Z" clipRule="evenodd"/>
    <path d="M26.5 32.4L38.4 28.4" stroke="var(--rc-brand-cut, #fbf7f0)" strokeWidth="2.8"/>
  </svg>;
}

export default function Brand({variant = 'header', tone = 'dark', className = ''}: BrandProps) {
  const onlyMark = variant === 'mark';
  return <span className={`rc-brand rc-brand--${variant} rc-brand--${tone} ${className}`} role="img" aria-label="RepCount">
    <span className="rc-brand-lockup" aria-hidden="true">
      <RepCountMark/>
      {!onlyMark && <span className="rc-brand-word">ep<span className="rc-brand-count">Count</span><span className="rc-brand-stop"/></span>}
    </span>
    {variant === 'signature' && <span className="rc-brand-signature" aria-hidden="true">MOVE WITH PURPOSE</span>}
  </span>;
}
