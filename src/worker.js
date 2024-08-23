/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import cloudflared from "./cloudflared";
import asuscomm from "./asuscomm";

// Export a default object containing scheduled handlers
export default {
	async scheduled(event, env, ctx) {
		ctx.waitUntil(doSomeTaskOnASchedule(env));
	},

	async fetch(event, env, ctx) {
		ctx.waitUntil(doSomeTaskOnASchedule(env));
		return new Response({status: "ok."})
	}
};


async function doSomeTaskOnASchedule(env) {
	// 1. 获取 ddns 的ipc
	let current_ddns_ip = await cloudflared.resolve(env.DDNS_DOMAIN);
	console.log("current ddns ip: " + current_ddns_ip);
	if (!current_ddns_ip) {
		console.error("DDNS DOMAIN INVALID, ABORT.")
		return
	}
	// 2. 获取cloudflared client ip
	let connector_ip = await cloudflared.connectorIP(env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_CONNECTOR_ID, env.CLOUDFLARE_API_TOKEN);
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

	// 3.5 如果不一样 检查上次该ip的上次更新时间，如果间隔时间太短，也不要更新（improve）
	if (!await asuscomm.fuse(connector_ip, env.DDNS_STORE)) {
		console.log("The request was fused, SKIP UPDATE")
	}


	// 4. 更新 ddns 的ip
	await asuscomm.update(env.DDNS_DOMAIN, connector_ip, {
		MAC: env.ROUTER_MAC,
		WPS: env.ROUTER_WPS
	});

	// 5. 发送通知给我
	await cloudflared.notification(connector_ip, env.NOTIFY_TOKEN);

	console.log("notify push success.")
}

