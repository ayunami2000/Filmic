try {
	if (window.self != window.top) {
		throw "";
	}
} catch (e) {
	document.body.innerHTML = '<h4 class="text-center w-full">You cannot embed this page.</h4>';
	throw "embed fail \uD83E\uDD13";
}

const endpoints = {
	"membed1.com": "Movies and Shows",
	"anihdplay.com": "Anime",
	"asianhdplay.pro": "K-Drama",
	"animeid.live": "Anime (Spanish)"
};

const gdEndpoint = "gdriveplayer.us";

const endpointBox = document.getElementById("endpoint");
const searchForm = document.getElementById("searchform");
const searchBox = document.getElementById("search");
const searchSuggestBox = document.getElementById("searchsuggest");
const media = document.getElementById("media");
const backup = document.getElementById("backup");
const closeMediaBtn = document.getElementById("closemedia");
const episodeBox = document.getElementById("episode");
const prevEpisodeBtn = document.getElementById("prevepisode");
const nextEpisodeBtn = document.getElementById("nextepisode");
const clearSearchBtn = document.getElementById("clearsearch");
const downMediaBtn = document.getElementById("downmedia");
const endpointCards = document.getElementById("endpointcards");
const agreeBtn = document.getElementById("agree");
const prevMediaBtn = document.getElementById("prevmedia");
const nextMediaBtn = document.getElementById("nextmedia");
const embedMediaBtn = document.getElementById("embedmedia");

const useHls = !media.canPlayType("application/vnd.apple.mpegurl") && Hls.isSupported();

let hls = null;

function loadPage(epOffset) {
	if (window.location.search.length > 1) {
		const params = new URLSearchParams(window.location.search.slice(1));
		if (!params.has("gd") || !params.has("dl") || !params.has("q")) {
			return false;
		}
		let vidSrc = "/";
		const gd = !!+params.get("gd");
		if (gd) {
			vidSrc += "gd";
		}
		const dl = !!+params.get("dl");
		const hasE = (gd && dl) ? params.has("episode") : params.has("e");
		const e = (gd && dl) ? params.get("episode") : params.get("e");
		if (dl) {
			vidSrc += "dl/" + params.get("q");
			if (hasE) {
				const newEp = (+e) + epOffset;
				if (newEp > 0) {
					if (vidSrc.includes("?")) {
						vidSrc += "&";
					} else {
						vidSrc += "?";
					}
					vidSrc += "e" + ((gd && dl) ? "pisode" : "") + "=" + encodeURIComponent(newEp);
				}
			} else if (epOffset > 0) {
				if (vidSrc.includes("?")) {
					vidSrc += "&";
				} else {
					vidSrc += "?";
				}
				vidSrc += "e" + ((gd && dl) ? "pisode" : "") + "=1";
			}
		} else {
			if (!params.has("s")) {
				return false;
			}
			if (gd && !params.has("t")) {
				return false;
			}
			vidSrc += "sdl?s=" + encodeURIComponent(params.get("s"));
			if (gd) {
				vidSrc += "&t=" + encodeURIComponent(params.get("t"));
			}
			vidSrc += "&q=" + encodeURIComponent(params.get("q"));
			if (hasE) {
				const newEp = (+e) + epOffset;
				if (newEp > 0) {
					vidSrc += "&e" + ((gd && dl) ? "pisode" : "") + "=" + encodeURIComponent(newEp);
				}
			} else if (epOffset > 0) {
				vidSrc += "&e" + ((gd && dl) ? "pisode" : "") + "=1";
			}
		}
		loadVidUrl(vidSrc);
		return true;
	}
	return false;
}

function addEndpointCard(eu, et) {
	const card = document.createElement("div");
	card.className = "p-card col mx-auto";
	const title = document.createElement("h2");
	title.className = "card-title";
	title.innerText = et;
	card.appendChild(title);
	const span = document.createElement("span");
	span.innerText = "Provided by ";
	card.appendChild(span);
	const link = document.createElement("a");
	link.href = "https://" + eu;
	link.className = "hyperlink-underline font-weight-bold";
	link.target = "_blank";
	link.innerText = eu;
	card.appendChild(link);
	endpointCards.appendChild(card);
}

for (const endpoint in endpoints) {
	addEndpointCard(endpoint, endpoints[endpoint]);
	endpointBox.add(new Option(endpoints[endpoint] + " (" + endpoint + ")", endpoint));
}

addEndpointCard(gdEndpoint, "Extra Search API");
endpointBox.add(new Option("Movies (" + gdEndpoint + ")", "gd_movie"));
endpointBox.add(new Option("Anime (" + gdEndpoint + ")", "gd_animes"));
endpointBox.add(new Option("K-Drama (" + gdEndpoint + ")", "gd_drama"));
endpointBox.add(new Option("Shows (" + gdEndpoint + ")", "gd_series"));

endpointBox.selectedIndex = 0;

endpointBox.onchange = function() {
	lastSearch = "";
	searchBox.oninput();
};

episodeBox.oninput = function() {
	if (episodeBox.value < 1) {
		episodeBox.value = "";
	}
};

prevMediaBtn.onclick = function() {
	loadPage(-1);
};

nextMediaBtn.onclick = function() {
	loadPage(1);
};

prevEpisodeBtn.onclick = function() {
	if (!isNaN(episodeBox.value) && +episodeBox.value > 1) {
		episodeBox.value--;
	} else {
		episodeBox.value = "";
	}
};

nextEpisodeBtn.onclick = function() {
	if (isNaN(episodeBox.value)) {
		episodeBox.value = 1;
	} else {
		episodeBox.value++;
	}
};

clearSearchBtn.onclick = function() {
	searchBox.value = "";
	searchBox.oninput();
};

closeMediaBtn.onclick = function() {
	if(hls != null) {
		hls.detachMedia();
		hls.destroy();
		media.removeAttribute("src");
	}
	media.src = backup.src = "about:blank";
	window.history.pushState({}, "", "/");
};

searchForm.onsubmit = function() {
	if(endpointBox.value.startsWith("gd_")) {
		loadVidUrl("/gdsdl?s=" + encodeURIComponent(gdEndpoint) + "&t=" + encodeURIComponent(endpointBox.value.slice(3)) + "&q=" + encodeURIComponent(searchBox.value) + (episodeBox.value ? "&e=" + episodeBox.value : ""));
	} else {
		loadVidUrl("/sdl?s=" + encodeURIComponent(endpointBox.value) + "&q=" + encodeURIComponent(searchBox.value) + (episodeBox.value ? "&e=" + episodeBox.value : ""));
	}
	window.location.href = "#video";
	return false;
};

function savePage(vidSrc) {
	const gd = vidSrc.startsWith("/gd");
	const dl = vidSrc.startsWith("/dl/") || vidSrc.startsWith("/gddl/");
	const qInd = vidSrc.indexOf("?");
	let ur = "?gd=";
	ur += gd ? 1 : 0;
	ur += "&dl=";
	ur += dl ? 1 : 0;
	if (dl) {
		ur += "&q=";
		let eInd = vidSrc.indexOf("e" + ((gd && dl) ? "pisode" : "") + "=");
		if (eInd != -1) {
			if (qInd == eInd - 1) {
				eInd -= 1;
			} else if (vidSrc.indexOf("&e" + ((gd && dl) ? "pisode" : "") + "=") == eInd - 1) {
				eInd -= 1;
			} else {
				eInd = -1;
			}
		}
		ur += encodeURIComponent(vidSrc.slice(vidSrc.indexOf("/", 1) + 1, eInd == -1 ? undefined : eInd));
		ur += eInd == -1 ? "" : "&" + vidSrc.slice(eInd + 1);
	} else {
		ur += qInd == -1 ? "" : "&" + vidSrc.slice(qInd + 1);
	}
	window.history.pushState({}, "", ur);
}

function loadVidUrl(vidSrc) {
	closeMediaBtn.onclick();
	savePage(vidSrc);
	if (vidSrc.startsWith("/dl/") || vidSrc.startsWith("/gddl/")) {
		embedMediaBtn.href = "/watch?v=" + btoa(vidSrc.slice(vidSrc.indexOf("/", 1) + 1));
		embedMediaBtn.classList.remove("d-none");
	} else {
		embedMediaBtn.classList.add("d-none");
	}
	backup.classList.add("d-none");
	media.classList.remove("d-none");
	if(useHls) {
		media.onerror = function() {
			media.onerror = function() {};
			if(hls != null) {
				hls.detachMedia();
				hls.destroy();
				media.removeAttribute("src");
			}
			hls = new Hls();
			hls.on(Hls.Events.ERROR, function(event, data) {
				if (data.fatal) {
					media.classList.add("d-none");
					backup.classList.remove("d-none");
					backup.src = vidSrc;
				}
			});
			hls.loadSource(vidSrc);
			hls.attachMedia(media);
		};
	}
	media.src = downMediaBtn.href = vidSrc;
};

let searchTimeout = -1;
let lastSearch = searchBox.value;
searchBox.oninput = function() {
	if (lastSearch == searchBox.value) {
		return;
	}
	lastSearch = searchBox.value;
	if (searchTimeout != -1) {
		clearTimeout(searchTimeout);
	}
	if (lastSearch == "") {
		searchSuggestBox.innerHTML = "";
		return;
	}
	searchTimeout = setTimeout(function() {
		fetch((endpointBox.value.startsWith("gd_") ? "/gdsearch?s=" + encodeURIComponent(gdEndpoint) + "&t=" + encodeURIComponent(endpointBox.value.slice(3)) : ("/search?s=" + encodeURIComponent(endpointBox.value))) + "&q=" + encodeURIComponent(lastSearch)).then(d => d.json()).then(j => {
			searchSuggestBox.innerHTML = "";
			if (Object.keys(j).length > 0) {
				const h = document.createElement("h6");
				h.className = "dropdown-header";
				h.innerText = "Suggestions";
				const hd = document.createElement("span");
				hd.className = "font-weight-normal";
				hd.innerText = " (Ignore Episode)";
				h.appendChild(hd);
				searchSuggestBox.appendChild(h);
			}
			for(const t in j) {
				const a = document.createElement("a");
				a.href = "#video";
				a.className = "dropdown-item";
				a.innerText = t;
				a.onclick = function() {
					if(endpointBox.value.startsWith("gd_")) {
						loadVidUrl("/gddl/" + (episodeBox.value ? j[t].slice(0, j[t].lastIndexOf("episode=") + 8) + episodeBox.value : j[t]));
					} else {
						loadVidUrl("/dl/" + j[t] + (episodeBox.value ? "?e=" + episodeBox.value : ""));
					}
				};
				searchSuggestBox.appendChild(a);
			}
		}).catch(e => {
			searchSuggestBox.innerHTML = "";
		});
	}, 500);
};

agreeBtn.onclick = function(e) {
	agreeBtn.onclick = function() {};
	if (loadPage(0)) {
		e.preventDefault();
		window.location.href = "#video";
	}
};