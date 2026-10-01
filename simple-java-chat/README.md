# Simple Chat Application

A beginner Java mini project. The HTML, CSS, and JavaScript page sends messages to a small Java HTTP server. The server keeps them in an `ArrayList` while it is running; there is no database or file storage.

## Files

- `Main.java` — starts the Java server and handles the page and message requests.
- `index.html` — the chat page.
- `style.css` — the page styling.
- `script.js` — loads and sends messages using `fetch()`.

## Run

In the Replit Shell:

```sh
cd simple-java-chat
javac Main.java
java Main
```

Open the web preview to use the chat. The server uses port `8000` by default and reads Replit's `PORT` setting when it is provided.

## How the project works

1. The browser loads `index.html`, `style.css`, and `script.js` from the Java server.
2. When the page opens, JavaScript makes a `GET /messages` request.
3. Java responds with the messages currently held in its `ArrayList`.
4. When someone sends a message, JavaScript makes a `POST /messages` request with the message in its form body.
5. Java adds the message to the `ArrayList` and returns a success response.
6. JavaScript requests the message list again and displays the updated messages.

### Presentation explanation

- **Frontend:** HTML describes the page, CSS styles it, and JavaScript responds to sending a message and makes HTTP requests with `fetch()`.
- **Java backend:** `Main.java` starts Java's built-in HTTP server. It serves the page files and handles requests sent to `/messages`.
- **HTTP POST:** POST sends new information to a server. Here, it sends the message text for Java to store.
- **ArrayList:** `messages` is a Java list that holds each message in memory as the program runs. It is cleared when the server stops.
- **HTTP GET:** GET asks the server for information. Here, it returns all messages so the page can display them.
- **Full flow:** Type a message → click Send → JavaScript sends POST → Java adds it to the ArrayList → JavaScript sends GET → the updated messages appear in the page.

## Viva questions

1. **What is the frontend of this project?**  
   The frontend is the part shown in the browser. It is made with HTML, CSS, and JavaScript.

2. **What does the Java backend do?**  
   It serves the chat page, receives messages, stores them in a list, and returns the saved messages.

3. **What is an HTTP POST request used for here?**  
   It sends a new message from the browser to the Java server.

4. **What is an `ArrayList`?**  
   It is a Java collection that can hold a list of items. This project uses one to hold chat messages.

5. **What does the GET endpoint return?**  
   `GET /messages` returns every message currently stored in the list.

6. **Are messages saved permanently?**  
   No. They are only kept in memory and are lost when the Java server stops.

7. **What does JavaScript's `fetch()` do?**  
   It lets the browser send HTTP requests to the Java server and read its responses.