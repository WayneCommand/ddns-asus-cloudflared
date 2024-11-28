/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {Cloudflared} from "./cloudflared";
import {AsusComm} from "./asuscomm";
import {RateLimiter} from "./rate-limiter";

// Export a default object containing scheduled handlers
export default {
	async scheduled(event, env, ctx) {
		ctx.waitUntil(doSomeTaskOnASchedule(env));
	},

	async fetch(event, env, ctx) {
		// await doSomeTaskOnASchedule(env);

		const limiter = new RateLimiter(1, 30, env.DDNS_STORE);
		const key = 'limiter:test';

		if (await limiter.tryRemoveToken(key)) {
			console.log('Action allowed');
			return Response.json({status: "Action allowed"})
		} else {

			console.log('Rate limit exceeded');
			return Response.json({status: "Rate limit exceeded"})
		}
	}
};


async function doSomeTaskOnASchedule(env) {
	const asuscomm = new AsusComm({
		mac: env.ROUTER_MAC,
		wps: env.ROUTER_WPS
	});
	const cloudflared = new Cloudflared({
		accountId: env.CLOUDFLARE_ACCOUNT_ID,
		apiKey: env.CLOUDFLARE_API_TOKEN,
		notifyKey: env.NOTIFY_TOKEN
	})
	const limiter = new RateLimiter(1, 30 * 60, env.DDNS_STORE);

	// 1. 获取 ddns 的ipc
	let current_ddns_ip = await cloudflared.resolve(env.DDNS_DOMAIN);
	console.log("current ddns ip: " + current_ddns_ip);
	if (!current_ddns_ip) {
		console.error("DDNS DOMAIN INVALID, ABORT.")
		return
	}
	// 2. 获取cloudflared client ip
	let connector_ip = await cloudflared.connectorIP(env.CLOUDFLARE_TUNNEL_ID);
	console.log("current connector ip: " + connector_ip);
	if (!connector_ip) {
		console.error("IP INVALID, ABORT.")
		return
	}

	// 3. 比较ip，如果一样就跳过更新
	if (current_ddns_ip === connector_ip) {
		console.log("IP NOT CHANGED, SKIP UPDATE")
		return
	}

	// 3.5 如果不一样 对更新的IP 实施限流，避免重复更新 (30 min)
	const key = `limiter:ip:${connector_ip}`;
	if (!await limiter.tryRemoveToken(key)) {
		console.log("The request was updated, SKIP UPDATE")
		return
	}

	// 4. 更新 ddns 的ip
	await asuscomm.update(env.DDNS_DOMAIN, connector_ip);

	// 5. 发送通知给我
	await cloudflared.notification(connector_ip);
}

