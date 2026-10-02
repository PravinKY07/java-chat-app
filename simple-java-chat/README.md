# Simple Chat Application

A beginner Java mini project. The HTML, CSS, and JavaScript page sends messages to a small Java HTTP server. Everyone using the same running app shares one chat; pages check for new messages every two seconds. The server keeps the 500 most recent messages in an `ArrayList` while it is running; there is no database or file storage.

## Files

- `Main.java` — starts the Java server and handles the page and message requests.
- `index.html` — the chat page.
- `style.css` — the page styling.
- `script.js` — loads and sends messages using `fetch()` and checks for new messages.
- `Dockerfile` — builds the app into a Java 21 image for deployment.

## Run

Locally:

```sh
cd simple-java-chat
javac Main.java
java Main
```

Then open <http://localhost:8000> in a browser. The server uses port `8000` by default and reads the `PORT` environment variable when one is set. If `PORT` is not a valid port number, it falls back to `8000` instead of failing to start.

The server keeps only the **500 most recent** messages in memory, and requests to `/messages` are handled on a thread pool so one slow request cannot block the whole chat.

## Deploy on Render

Live at <https://java-chat-app-oin1.onrender.com>.

Render has no native Java runtime — the language dropdown offers Node, Bun, Python, Ruby, Go, Rust, Elixir, and Docker. So this app deploys through the `Dockerfile` in this folder, which compiles `Main.java` in a Java 21 image and starts it.

1. Push this repository to GitHub.
2. In Render, choose **New → Web Service** and connect the GitHub repository.
3. Set **Root Directory** to `simple-java-chat`.
4. Set **Dockerfile Path** to `Dockerfile`.
5. Leave **Build Command** and **Start Command** empty — the Dockerfile's `CMD ["java", "Main"]` runs the app.
6. Choose a free instance type and deploy.

The Root Directory and Dockerfile Path together have to resolve to `simple-java-chat/Dockerfile`. Render concatenates the two values, so setting Root Directory to `simple-java-chat` *and* Dockerfile Path to `simple-java-chat/Dockerfile` fails the build.

Render sets the `PORT` environment variable automatically and the Java server reads it. Messages are shared by everyone using the same deployment and are cleared whenever the server restarts — including when the free instance spins down after inactivity.

## How the project works

1. The browser loads `index.html`, `style.css`, and `script.js` from the Java server.
2. When the page opens, JavaScript makes a `GET /messages` request.
3. Java responds with the messages currently held in its `ArrayList`, including each sender's display name.
4. Every open page requests the list again every two seconds, so messages from other visitors appear automatically.
5. When someone sends a message, JavaScript makes a `POST /messages` request with the sender name and message in its form body.
6. Java adds the message to the shared `ArrayList` and returns a success response.

### Presentation explanation

- **Frontend:** HTML describes the page, CSS styles it, and JavaScript responds to sending a message and makes HTTP requests with `fetch()`.
- **Java backend:** `Main.java` starts Java's built-in HTTP server. It serves the page files and handles requests sent to `/messages`.
- **HTTP POST:** POST sends new information to a server. Here, it sends the sender's display name and message for Java to store.
- **ArrayList:** `messages` is a Java list that holds each message in memory as the program runs. It is cleared when the server stops.
- **HTTP GET:** GET asks the server for information. Here, it returns all messages so the page can display them.
- **Multiple visitors:** Everyone opening the same running app talks to the same Java server and sees the same in-memory message list. Each page checks for updates every two seconds.
- **Full flow:** Enter a display name and message → click Send → JavaScript sends POST → Java adds it to the ArrayList → each open page sends GET → the new message appears with its sender's name.

## Viva questions

1. **What is the frontend of this project?**  
   The frontend is the part shown in the browser. It is made with HTML, CSS, and JavaScript.

2. **What does the Java backend do?**  
   It serves the chat page, receives messages, stores them in a list, and returns the saved messages.

3. **What is an HTTP POST request used for here?**  
   It sends a new message from the browser to the Java server.

4. **What is an `ArrayList`?**  
   It is a Java collection that can hold a list of items. This project uses one to hold chat messages, capped at the 500 most recent so memory stays bounded.

5. **What does the GET endpoint return?**  
   `GET /messages` returns every message currently stored in the list.

6. **Are messages saved permanently?**  
   No. They are only kept in memory and are lost when the Java server stops.

7. **What does JavaScript's `fetch()` do?**  
   It lets the browser send HTTP requests to the Java server and read its responses.

8. **How do messages from another visitor appear?**  
   Each open page sends a GET request every two seconds and displays the latest shared message list.