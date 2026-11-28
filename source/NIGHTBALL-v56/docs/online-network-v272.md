# Online networking v272

The Pages build remains playable without a separate server. Existing room
codes and authoritative host simulation are retained. The reliable PeerJS
data connection carries input, score, calls, menus and per-play keyframes.
An optional negotiated native RTCDataChannel (ID 62, unordered, no retries)
carries independent field deltas. If it cannot open, compact snapshots keep
working on the reliable connection. Failed or stale pose packets are never
needed to decode a newer pose.

Replay frames use a sequential delta codec in a Web Worker (synchronous
fallback), with backpressure-aware reliable chunks. Reconnect pauses the
match, creates a fresh epoch and keyframe, and waits for the guest's receipt
before play resumes. Guest room continuation tokens are random per session.

## Optional relay deployment (not provisioned by GitHub Pages)
- Deploy server/ with Cloudflare Wrangler after creating/verifying a Workers
  account and billing/usage limits. Restrict ALLOWED_ORIGIN to the Pages origin.
- Set relayUrl in dist/online-config.js to the deployed wss://.../relay URL.
  Host opens a standby socket; guest tries direct WebRTC first and falls back
  after 6.5 seconds; during interrupted matches it may migrate after direct
  reconnect attempts. Configure the same URL on both devices. WebSocket still
  uses ordered reliable transport, so it is a connectivity fallback, not
  unconditionally faster. Test and monitor load before enabling publicly.
- For TURN, provide an HTTPS iceEndpoint returning {iceServers:[...]} with
  STUN and short-lived TURN credentials. Do not commit permanent TURN
  credentials or Cloudflare secrets to this public repository. Standard ICE
  selects direct candidates if available and relay otherwise. A TURN service
  (and usage limits) needs provisioning independently.
- The localStorage nightball.peerConfig option supports a self-hosted PeerJS
  signaling server, iceEndpoint/relayUrl overrides and RTCConfiguration for
  development. Neither hosting PeerServer alone nor changing its region
  makes established P2P traffic faster.
- For reliability, test Wi-Fi, cellular, direct/TURN/WebSocket separately,
  including a temporary loss during the pitch, manual running, an ABS window,
  replay and a substitution. Permanent disconnection ends the session after
  the recovery deadline rather than simulating unconfirmed decisions.
