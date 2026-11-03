# Anonymous E2E Chat

## Run it

1. `npm install`
2. `npm start`   (starts the relay server on port 8080)
3. In another terminal: `npx serve public` (or any static file server) and open the URL it gives you
4. Add a room name after `#`, e.g. `index.html#kitchen`, and open that same URL in a second tab/browser to test

The server (server.js) only ever relays encrypted blobs and public keys.
It never logs IP addresses and never sees plaintext messages.
