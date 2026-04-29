/**
 * NeonCard Sound Manager
 * Handles sound effects (SFX) playback.
 */

var SoundManager = {
    _volume: 0.8,

    /**
     * Initialize SoundManager and load volume from settings.
     */
    init: function() {
        var s = {};
        try { s = JSON.parse(localStorage.getItem('neonCardSettings') || '{}'); } catch(e) {}
        this._volume = (s.sfxVolume !== undefined ? s.sfxVolume : 80) / 100;
        console.log('[SoundManager] Initialized. Volume:', this._volume);
    },

    /**
     * Set the global SFX volume.
     * @param {number} val - Volume value (0-100).
     */
    setVolume: function(val) {
        this._volume = val / 100;
    },

    /**
     * Play a sound effect.
     * @param {string} effect - The name of the effect (e.g., 'atk', 'damage', 'win').
     * @param {boolean} allowVariant - If true, randomly chooses between name and name2 if applicable.
     */
    play: function(effect, allowVariant = true) {
        var fileName = effect;
        
        // Handle random variants for specific effects
        if (allowVariant) {
            if (['atk', 'burn', 'damage', 'money'].includes(effect)) {
                if (Math.random() > 0.5) {
                    fileName = effect + '2';
                }
            }
        }

        // Spelling fixes based on actual filenames in audio/effect
        if (fileName === 'purchase') fileName = 'purchace';
        if (fileName === 'shield') fileName = 'shied';

        var path = 'audio/Effect/' + fileName + '.mp3';
        
        // Create a new Audio object for every play to allow overlapping sounds
        var audio = new Audio(path);
        audio.volume = this._volume;
        
        // Notify MusicManager for ducking
        if (window.MusicManager && typeof MusicManager.onSFXStart === 'function') {
            MusicManager.onSFXStart();
            var handled = false;
            var cleanup = function() {
                if (handled) return;
                handled = true;
                MusicManager.onSFXEnd();
            };
            audio.onended = cleanup;
            audio.onerror = cleanup;
        }

        audio.play().catch(function(err) {
            // Silently fail if blocked by browser policy or missing file
            console.debug('[SoundManager] Playback blocked or failed:', fileName, err);
            if (window.MusicManager && typeof MusicManager.onSFXEnd === 'function') {
                MusicManager.onSFXEnd();
            }
        });
    },

    /**
     * Play a sound effect N times with a small delay between each.
     * @param {string} effect - Effect name.
     * @param {number} count - Number of times to play.
     */
    playNTimes: function(effect, count) {
        if (!count || count <= 0) return;
        var self = this;
        var i = 0;
        // Draw sounds usually play quite fast
        var interval = setInterval(function() {
            self.play(effect, false);
            i++;
            if (i >= count) clearInterval(interval);
        }, 200);
    }
};

// Auto-init on script load if we're in a browser environment
if (typeof window !== 'undefined') {
    // We'll also call this manually in index.html/game.html for safety
    SoundManager.init();
}
