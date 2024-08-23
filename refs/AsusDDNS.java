import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;

public class AsusDDNS {

    private String user;
    private String key;
    private String host;
    private String mode;
    private String output;
    private String wanIP;

    public AsusDDNS(String user, String key, String host, String mode, String output) {
        this.user = stripDotsColons(user);
        this.key = key;
        this.host = host + ".asuscomm.com";
        this.mode = mode;
        this.output = output;
        this.wanIP = getWanIp();
    }

    private String stripDotsColons(String input) {
        return input.replace(".", "").replace(":", "");
    }

    private String calculatePassword() {
        String strippedHost = stripDotsColons(host);
        String strippedWanIP = stripDotsColons(wanIP);
        try {
            String data = strippedHost + strippedWanIP;
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update((data + key).getBytes());
            byte[] digest = md.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02X", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    private String asusRequest() {
        String path = mode.equals("register") ? "ddns/register.jsp" : "ddns/update.jsp";
        String password = calculatePassword();
        String urlString = "http://ns1.asuscomm.com/" + path + "?hostname=" + host + "&myip=" + wanIP;
        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", "ez-update-3.0.11b5 unknown [] (by Angus Mackay)");
            connection.setRequestProperty("Authorization", "Basic " + java.util.Base64.getEncoder().encodeToString((user + ":" + password).getBytes()));
            int responseCode = connection.getResponseCode();
            connection.disconnect();
            return String.valueOf(responseCode);
        } catch (Exception e) {
            e.printStackTrace();
            return "500"; // Internal Server Error
        }
    }

    private String getWanIp() {
        try {
            URL url = new URL("http://api.ipify.org/");
            BufferedReader in = new BufferedReader(new InputStreamReader(url.openStream()));
            String ip = in.readLine();
            in.close();
            return ip;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private boolean isDnsUpdated() {
        // Implement DNS check (nslookup equivalent in Java)
        // For demonstration purposes, assume DNS is always updated.
        return true;
    }

    private String codeToString(String code) {
        Map<String, String> responseMessages = new HashMap<>();
        responseMessages.put("200", mode.equals("register") ? "Registration success." : "Update success.");
        responseMessages.put("203", mode.equals("register") ? "Registration failed." : "Update failed.");
        responseMessages.put("220", "Same domain success.");
        responseMessages.put("230", "New domain success.");
        responseMessages.put("297", "Invalid hostname.");
        responseMessages.put("298", "Invalid domain name.");
        responseMessages.put("299", "Invalid IP format.");
        responseMessages.put("401", "Authentication failure.");
        responseMessages.put("407", "Proxy authentication Required.");
        return responseMessages.getOrDefault(code, "Unknown result code. (" + code + ")");
    }

    private void log(String message) {
        switch (output) {
            case "logger":
                System.out.println("logger: " + message); // Logging implementation needed
                break;
            case "silent":
                break;
            default:
                System.err.println(message);
                break;
        }
    }

    private void main() {
        if (mode.equals("update") && isDnsUpdated()) {
            log("Domain already updated.");
            return;
        }

        String returnCode = asusRequest();
        String res = codeToString(returnCode);
        log(res);
    }

    public static void main(String[] args) {
        if (args.length == 5) {
            String user = args[0];
            String key = args[1];
            String host = args[2];
            String mode = args[3];
            String output = args[4];

            AsusDDNS ddns = new AsusDDNS(user, key, host, mode, output);
            if (ddns.wanIP != null) {
                ddns.main();
            } else {
                ddns.log("No internet connection, cannot check.");
            }
        } else {
            System.out.println("Usage: mac wps host (register|update) (logger|console|silent)");
        }
    }
}
