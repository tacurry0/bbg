/* Deployment configuration. GitHub Pages alone has no TURN/WebSocket server.
   Set relayUrl to a deployed wss:// endpoint and/or iceEndpoint to an HTTPS
   endpoint issuing short-lived WebRTC ICE credentials. Leave empty for P2P.
   Do not embed permanent TURN credentials or server secrets here. */
globalThis.NightOnlineConfig=Object.freeze({relayUrl:'',iceEndpoint:''});
