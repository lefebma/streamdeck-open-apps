# Marketplace submission

Submitted for Elgato review. The Marketplace listing is not live yet; automatic publication after approval is enabled.

## Listing details

- Pricing: Free.
- Name: **Open Apps** (confirm availability in Maker Console).
- Author: **ELS Partners** (Maker organization).
- Type: Stream Deck plugin. Device: Stream Deck Neo only.
- Requirements: macOS 12+, Apple Silicon or Intel; Stream Deck 6.9+.
- Language: English. Version: 0.1.1.0.
- UUID: `com.marclefebvre.openapps` (keep unchanged after publication).
- Source: https://github.com/lefebma/streamdeck-open-apps
- Support: https://github.com/lefebma/streamdeck-open-apps/issues
- Privacy: https://github.com/lefebma/streamdeck-open-apps/blob/main/PRIVACY.md

## Description

Switch between your running Mac apps from Stream Deck Neo. Open Apps shows six applications at a time with their real icons and names, and highlights the foreground app with a green border. Press an app key to bring its existing windows forward, or use the arrow keys to browse more apps.

App positions stay stable when you switch focus. Newly opened apps join the list, and closed apps disappear automatically. Add the navigator to a new page in your existing profile or use the included standalone Open Apps profile. Installation and startup preserve your selected profile.

Requires Stream Deck Neo, macOS 12 or later, and Stream Deck software 6.9 or later. Supports Apple Silicon and Intel Macs. Runs locally without accounts, telemetry, or Accessibility and Automation permissions. Windows and other Stream Deck models are not supported.

## Release notes

Initial release: six live application keys, native icons, foreground highlighting, stable positions, paging, and app activation. Includes a universal macOS helper and an optional standalone Stream Deck Neo profile. Existing profiles and pages remain available.

## Submission files

- Installer: `dist/com.marclefebvre.openapps.streamDeckPlugin`, attached to the GitHub release.
- App icon: `marketplace/app-icon.png`, 288 × 288 PNG.
- Preferences icons: `imgs/plugin.png` and `imgs/plugin@2x.png`, 256 and 512 px.
- Thumbnail: `marketplace/thumbnail.png`. Gallery: `gallery-1.png`, `gallery-2.png`, `gallery-3.png` (1920 × 960). These are clearly labeled illustrations using original sample app icons and actual plugin key rendering. Review these before uploading. Regenerate with `npm run media`.
- If requested, record physical Neo app activation and paging; mockups do not replace hardware evidence.

## Review status

Await Elgato's review result and address any requested changes in a new version. Keep the plugin UUID unchanged.

The upload wizard required manifest SDK 3 and Stream Deck 6.9 or later for DRM compatibility. The JavaScript SDK remains @elgato/streamdeck 2.1.2, which supports this configuration.

Intel hardware and minimum-version macOS/Stream Deck testing remain unverified. Both helper architectures compile; physical-device testing is on Apple Silicon with Stream Deck 7.6.

Official sources: [submission wizard](https://docs.elgato.com/maker-console/submitting-products/), [media guidelines](https://docs.elgato.com/guidelines/products/), [plugin guidelines](https://docs.elgato.com/guidelines/stream-deck/plugins/), [review process](https://docs.elgato.com/maker-console/review-process/).
