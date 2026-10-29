import "./member-polish.css";
import "./staff.css";

/** Placeholder dashboard shown while a signed-in page loads: the sidebar and a few shimmering cards, so a click answers at once. */
export default function LoadingShell({label = "Loading"}: {label?: string}) {
  return <div className="app rc-member rc-staff rc-loading" role="status" aria-live="polite">
    <span className="visually-hidden">{label}…</span>
    <aside className="sidebar" aria-hidden="true"><span className="rc-skel rc-skel-brand"/>{[0, 1, 2, 3].map(i => <span key={i} className="rc-skel rc-skel-nav"/>)}</aside>
    <div className="content" aria-hidden="true">
      <header className="topbar"><span/><span className="rc-skel rc-skel-avatar"/></header>
      <main>
        <span className="rc-skel rc-skel-title"/>
        <span className="rc-skel rc-skel-line"/>
        <div className="three-grid">{[0, 1, 2].map(i => <span key={i} className="rc-skel rc-skel-card"/>)}</div>
        <span className="rc-skel rc-skel-panel"/>
      </main>
    </div>
  </div>;
}
