# v212 pregame screen

The normal versus flow now uses a dedicated viewport-sized shell with a fixed footer and independently scrollable body. Team, park, pitcher, rule and preset screens reuse the shell. Normal match lineup uses the same shell; confirming a lineup returns to the hub. Other modes and simulation are unchanged. Stadium previews are schematic. Dedicated Playwright workflow verifies real app at 320, 390, 412px and navigation/persistence; older workflows have version-pinned failures that predate this change.
