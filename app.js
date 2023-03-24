const { got, Options } = require("got-cjs");
const CryptoJS = require("crypto-js");
const vm = require("vm");
const h5p = require("html5parser");
const express = require("express");
const app = express();
const fs = require("fs");

const PORT = process.env.PORT || 8080;
const IS_HTTPS = process.env.IS_HTTPS || true;

const gotOpts = new Options({
	throwHttpErrors: false
});

/*
function cors(url) {
	return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
}
*/

function sanitize(text) {
	return text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "");
}

app.get("/robots.txt", async (req, res) => {
	try {
		res.status(200);
		res.type("text/plain");
		res.send("Sitemap: http" + (IS_HTTPS ? "s" : "") + "://" + req.headers.host + "/sitemap_membed1.com--recommended-series_anihdplay.com--popular_asianhdplay.pro--popular_animeid.live--popular_membed1.com_anihdplay.com_asianhdplay.pro_animeid.live.txt");
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.get("/sitemap_*.txt", async (req, res) => {
	try {
		const urls = req.url.slice(9, -4).split("_");
		const sitemap = [];
		for (let i = 0; i < urls.length; i++) {
			const dashDashInd = urls[i].indexOf("--");
			let baseUrl = dashDashInd == -1 ? urls[i] : urls[i].slice(0, dashDashInd);
			let lowerBaseUrl = baseUrl.toLowerCase();
			let tmp = lowerBaseUrl.startsWith("https://") || lowerBaseUrl.startsWith("http://");
			if (tmp) {
				tmp = 2;
			} else if (lowerBaseUrl.startsWith("//")) {
				baseUrl = "https:" + baseUrl;
				tmp = -4;
			} else if (lowerBaseUrl.startsWith("://")) {
				baseUrl = "https" + baseUrl;
				tmp = -3;
			} else {
				baseUrl = "https://" + baseUrl;
				tmp = -6;
			}
			urls[i] = baseUrl + (dashDashInd == -1 ? "" : ("/" + urls[i].slice(baseUrl.length + tmp)));
			const t = await got(urls[i], {
				headers: {
					"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"accept-language": "en-US,en;q=0.9",
					"cache-control": "no-cache",
					"pragma": "no-cache",
					"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
					"sec-ch-ua-mobile": "?0",
					"sec-ch-ua-platform": "\"Windows\"",
					"sec-fetch-dest": "document",
					"sec-fetch-mode": "navigate",
					"sec-fetch-site": "none",
					"sec-fetch-user": "?1",
					"upgrade-insecure-requests": "1"
				}
			}, gotOpts).text();
			const parsed = h5p.parse(t, {
				setAttributeMap: true
			});
			h5p.walk(parsed, {
				enter: (node, parent) => {
					if (parent == null) return;
					if (parent.type == h5p.SyntaxKind.Tag && parent.name == "ul" && "class" in parent.attributeMap && parent.attributeMap.class.value.value == "listing items" && node.type == h5p.SyntaxKind.Tag && node.name == "li" && Array.isArray(node.body)) {
						h5p.walk(node.body, {
							enter: node2 => {
								if (node2.type == h5p.SyntaxKind.Tag && node2.name == "a" && "href" in node2.attributeMap) {
									sitemap.push("http" + (IS_HTTPS ? "s" : "") + "://" + req.headers.host + "/watch?v=" + Buffer.from(baseUrl + node2.attributeMap.href.value.value).toString("base64"));
								}
							}
						});
					}
				}
			});
		}
		res.status(200);
		res.type("text/plain");
		res.send(sitemap.join("\n"));
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.get("/watch.html", async (req, res) => {
	try {
		res.redirect(307, "/");
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

const watchPage = fs.readFileSync("web/watch.html", "utf-8");

app.use("/", express.static("web"));

app.get("/watch", async (req, res) => {
	try {
		if (!req.query.v) {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		let url = Buffer.from(req.query.v, "base64").toString("utf-8");
		let tmp = url.toLowerCase();
		if (!tmp.startsWith("http://") && !tmp.startsWith("https://")) {
			if (url.startsWith("://")) {
				url = "https" + url;
			} else if (url.startsWith("//")) {
				url = "https:" + url;
			} else {
				url = "https://" + url;
			}
		}
		const gd = url.includes("/player.php?");
		const streaming = url.includes("/streaming.php?");
		const t = await got(url, {
			headers: {
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"pragma": "no-cache",
				"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Windows\"",
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"sec-fetch-user": "?1",
				"upgrade-insecure-requests": "1"
			}
		}, gotOpts).text();
		const parsed = h5p.parse(t, {
			setAttributeMap: true
		});
		let title = null;
		h5p.walk(parsed, {
			enter: (node, parent) => {
				if (title != null) return;
				if (node.type != h5p.SyntaxKind.Tag) return;
				if (gd || streaming) {
					if (node.name == "title" && Array.isArray(node.body) && node.body.length > 0 && node.body[0].type == h5p.SyntaxKind.Text) {
						title = node.body[0].value.trim();
						if (streaming) {
							title = title.slice(6);
						}
					}
				} else {
					if (parent == null) return;
					if (parent.type == h5p.SyntaxKind.Tag && parent.name == "div" && "class" in parent.attributeMap && parent.attributeMap.class.value.value == "video-details" && node.type == h5p.SyntaxKind.Tag && node.name == "span" && "class" in node.attributeMap && node.attributeMap.class.value.value == "date" && Array.isArray(node.body)) {
						title = node.body[0].value.trim();
					}
				}
			}
		});
		if (title == null) {
			res.status(404);
			res.type("text/plain");
			res.send("404 not found");
			return;
		}
		const eInd = url.indexOf("?e=");
		if (eInd != -1) {
			title += " Episode " + url.slice(eInd + 3).replace(/[^\d]+/g, "");
		}
		res.status(200);
		res.type("text/html");
		res.send(watchPage.replace(/\${TITLE}/gi, sanitize(title)).replace(/\${ID}/gi, sanitize(req.query.v)).replace(/\${URL}/gi, sanitize("/" + (gd ? "gd" : "") + "dl/" + url)));
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.get([ "/gdsearch", "/gdsdl" ], async (req, res) => {
	try {
		if (!req.query.q || !req.query.t || !req.query.s) {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		let type = req.query.t.toLowerCase();
		if (type == "anime") {
			type = "animes";
		} else if (type == "movies") {
			type = "movie";
		} else if (type == "dramas") {
			type = "drama";
		} else if (type == "serie") {
			type = "series";
		}
		const rj = await got("https://api." + req.query.s + "/v1/" + type + "/search?title=" + encodeURIComponent(req.query.q), {}, gotOpts).json();
		if (!rj) {
			res.status(404);
			res.type("text/plain");
			res.send("404 not found");
			return;
		}
		const j = {};
		for (const item of rj) {
			j[item.title] = type == "movie" ? "http://database." + req.query.s + "/player.php?imdb=" + item.imdb : item.player_url.replace(/\\\//g, "/").replace(/{insert \d+ - \d+}$/, req.query.e || item.total_episode);
			if (req.url.startsWith("/gdsdl")) {
				res.redirect(307, "/gddl/" + j[item.title]);
				return;
			}
		}
		if (req.url.startsWith("/gdsdl")) {
			res.status(404);
			res.type("text/plain");
			res.send("404 not found");
			return;
		}
		res.status(200);
		res.type("application/json");
		res.send(JSON.stringify(j, null, "\t"));
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.get([ "/gddl/:prot\\://:url/player.php", "/gddl///:url/player.php", "/gddl/:url/player.php" ], async (req, res) => {
	try {
		if (!req.params.url) {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		const endpoint = ((req.params.prot || "https") + "://" + req.params.url).split("/", 3).join("/");
		const t = await got(endpoint + "/player.php" + req.url.slice(req.url.indexOf("?")), {
			headers: {
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"pragma": "no-cache",
				"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Windows\"",
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"sec-fetch-user": "?1",
				"upgrade-insecure-requests": "1"
			}
		}, gotOpts).text();
		const parsed = h5p.parse(t, {
			setAttributeMap: true
		});
		let theUrl = null;
		h5p.walk(parsed, {
			enter: (node, parent) => {
				if (node.type != h5p.SyntaxKind.Tag) return;
				if (node.name == "li" && Array.isArray(node.body) && node.body.length > 0 && node.body[0].type == h5p.SyntaxKind.Text && node.body[0].value == "Mirror Server" && parent.type == h5p.SyntaxKind.Tag && parent.name == "a" && "href" in parent.attributeMap) {
					theUrl = parent.attributeMap.href.value.value;
				}
			}
		});
		if (theUrl == null) {
			res.status(404);
			res.type("text/plain");
			res.send("404 not found");
			return;
		}
		if (theUrl.startsWith("//")) {
			theUrl = "https:" + theUrl;
		}
		if (theUrl.startsWith("https://vidstreaming.io")) {
			theUrl = "https://anihdplay.com" + theUrl.slice(23);
		}
		res.redirect(307, "/dl/" + theUrl);
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.get([ "/search", "/sdl" ], async (req, res) => {
	try {
		if (!req.query.q || !req.query.s) {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		let endpoint = req.query.s;
		let tmp = null;
		if (endpoint.startsWith("//")) {
			endpoint = "https:" + endpoint;
		} else if (!(tmp = endpoint.toLowerCase()).startsWith("https://") && !tmp.startsWith("http://")) {
			endpoint = "https://" + endpoint;
		}
		endpoint = endpoint.split("/", 3).join("/");
		const t = (await got(endpoint + "/ajax-search.html?keyword=" + encodeURIComponent(req.query.q) + "&id=-1", {
			headers: {
				"accept": "application/json, text/javascript, */*; q=0.01",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"pragma": "no-cache",
				"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Windows\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-origin",
				"x-requested-with": "XMLHttpRequest",
				"Referer": endpoint + "/",
				"Referrer-Policy": "strict-origin-when-cross-origin"
			}
		}, gotOpts).json()).content;
		const parsed = h5p.parse(t, {
			setAttributeMap: true
		});
		let firstUrl = null;
		const j = {};
		h5p.walk(parsed, {
			enter: node => {
				if (node.type == h5p.SyntaxKind.Tag && node.name == "a" && "href" in node.attributeMap && Array.isArray(node.body)) {
					j[node.body[0].value] = endpoint + node.attributeMap.href.value.value;
					if (firstUrl == null) {
						firstUrl = j[node.body[0].value];
					}
				}
			}
		});
		if (req.url.startsWith("/sdl")) {
			if (firstUrl == null) {
				res.status(404);
				res.type("text/plain");
				res.send("404 not found");
			} else {
				res.redirect(307, "/dl/" + firstUrl + (req.query.e ? "?e=" + req.query.e : ""));
				return;
			}
		} else {
			res.status(200);
			res.type("application/json");
			res.send(JSON.stringify(j, null, "\t"));
		}
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.get([ "/dl/:prot\\://:url/:path/:name", "/dl///:url/:path/:name", "/dl/:url/:path/:name" ], async (req, res) => {
	try {
		if (!req.params.url) {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		if (req.params.path != "videos" && req.params.path != "ver") {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		const endpoint = ((req.params.prot || "https") + "://" + req.params.url).split("/", 3).join("/");
		if (!req.params.name) {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		const fardUrl = endpoint + "/" + req.params.path + "/" + req.params.name;
		if (req.query.e && !isNaN(+req.query.e)) {
			const ep = await got(fardUrl, {
				headers: {
					"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"accept-language": "en-US,en;q=0.9",
					"cache-control": "no-cache",
					"pragma": "no-cache",
					"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
					"sec-ch-ua-mobile": "?0",
					"sec-ch-ua-platform": "\"Windows\"",
					"sec-fetch-dest": "document",
					"sec-fetch-mode": "navigate",
					"sec-fetch-site": "none",
					"sec-fetch-user": "?1",
					"upgrade-insecure-requests": "1"
				}
			}, gotOpts).text();
			const epp = h5p.parse(ep, {
				setAttributeMap: true
			});
			const eps = [];
			h5p.walk(epp, {
				enter: (node, parent) => {
					if (parent == null) return;
					if (parent.type == h5p.SyntaxKind.Tag && parent.name == "ul" && "class" in parent.attributeMap && parent.attributeMap.class.value.value == "listing items lists" && node.type == h5p.SyntaxKind.Tag && node.name == "li" && Array.isArray(node.body)) {
						h5p.walk(node.body, {
							enter: node2 => {
								if (node2.type == h5p.SyntaxKind.Tag && node2.name == "a" && "href" in node2.attributeMap) {
									eps.unshift(node2.attributeMap.href.value.value);
								}
							}
						});
					}
				}
			});
			if (eps.length > 0) {
				res.redirect(307, "/dl/" + endpoint + eps[Math.max(1, Math.min(eps.length, +req.query.e)) - 1]);
				return;
			}
		}
		const t = await got(fardUrl, {
			headers: {
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"pragma": "no-cache",
				"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Windows\"",
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"sec-fetch-user": "?1",
				"upgrade-insecure-requests": "1"
			}
		}, gotOpts).text();
		if (t.startsWith("404")) {
			res.status(404);
			res.type("text/plain");
			res.send("404 not found");
			return;
		}
		const parsed = h5p.parse(t, {
			setAttributeMap: true
		});
		let u = null;
		h5p.walk(parsed, {
			enter: node => {
				if (node.type == h5p.SyntaxKind.Tag && node.name == "iframe" && Array.isArray(node.body)) {
					if ("src" in node.attributeMap) {
						u = node.attributeMap.src.value.value;
					}
				}
			}
		});
		if (u == null) {
			res.status(500);
			res.type("text/plain");
			res.send("500 internal server error");
			return;
		}
		res.redirect(307, "/dl/" + u);
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.get([ "/dl/:prot\\://:url/streaming.php", "/dl///:url/streaming.php", "/dl/:url/streaming.php" ], async (req, res) => {
	try {
		if (!req.params.url) {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		const endpoint = ((req.params.prot || "https") + "://" + req.params.url).split("/", 3).join("/");
		if (!req.query.id) {
			res.status(400);
			res.type("text/plain");
			res.send("400 invalid request");
			return;
		}
		const t = await got(endpoint + "/streaming.php?id=" + req.query.id, {
			headers: {
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"pragma": "no-cache",
				"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Windows\"",
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"sec-fetch-user": "?1",
				"upgrade-insecure-requests": "1"
			}
		}, gotOpts).text();
		if (t.startsWith("SQLSTATE")) {
			res.status(404);
			res.type("text/plain");
			res.send("404 not found");
			return;
		}
		const parsed = h5p.parse(t, {
			setAttributeMap: true
		});
		let playerUrl = null;
		let crypto = null;
		let bodyClass = null;
		let divClass = null;
		let div2Class = null;
		let backupUrls = [];
		h5p.walk(parsed, {
			enter: node => {
				if (node.type != h5p.SyntaxKind.Tag) return;
				let k = null;
				if (node.name == "script") {
					if (!("data-name" in node.attributeMap)) return;
					if (((k = node.attributeMap["data-name"].value.value) == "crypto" || k == "episode") && "data-value" in node.attributeMap) {
						crypto = node.attributeMap["data-value"].value.value;
					} else if (k == "ts") {
						playerUrl = node.attributeMap.src.value.value;
					}
				} else if ((node.name == "body" || node.name == "div")) {
					if ("class" in node.attributeMap) {
						if ((k = node.attributeMap.class.value.value).includes("container-")) {
							if (node.name == "body") {
								bodyClass = k;
							} else {
								divClass = k;
							}
						} else if (node.name == "div" && k.includes("videocontent-")) {
							div2Class = k;
						}
					}
				} else if (node.name == "li" && "class" in node.attributeMap && node.attributeMap.class.value.value == "linkserver" && "data-video" in node.attributeMap && Array.isArray(node.body)) {
					backupUrls[node.body[0].value] = node.attributeMap["data-video"].value.value;
				}
			}
		});
		if (crypto == null || playerUrl == null) {
			const v = Object.values(backupUrls);
			if (v.length > 0) {
				if ("Doodstream" in backupUrls) {
					res.redirect(307, backupUrls["Doodstream"]);
					return;
				}
				/*
				if ("Xstreamcdn" in backupUrls) {
					res.redirect(307, cors((await got(cors(backupUrls["Xstreamcdn"].replace("/v/", "/api/source/")), {
						"headers": {
							"accept": "*\/*",
							"accept-language": "en-US,en;q=0.9",
							"cache-control": "no-cache",
							"pragma": "no-cache",
							"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
							"sec-ch-ua-mobile": "?0",
							"sec-ch-ua-platform": "\"Windows\"",
							"sec-fetch-dest": "empty",
							"sec-fetch-mode": "cors",
							"sec-fetch-site": "same-origin",
							"x-requested-with": "XMLHttpRequest",
							"Referer": backupUrls["Xstreamcdn"].replace("/v/", "/f/"),
							"Referrer-Policy": "strict-origin-when-cross-origin"
						},
						"method": "POST"
					}, gotOpts).json()).data[0].file));
					return;
				}
				*/
				res.redirect(307, v[Math.floor(Math.random() * v.length)]);
			} else {
				res.status(500);
				res.type("text/plain");
				res.send("500 internal server error");
			}
			return;
		}
		const scr = await got(playerUrl, {
			headers: {
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"pragma": "no-cache",
				"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Windows\"",
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"sec-fetch-user": "?1",
				"upgrade-insecure-requests": "1"
			}
		}, gotOpts).text();
		var doneYet = false;
		const o = function(ae) {
			o.getJSON = function(u, c) {
				got(endpoint + u, {
					headers: {
						"accept": "application/json, text/javascript, */*; q=0.01",
						"accept-language": "en-US,en;q=0.9",
						"cache-control": "no-cache",
						"pragma": "no-cache",
						"sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
						"sec-ch-ua-mobile": "?0",
						"sec-ch-ua-platform": "\"Windows\"",
						"sec-fetch-dest": "empty",
						"sec-fetch-mode": "cors",
						"sec-fetch-site": "same-origin",
						"x-requested-with": "XMLHttpRequest",
						"Referer": endpoint + "/streaming.php?id=" + req.query.id,
						"Referrer-Policy": "unsafe-url"
					}
				}, gotOpts).json().then(j => {
					c(j);
				});
			};
			return {
				data: function(k) {
					return crypto;
				},
				attr: function(k) {
					const h = ae.toLowerCase();
					if (h.startsWith("body")) {
						return bodyClass;
					}
					if (h.startsWith("div")) {
						if (h.includes("container")) {
							return divClass;
						} else {
							return div2Class;
						}
					}
					return "";
				},
				get ready() {
					if (doneYet) return;
					doneYet = true;
					return ctx.doFard;
				}
			};
		};
		const ctx = {
			"$": o,
			res: function(...a) {
				console.log(...a);
			},
			CryptoJS: CryptoJS,
			clearTimeout: function() {},
			setTimeout: function() {},
			clearInterval: function() {},
			setInterval: function() {},
			navigator: {},
			window: {},
			document: {
				documentElement: {}
			},
			jQuery: function() {},
			jwplayer: function() {
				return {
					setup: function(ss) {
						ss = ss.sources;
						if (ss.length == 0) {
							res.status(404);
							res.type("text/plain");
							res.send("404 not found");
							return;
						}
						let c = null;
						for (const s of ss) {
							if (s.label.toLowerCase() == "auto") {
								c = s.file;
								break;
							}
						}
						if (c == null) {
							c = ss[ss.length - 1].file;
						}
						res.redirect(307, c);
					},
					on: function() {},
					addButton: function() {}
				}
			}
		};
		vm.runInNewContext("try {\nthis.doFard = function(a) {\na();\n}\n" + scr + "\n} catch(e) {\n//res(e);\n}", ctx);
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.get("*", (req, res) => {
	try {
		res.redirect(307, "/");
	} catch(e) {
		res.status(500);
		res.type("text/plain");
		res.send("500 internal server error");
	}
});

app.listen(PORT, () => {
	console.log("listening");
});