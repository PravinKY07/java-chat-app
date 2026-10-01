# Simple Java Chat Application

A beginner-level chat mini project using HTML, CSS, and JavaScript in the browser and Java's built-in HTTP server. Messages are held in memory in an `ArrayList` and are cleared when the server stops.

## Run & Operate

- Main Replit workflow: `Simple Java Chat App`
- Manual run from the project root: `cd simple-java-chat && javac Main.java && java Main`
- The server uses the `PORT` environment variable when set, or port `8000` otherwise.

## Stack

- Backend: Java `HttpServer` from the JDK; no third-party dependencies
- Frontend: plain HTML, CSS, and JavaScript
- Message storage: an in-memory Java `ArrayList`; no database or file storage

## Where things live

- `simple-java-chat/Main.java` — serves the frontend and handles `GET /messages` and `POST /messages`
- `simple-java-chat/index.html` — chat page
- `simple-java-chat/style.css` — basic responsive styling
- `simple-java-chat/script.js` — loads and sends messages with `fetch()`
- `simple-java-chat/README.md` — run instructions, project explanation, and viva questions
