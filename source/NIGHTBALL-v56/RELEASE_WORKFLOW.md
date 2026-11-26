# Release workflow

Every update MUST add a newest-first release entry to dist/release-notes.js with Japanese title/detail, optional items and zh-TW/ko translations. Update VERSION and release-notes.js?v=<VERSION> in dist/index.html and dist/sw.js. The GitHub Pages workflow checks these before publication. Preserve the history. Read status is per browser and is marked only when the latest release history is opened.
