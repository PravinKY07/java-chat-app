const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const messageList = document.querySelector("#message-list");
const sendButton = document.querySelector("#send-button");
const formStatus = document.querySelector("#form-status");

function displayMessages(messages) {
  messageList.replaceChildren();

  if (messages.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-state";
    emptyMessage.textContent = "No messages yet. Send the first one.";
    messageList.append(emptyMessage);
    return;
  }

  messages.forEach((message) => {
    const item = document.createElement("li");
    item.className = "message-item";

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = "You";

    const bubble = document.createElement("p");
    bubble.className = "message-bubble";
    bubble.textContent = message;

    item.append(label, bubble);
    messageList.append(item);
  });

  messageList.scrollTop = messageList.scrollHeight;
}

async function loadMessages() {
  const response = await fetch("/messages");
  if (!response.ok) {
    throw new Error("Could not load messages from the Java server.");
  }

  const messages = await response.json();
  displayMessages(messages);
}

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (!message) {
    formStatus.textContent = "Type a message before sending.";
    messageInput.focus();
    return;
  }

  sendButton.disabled = true;
  formStatus.textContent = "";

  try {
    const response = await fetch("/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({ message }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "The message could not be sent.");
    }

    messageInput.value = "";
    await loadMessages();
    messageInput.focus();
  } catch (error) {
    formStatus.textContent =
      error instanceof Error
        ? error.message
        : "Could not connect to the Java server.";
  } finally {
    sendButton.disabled = false;
  }
});

loadMessages().catch((error) => {
  formStatus.textContent =
    error instanceof Error
      ? error.message
      : "Could not connect to the Java server.";
});