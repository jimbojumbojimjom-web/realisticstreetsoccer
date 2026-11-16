# Street Soccer 3D — Multiplayer

This project packages the uploaded Street Soccer 3D game with a Node.js + Socket.IO
server for online room-code multiplayer.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 in two browser windows/devices. In the game, open the
online multiplayer menu, create a room on one device, and enter the four-letter
room code on the other.

## Play with someone over the internet

The server must be hosted on a public Node.js service that supports persistent
WebSocket connections. Deploy this folder, install dependencies, and run
`npm start`. Share the resulting HTTPS website address with the other player.
Both players must open the game from that same hosted address.

Do not open `public/index.html` directly with `file://` for online play. The game
loads Socket.IO from the server that serves the page.

## Project structure

```text
public/
  index.html
test/
  multiplayer.test.js
.gitignore
package.json
README.md
server.js
```

## Notes

- The game client already contains its Socket.IO multiplayer client and room
  event handling; this package supplies the missing server.
- Room state is held in server memory. Restarting the server closes active rooms.
- This is a starter multiplayer server, not an authoritative anti-cheat server.
  For public competitive play, validate gameplay actions and match state server-side.
