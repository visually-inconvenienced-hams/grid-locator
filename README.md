# Grid Square Locator — Visually Inconvenienced Hams

Status: LIVE at https://visually-inconvenienced-hams.github.io/grid-locator/ (repo `visually-inconvenienced-hams/grid-locator`, GitHub Pages). Deployed 2026-11-16.

## What it is

One static page. A member types a Maidenhead grid square (4 or 6 characters) and the page names the nearest town to the centre of that square, with the distance and direction in plain words. Or a member types a town and the page gives its grid square. Copy buttons on both results copy the signed latitude and longitude for use in another tool. A visual map below the grid result shows the square outline, the centre, and the nearest place, for sighted and low-vision users. The page follows the device's light or dark setting, with a toggle at the top to pick either way; the map tiles and marker colours switch with the theme. Everything runs in the browser: no server, no API key, no cost, no Google services anywhere, and no lookup ever leaves the member's device. The only file the page loads is its own place list, from the same site — except the visual map, whose picture tiles come from CARTO's servers.

## Files

- `index.html` — the page: two lookup forms, copy buttons for latitude and longitude on both results, a visual Leaflet map below the grid result, a plain-language "How grid squares work" explainer, and an "About the data" section. Bright-on-black palette from the HamClock/course pages (green #00FF00, amber #FFB300 on black), real headings, labelled fields, aria-live results, focus move to results, grids spelled out for screen readers ("E N 6 1 C N"), coordinates and distances in words, not symbols. Back-to-group links use the HamClock close-button pattern inside Facebook's in-app browser.
- `grid.js` — Maidenhead math, nearest-place search, place search, and all result wording. No network calls. Also runs under Node for testing.
- `leaflet.js`, `leaflet.css` — Leaflet 1.9.4 (BSD-2-Clause), vendored from unpkg so the page needs no CDN at runtime. Map tiles come from CARTO at runtime (Dark Matter in dark mode, Positron in light mode; see tileSpec in `index.html`); CARTO needs an API key in the tile URL (Gregory's key, added 2026-11-16 — the key is visible in the page source, as CARTO's web-map design requires; restrict it to this site in the CARTO dashboard). Attribution to OpenStreetMap and CARTO is on the map itself. Esri's tiles (World Dark Gray Base / World Street Map) were the working key-free fallback and remain the fallback if the key ever breaks.
- `places.json` (1,498,215 bytes) — 40,237 places as compact arrays. No grids are stored; grids are computed on the fly.
- `build_places.py` — rebuilds `places.json` from the two source files (see below). Run: `python3 build_places.py <gazetteer.txt> <cities1000.txt> [countryInfo.txt]`.
- `test_grid.js` — Node tests for the math, the dataset, and the required lookup cases. Run: `node test_grid.js`.
- `test_page.js` — Node test that runs the page's own inline script under a DOM stub and drives both lookups. Run: `node test_page.js`.

Total served weight: 1,537,873 bytes (1.47 MB). Gzipped, as GitHub Pages serves it: about 568 KB (places.json gzips from 1.43 MB to 543 KB).

## Data sources

- United States: US Census Bureau, 2025 Gazetteer, Places file (national), downloaded 2026-11-16 from https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip — public domain. 32,350 places: every incorporated place and census-designated place. Town positions are the Census internal points; legal suffixes ("city", "village", "CDP", and so on) are stripped for display.
- Outside the United States: GeoNames `cities1000`, downloaded 2026-11-16 from https://download.geonames.org/export/dump/cities1000.zip — CC BY 4.0, attributed on the page and here. Filtered to non-US places with population 75,000 or more, plus every national capital: 7,887 places in 243 countries. Country names come from GeoNames `countryInfo.txt` and are embedded in `grid.js`.

## One deviation from the brief, flagged honestly

The brief asked for the world cities from an MIT-licensed source. No MIT-licensed world-cities dataset with population data could be verified: the obvious candidate, lutangar/cities.json, is itself CC BY 4.0 GeoNames data and carries no population field, so "major cities" could not be picked from it. GeoNames `cities1000` (CC BY 4.0) was used instead, because it has the population field the "major cities" filter needs and it is the standard verifiable source. Attribution is on the page ("About the data") and in this file, which satisfies the license. If an MIT-only source is ever required, the world list would have to be rebuilt from a different dataset and re-verified.

## Test results (2026-11-16, both suites exit 0, all checks pass)

- `node test_grid.js`: dataset counts, EN61CN bounds against hand-verified values (centre 41.5625, -87.7917; south-west corner 41.5417, -87.8333), known lat/lon-to-grid values (Tinley Park EN61CN, Washington DC FM18, London IO91, Copenhagen JO65, Sydney QF56, Cape Town JF96), 32 round-trip checks (16 points, 4- and 6-character), validation of good and bad input, square sizes (EN61CN about 6.9 km wide, 4.6 km tall).
- `node test_page.js`: the page's own script loads the real place list, enables both forms, and drives both lookups, including the example button, bad input, a 4-character square, a no-match search, and a region-filtered search.

Required cases:

- EN61CN returns Tinley Park, Illinois, 1.2 kilometers (0.8 miles) north-west of the square centre. Runner-up is Frankfort Square at 4.6 km, so the margin is clear. The Bremen Township problem does not arise: townships are not Census places, so no township is ever in the list.
- FN21 returns Masthope, Pennsylvania, 2.8 kilometers north-west of the centre, with Barryville, New York third at 7.2 km. Note for Nova: FN21's centre falls in rural north-east Pennsylvania near the New York border, not near New York City (the city itself is in FN20). "New York area" is true only in the border sense; the page reports the real place.
- JO65 returns Malmö, Sweden, 12 kilometers north of the centre, with Copenhagen, Denmark third at 34 km. The square's centre is in the Øresund between the two cities.
- A place search for "Tinley Park" returns Tinley Park, Illinois, grid EN61CN. "Malmo" without the accent finds Malmö, Sweden. "Springfield, Illinois" filters by state.
- No-Google check: the word appears once in the served files, in a `grid.js` comment stating the rule. No Google URLs, APIs, fonts, or services. The only runtime network call is `fetch("places.json")` from the same site. No API keys anywhere.
- Speed: a nearest-place scan over all 40,237 places takes about 18 ms in Node; a name search about 8 ms.

## Not verified (needs a live browser after deploy)

No browser is available in this staging environment, so these were not tested and must be checked on the live page: VoiceOver/NVDA announcement of the results, the close button from inside Facebook's in-app browser, the mobile deep link to the Facebook app, and the visual layout at large text sizes. The DOM-stub test covers the logic and wording only.

To preview locally before deploying, serve this folder over http (the page fetches `places.json`, which does not work from a `file:` address): `python3 -m http.server 8000`, then open http://localhost:8000/.

## Deploy notes for Nova

Create public repo `visually-inconvenienced-hams/grid-locator`, enable GitHub Pages from the main branch, and upload `index.html`, `grid.js`, and `places.json`. The build/test files and this README can go in the repo too; they are not loaded by the page. After deploy, verify live: EN61CN returns Tinley Park; a place search for "Tinley Park" returns EN61CN; the page loads with no console errors; the back link and (from inside Facebook) the close button behave as on the HamClock page.
