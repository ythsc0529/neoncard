/**
 * NeonCard Music Manager
 * Handles background music playback and persistence across pages.
 */

var MusicManager = {
    songs: [
        { title: 'Neon Shuffle', file: 'audio/Music/Neon Shuffle.mp3', cover: 'audio/Music/Neon Shuffle.png' },
        { title: 'Card Pulse', file: 'audio/Music/Card Pulse.mp3', cover: 'audio/Music/Card Pulse.png' },
        { title: 'Lucky Draw Rush', file: 'audio/Music/Lucky Draw Rush.mp3', cover: 'audio/Music/Lucky Draw Rush.png' }
    ],
    currentIndex: -1,
    audio: null,
    isPlaying: false,
    isShuffle: true,
    _progressTimer: null,

    init: function() {
        if (this.audio) return;
        this.audio = new Audio();
        
        var s = {};
        try { s = JSON.parse(localStorage.getItem('neonCardSettings') || '{}'); } catch(e) {}
        this._baseVolume = (s.musicVolume !== undefined ? s.musicVolume : 70) / 100;
        this.audio.volume = this._baseVolume;
        this._activeSFXCount = 0;
        this._isDucked = false;

        var self = this;
        this.audio.addEventListener('ended', function() { self.next(); });
        this.audio.addEventListener('timeupdate', function() { self._updateProgress(); });
        this.audio.addEventListener('loadedmetadata', function() { self._updateProgress(); });

        // Persistence Logic
        window.addEventListener('pagehide', function() {
            var song = self.songs[self.currentIndex];
            if (song && self.audio) {
                sessionStorage.setItem('nc_currentMusicFile', song.file);
                sessionStorage.setItem('nc_currentMusicTime', self.audio.currentTime || 0);
                sessionStorage.setItem('nc_musicIsPlaying', self.isPlaying);
            }
        });

        // Resume from sessionStorage if available
        var savedFile = sessionStorage.getItem('nc_currentMusicFile');
        var savedTime = parseFloat(sessionStorage.getItem('nc_currentMusicTime') || '0');
        var wasPlaying = sessionStorage.getItem('nc_musicIsPlaying') === 'true';

        if (savedFile) {
            // Find index of the saved song
            for (var i = 0; i < this.songs.length; i++) {
                if (this.songs[i].file === savedFile) {
                    this.currentIndex = i;
                    break;
                }
            }
        }

        if (this.currentIndex === -1) {
            this.currentIndex = Math.floor(Math.random() * this.songs.length);
        }

        if (savedFile && savedTime > 0) {
            this._loadAndPlay(true, savedTime, wasPlaying);
        } else {
            this._loadAndPlay(true);
        }
    },

    _loadAndPlay: function(isFirst, startTime, shouldPlay) {
        var song = this.songs[this.currentIndex];
        if (!song) return;
        
        this.audio.src = song.file;
        if (startTime) this.audio.currentTime = startTime;
        this.audio.load();

        var self = this;
        var songTitle = song.title;

        // If it's a page reload/navigation, we try to auto-resume
        // Browsers might block this until user interaction
        var playPromise = (isFirst && startTime > 0 && !shouldPlay) ? null : this.audio.play();

        if (playPromise !== undefined && playPromise !== null) {
            playPromise.then(function() {
                self.isPlaying = true;
                self._updateUI();
                self._startProgressTimer();
                if (!isFirst) self._showNowPlayingToast(songTitle);
            }).catch(function(err) {
                console.warn('[MusicManager] Autoplay blocked or failed:', err);
                self.isPlaying = false;
                self._updateUI();
                // Add one-time click listener to resume
                var resumeHandler = function() {
                    if (!self.isPlaying && self.audio) {
                        self.audio.play().then(function() {
                            self.isPlaying = true;
                            self._updateUI();
                            self._startProgressTimer();
                            document.removeEventListener('click', resumeHandler);
                        }).catch(function() {});
                    }
                };
                document.addEventListener('click', resumeHandler);
            });
        } else {
            // Just update UI if we're not playing yet
            this.isPlaying = false;
            this._updateUI();
        }
    },

    togglePlay: function() {
        if (!this.audio) return;
        var self = this;
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            this._stopProgressTimer();
        } else {
            this.audio.play().then(function() {
                self.isPlaying = true;
                self._startProgressTimer();
            }).catch(function() {});
        }
        this._updateUI();
    },

    toggleShuffle: function() {
        this.isShuffle = !this.isShuffle;
        this._updateUI();
    },

    next: function() {
        if (this.isShuffle && this.songs.length > 1) {
            var nextIdx;
            do {
                nextIdx = Math.floor(Math.random() * this.songs.length);
            } while (nextIdx === this.currentIndex);
            this.currentIndex = nextIdx;
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.songs.length;
        }
        this._loadAndPlay(false);
    },

    prev: function() {
        if (this.isShuffle && this.songs.length > 1) {
            var nextIdx;
            do {
                nextIdx = Math.floor(Math.random() * this.songs.length);
            } while (nextIdx === this.currentIndex);
            this.currentIndex = nextIdx;
        } else {
            this.currentIndex = (this.currentIndex - 1 + this.songs.length) % this.songs.length;
        }
        this._loadAndPlay(false);
    },

    playSong: function(index) {
        if (index >= 0 && index < this.songs.length) {
            this.currentIndex = index;
            this._loadAndPlay(false);
        }
    },


    _updateUI: function() {
        var song = this.songs[this.currentIndex];
        if (!song) return;

        // Global elements (if they exist on the page)
        var icon = document.getElementById('musicBtnIcon');
        var label = document.getElementById('musicBtnLabel');
        var diskImg = document.getElementById('musicBtnDiskImg');

        var emoji = document.getElementById('musicBtnEmoji');

        if (icon) {
            if (this.isPlaying) icon.classList.add('playing');
            else icon.classList.remove('playing');
        }
        
        // Update Disk Image with Album Cover
        if (diskImg) {
            if (song.cover) {
                diskImg.src = song.cover;
                diskImg.style.display = 'block';
                if (emoji) emoji.style.display = 'none'; // Hide the emoji icon if image is present
            } else {
                diskImg.style.display = 'none';
                if (emoji) emoji.style.display = 'block';
            }
        }

        if (label) {
            label.textContent = this.isPlaying
                ? (song.title.length > 10 ? song.title.substring(0, 10) + '\u2026' : song.title)
                : '\u97f3\u6a02'; // "音樂"
        }

        // Modal elements
        var titleEl = document.getElementById('musicTitle');
        var coverImg = document.getElementById('musicCoverImg');
        var coverEmoji = document.getElementById('musicCoverEmoji');
        var playBtn = document.getElementById('musicPlayPauseBtn');

        if (titleEl) titleEl.textContent = song.title;
        if (playBtn) playBtn.textContent = this.isPlaying ? '\u23f8' : '\u25b6'; // Pause/Play icons
        
        if (song.cover) {
            if (coverImg) { coverImg.src = song.cover; coverImg.style.display = 'block'; }
            if (coverEmoji) coverEmoji.style.display = 'none';
        } else {
            if (coverImg) coverImg.style.display = 'none';
            if (coverEmoji) coverEmoji.style.display = 'block';
        }

        this._renderPlaylist();
    },

    _renderPlaylist: function() {
        var playlistEl = document.getElementById('musicPlaylist');
        if (!playlistEl) return;
        
        var html = '';
        for (var i = 0; i < this.songs.length; i++) {
            var s = this.songs[i];
            var active = (i === this.currentIndex);
            html += '<div onclick="MusicManager.playSong(' + i + ')" class="music-list-item' + (active ? ' active' : '') + '">' +
                    '<div class="music-list-item-info">' +
                    '<span class="music-list-item-title">' + s.title + '</span>' +
                    '</div>' +
                    (active && this.isPlaying ? '<span class="music-playing-bars"><span></span><span></span><span></span></span>' : '') +
                    '</div>';
        }
        playlistEl.innerHTML = html;
    },

    _updateProgress: function() {
        if (!this.audio) return;
        var cur = this.audio.currentTime;
        var dur = this.audio.duration || 0;
        var pct = dur > 0 ? (cur / dur * 100) : 0;
        
        var fill = document.getElementById('musicProgressFill');
        var curEl = document.getElementById('musicCurrentTime');
        var durEl = document.getElementById('musicDuration');
        
        if (fill) fill.style.width = pct + '%';
        if (curEl) curEl.textContent = this._formatTime(cur);
        if (durEl) durEl.textContent = this._formatTime(dur);
    },

    _formatTime: function(secs) {
        if (!secs || isNaN(secs)) return '0:00';
        var m = Math.floor(secs / 60);
        var s = Math.floor(secs % 60);
        return m + ':' + (s < 10 ? '0' + s : s);
    },

    _startProgressTimer: function() {
        this._stopProgressTimer();
        var self = this;
        this._progressTimer = setInterval(function() { self._updateProgress(); }, 1000);
    },

    _stopProgressTimer: function() {
        if (this._progressTimer) { clearInterval(this._progressTimer); this._progressTimer = null; }
    },

    _showNowPlayingToast: function(title) {
        var old = document.getElementById('nowPlayingToast');
        if (old) { old.classList.add('hiding'); setTimeout(function() { old.remove(); }, 350); }
        
        var delay = old ? 400 : 0;
        setTimeout(function() {
            var toast = document.createElement('div');
            toast.id = 'nowPlayingToast';
            toast.className = 'now-playing-toast';
            toast.innerHTML = '<span style="font-size:1.3rem">\ud83c\udfb5</span><div><div style="color:#b478ff;font-size:0.78rem;margin-bottom:2px;">\u6b63\u5728\u64ad\u653e</div><div style="color:var(--text-primary);font-size:0.9rem;font-weight:600;">' + title + '</div></div>';
            document.body.appendChild(toast);
            
            var hideTimer = setTimeout(function() {
                toast.classList.add('hiding');
                setTimeout(function() { toast.remove(); }, 350);
            }, 4000);
            
            toast.addEventListener('click', function() {
                clearTimeout(hideTimer);
                toast.classList.add('hiding');
                setTimeout(function() { toast.remove(); }, 350);
            });
        }, delay);
    },
    
    onSFXStart: function() {
        this._activeSFXCount++;
        if (!this._isDucked && this._activeSFXCount > 0) {
            this._isDucked = true;
            this._applyVolume();
        }
    },

    onSFXEnd: function() {
        this._activeSFXCount = Math.max(0, this._activeSFXCount - 1);
        if (this._isDucked && this._activeSFXCount === 0) {
            this._isDucked = false;
            this._applyVolume();
        }
    },

    setBaseVolume: function(val) {
        this._baseVolume = val / 100;
        this._applyVolume();
    },

    _applyVolume: function() {
        if (!this.audio) return;
        // Duck to 30% of base volume
        var target = this._isDucked ? (this._baseVolume * 0.3) : this._baseVolume;
        this.audio.volume = target;
    }
};
