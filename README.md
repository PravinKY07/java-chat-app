# Simple Chat Application

A beginner web-based chat application with a **Java backend**.

The frontend is plain HTML, CSS, and JavaScript. The backend is a single
`Main.java` using Java's built-in HTTP server. Users type a message and
click Send; JavaScript sends an HTTP `POST` to the Java server, which
stores the message in an `ArrayList`. Every open page polls with `GET`
every two seconds, so messages from other visitors appear automatically.

**Live demo:** <https://java-chat-app-oin1.onrender.com>

## Technologies

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | Java (`com.sun.net.httpserver`, part of the JDK) |
| Storage | `ArrayList` held in memory, capped at the 500 most recent |
| HTTP | `GET` to read messages, `POST` to send them |
| Hosting | Docker on Render |

There are no dependencies. No Maven, no Gradle, no `package.json`, no
npm install. Just a JDK.

## Project layout

```
.
├── .gitignore
└── simple-java-chat/
    ├── Main.java        # Java HTTP server: serves pages, handles GET/POST /messages
    ├── index.html       # Chat page
    ├── style.css        # Page styling
    ├── script.js        # fetch() calls, polling, and rendering
    ├── favicon.svg
    ├── Dockerfile       # For deployment
    └── README.md        # Detailed notes and viva questions
```

## How it works

1. The browser loads `index.html`, `style.css`, and `script.js` from the Java server.
2. On page open, JavaScript makes a `GET /messages` request.
3. Java responds with the messages currently in its `ArrayList`.
4. Each open page requests the list again every two seconds, so messages from other visitors appear automatically.
5. On send, JavaScript makes a `POST /messages` with the display name and message in the form body.
6. Java adds the message to the shared `ArrayList` and returns `201`.

```
User types message → clicks Send
        ↓
JavaScript POST /messages
        ↓
Java stores it in the ArrayList
        ↓
Each open page GET /messages
        ↓
Message appears in the chat window
```

## Run locally

```sh
cd simple-java-chat
javac Main.java
java Main
```

Open <http://localhost:8000>. The server reads the `PORT` environment
variable when one is set, and falls back to `8000` otherwise.

## API

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/messages` | `200` — JSON array of `{sender, text}` |
| `POST` | `/messages` | `201` — `{"success":true}` |
| `POST` | `/messages` | `400` — empty message, or name over 30 / message over 500 characters |
| `POST` | `/messages` | `413` — request body over 64KB |

## Deploy

Render has no native Java runtime (it offers Node, Bun, Python, Ruby, Go,
Rust, Elixir, and Docker), so this app deploys through the included
`Dockerfile`.

1. Create a **Web Service** in Render and connect this repository.
2. Set **Root Directory** to `simple-java-chat`.
3. Set **Dockerfile Path** to `Dockerfile`.
4. Leave **Build Command** and **Start Command** empty — the Dockerfile's
   `CMD` handles it.
5. Deploy.

The two path settings must resolve to `simple-java-chat/Dockerfile`, with
`simple-java-chat` appearing exactly once. Putting it in both fields makes
Render concatenate them and the build fails.

See `simple-java-chat/README.md` for a deeper walkthrough and viva
questions.

## Notes and limitations

- **Messages are not permanent.** They live in an `ArrayList` in memory and
  are lost whenever the server restarts.
- **Free-tier hosting sleeps.** The Render free instance spins down after
  roughly 15 minutes of inactivity, so the first request after that can
  take 30–60 seconds to wake. Messages are cleared on each restart.
- **Single shared chat.** Everyone using one deployment sees the same list.
- Messages are escaped before being placed in JSON, so quotes, newlines,
  and backslashes render correctly.