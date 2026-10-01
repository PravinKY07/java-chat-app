import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class Main {
    private static final List<String> messages = new ArrayList<>();
    private static final Path APP_FOLDER = Path.of(".").toAbsolutePath().normalize();

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8000"));
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/", Main::handleRequest);
        server.start();

        System.out.println("Simple Chat Application is running on port " + port);
    }

    private static void handleRequest(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        if (path.equals("/messages")) {
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

    private static void getMessages(HttpExchange exchange) throws IOException {
        List<String> savedMessages;
        synchronized (messages) {
            savedMessages = new ArrayList<>(messages);
        }

        List<String> jsonMessages = new ArrayList<>();
        for (String message : savedMessages) {
            jsonMessages.add("\"" + escapeJson(message) + "\"");
        }

        sendResponse(exchange, 200, "[" + String.join(",", jsonMessages) + "]", "application/json");
    }

    private static void addMessage(HttpExchange exchange) throws IOException {
        String form = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        String message = readMessageField(form).trim();

        if (message.isEmpty()) {
            sendResponse(exchange, 400, "{\"error\":\"Message cannot be empty.\"}", "application/json");
            return;
        }

        synchronized (messages) {
            messages.add(message);
        }

        sendResponse(exchange, 201, "{\"success\":true}", "application/json");
    }

    private static String readMessageField(String form) {
        for (String part : form.split("&")) {
            int equalsPosition = part.indexOf('=');
            if (equalsPosition < 0) {
                continue;
            }

            String name = URLDecoder.decode(part.substring(0, equalsPosition), StandardCharsets.UTF_8);
            if (name.equals("message")) {
                return URLDecoder.decode(part.substring(equalsPosition + 1), StandardCharsets.UTF_8);
            }
        }

        return "";
    }

    private static void servePage(HttpExchange exchange, String path) throws IOException {
        String fileName = switch (path) {
            case "/", "/index.html" -> "index.html";
            case "/style.css" -> "style.css";
            case "/script.js" -> "script.js";
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
                : fileName.endsWith(".js") ? "text/javascript" : "text/html";
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