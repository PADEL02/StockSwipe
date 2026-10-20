// ─────────────────────────────────────────────────────────────────────────────
// Rechtstexte – genutzt in der App (Info-Bereich) und auf den Webseiten
// impressum.html und datenschutz.html.
//
// ⚠️ VORLAGEN: Alles in [ECKIGEN KLAMMERN] vor dem Launch ausfüllen und die
// Texte rechtlich prüfen lassen. Sie beschreiben den technischen Stand der App
// (Oktober 2026), ersetzen aber keine Rechtsberatung.
// ─────────────────────────────────────────────────────────────────────────────
const LEGAL = {
  version: "Stand: [DATUM]",

  impressum: `
    <h3>Angaben gemäß § 5 DDG</h3>
    <p>[VOR- UND NACHNAME]<br>[STRASSE UND HAUSNUMMER]<br>[PLZ ORT]<br>Deutschland</p>

    <h3>Kontakt</h3>
    <p>E-Mail: [E-MAIL-ADRESSE]</p>

    <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
    <p>[VOR- UND NACHNAME], Anschrift wie oben</p>

    <h3>Marken und Logos</h3>
    <p>Die in der App gezeigten Unternehmensnamen, Marken und Logos gehören den jeweiligen Inhabern.
    Sie dienen ausschließlich dazu, das jeweilige Unternehmen zu kennzeichnen. Es besteht keine
    Verbindung zu diesen Unternehmen und keine Empfehlung durch sie.</p>

    <h3>Verbraucherstreitbeilegung</h3>
    <p>[PRÜFEN:] Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor
    einer Verbraucherschlichtungsstelle teilzunehmen.</p>
  `,

  hinweise: `
    <h3>Keine Anlageberatung</h3>
    <p>Die App dient ausschließlich der Information und Bildung. Nichts in der App ist eine
    Empfehlung, bestimmte Wertpapiere zu kaufen, zu halten oder zu verkaufen.</p>

    <h3>Daten ohne Gewähr</h3>
    <p>Unternehmensdaten und Lieferketten werden mit Hilfe von KI aus öffentlich zugänglichen
    Quellen zusammengestellt und automatisch geprüft. Trotzdem können sie unvollständig, veraltet
    oder falsch sein. Lieferketten zeigen nur öffentlich belegte Beziehungen und sind nie vollständig.
    Im Demo-Modus zeigt die App vereinfachte Beispieldaten.</p>

    <h3>Risiko</h3>
    <p>Investieren ist mit Risiken verbunden, bis hin zum vollständigen Verlust des eingesetzten
    Geldes. Triff Anlageentscheidungen eigenverantwortlich und informiere dich zusätzlich bei
    anderen Quellen.</p>
  `,

  datenschutz: `
    <h3>1. Verantwortlicher</h3>
    <p>[VOR- UND NACHNAME], [STRASSE UND HAUSNUMMER], [PLZ ORT], Deutschland<br>
    E-Mail: [E-MAIL-ADRESSE]</p>

    <h3>2. Kurz zusammengefasst</h3>
    <p>Die App funktioniert ohne Registrierung. Es gibt kein Tracking, keine Werbung und keine
    Analyse-Dienste. Deine Watchlist und deine ETFs bleiben auf deinem Gerät.</p>

    <h3>3. Daten auf deinem Gerät</h3>
    <p>Deine Watchlist, deine eigenen ETFs und die Information, ob du die Einführung gesehen hast,
    werden nur lokal auf deinem Gerät gespeichert und nicht an uns übertragen. Du löschst sie,
    indem du die App-Daten löschst bzw. die App deinstallierst.</p>

    <h3>4. Abruf von Unternehmensdaten (Backend bei Cloudflare)</h3>
    <p>Wenn die App Unternehmensdaten, Lieferketten oder Logos lädt, stellt sie eine Anfrage an
    unseren Server bei Cloudflare, Inc. (USA). Dabei werden technisch notwendig deine IP-Adresse
    sowie der Inhalt der Anfrage (z. B. ein Unternehmensname oder Suchbegriff) verarbeitet.
    Zum Schutz vor Missbrauch speichern wir nicht deine IP-Adresse, sondern nur einen nicht
    umkehrbaren Hash-Wert davon, und zwar nur für die laufende Stunde; danach wird er gelöscht.
    Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (sicherer und funktionsfähiger Betrieb).
    [PRÜFEN: Grundlage der Übermittlung in die USA, z. B. EU-US Data Privacy Framework /
    Auftragsverarbeitungsvertrag mit Cloudflare.]</p>

    <h3>5. KI-Recherche (Anthropic)</h3>
    <p>Fehlen zu einem Unternehmen noch Daten, recherchiert unser Server diese mit einem KI-Dienst
    von Anthropic, PBC (USA). Dabei werden nur der Unternehmensname bzw. dein Suchbegriff übermittelt,
    keine Daten über dich (keine IP-Adresse, keine Gerätekennung). Bitte gib in die Suche keine
    personenbezogenen Daten ein. [PRÜFEN: Grundlage der Übermittlung in die USA.]</p>

    <h3>6. Firmenlogos</h3>
    <p>Firmenlogos lädt unser Server einmalig von der offiziellen Website des jeweiligen Unternehmens
    und speichert sie bei uns zwischen. Dein Gerät hat dabei keinen Kontakt zu diesen Websites;
    deine IP-Adresse wird nicht an sie übermittelt. Schriftarten sind in der App enthalten und
    werden nicht von fremden Servern geladen.</p>

    <h3>7. Web-Version (GitHub Pages)</h3>
    <p>Die Web-Version der App wird über GitHub Pages (GitHub, Inc., USA) bereitgestellt. GitHub
    verarbeitet dabei technisch notwendige Zugriffsdaten wie deine IP-Adresse in Server-Logfiles.
    Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. [PRÜFEN: Grundlage der Übermittlung in die USA.]</p>

    <h3>8. App-Stores</h3>
    <p>Beim Herunterladen der App über den Apple App Store oder Google Play verarbeiten Apple bzw.
    Google Daten in eigener Verantwortung. Es gelten deren Datenschutzerklärungen.</p>

    <h3>9. Deine Rechte</h3>
    <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
    Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Schreib uns dazu einfach eine E-Mail.
    Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. beim
    [PRÜFEN: Bayerischen Landesamt für Datenschutzaufsicht (BayLDA)].</p>
  `,
};
