# Enkel timeplanlegger

Dette er en helt enkel, gratis timeplanlegger laget med vanlig HTML, CSS og JavaScript.

Den kan kjøres direkte i nettleseren og passer fint som en første prototype på GitHub Pages.

## Funksjoner

- Legg inn lærere
- Legg inn klasser
- Legg inn fag
- Legg inn rom
- Legg inn timer i ukeplan
- Se timeplan etter klasse, lærer eller rom
- Varsel ved kollisjon:
  - lærer er dobbeltbooket
  - klasse har to timer samtidig
  - rom er dobbeltbooket
- Lagring i nettleseren med localStorage
- Eksport og import av JSON

## Viktig begrensning

Dette er en lokal prototype. Data lagres bare i nettleseren på maskinen som brukes.

Ikke bruk løsningen til sensitive elevopplysninger uten å vurdere personvern, tilgangsstyring og sikker lagring.

## Slik legger du den på GitHub

1. Lag et nytt repository på GitHub, for eksempel `enkel-timeplanlegger`.
2. Last opp disse filene:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
3. Gå til **Settings** → **Pages**.
4. Velg branch `main` og folder `/root`.
5. Trykk **Save**.
6. Etter litt tid får du en GitHub Pages-lenke.

## Videre ideer

- Drag-and-drop for timer
- Utskrift til PDF
- Automatisk forslag til ledige tidspunkt
- Flere timeplanperioder
- Dobbeltimer
- Fag med krav til spesialrom
- Lærerens tilgjengelighet
- Innlogging
- Skylagring
