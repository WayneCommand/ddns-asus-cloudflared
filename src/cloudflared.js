class Cloudflared {

	/**
	 * 解析域名的IP
	 * @param domian		     域名
	 * @returns {Promise<*>}	IP
	 */
	async resolve(domian) {
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
        }
	}


	/**
	 * 获取连接器客户端的原始IP
	 * @param accountId			账户ID
	 * @param connectorId		连接器ID
	 * @param apiKey			API KEY
	 * @returns {Promise<*>}	IP
	 */
	async connectorIP(accountId, connectorId, apiKey) {
		let response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel/${connectorId}`, {
			method: "GET",
            headers: {
				'accept': `application/json`,
				"Authorization": `Bearer ${apiKey}`
            }
		})

		let body = await response.json();

		if (body.success) {
			let conn = body.result.connections
			// 取最新（最后一个）的原始ip
			return conn[conn.length - 1].origin_ip;
		}
	}

	async notification(ip, token) {
		await fetch('https://notify.waynecommand.com/wechat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			body: JSON.stringify({
				title: 'DDNS 更新成功',
				content: 'DDNS 更新成功: ' + ip
			})
		})
	}

}

const cloudflared = new Cloudflared();

export default cloudflared;
