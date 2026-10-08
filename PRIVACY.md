# Privacy

Open Apps runs locally on your Mac. Its native helper reads the names, bundle identifiers, process identifiers, icons, and foreground status of running applications so Stream Deck can display and activate them.

The helper sends this information through a local standard-input/output pipe. The plugin communicates with Stream Deck through the SDK's local WebSocket connection. Open Apps does not send app information to remote servers, collect analytics, use accounts, or read window contents, documents, browser history, or keystrokes. It does not require Accessibility or Automation permissions.

App information is held in memory. The plugin may write local diagnostic logs through the Stream Deck SDK when errors occur; these are not uploaded automatically. Stream Deck manages its own profiles, settings, and logs separately.

Bug reports voluntarily submitted on GitHub are public. Remove private information before posting. GitHub and Elgato operate under their own privacy policies.
