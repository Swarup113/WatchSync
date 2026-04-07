# WatchSync – Watch YouTube Together in Sync

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7.2-black)](https://socket.io/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**WatchSync** is a real-time web application that allows you to watch YouTube videos with friends **perfectly synchronized**. Create a room, share the link, and enjoy the video together with live chat. Only the host controls playback – play, pause, seek, or change the video – and everyone else follows in sync.

##  Live Demo

> **https://watchsync.up.railway.app/:**   

---

##  Features

-  **Room creation & invite links** – generate a unique room ID and share it.
-  **YouTube video sync** – host loads any YouTube URL, guests watch in perfect sync.
-  **Host controls** – only the host can play, pause, seek, or load new videos.
-  **Real-time chat** – messages appear instantly with coloured usernames (host in gold, guests in pastel).
-  **Optional usernames** – guests can set their own name or be assigned "Guest 1", "Guest 2", etc.
-  **Mobile responsive** – works on phones, tablets, and desktops.
-  **Dark theme** – easy on the eyes for late-night watch parties.

---

##  Tech Stack

- **Backend:** Node.js + Express
- **Real-time:** Socket.io
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Video API:** YouTube IFrame Player API
- **Styling:** Custom CSS with Flexbox, dark theme, responsive design

---

## How to Use

**Create a room** – click "Create Room" on the landing page. You become the Host.

**Invite friends** – copy the invite link from the top bar and share it.

**Join as a guest** – when someone opens the link, they can enter an optional name and join.

**Load a YouTube video** – paste any YouTube URL (e.g., https://youtu.be/... or https://youtube.com/watch?v=...) and click "Load".

**Control playback** – only the host sees enabled controls (play/pause, seek, load new video). Guests watch in real‑time sync.

**Chat** – everyone can send messages; host appears in gold, guests in distinct colours.

---

## License
MIT 

---

## Acknowledgements

- YouTube IFrame API
- Socket.io
- Font Awesome for icons
- Google Fonts (Inter)
