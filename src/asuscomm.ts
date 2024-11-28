import CryptoJS from 'crypto-js';

class AsusComm {

	wps: string;
	mac: string;

	constructor(options: AsusOptions) {
		this.wps = options.wps;
		this.mac = options.mac;
	}

	/**
	 * 更新dns
	 * @param domain		原始的domain。 xxxx.asuscomm.com
	 * @param ip			原始的ip。
	 * @returns {Promise<*>}
	 */
	async update(domain: string, ip: string): Promise<any> {
		console.log("ready to update asus ddns.")

		let response = await fetch(`http://ns1.asuscomm.com/ddns/update.jsp?hostname=${domain}&myip=${ip}`, {
			method: "GET",
			headers: {
				'User-Agent': 'ez-update-3.0.11b5 unknown [] (by Angus Mackay)',
				'Authorization': basicAuth(user(this.mac), password(domain, ip, this.wps)),
			}
		});

		console.log(`AsusComm Resp: ${JSON.stringify(response)}`);
	}

	async reg(accountId, connectorId, apiKey) {

	}

}


/**
 * 去除点号和冒号
 * @param str
 * @returns {*}
 */
function stripDotsColons(str: string): string {
	return str.replace(/[.:]/g, '');
}

function user(mac: string): string {
	return stripDotsColons(mac);
}

function password(domain: string, ip: string, wps: string): string {
	const d = stripDotsColons(domain)
	const i = stripDotsColons(ip)

	let hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.MD5, wps)
		.update(d + i)
		.finalize();

	return CryptoJS.enc.Hex.stringify(hmac).toUpperCase();
}

function basicAuth(user: string, password: string): string {
	let auth = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');

	console.log(`http auth: ${auth}`);
	return auth;
}

type AsusOptions = {
	mac: string,
	wps: string
}

export {
	AsusComm
}
