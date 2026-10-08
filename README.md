# Open Apps for Stream Deck Neo

A live macOS app switcher for Stream Deck Neo. Six keys show running apps with their real icons and names. Press a key to bring that app's existing windows forward. Use the two arrow keys to browse more apps.

- A green border marks the foreground app.
- Positions stay stable when you switch focus. New apps append; closed apps disappear within roughly a second.
- Runs locally without accounts, telemetry, or Accessibility and Automation permissions.
- Add a navigator page to your existing profile or use the included standalone profile.

## Requirements

Stream Deck Neo, macOS 12 or later (Apple Silicon or Intel), and Stream Deck software 6.6 or later. The helper is a universal binary. Physical-device testing was performed on Apple Silicon with Stream Deck 7.6; Intel hardware and minimum-version testing are still welcome. Windows and other Stream Deck layouts are not supported.

## Install

1. Download `com.marclefebvre.openapps.streamDeckPlugin` from [GitHub Releases](https://github.com/lefebma/streamdeck-open-apps/releases/latest).
2. Double-click it and approve installation in Stream Deck.
3. If prompted, install the included **Open Apps** profile. Select it to try the navigator, or add the actions to your existing profile.

Installation and startup preserve your selected profile. The plugin does not replace your pages or make its profile your default. The **Open App Switcher** action opens the included standalone profile when pressed.

### Add a page to your existing profile

Create a new page in Stream Deck and drag actions from the **Open Apps** category into this exact layout:

| First key | Second key | Third key | Fourth key |
| --- | --- | --- | --- |
| Live App | Live App | Live App | Live App |
| Live App | Live App | Previous Apps | Next Apps |

The Neo's navigation sensors move between device pages. The plugin's arrows move between groups of six apps within the navigator page. The Infobar remains available for your own actions.

## Development

Install Node.js 20 or newer, Python 3, and Xcode Command Line Tools on macOS, then run:

```sh
npm ci
npm run build
npm test
npm run validate
npm run pack
```

The build bundles the Node plugin, compiles both native architectures, combines and ad-hoc signs the helper, creates original icons, and generates a portable profile. The installer is written to `dist/`. Stream Deck supplies Node.js for end users.

Use `npx streamdeck link com.marclefebvre.openapps.sdPlugin` and `npx streamdeck restart com.marclefebvre.openapps` for local development. Keep the linked directory in place. Test manifest/profile changes with a full Stream Deck restart. Back up an existing installation before linking a second copy.

`src/plugin.ts` handles Stream Deck actions. `src/model.mjs` handles ordering, paging, and rendering. `native/OpenApps.swift` uses AppKit to enumerate and activate apps over a local JSON-line pipe. `scripts/profile.py` generates the Neo profile without copying user configuration.

## Verification

`npm test` covers stable ordering, app closure/PID reuse, paging, icon escaping, and the bundled plugin's WebSocket rendering/activation protocol. It also checks that startup does not switch profiles. CI builds the universal helper, tests, validates, and packages on macOS.

`node tests/native-smoke.mjs` is an optional interactive check that activates Finder, verifies foreground status, and restores the previous app. Run it where switching focus is acceptable.

## Support and privacy

Report bugs in [GitHub Issues](https://github.com/lefebma/streamdeck-open-apps/issues). Include macOS/Stream Deck versions and device model; remove private app names and paths from screenshots or logs.

Read the [privacy policy](PRIVACY.md) and [Marketplace submission notes](marketplace/SUBMISSION.md). This project is independent of Elgato.

Official references: [Stream Deck SDK](https://docs.elgato.com/streamdeck/sdk/introduction/getting-started/), [packaging](https://docs.elgato.com/streamdeck/cli/commands/pack/), [Marketplace guidelines](https://docs.elgato.com/guidelines/stream-deck/plugins/).

Licensed under the [MIT License](LICENSE).
