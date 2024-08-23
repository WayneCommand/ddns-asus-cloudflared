# DDNS updator on cloudflared and asuscomm

## AsusComm

```shell
curl -H "User-Agent: ez-update-3.0.11b5 unknown [] (by Angus Mackay)" -H "Authorization: Basic {basic_auth}" \
'http://ns1.asuscomm.com/ddns/update.jsp?hostname=waynecmd.asuscomm.com&myip=116.232.100.101'
```

### Keys
- mac = (asus mac address) [to get it from nvram: nvram get et0macaddr]
- wps = (your wps code) [to get it from nvram: nvram get secret_code]
- host = custom .asuscomm.com

### Algorithm

- user = mac
- password = md5 -hmac(host+wanIP, wps), origin: `echo $(echo -n "waynecmdasuscommcom116232100110" | openssl md5 -hmac "03065678" 2>/dev/null | cut -d ' ' -f 2 | tr 'a-z' 'A-Z')
`
- auth = http_basic(user:password)
- url = http://ns1.asuscomm.com/ddns/update.jsp?hostname=$host&myip=$wanIP

### refs

- https://iplookup.asus.com/nslookup.php
- https://github.com/BigNerd95/ASUSddns

## Cloudflared


### Connector IP
```shell
https://api.cloudflare.com/client/v4/accounts/{account}/cfd_tunnel/{connector_id}
```

### DNS Query
```shell
curl -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=example.com&type=A' | jq .
```

**refs**

- https://superuser.com/questions/1532975/how-to-query-for-dns-over-https-dns-over-tls-using-command-line
- https://github.com/gethomepage/homepage/blob/main/src/utils/proxy/handlers/credentialed.js#L11
