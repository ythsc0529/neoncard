/**
 * Neon Card Game - Resource Loader
 * Preloads assets without blocking the first playable screen.
 */

const ResourceLoader = (() => {
    let _loadedCount = 0;
    let _totalCount = 0;
    let _onProgress = null;
    let _onReady = null;
    let _onComplete = null;
    let _isReady = false;
    let _isFinished = false;
    let _queue = [];
    let _activeCount = 0;
    let _timer = null;

    function _getDefaultConcurrency() {
        const cores = navigator.hardwareConcurrency || 4;
        const isNative = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web';
        const isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        if (isNative || isSmallScreen || cores <= 4) return 3;
        return 5;
    }

    /**
     * Start preloading resources from the manifest.
     * @param {Object} manifest
     * @param {Object} options
     * @param {Function} options.onProgress - fn(percent, label, loaded, total)
     * @param {Function} options.onReady - called once after readyAfter items or maxBlockingMs
     * @param {Function} options.onComplete - called when all resources finish
     * @param {number} options.readyAfter - number of resources needed before app init can continue
     * @param {number} options.maxBlockingMs - max time to keep the startup loader waiting
     * @param {number} options.concurrency - simultaneous image requests
     */
    function load(manifest, options = {}) {
        _onProgress = options.onProgress;
        _onReady = options.onReady;
        _onComplete = options.onComplete;
        _loadedCount = 0;
        _activeCount = 0;
        _isReady = false;
        _isFinished = false;
        clearTimeout(_timer);

        const images = Array.from(new Set((manifest && manifest.images) || []));
        _queue = images.slice();
        _totalCount = images.length;

        if (_totalCount === 0) {
            _markReady();
            _finish();
            return;
        }

        const readyAfter = Math.min(options.readyAfter ?? 8, _totalCount);
        const maxBlockingMs = options.maxBlockingMs ?? 1200;
        const concurrency = Math.max(1, options.concurrency || _getDefaultConcurrency());

        console.log(`[ResourceLoader] Loading ${_totalCount} resources with concurrency=${concurrency}...`);

        _timer = setTimeout(_markReady, maxBlockingMs);

        for (let i = 0; i < concurrency; i++) {
            _pumpQueue(concurrency, readyAfter);
        }
    }

    function _pumpQueue(concurrency, readyAfter) {
        if (_isFinished || _activeCount >= concurrency) return;

        const src = _queue.shift();
        if (!src) {
            if (_activeCount === 0) _finish();
            return;
        }

        _activeCount++;
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';

        img.onload = () => _handleItemLoaded(src, concurrency, readyAfter);
        img.onerror = () => {
            console.warn(`[ResourceLoader] Failed to load: ${src}`);
            _handleItemLoaded(src, concurrency, readyAfter);
        };
        img.src = src;
    }

    function _handleItemLoaded(src, concurrency, readyAfter) {
        _activeCount = Math.max(0, _activeCount - 1);
        _loadedCount++;

        const percent = Math.floor((_loadedCount / _totalCount) * 100);
        const fileName = src.split('/').pop().split('.')[0];

        if (_onProgress) {
            _onProgress(percent, fileName, _loadedCount, _totalCount);
        }

        if (_loadedCount >= readyAfter) {
            _markReady();
        }

        _pumpQueue(concurrency, readyAfter);
        if (_loadedCount === _totalCount) {
            _finish();
        }
    }

    function _markReady() {
        if (_isReady) return;
        _isReady = true;
        clearTimeout(_timer);
        if (_onReady) _onReady();
    }

    function _finish() {
        if (_isFinished) return;
        _isFinished = true;
        _markReady();
        console.log('[ResourceLoader] All resources loaded.');
        if (_onComplete) _onComplete();
    }

    function isLoaded() {
        return _isFinished;
    }

    function isReady() {
        return _isReady;
    }

    return {
        load,
        isLoaded,
        isReady
    };
})();

window.ResourceLoader = ResourceLoader;
