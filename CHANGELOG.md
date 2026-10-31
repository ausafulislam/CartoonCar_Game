# Changelog

All notable changes to Cartoon Car Adventure. The version is shown at the bottom
of the in-game **Settings** screen.

## [1.1.0] — 2026-10-31

### Gameplay
- **Bot traffic drives like traffic.** Each car looks at the vehicle in front of it in
  its lane, keeps a bumper-sized gap, inherits its speed when queuing and pulls into a
  free neighbouring lane to overtake (with a lean). Cars can no longer slide through
  each other — a forced-spawn stress run went from 84 overlapping frames (worst 94 px)
  to zero.
- **Road works replaced single obstacles.** A road blocker now arrives with the
  construction site it is guarding: a freshly dug pit with a spoil ring, cut asphalt
  edge, warning tape and rubble behind it. Open pits also show up on their own.
- **Lone traffic cones are gone.** Cones no longer spawn on their own in the middle of
  the road; they now only ever appear as part of a road-works site — fencing the
  blocker and standing around the open pit — so every cone you see means something.
- Blockers are a full crash (a life); pits jolt the car, cut its speed and spoil the
  clean run without costing a life.
- Coin chains no longer spawn over a blocked lane.

### Performance
- Pressing a steering pad no longer re-renders React at all (it toggles a class), and
  the HUD numbers are written straight into the DOM.
- The pressed-button animation is compositor-only (`transform` + overlay `opacity`);
  the old `filter` / `box-shadow` transitions repainted the button over the live
  canvas and cost ~40% of the frame rate while steering.
- Speed dial and HUD text update at ~11 Hz instead of every frame; the dial gradient
  repaints in 2% steps.
- Pooled particle emitters and one reused floating label instead of new objects per
  coin and near miss.
- Steering is frame-rate independent and eases towards the edge instead of snapping.
- WebGL MSAA off, `powerPreference: high-performance`, lazily measured pad hit boxes,
  rate-limited haptics, `overscroll-behavior: none`.

### UI
- Settings shows the running version and a **Built by Ausaf** credit that opens
  <https://ausafulislam.vercel.app>.
- How-to-play text updated for the new hazards.

### Fixed
- Daily missions and their claimed rewards now roll over the moment the app opens (and
  the normalised save is written back immediately), instead of yesterday's counters
  still sitting in storage until the next action.
- The Settings footer uses dark ink instead of white-on-pale, and the build credit has
  a proper link colour.

### Housekeeping
- The Fredoka typeface is now bundled (`@fontsource-variable/fredoka`) instead of being
  fetched from Google Fonts: zero third-party requests, correct type in the installed
  PWA offline, and no blocked-font console error behind a restrictive network.
- The headless test suites now assert every step and exit non-zero on failure (they used
  to only log), cover the Settings version/credit, and accept a custom `CHROMIUM_PATH`.
- Removed unused template assets, documented the performance work, added this
  changelog and refreshed the screenshots.

## [1.0.0]

- Initial release: 50 levels + Endless mode, 12 cars, garage, shop with upgrades,
  trophies, daily rewards and missions, settings, offline-first PWA.
