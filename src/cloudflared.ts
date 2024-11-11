class Cloudflared {

	accountId: string;
	apiKey: string;
	notifyKey: string;

	constructor(options: CloudflaredOptions) {
		this.accountId = options.accountId;
		this.apiKey = options.apiKey;
		this.notifyKey = options.notifyKey;
	}

	/**
	 * 解析域名的IP
	 * @param domian		     域名
	 * @returns {Promise<*>}	IP
	 */
	async resolve(domian: string): Promise<string> {
		let response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domian}&type=A`, {
			method: "GET",
			headers: {
				'accept': `application/dns-json`,
			}
		});

		let body = await response.json();

		// this is dns resolved ip
		if (body.Answer && body.Answer.length > 0) {
            return body.Answer[0].data;
        } else {
			return "";
		}
	}


	/**
	 * 获取连接器客户端的原始IP
	 * @param tunnelId		通道
	 * @returns {Promise<*>}	IP
	 */
	async connectorIP(tunnelId: string): Promise<string> {
		let response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/cfd_tunnel/${tunnelId}`, {
			method: "GET",
            headers: {
				'accept': `application/json`,
				"Authorization": `Bearer ${this.apiKey}`
            }
		})

		let body = await response.json();

		if (body.success) {
			let conn = body.result.connections
			// 取最新（最后一个）的原始ip
			return conn[conn.length - 1].origin_ip;
		}else {
			return "";
		}
	}

	async notification(ip: string): Promise<void> {
		await fetch('https://notify.waynecommand.com/wechat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + this.notifyKey
			},
			body: JSON.stringify({
				title: 'DDNS 更新成功',
				content: 'DDNS 更新成功: ' + ip
			})
		})
		console.log("notify push success.")
	}

}

type CloudflaredOptions = {
	accountId: string,
	apiKey: string,
	notifyKey: string
}

export {
	Cloudflared
}
