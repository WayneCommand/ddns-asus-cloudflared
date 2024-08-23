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
