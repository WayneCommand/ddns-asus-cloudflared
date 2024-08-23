import CryptoJS from 'crypto-js';

class AsusComm {

	/**
	 * 更新dns
	 * @param domian		原始的domain。 xxxx.asuscomm.com
	 * @param ip			原始的ip。
	 * @param options		包含 MAC，WPS
	 * @returns {Promise<*>}
	 */
	async update(domian, ip, options) {
		console.log("ready to update asus ddns.")

		let response = await fetch(`http://ns1.asuscomm.com/ddns/update.jsp?hostname=${domian}&myip=${ip}`, {
			method: "GET",
			headers: {
				'User-Agent': 'ez-update-3.0.11b5 unknown [] (by Angus Mackay)',
				'Authorization': basicAuth(user(options.MAC), password(domian, ip, options.WPS)),
			}
		});

		console.log(response);
	}

	/**
	 * 限制器（保险丝），不要让太多请求同时更新
	 * @param ip		客户端将要更新的IP
	 * @param store		IP KV存储
	 * @returns {Promise<void>}
	 */
	async fuse(ip, store) {
		// IP 不能为空
		if (!ip) return false;

		// 1724377555026
		// Milliseconds (1/1,000 second)
		let lastTS = await store.get(ip);
		let currTS = Date.now();

		// 如果上次更新时间有，检查时间间隔 是否大于 15 分钟
		if (lastTS) {
			// 如果小于 15 分钟
			if (currTS - lastTS < 15 * 60 * 1000) return false
		}

		// 如果 大于 15 分钟，或是第一次更新，就 put 记录，并通行
		await store.put(ip, currTS);
		return true;
	}

	async reg(accountId, connectorId, apiKey) {

	}




}


/**
 * 去除点号和冒号
 * @param str
 * @returns {*}
 */
function stripDotsColons(str) {
	return str.replace(/[.:]/g, '');
}

function user(mac) {
	return stripDotsColons(mac);
}

function password(domain, ip, wps) {
	const d = stripDotsColons(domain)
	const i = stripDotsColons(ip)

	let hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.MD5, wps)
		.update(d + i)
		.finalize();

	return CryptoJS.enc.Hex.stringify(hmac).toUpperCase();
}

function basicAuth(user, password) {
	let auth = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');

	console.log(auth);
	return auth;
}

const asus = new AsusComm();


export default asus;
