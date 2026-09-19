import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// SwitchUserMode — React port of switch-user-mode.html.
// Same layout, text, buttons, and destinations.
export default function SwitchUserMode() {
  useEffect(() => {
    document.body.classList.remove('theme-dark');
    let cancelled = false;
    import('gsap').then(({ default: gsap }) => {
      if (cancelled) return;
      try {
        gsap.fromTo('.switch-mode-header', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
        gsap.fromTo(
          '.switch-mode-card',
          { opacity: 0, y: 28, scale: 0.96, filter: 'blur(12px)' },
          { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.78, delay: 0.08, ease: 'power3.out' }
        );
        gsap.fromTo('.switch-progress i', { scaleX: 0.18 }, { scaleX: 1, transformOrigin: 'left center', duration: 1.1, stagger: 0.14, delay: 0.55, ease: 'power3.out' });
      } catch { /* ignore */ }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="auth-page switch-mode-page">
      <nav className="auth-header switch-mode-header" aria-label="Feature navigation">
        <Link className="auth-brand" to="/">
          <span className="logo-mark auth-logo"><span /><span /><span /><span /></span>
          <span>
            <strong className="brand-word">Spendora</strong>
            <small>Secure expense workspace</small>
          </span>
        </Link>
        <Link className="auth-back" to="/">Back to dashboard</Link>
      </nav>

      <section className="switch-mode-stage" aria-labelledby="switchModeTitle">
        <div className="switch-mode-card">
          <span className="switch-mode-pill">Switch user mode</span>
          <h1 id="switchModeTitle">Launching this feature very soon!</h1>
          <p>CRYPTEX is preparing a smoother account switching experience with secure profiles, protected wallet data, and fast workspace handoff.</p>

          <div className="switch-progress" aria-hidden="true">
            <span><i /></span>
            <span><i /></span>
            <span><i /></span>
          </div>

          <div className="switch-mode-actions">
            <Link className="login-submit" to="/">Return to dashboard</Link>
            <Link className="auth-back" to="/login?switch=1">Preview login flow</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
