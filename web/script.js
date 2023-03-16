const endpoints = {
	"membed1.com": "Movies and Shows",
	"anihdplay.com": "Anime",
	"asianhdplay.pro": "K-Drama",
	"animeid.live": "Anime (Spanish)"
};

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

const useHls = !media.canPlayType("application/vnd.apple.mpegurl") && Hls.isSupported();

let hls = null;

for (const endpoint in endpoints) {
	const card = document.createElement("div");
	card.className = "card col";
	const title = document.createElement("h2");
	title.className = "card-title";
	title.innerText = endpoints[endpoint];
	card.appendChild(title);
	const span = document.createElement("span");
	span.innerText = "Provided by ";
	card.appendChild(span);
	const link = document.createElement("a");
	link.href = "https://" + endpoint;
	link.className = "hyperlink-underline font-weight-bold";
	link.target = "_blank";
	link.innerText = endpoint;
	card.appendChild(link);
	endpointCards.appendChild(card);
	endpointBox.add(new Option(endpoints[endpoint] + " (" + endpoint + ")", endpoint));
}

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
};

searchForm.onsubmit = function() {
	loadVidUrl("/sdl?s=" + encodeURIComponent(endpointBox.value) + "&q=" + encodeURIComponent(searchBox.value) + (episodeBox.value ? "&e=" + episodeBox.value : ""));
	window.location.href = "#video";
	return false;
};

function loadVidUrl(vidSrc) {
	closeMediaBtn.onclick();
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
		fetch("/search?s=" + encodeURIComponent(endpointBox.value) + "&q=" + encodeURIComponent(lastSearch)).then(d => d.json()).then(j => {
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
					loadVidUrl("/dl/" + j[t] + (episodeBox.value ? "?e=" + episodeBox.value : ""));
				};
				searchSuggestBox.appendChild(a);
			}
		}).catch(e => {
			searchSuggestBox.innerHTML = "";
		});
	}, 500);
};
