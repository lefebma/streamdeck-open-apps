# Changelog

## 0.1.2

Fix: installed packages showed no apps and the keys did nothing. The package archive dropped the executable bit on the native helper, so it could not start (EACCES). The plugin now restores the bit, and clears any quarantine flag, before launching the helper.

## 0.1.1

Align the packaged author with the ELS Partners Maker organization and enable Marketplace DRM compatibility (manifest SDK 3; Stream Deck 6.9 minimum).

## 0.1.0

Initial public release: six live application keys, native icons, stable positions, foreground highlighting, paging, and app activation without Accessibility or Automation access. Includes a universal macOS helper and an optional standalone Neo profile. Installation and startup preserve the selected profile.
