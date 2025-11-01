// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Grab UI nodes
const getImageBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');

// Cache fetched data so repeated clicks don't repeatedly request the CDN
let cachedApod = null;

// Small helper to show the placeholder / loading / error messages
function showPlaceholder(icon, message) {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">${icon}</div>
			<p>${message}</p>
		</div>
	`;
}

// Try to convert known video URLs to embeddable URLs (YouTube, youtu.be, Vimeo)
function getEmbeddableUrl(url) {
	if (!url) return null;
	try {
		const u = new URL(url);
		const host = u.hostname.toLowerCase();

		// YouTube watch links -> /embed/VIDEOID
		if (host.includes('youtube.com')) {
			// If already an embed URL, return as-is
			if (u.pathname.startsWith('/embed/')) return url;
			const v = u.searchParams.get('v');
			if (v) return `https://www.youtube.com/embed/${v}`;
		}

		// Short youtu.be links
		if (host === 'youtu.be') {
			const id = u.pathname.slice(1);
			if (id) return `https://www.youtube.com/embed/${id}`;
		}

		// Vimeo: https://vimeo.com/ID -> https://player.vimeo.com/video/ID
		if (host.includes('vimeo.com')) {
			const parts = u.pathname.split('/').filter(Boolean);
			const id = parts.pop();
			if (id && /^[0-9]+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
		}

		// If nothing matched, return null to indicate we can't embed
		return null;
	} catch (err) {
		return null;
	}
}

// Fetch the JSON feed (cached after the first request)
async function fetchApodData() {
	if (cachedApod) return cachedApod;
	const res = await fetch(apodData);
	if (!res.ok) throw new Error(`Network error: ${res.status}`);
	const data = await res.json();
	cachedApod = data;
	return data;
}

// Render gallery array of APOD-like objects
function renderGallery(items) {
	if (!items || items.length === 0) {
		showPlaceholder('🔭', 'No space photos available.');
		return;
	}

	// Clear current gallery
	gallery.innerHTML = '';

	items.forEach(item => {
		const card = document.createElement('article');
		card.className = 'gallery-item';

		// Media container: either an <img> for images/thumbnail or a simple placeholder for video without thumbnail
		let mediaEl;
		if (item.media_type === 'image') {
			mediaEl = document.createElement('img');
			mediaEl.src = item.url;
			mediaEl.alt = item.title || 'Space image';
			} else if (item.media_type === 'video') {
				if (item.thumbnail_url) {
					// Wrap the thumbnail in a container so we can show a play overlay
					const wrap = document.createElement('div');
					wrap.className = 'video-thumb';
					const img = document.createElement('img');
					img.src = item.thumbnail_url;
					img.alt = (item.title ? item.title + ' (video thumbnail)' : 'Video thumbnail');
					wrap.appendChild(img);
					const overlay = document.createElement('div');
					overlay.className = 'play-overlay';
					overlay.textContent = '▶';
					wrap.appendChild(overlay);
					mediaEl = wrap;
				} else {
					// Fallback placeholder when no thumbnail is available
					mediaEl = document.createElement('div');
					mediaEl.className = 'video-placeholder';
					mediaEl.innerHTML = '<div class="play">▶</div>';
				}
		} else {
			// Unknown media type: show a simple placeholder
			mediaEl = document.createElement('div');
			mediaEl.className = 'video-placeholder';
			mediaEl.innerHTML = '<div class="play">?</div>';
		}

		// Info block (title + date)
		const info = document.createElement('p');
		info.innerHTML = `<strong>${item.title || 'Untitled'}</strong><br/><small>${item.date || ''}</small>`;

		card.appendChild(mediaEl);
		card.appendChild(info);

		// Clicking a card opens the modal with details
		card.addEventListener('click', () => openModal(item));

		gallery.appendChild(card);
	});
}

// Create and show modal for a given APOD item
function openModal(item) {
	// Create overlay
	const overlay = document.createElement('div');
	overlay.className = 'modal-overlay';

	// Modal container
	const modal = document.createElement('div');
	modal.className = 'modal';

	// Close button
	const closeBtn = document.createElement('button');
	closeBtn.className = 'close-btn';
	closeBtn.setAttribute('aria-label', 'Close');
	closeBtn.textContent = '✕';
	closeBtn.addEventListener('click', close);

	// Media area
	const mediaWrap = document.createElement('div');
	mediaWrap.className = 'modal-media';

	if (item.media_type === 'image') {
		const img = document.createElement('img');
		// Prefer higher-res `hdurl` when available
		img.src = item.hdurl || item.url;
		img.alt = item.title || 'Space image';
		mediaWrap.appendChild(img);
		} else if (item.media_type === 'video') {
			// Prefer to embed when we can (YouTube/Vimeo). Otherwise show thumbnail + link.
			const embed = getEmbeddableUrl(item.url);
			if (embed) {
				const iframe = document.createElement('iframe');
				iframe.src = embed;
				iframe.setAttribute('frameborder', '0');
				iframe.setAttribute('allowfullscreen', '');
				// Make it responsive via CSS
				mediaWrap.appendChild(iframe);
			} else {
				// If we can't embed, show a large thumbnail (if available) or placeholder,
				// and provide a clear external link to open the video in a new tab.
				if (item.thumbnail_url) {
					const img = document.createElement('img');
					img.src = item.thumbnail_url;
					img.alt = item.title || 'Video';
					mediaWrap.appendChild(img);
				} else {
					const fallback = document.createElement('div');
					fallback.className = 'video-placeholder';
					fallback.innerHTML = '<div class="play">▶</div>';
					mediaWrap.appendChild(fallback);
				}

				const linkWrap = document.createElement('p');
				linkWrap.style.marginTop = '12px';
				const a = document.createElement('a');
				a.href = item.url;
				a.target = '_blank';
				a.rel = 'noopener noreferrer';
				a.textContent = 'Open video in new tab';
				a.className = 'video-link';
				linkWrap.appendChild(a);
				mediaWrap.appendChild(linkWrap);
			}
	} else {
		const fallback = document.createElement('div');
		fallback.className = 'video-placeholder';
		fallback.innerHTML = '<div class="play">?</div>';
		mediaWrap.appendChild(fallback);
	}

	// Text content
	const body = document.createElement('div');
	body.className = 'modal-body';
	const title = document.createElement('h2');
	title.textContent = item.title || 'Untitled';
	const date = document.createElement('p');
	date.className = 'modal-date';
	date.textContent = item.date || '';
	const expl = document.createElement('p');
	expl.className = 'modal-explanation';
	expl.textContent = item.explanation || '';

	body.appendChild(title);
	body.appendChild(date);
	body.appendChild(expl);

	modal.appendChild(closeBtn);
	modal.appendChild(mediaWrap);
	modal.appendChild(body);

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	// Accessibility: trap focus on close button first
	closeBtn.focus();

	// Close helpers
	function onKey(e) {
		if (e.key === 'Escape') close();
	}

	function onOutsideClick(e) {
		if (e.target === overlay) close();
	}

	function close() {
		document.removeEventListener('keydown', onKey);
		overlay.removeEventListener('click', onOutsideClick);
		overlay.remove();
	}

	document.addEventListener('keydown', onKey);
	overlay.addEventListener('click', onOutsideClick);
}

// Wire up button click to fetch and render
getImageBtn.addEventListener('click', async () => {
	showPlaceholder('🔄', 'Loading space photos…');
	try {
		const data = await fetchApodData();
		// The feed is an array; show it as-is (could be sorted/filtered later)
		renderGallery(data);
	} catch (err) {
		console.error(err);
		showPlaceholder('⚠️', 'Failed to load space photos. Try again later.');
	}
});

// End of script