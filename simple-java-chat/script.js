const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const senderNameInput = document.querySelector("#sender-name");
const messageList = document.querySelector("#message-list");
const sendButton = document.querySelector("#send-button");
const formStatus = document.querySelector("#form-status");
const messageAnnouncer = document.querySelector("#message-announcer");
let lastMessageSnapshot = null;
let lastRenderedSenderName = null;
let lastAnnouncedKey = null;
let isPolling = false;

function getSenderName() {
  return senderNameInput.value.trim() || "Guest";
}

function displayMessages(messages) {
  const senderName = getSenderName();
  const snapshot = JSON.stringify(messages) + "|" + senderName;
  if (snapshot === lastMessageSnapshot) {
    return;
  }
  lastMessageSnapshot = snapshot;
  lastRenderedSenderName = senderName;

  messageList.replaceChildren();

  if (messages.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-state";
    emptyMessage.textContent = "No messages yet. Send the first one.";
    messageList.append(emptyMessage);
    lastAnnouncedKey = null;
    return;
  }

  messages.forEach((message) => {
    const item = document.createElement("li");
    const sender = message.sender || "Guest";
    item.className =
      sender === senderName
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

  const newest = messages[messages.length - 1];
  const newestSender = newest.sender || "Guest";
  const newestKey = newestSender.length + ":" + newestSender + newest.text;

  if (lastAnnouncedKey === null) {
    // First render of existing history: record it without announcing.
    lastAnnouncedKey = newestKey;
  } else if (newestKey !== lastAnnouncedKey) {
    messageAnnouncer.textContent = `New message from ${newest.sender || "Guest"}`;
    lastAnnouncedKey = newestKey;
  }

  messageList.scrollTop = messageList.scrollHeight;
}

async function loadMessages() {
  if (isPolling) {
    return;
  }
  isPolling = true;

  try {
    const response = await fetch("/messages");
    if (!response.ok) {
      throw new Error("Could not load messages from the Java server.");
    }

    const messages = await response.json();
    displayMessages(messages);
  } finally {
    isPolling = false;
  }
}

senderNameInput.addEventListener("input", () => {
  if (getSenderName() !== lastRenderedSenderName) {
    loadMessages().catch(() => {});
  }
});

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
    formStatus.textContent = "";
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