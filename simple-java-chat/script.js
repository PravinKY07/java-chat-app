const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const senderNameInput = document.querySelector("#sender-name");
const messageList = document.querySelector("#message-list");
const sendButton = document.querySelector("#send-button");
const formStatus = document.querySelector("#form-status");
let lastMessageSnapshot = null;

function getSenderName() {
  return senderNameInput.value.trim() || "Guest";
}

function displayMessages(messages) {
  const snapshot = JSON.stringify(messages);
  if (snapshot === lastMessageSnapshot) {
    return;
  }
  lastMessageSnapshot = snapshot;

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
    const sender = message.sender || "Guest";
    item.className =
      sender === getSenderName()
        ? "message-item"
        : "message-item message-item--other";

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = sender;

    const bubble = document.createElement("p");
    bubble.className = "message-bubble";
    bubble.textContent = message.text;

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
  formStatus.textContent = "";
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
      body: new URLSearchParams({ sender: getSenderName(), message }),
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

window.setInterval(() => {
  loadMessages().catch(() => {
    formStatus.textContent = "Could not refresh messages. Retrying shortly.";
  });
}, 2000);