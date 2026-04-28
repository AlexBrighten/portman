# Changelog

All notable changes to the Portman extension will be documented in this file.

## [1.1.0]
### Added
- **Multi-Root Workspace Grouping:** Ports are now automatically grouped under their respective workspace folder names when multiple folders are open.
- **Auto-Cleanup:** Added a synchronous prompt on workspace close to kill any lingering dev processes and prevent zombie ports.
- **Terminal Crash Interception:** Real-time detection of `EADDRINUSE` errors in the integrated terminal with a "Kill & Retry" inline prompt.
- **`.env` File Awareness:** Cross-references `.env` port configurations and flags matching ports in the activity view.
- **Docker Detection:** Automatically identifies ports proxied through Docker and displays the container name.
- **Team Config Export:** Added commands to export port profiles to `.devcontainer/portman.json` and auto-import them on workspace load.
- **Keyboard Shortcuts:** Configurable keybindings using `ctrl+alt+p` chords for refreshing, killing, and finding free ports without Command Palette conflicts.
- **Local Telemetry:** Opt-in local-only metric collection for KPIs, viewable via the `Portman: Show Metrics` command.

### Fixed
- Fixed issue where persistent databases (like Postgres or Redis) could be falsely categorized as dev ports and incorrectly suggested for auto-cleanup.
- Excluded internal SRS documents and build scripts from the VSIX bundle for a significantly smaller extension size.

## [1.0.0]
### Added
- **Initial Release:** Visual port manager for VS Code with single-click process termination.
- **Process Classification:** Automatically classifies active ports into Dev, IDE, and System categories.
- **Port Profiles:** Create named profiles to group multiple related ports for bulk management.
- **Annotations:** Add persistent custom labels to any active port.
- **Conflict Prediction:** Scans `package.json` scripts to warn users proactively before launching tasks on occupied ports.
- **Free Port Finder:** Scan for and copy the nearest available free port above a given number.
- **Webview Detail Panel:** Rich interactive cards displaying command history, CPU/Memory stats, and one-click actions.
- **Activity Tracker:** Records first-seen and last-seen timestamps and logs historical process information per port.
