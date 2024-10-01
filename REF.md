# REF Program

### js version (original)

```javascript
const https = require('https');
const crypto = require('crypto');
const { exec } = require('child_process');

function stripDotsColons(str) {
	return str.replace(/[.:]/g, '');
}

function calculatePassword(host, wanIP, key) {
	const strippedHost = stripDotsColons(host);
	const strippedWanIP = stripDotsColons(wanIP);
	const hmac = crypto.createHmac('md5', key);
	hmac.update(strippedHost + strippedWanIP);
	return hmac.digest('hex').toUpperCase();
}

function getWanIP(callback) {
	https.get('https://api.ipify.org/', (res) => {
		let data = '';
		res.on('data', (chunk) => data += chunk);
		res.on('end', () => callback(data));
	}).on('error', (err) => callback(null));
}

function asusRequest(user, password, host, wanIP, mode, callback) {
	const path = mode === 'register' ? 'ddns/register.jsp' : 'ddns/update.jsp';
	const url = `http://ns1.asuscomm.com/${path}?hostname=${host}&myip=${wanIP}`;
	const options = {
		method: 'GET',
		headers: {
			'User-Agent': 'ez-update-3.0.11b5 unknown [] (by Angus Mackay)',
			'Authorization': 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')
		}
	};

	https.get(url, options, (res) => {
		callback(res.statusCode);
	}).on('error', (err) => callback(null));
}

function codeToString(mode, code) {
	const logMode = mode === 'register' ? 'Registration' : 'Update';
	switch (code) {
		case 200: return `${logMode} success.`;
		case 203:
		case 233: return `${logMode} failed.`;
		case 220: return `${logMode} same domain success.`;
		case 230: return `${logMode} new domain success.`;
		case 297: return 'Invalid hostname.';
		case 298: return 'Invalid domain name.';
		case 299: return 'Invalid IP format.';
		case 401: return 'Authentication failure.';
		case 407: return 'Proxy authentication Required.';
		default: return `Unknown result code. (${code})`;
	}
}

function isDnsUpdated(host, wanIP, callback) {
	exec(`nslookup ${host} ns1.asuscomm.com`, (err, stdout) => {
		if (err) return callback(false);
		const dnsResolution = stdout.split(/\s+/);
		callback(dnsResolution.includes(wanIP));
	});
}

function log(output, message) {
	switch (output) {
		case 'logger':
			exec(`logger -t "ASUSddns" "${message}"`);
			break;
		case 'silent':
			break;
		default:
			console.error(message);
	}
}

function usage() {
	console.log("Usage: mac wps host (register|update) (logger|console|silent)");
	console.log("mac format: 00:11:22:33:44:55     (asus mac address) [to get it from nvram: nvram get et0macaddr]");
	console.log("wps format: 12345678              (your wps code) [to get it from nvram: nvram get secret_code]");
	console.log("host format: testestest           (your hostname without .asucomm.com)");
	console.log("Program output:");
	console.log("logger   -->  /var/log/messages");
	console.log("console  -->  console");
	console.log("silent   -->  mute output");
	console.log("example to register and update testestest.asuscomm.com:");
	console.log("$0 00:11:22:33:44:55 12345678 testestest register console");
	console.log("$0 00:11:22:33:44:55 12345678 testestest update logger");
	console.log("Launch 'register' the first time to register the new domain with your mac address.");
	console.log("Launch 'update' each 5 minutes (eg: with cron jobs) to keep DNS updated.");
	console.log("ASUSddns script by BigNerd95 (https://github.com/BigNerd95/ASUSddns)");
}

function main(args) {
	if (args.length !== 5) {
		usage();
		return;
	}

	const [mac, key, host, mode, output] = args;
	const user = stripDotsColons(mac);
	const fullHost = `${host}.asuscomm.com`;

	getWanIP((wanIP) => {
		if (!wanIP) {
			log(output, "No internet connection, cannot check.");
			return;
		}

		const password = calculatePassword(fullHost, wanIP, key);

		if (mode === 'update') {
			isDnsUpdated(fullHost, wanIP, (updated) => {
				if (updated) {
					log(output, "Domain already updated.");
					return;
				}

				asusRequest(user, password, fullHost, wanIP, mode, (statusCode) => {
					const res = codeToString(mode, statusCode);
					log(output, res);
				});
			});
		} else if (mode === 'register') {
			asusRequest(user, password, fullHost, wanIP, mode, (statusCode) => {
				const res = codeToString(mode, statusCode);
				log(output, res);
			});
		} else {
			log(output, "Unknown action! Allowed action: register or update");
		}
	});
}

// Run the script with process arguments
main(process.argv.slice(2));
```

### java version

> GPT converted from the above JavaScript code. maybe not exactly the same, but it should work.

```java
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
```
