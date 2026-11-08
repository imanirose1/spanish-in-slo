# Spanish in SLO

A static student research website for SPAN 2207. All initial entries are sample data, not collected evidence.

## Preview

Open `index.html` in a browser, or serve this directory with `python3 -m http.server 8000` and visit http://localhost:8000/. The map tiles and Google Fonts need internet access. The Leaflet library is bundled locally.

## Publish

Upload this directory's contents to the root of a GitHub repository. Set Settings → Pages → Deploy from a branch → main → /(root). No build step, package installation, API key, or paid domain is required.

## Content

- `data.js`: sign and street entries. Coordinates use latitude, longitude order. Street coordinate arrays may trace a complete verified street or a specified section. Keep `sample: true` for examples; set false only after collecting and verifying an entry. Use an `assets/` relative path for `photo`, with a descriptive `photoAlt`.
- `index.html`: page text, research methods, bibliography, findings, and group information.
- `styles.css`: colors and font pairing (Cormorant Garamond / Source Sans 3).
- `app.js`: hash navigation, filtering, interactive map, entry detail panel.
- `assets/`: photos and favicon.
- `vendor/`: Leaflet 1.9.4 and license.

When replacing all examples, also revise the global prototype banner, map footnote, research status, photo captions, and findings text. Exact current street geometry and naming history have not been researched. Sample points are fictional.

The basemap uses OpenStreetMap with visible attribution. Respect https://operations.osmfoundation.org/policies/tiles/ and do not bulk-download tiles. Leaflet license is included in `vendor/LEAFLET-LICENSE.txt`.
