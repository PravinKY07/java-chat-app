const PASSWORD_STORAGE_KEY = "chat-password";
const PASSWORD_HEADER = "X-Chat-Password";

const passwordForm = document.querySelector("#password-form");
const passwordInput = document.querySelector("#password-input");
const passwordButton = document.querySelector("#password-button");
const passwordStatus = document.querySelector("#password-status");
const chatPanel = document.querySelector("#chat-panel");

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

function getStoredPassword() {
  try {
    return window.sessionStorage.getItem(PASSWORD_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storePassword(password) {
  try {
    if (password) {
      window.sessionStorage.setItem(PASSWORD_STORAGE_KEY, password);
    } else {
      window.sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private browsing; the chat still works.
  }
}

function showChat() {
  passwordForm.hidden = true;
  chatPanel.hidden = false;
  messageInput.focus();
}

function showPasswordGate(message) {
  passwordForm.hidden = false;
  chatPanel.hidden = true;
  passwordStatus.textContent = message || "";
  passwordInput.value = "";
  passwordInput.focus();
}

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = passwordInput.value;
  passwordButton.disabled = true;
  passwordStatus.textContent = "Checking...";

  try {
    const response = await fetch("/messages", {
      headers: { [PASSWORD_HEADER]: password },
    });

    if (response.status === 429) {
      passwordStatus.textContent = "Too many failed attempts. Wait a minute and try again.";
      return;
    }
    if (!response.ok) {
      passwordStatus.textContent = "That password is not correct.";
      return;
    }

    storePassword(password);
    showChat();
    await loadMessages();
  } catch {
    passwordStatus.textContent = "Could not reach the chat server.";
  } finally {
    passwordButton.disabled = false;
  }
});

async function loadMessages() {
  if (isPolling) {
    return;
  }
  const password = getStoredPassword();
  if (!password) {
    showPasswordGate();
    return;
  }
  isPolling = true;

  try {
    const response = await fetch("/messages", {
      headers: { [PASSWORD_HEADER]: password },
    });

    if (response.status === 401) {
      storePassword("");
      showPasswordGate("Your session was not accepted. Enter the password again.");
      return;
    }
    if (response.status === 429) {
      showPasswordGate("Too many failed attempts. Wait a minute and try again.");
      return;
    }
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
        [PASSWORD_HEADER]: getStoredPassword(),
      },
      body: new URLSearchParams({ sender: getSenderName(), message }),
    });

    if (response.status === 401 || response.status === 429) {
      storePassword("");
      showPasswordGate("Your session was not accepted. Enter the password again.");
      return;
    }

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
  if (!getStoredPassword()) {
    return;
  }
  loadMessages().catch(() => {
    formStatus.textContent = "Could not refresh messages. Retrying shortly.";
  });
}, 2000);