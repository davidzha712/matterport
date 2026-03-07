import Link from "next/link"

export default function NotFound() {
  return (
    <main className="empty-state">
      <div className="empty-state__panel">
        <p className="eyebrow">Route nicht gefunden</p>
        <h1>Diese Raumansicht existiert nicht.</h1>
        <p>
          Die Plattform fuehrt Projekt-, Space-, Raum- und Objektkontext direkt in der URL. Bitte
          pruefe die Kennung oder gehe zur Uebersicht zurueck.
        </p>
        <Link className="primary-link" href="/">
          Zur Startseite
        </Link>
      </div>
    </main>
  )
}
