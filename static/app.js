// GLOBAL STATE
let allReleases = [];
let filteredReleases = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM ELEMENTS
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const typeFilters = document.getElementById('type-filters');
const releasesGrid = document.getElementById('releases-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Elements
const countTotal = document.getElementById('count-total');
const countFeatures = document.getElementById('count-features');
const countIssues = document.getElementById('count-issues');
const countOther = document.getElementById('count-other');

// Tweet Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const progressCircle = document.getElementById('progress-circle');
const tweetMediaPreview = document.getElementById('tweet-media-preview');
const tweetLinkPreview = document.getElementById('tweet-link-preview');

// SVG Ring Configuration
const CIRCUMFERENCE = 2 * Math.PI * 14; // r=14 -> 87.964
progressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
progressCircle.style.strokeDashoffset = CIRCUMFERENCE;

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// EVENT LISTENERS
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => {
        if (!refreshIcon.classList.contains('spinning')) {
            fetchReleases();
        }
    });

    retryBtn.addEventListener('click', fetchReleases);
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Search input handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        
        // Show/hide clear button
        if (searchQuery.length > 0) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
        }
        
        applyFiltersAndSearch();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.remove('visible');
        applyFiltersAndSearch();
    });

    // Filter Chips
    typeFilters.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;

        // Update active chip
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        currentFilter = chip.dataset.type;
        applyFiltersAndSearch();
    });

    // Tweet Modal Event Listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    
    // Close modal on click outside card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Recalculate character count in textarea
    tweetTextarea.addEventListener('input', updateCharCount);

    // Post/Share Tweet
    postTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value.trim();
        if (text.length === 0 || text.length > 280) return;

        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        
        closeTweetModal();
        showToast('Redirected to Twitter to publish!', 'success');
    });
}

// FETCH DATA FROM API
async function fetchReleases() {
    showLoading();
    try {
        const response = await fetch('/api/releases');
        const data = await response.json();
        
        if (data.success) {
            allReleases = data.releases;
            updateStats();
            applyFiltersAndSearch();
            showToast('Release feed updated successfully', 'info');
        } else {
            showError(data.error || 'Unknown server error');
        }
    } catch (err) {
        showError('Network connectivity error. Could not reach server.');
        console.error(err);
    }
}

// UPDATE STATS COUNTERS WITH ANIMATION
function updateStats() {
    const total = allReleases.length;
    const features = allReleases.filter(r => r.type.toLowerCase() === 'feature').length;
    const issues = allReleases.filter(r => r.type.toLowerCase() === 'issue').length;
    const others = total - features - issues;

    animateCounter(countTotal, total);
    animateCounter(countFeatures, features);
    animateCounter(countIssues, issues);
    animateCounter(countOther, others);
}

function animateCounter(element, target) {
    let start = 0;
    const duration = 800; // ms
    const increment = Math.ceil(target / (duration / 16)); // ~60fps
    
    if (target === 0) {
        element.textContent = '0';
        return;
    }

    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            clearInterval(timer);
            element.textContent = target;
        } else {
            element.textContent = start;
        }
    }, 16);
}

// FILTER & SEARCH LOGIC
function applyFiltersAndSearch() {
    filteredReleases = allReleases.filter(release => {
        // Apply type filter
        let matchesType = true;
        if (currentFilter !== 'all') {
            matchesType = release.type.toLowerCase() === currentFilter;
        }

        // Apply search query
        let matchesSearch = true;
        if (searchQuery !== '') {
            const cleanContent = stripHtml(release.content).toLowerCase();
            const dateStr = release.date.toLowerCase();
            const typeStr = release.type.toLowerCase();
            
            matchesSearch = cleanContent.includes(searchQuery) || 
                            dateStr.includes(searchQuery) || 
                            typeStr.includes(searchQuery);
        }

        return matchesType && matchesSearch;
    });

    renderReleases();
}

// RENDER CARDS TO GRID
function renderReleases() {
    releasesGrid.innerHTML = '';
    hideStates();

    if (filteredReleases.length === 0) {
        if (searchQuery !== '' || currentFilter !== 'all') {
            emptyState.classList.remove('hidden');
        } else {
            showError('No release notes returned from feed.');
        }
        return;
    }

    filteredReleases.forEach((release, index) => {
        const card = document.createElement('div');
        const typeClass = `type-${release.type.toLowerCase()}`;
        card.className = `release-card ${typeClass}`;
        // Cascade entry animation delays
        card.style.animationDelay = `${index * 0.05}s`;

        // Render contents
        const displayType = release.type;
        const badgeClass = `badge-${release.type.toLowerCase()}`;

        // Build HTML string
        card.innerHTML = `
            <div class="card-top">
                <div class="card-meta">
                    <span class="badge ${badgeClass}">${displayType}</span>
                    <span class="card-date">
                        <span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span>
                        ${release.date}
                    </span>
                </div>
                <div class="card-body">
                    ${release.content}
                </div>
            </div>
            <div class="card-actions">
                <button class="tweet-btn" aria-label="Share update on Twitter">
                    <svg class="tweet-btn-icon" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet This</span>
                </button>
                ${release.link ? `
                    <a href="${release.link}" target="_blank" rel="noopener noreferrer" class="docs-link">
                        <span>Read Docs</span>
                        <span class="material-symbols-outlined docs-link-icon">open_in_new</span>
                    </a>
                ` : ''}
            </div>
        `;

        // Add event listener to share button
        card.querySelector('.tweet-btn').addEventListener('click', () => {
            openTweetModal(release);
        });

        releasesGrid.appendChild(card);
    });
}

// TWEET MODAL FUNCTIONS
function openTweetModal(release) {
    tweetModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Populate link preview
    if (release.link) {
        tweetMediaPreview.classList.remove('hidden');
        tweetLinkPreview.textContent = release.link;
    } else {
        tweetMediaPreview.classList.add('hidden');
    }

    // Build tweet text template
    const cleanContent = stripHtml(release.content);
    const dateStr = release.date;
    const typeStr = release.type;
    
    // Template: "📢 BigQuery Feature (June 15, 2026): [Description] #GoogleCloud #BigQuery [link]"
    const prefix = `📢 BigQuery ${typeStr} (${dateStr}): `;
    const suffix = `\n\n#GoogleCloud #BigQuery${release.link ? ' ' + release.link : ''}`;
    
    // Calculate available chars for description
    const totalFixedLength = prefix.length + suffix.length;
    const maxDescLength = 280 - totalFixedLength;

    let desc = cleanContent;
    if (desc.length > maxDescLength) {
        desc = desc.substring(0, maxDescLength - 4) + '...';
    }

    const tweetText = `${prefix}${desc}${suffix}`;
    tweetTextarea.value = tweetText;
    
    // Trigger count refresh
    updateCharCount();
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function updateCharCount() {
    const text = tweetTextarea.value;
    const length = text.length;
    const remaining = 280 - length;

    // Update text display
    charCount.textContent = remaining;

    // Apply color warning states
    charCount.classList.remove('warning', 'danger');
    if (remaining <= 20 && remaining >= 0) {
        charCount.classList.add('warning');
    } else if (remaining < 0) {
        charCount.classList.add('danger');
    }

    // Update circular progress bar
    if (length <= 280) {
        const fraction = length / 280;
        const offset = CIRCUMFERENCE - (fraction * CIRCUMFERENCE);
        progressCircle.style.strokeDashoffset = offset;
        progressCircle.setAttribute('stroke', remaining <= 20 ? '#f59e0b' : '#1d9bf0');
    } else {
        // Overflow
        progressCircle.style.strokeDashoffset = 0;
        progressCircle.setAttribute('stroke', '#f43f5e');
    }

    // Disable button if invalid
    if (length === 0 || length > 280) {
        postTweetBtn.disabled = true;
    } else {
        postTweetBtn.disabled = false;
    }
}

// HELPERS
function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Replace anchor links with their text and URL or just clean it up
    // Usually, just text representation is fine.
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up excessive whitespace/newlines
    return text.replace(/\s+/g, ' ').trim();
}

function resetFilters() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.remove('visible');
    
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-type="all"]').classList.add('active');
    currentFilter = 'all';
    
    applyFiltersAndSearch();
}

// UI STATE MANAGERS
function showLoading() {
    refreshIcon.classList.add('spinning');
    loadingState.classList.remove('hidden');
    releasesGrid.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
}

function hideStates() {
    refreshIcon.classList.remove('spinning');
    loadingState.classList.add('hidden');
    releasesGrid.classList.remove('hidden');
}

function showError(msg) {
    refreshIcon.classList.remove('spinning');
    loadingState.classList.add('hidden');
    releasesGrid.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    errorMessage.textContent = msg;
    errorState.classList.remove('hidden');
    showToast(`Error: ${msg}`, 'error');
}

// TOAST SYSTEM
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast`;
    
    let icon = 'info';
    let iconClass = 'toast-info-icon';
    if (type === 'success') {
        icon = 'check_circle';
        iconClass = 'toast-success-icon';
    } else if (type === 'error') {
        icon = 'cancel';
        iconClass = 'toast-error-icon';
    }

    toast.innerHTML = `
        <span class="material-symbols-outlined ${iconClass}">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade out and remove toast after 4s
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}
