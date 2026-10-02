import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

public class Main {
    private static final List<ChatMessage> messages = new ArrayList<>();
    private static final Path APP_FOLDER = Path.of(".").toAbsolutePath().normalize();

    private static final int DEFAULT_PORT = 8000;
    private static final int MAX_MESSAGES = 500;
    private static final int MAX_NAME_LENGTH = 30;
    private static final int MAX_MESSAGE_LENGTH = 500;
    private static final int MAX_BODY_BYTES = 64 * 1024;

    private static final String PASSWORD_HEADER = "X-Chat-Password";
    private static final String PASSWORD_ENVIRONMENT_VARIABLE = "CHAT_PASSWORD";
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_MILLIS = 60_000L;

    private static byte[] chatPassword;
    private static final Map<String, Attempt> failedAttempts = new ConcurrentHashMap<>();

    public static void main(String[] args) throws IOException {
        String configuredPassword = System.getenv(PASSWORD_ENVIRONMENT_VARIABLE);
        if (configuredPassword == null || configuredPassword.isEmpty()) {
            System.out.println(
                    "The " + PASSWORD_ENVIRONMENT_VARIABLE + " environment variable is not set."
                            + " Set it to the chat password and start the server again."
            );
            System.exit(1);
            return;
        }
        chatPassword = configuredPassword.getBytes(StandardCharsets.UTF_8);

        int port = readPort();
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.setExecutor(Executors.newFixedThreadPool(10));
        server.createContext("/", Main::handleRequest);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stop(0)));
        server.start();

        System.out.println("Simple Chat Application is running on port " + port);
    }

    private static int readPort() {
        String configuredPort = System.getenv("PORT");
        if (configuredPort == null || configuredPort.isBlank()) {
            return DEFAULT_PORT;
        }

        try {
            int port = Integer.parseInt(configuredPort.trim());
            return port > 0 && port <= 65535 ? port : DEFAULT_PORT;
        } catch (NumberFormatException exception) {
            System.out.println("PORT \"" + configuredPort + "\" is not a valid port, using " + DEFAULT_PORT);
            return DEFAULT_PORT;
        }
    }

    private static void handleRequest(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        if (path.equals("/messages")) {
            if (!isAuthorized(exchange)) {
                return;
            }

            if (method.equals("GET")) {
                getMessages(exchange);
            } else if (method.equals("POST")) {
                addMessage(exchange);
            } else {
                exchange.getResponseHeaders().set("Allow", "GET, POST");
                sendResponse(exchange, 405, "{\"error\":\"Use GET or POST.\"}", "application/json");
            }
            return;
        }

        if (method.equals("GET")) {
            servePage(exchange, path);
            return;
        }

        sendResponse(exchange, 405, "Method not allowed.", "text/plain");
    }

    private static boolean isAuthorized(HttpExchange exchange) throws IOException {
        String clientAddress = exchange.getRemoteAddress().getAddress().getHostAddress();
        long now = System.currentTimeMillis();

        Attempt attempt = failedAttempts.get(clientAddress);
        boolean withinCooldown = attempt != null && now - attempt.lastFailureAt < LOCKOUT_MILLIS;
        if (withinCooldown && attempt.failures >= MAX_FAILED_ATTEMPTS) {
            sendResponse(
                    exchange,
                    429,
                    "{\"error\":\"Too many failed attempts. Try again in a moment.\"}",
                    "application/json"
            );
            return false;
        }

        String suppliedPassword = exchange.getRequestHeaders().getFirst(PASSWORD_HEADER);
        boolean passwordMatches = suppliedPassword != null
                && MessageDigest.isEqual(
                        suppliedPassword.getBytes(StandardCharsets.UTF_8),
                        chatPassword
                );

        if (passwordMatches) {
            failedAttempts.remove(clientAddress);
            return true;
        }

        int failures = withinCooldown ? attempt.failures + 1 : 1;
        failedAttempts.put(clientAddress, new Attempt(failures, now));
        exchange.getResponseHeaders().set("WWW-Authenticate", "ChatPassword");
        sendResponse(exchange, 401, "{\"error\":\"Incorrect password.\"}", "application/json");
        return false;
    }

    private static class Attempt {
        private final int failures;
        private final long lastFailureAt;

        private Attempt(int failures, long lastFailureAt) {
            this.failures = failures;
            this.lastFailureAt = lastFailureAt;
        }
    }

    private static void getMessages(HttpExchange exchange) throws IOException {
        List<ChatMessage> savedMessages;
        synchronized (messages) {
            savedMessages = new ArrayList<>(messages);
        }

        StringBuilder json = new StringBuilder("[");
        for (int index = 0; index < savedMessages.size(); index++) {
            ChatMessage message = savedMessages.get(index);
            if (index > 0) {
                json.append(",");
            }
            json.append("{\"sender\":\"")
                    .append(escapeJson(message.sender))
                    .append("\",\"text\":\"")
                    .append(escapeJson(message.text))
                    .append("\"}");
        }
        json.append("]");

        sendResponse(exchange, 200, json.toString(), "application/json");
    }

    private static void addMessage(HttpExchange exchange) throws IOException {
        String form;
        try {
            form = readLimitedBody(exchange);
        } catch (RequestTooLargeException exception) {
            sendResponse(exchange, 413, "{\"error\":\"Message is too large.\"}", "application/json");
            return;
        }

        String sender = readFormField(form, "sender").trim();
        String message = readFormField(form, "message").trim();

        if (sender.isEmpty()) {
            sender = "Guest";
        }

        if (message.isEmpty()) {
            sendResponse(exchange, 400, "{\"error\":\"Message cannot be empty.\"}", "application/json");
            return;
        }

        if (sender.length() > MAX_NAME_LENGTH || message.length() > MAX_MESSAGE_LENGTH) {
            sendResponse(exchange, 400, "{\"error\":\"Name or message is too long.\"}", "application/json");
            return;
        }

        synchronized (messages) {
            messages.add(new ChatMessage(sender, message));
            while (messages.size() > MAX_MESSAGES) {
                messages.remove(0);
            }
        }

        sendResponse(exchange, 201, "{\"success\":true}", "application/json");
    }

    private static String readLimitedBody(HttpExchange exchange)
            throws IOException, RequestTooLargeException {
        try (InputStream body = exchange.getRequestBody()) {
            byte[] content = body.readNBytes(MAX_BODY_BYTES + 1);
            if (content.length > MAX_BODY_BYTES) {
                throw new RequestTooLargeException();
            }
            return new String(content, StandardCharsets.UTF_8);
        }
    }

    private static class RequestTooLargeException extends Exception {
        private static final long serialVersionUID = 1L;
    }

    private static String readFormField(String form, String fieldName) {
        for (String part : form.split("&")) {
            int equalsPosition = part.indexOf('=');
            if (equalsPosition < 0) {
                continue;
            }

            String name = URLDecoder.decode(part.substring(0, equalsPosition), StandardCharsets.UTF_8);
            if (name.equals(fieldName)) {
                return URLDecoder.decode(part.substring(equalsPosition + 1), StandardCharsets.UTF_8);
            }
        }

        return "";
    }

    private static class ChatMessage {
        private final String sender;
        private final String text;

        private ChatMessage(String sender, String text) {
            this.sender = sender;
            this.text = text;
        }
    }

    private static void servePage(HttpExchange exchange, String path) throws IOException {
        String fileName = switch (path) {
            case "/", "/index.html" -> "index.html";
            case "/style.css" -> "style.css";
            case "/script.js" -> "script.js";
            case "/favicon.ico", "/favicon.svg" -> "favicon.svg";
            default -> null;
        };

        if (fileName == null) {
            sendResponse(exchange, 404, "Page not found.", "text/plain");
            return;
        }

        Path file = APP_FOLDER.resolve(fileName);
        if (!Files.exists(file)) {
            sendResponse(exchange, 500, "A chat application file is missing.", "text/plain");
            return;
        }

        String contentType = fileName.endsWith(".css")
                ? "text/css"
                : fileName.endsWith(".js")
                        ? "text/javascript"
                        : fileName.endsWith(".svg")
                                ? "image/svg+xml"
                                : "text/html";
        byte[] content = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", contentType + "; charset=UTF-8");
        exchange.sendResponseHeaders(200, content.length);
        exchange.getResponseBody().write(content);
        exchange.close();
    }

    private static String escapeJson(String value) {
        StringBuilder escaped = new StringBuilder();
        for (char character : value.toCharArray()) {
            switch (character) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (character < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) character));
                    } else {
                        escaped.append(character);
                    }
                }
            }
        }
        return escaped.toString();
    }

    private static void sendResponse(
            HttpExchange exchange,
            int statusCode,
            String body,
            String contentType
    ) throws IOException {
        byte[] content = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType + "; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, content.length);
        exchange.getResponseBody().write(content);
        exchange.close();
    }
}