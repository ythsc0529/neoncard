/**
 * Neon Card Game - Resource Loader
 * Handles preloading of assets with progress tracking.
 */

const ResourceLoader = (() => {
    let _loadedCount = 0;
    let _totalCount = 0;
    let _onProgress = null;
    let _onComplete = null;
    let _isFinished = false;

    /**
     * Start preloading all resources in the manifest
     * @param {Object} manifest - The RESOURCE_MANIFEST object
     * @param {Object} options - { onProgress: fn(percent, label), onComplete: fn() }
     */
    function load(manifest, options = {}) {
        _onProgress = options.onProgress;
        _onComplete = options.onComplete;
        _loadedCount = 0;
        _isFinished = false;

        const images = manifest.images || [];
        _totalCount = images.length;

        if (_totalCount === 0) {
            _finish();
            return;
        }

        console.log(`[ResourceLoader] Loading ${_totalCount} resources...`);

        images.forEach(src => {
            const img = new Image();
            img.onload = () => _handleItemLoaded(src);
            img.onerror = () => {
                console.warn(`[ResourceLoader] Failed to load: ${src}`);
                _handleItemLoaded(src); // Continue anyway
            };
            img.src = src;
        });
    }

    function _handleItemLoaded(src) {
        _loadedCount++;
        const percent = Math.floor((_loadedCount / _totalCount) * 100);
        
        // Extract filename for display label
        const fileName = src.split('/').pop().split('.')[0];
        
        if (_onProgress) {
            _onProgress(percent, fileName);
        }

        if (_loadedCount === _totalCount) {
            _finish();
        }
    }

    function _finish() {
        if (_isFinished) return;
        _isFinished = true;
        console.log('[ResourceLoader] All resources loaded.');
        if (_onComplete) {
            _onComplete();
        }
    }

    function isLoaded() {
        return _isFinished;
    }

    return {
        load,
        isLoaded
    };
})();

// Export for global access
window.ResourceLoader = ResourceLoader;
