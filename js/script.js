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
				mediaEl = document.createElement('img');
				mediaEl.src = item.thumbnail_url;
				mediaEl.alt = (item.title ? item.title + ' (video thumbnail)' : 'Video thumbnail');
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
		// Try to embed the video if the URL looks embeddable
		const iframe = document.createElement('iframe');
		iframe.src = item.url;
		iframe.setAttribute('frameborder', '0');
		iframe.setAttribute('allowfullscreen', '');
		// Make it responsive via CSS
		mediaWrap.appendChild(iframe);
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