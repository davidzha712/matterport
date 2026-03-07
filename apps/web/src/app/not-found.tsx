import Link from "next/link"

export default function NotFound() {
  return (
    <main className="empty-state">
      <div className="empty-state__panel">
        <p className="eyebrow">Route not found</p>
        <h1>That space view does not exist.</h1>
        <p>
          The platform keeps project, space, room, and object context in the URL. Double-check
          the identifier or return to the dashboard.
        </p>
        <Link className="primary-link" href="/">
          Return home
        </Link>
      </div>
    </main>
  )
}

