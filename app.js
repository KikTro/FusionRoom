// FusionRoom - Collaborative Media Streaming Application
class FusionRoom {
    constructor() {
        this.socket = null;
        this.currentRoom = null;
        this.userName = null;
        this.userId = this.generateUserId();
        this.currentVideo = null;
        this.queue = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isAudioOnly = false;
        this.volume = 1;
        this.isMuted = false;
        this.localFiles = new Map();
        this.isSyncing = false;
        this.syncOffset = 0;
        this.youtubePlayer = null;
        this.isYouTubeReady = false;
        this.progressUpdateInterval = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeSocket();
        this.initializeYouTubeAPI();
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    initializeElements() {
        // Screens
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.mainApp = document.getElementById('mainApp');
        
        // Welcome screen elements
        this.roomCodeInput = document.getElementById('roomCodeInput');
        this.userNameInput = document.getElementById('userNameInput');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        
        // Main app elements
        this.currentRoomCode = document.getElementById('currentRoomCode');
        this.currentUserName = document.getElementById('currentUserName');
        this.userCount = document.getElementById('userCount');
        this.copyRoomCode = document.getElementById('copyRoomCode');
        
        // Player elements
        this.videoPlayer = document.getElementById('videoPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.playPauseBtn.disabled = true;
        this.progressBar = document.querySelector('.progress-bar');
        this.progressFill = document.getElementById('progressFill');
        this.currentTime = document.getElementById('currentTime');
        this.duration = document.getElementById('duration');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.audioOnlyBtn = document.getElementById('audioOnlyBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        
        // Search elements
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.youtubeResults = document.getElementById('youtubeResults');
        this.localResults = document.getElementById('localResults');
        this.fileInput = document.getElementById('fileInput');
        this.localFilesList = document.getElementById('localFilesList');
        
        // Queue elements
        this.queueList = document.getElementById('queueList');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.clearQueueBtn = document.getElementById('clearQueueBtn');
        
        // Users elements
        this.usersList = document.getElementById('usersList');
        
        // Other elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toastContainer = document.getElementById('toastContainer');
    }

    attachEventListeners() {
        // Welcome screen events
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        this.userNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createRoom();
        });

        // Room management
        this.copyRoomCode.addEventListener('click', () => this.copyRoomCodeToClipboard());

        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        this.audioOnlyBtn.addEventListener('click', () => this.toggleAudioOnly());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Search functionality
        this.searchBtn.addEventListener('click', () => this.searchYouTube());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchYouTube();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // File upload
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files));

        // Queue controls
        this.shuffleBtn.addEventListener('click', () => this.shuffleQueue());
        this.clearQueueBtn.addEventListener('click', () => this.clearQueue());

        // Progress bar click
        this.progressBar.addEventListener('click', (e) => {
            if (this.currentVideo) {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                this.seekTo(percentage);
            }
        });
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('roomJoined', (data) => this.handleRoomJoined(data));
        this.socket.on('roomCreated', (data) => this.handleRoomCreated(data));
        this.socket.on('userJoined', (data) => this.handleUserJoined(data));
        this.socket.on('userLeft', (data) => this.handleUserLeft(data));
        this.socket.on('videoChanged', (data) => this.handleVideoChanged(data));
        this.socket.on('queueUpdated', (data) => this.handleQueueUpdated(data));
        this.socket.on('playbackStateChanged', (data) => this.handlePlaybackStateChanged(data));
        this.socket.on('videoSeeked', (data) => this.handleVideoSeeked(data));
        this.socket.on('userCountUpdated', (data) => this.handleUserCountUpdated(data));
        this.socket.on('error', (data) => this.showToast(data.message, 'error'));
    }

    initializeYouTubeAPI() {
        if (typeof YT !== 'undefined' && YT.Player) {
            this.isYouTubeReady = true;
        } else {
            window.onYouTubeIframeAPIReady = () => {
                this.isYouTubeReady = true;
                console.log('YouTube API ready');
            };
        }
    }

    // Room Management
    async createRoom() {
        const userName = this.userNameInput.value.trim();
        if (!userName) {
            this.showToast('Please enter your name', 'error');
            return;
        }

        this.userName = userName;
        this.currentRoom = this.generateRoomCode();
        
        this.showLoading(true);
        
        this.socket.emit('createRoom', {
            roomCode: this.currentRoom,
            userName: this.userName,
            userId: this.userId
        });
    }

    async joinRoom() {
        const roomCode = this.roomCodeInput.value.trim().toUpperCase();
        const userName = this.userNameInput.value.trim();
        
        if (!roomCode || !userName) {
            this.showToast('Please enter both room code and your name', 'error');
            return;
        }

        this.userName = userName;
        this.currentRoom = roomCode;
        
        this.showLoading(true);
        
        this.socket.emit('joinRoom', {
            roomCode: this.currentRoom,
            userName: this.userName,
            userId: this.userId
        });
    }

    handleRoomCreated(data) {
        this.showLoading(false);
        this.currentRoomCode.textContent = data.roomCode;
        this.currentUserName.textContent = data.userName;
        this.userCount.textContent = '1';
        
        // Initialize users list with the creator
        this.updateUsersList([{
            id: this.userId,
            name: this.userName
        }]);
        
        this.showScreen('mainApp');
        this.showToast(`Room created! Share code: ${data.roomCode}`, 'success');
    }

    handleRoomJoined(data) {
        this.showLoading(false);
        this.currentRoomCode.textContent = data.roomCode;
        this.currentUserName.textContent = data.userName;
        this.userCount.textContent = data.users.length.toString();
        this.updateUsersList(data.users);
        this.queue = data.queue || [];
        this.updateQueueDisplay();
        
        if (data.currentVideo) {
            this.loadVideo(data.currentVideo);
        }
        
        this.showScreen('mainApp');
        this.showToast(`Joined room ${data.roomCode}`, 'success');
    }

    copyRoomCodeToClipboard() {
        navigator.clipboard.writeText(this.currentRoom).then(() => {
            this.showToast('Room code copied to clipboard!', 'success');
        });
    }

    handleUserJoined(data) {
        this.userCount.textContent = (parseInt(this.userCount.textContent) + 1).toString();
        this.showToast(`${data.userName} joined the room`, 'info');
    }

    handleUserLeft(data) {
        this.userCount.textContent = (parseInt(this.userCount.textContent) - 1).toString();
        this.showToast(`${data.userName} left the room`, 'info');
    }

    handleUserCountUpdated(data) {
        this.userCount.textContent = data.count.toString();
    }

    updateUsersList(users) {
        this.usersList.innerHTML = '';
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div class="user-name">${user.name}</div>
                <div class="user-status"></div>
            `;
            this.usersList.appendChild(userElement);
        });
    }

    // Video Management
    async searchYouTube() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        this.showLoading(true);
        
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error('Search request failed');
            }
            
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                this.displaySearchResults(data.items);
            } else {
                this.showToast('No videos found for your search', 'info');
                this.displaySearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Search failed, please try again', 'error');
            this.displaySearchResults([]);
        }
        
        this.showLoading(false);
    }

    displaySearchResults(results) {
        this.youtubeResults.innerHTML = '';
        results.forEach(video => {
            const resultElement = document.createElement('div');
            resultElement.className = 'search-result-item';
            resultElement.innerHTML = `
                <img src="${video.thumbnail}" alt="${video.title}" class="search-result-thumbnail">
                <div class="search-result-info">
                    <div class="search-result-title">${video.title}</div>
                    <div class="search-result-channel">${video.channel}</div>
                    <div class="search-result-duration">${video.duration}</div>
                </div>
            `;
            resultElement.addEventListener('click', () => this.addToQueue(video));
            this.youtubeResults.appendChild(resultElement);
        });
    }

    addToQueue(video) {
        this.queue.push(video);
        this.updateQueueDisplay();
        this.socket.emit('queueUpdated', { queue: this.queue });
        this.showToast(`Added "${video.title}" to queue`, 'success');
    }

    updateQueueDisplay() {
        this.queueList.innerHTML = '';
        
        if (this.queue.length === 0) {
            this.queueList.innerHTML = `
                <div class="queue-placeholder">
                    <i class="fas fa-list"></i>
                    <p>Queue is empty</p>
                </div>
            `;
            return;
        }

        this.queue.forEach((video, index) => {
            const queueItem = document.createElement('div');
            queueItem.className = `queue-item ${index === this.currentIndex ? 'playing' : ''}`;
            queueItem.innerHTML = `
                <img src="${video.thumbnail}" alt="${video.title}" class="queue-thumbnail">
                <div class="queue-info">
                    <div class="queue-title">${video.title}</div>
                    <div class="queue-channel">${video.channel}</div>
                </div>
                <div class="queue-actions">
                    <button class="queue-remove" onclick="event.stopPropagation(); app.removeFromQueue(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            queueItem.addEventListener('click', () => this.playFromQueue(index));
            this.queueList.appendChild(queueItem);
        });
    }

    removeFromQueue(index) {
        this.queue.splice(index, 1);
        if (this.currentIndex >= index && this.currentIndex > 0) {
            this.currentIndex--;
        }
        this.updateQueueDisplay();
        this.socket.emit('queueUpdated', { queue: this.queue });
    }

    playFromQueue(index) {
        this.currentIndex = index;
        const video = this.queue[index];
        this.loadVideo(video);
        this.socket.emit('videoChanged', { video: video, index: index });
    }

    loadVideo(video) {
        this.currentVideo = video;
        
        // Clear any existing progress update interval
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
        }
        
        if (video.isLocal) {
            this.videoPlayer.innerHTML = `
                <video id="syncVideo" style="width: 100%; height: 100%; object-fit: contain;">
                    <source src="${video.url}" type="${video.type}">
                    Your browser does not support the video tag.
                </video>
            `;
            
            setTimeout(() => {
                this.setupVideoSync();
                // Apply audio only mode if it's enabled
                if (this.isAudioOnly) {
                    this.applyAudioOnlyMode();
                }
            }, 100);
        } else {
            // YouTube video with hidden controls
            this.videoPlayer.innerHTML = `<div id="youtubePlayer"></div>`;
            
            if (this.isYouTubeReady) {
                this.createYouTubePlayer(video.id);
            } else {
                const checkReady = setInterval(() => {
                    if (this.isYouTubeReady) {
                        clearInterval(checkReady);
                        this.createYouTubePlayer(video.id);
                    }
                }, 100);
            }
            
            this.playPauseBtn.disabled = false;
        }
        
        this.updateQueueDisplay();
    }

    createYouTubePlayer(videoId) {
        if (this.youtubePlayer) {
            this.youtubePlayer.destroy();
        }
        
        this.youtubePlayer = new YT.Player('youtubePlayer', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 0,  // Hide YouTube controls
                'rel': 0,
                'modestbranding': 1,
                'showinfo': 0,
                'fs': 0,
                'iv_load_policy': 3
            },
            events: {
                'onReady': (event) => this.onYouTubePlayerReady(event),
                'onStateChange': (event) => this.onYouTubePlayerStateChange(event)
            }
        });
    }

    onYouTubePlayerReady(event) {
        console.log('YouTube player ready');
        this.playPauseBtn.disabled = false;
        
        // Apply audio only mode if it's enabled
        if (this.isAudioOnly) {
            setTimeout(() => {
                this.applyAudioOnlyMode();
            }, 100);
        }
        
        // Start progress update interval
        this.progressUpdateInterval = setInterval(() => {
            if (this.youtubePlayer && this.youtubePlayer.getCurrentTime) {
                const currentTime = this.youtubePlayer.getCurrentTime();
                const duration = this.youtubePlayer.getDuration();
                this.updateProgressBar(currentTime, duration);
            }
        }, 100);
    }

    onYouTubePlayerStateChange(event) {
        if (this.isSyncing) return;
        
        const state = event.data;
        let isPlaying = false;
        
        switch (state) {
            case YT.PlayerState.PLAYING:
                isPlaying = true;
                break;
            case YT.PlayerState.PAUSED:
                isPlaying = false;
                break;
            case YT.PlayerState.ENDED:
                isPlaying = false;
                break;
        }
        
        if (this.isPlaying !== isPlaying) {
            this.isPlaying = isPlaying;
            this.updatePlayPauseButton();
            this.socket.emit('playbackStateChanged', { 
                isPlaying: isPlaying,
                currentTime: this.youtubePlayer.getCurrentTime()
            });
        }
    }

    // Local File Management
    handleFileUpload(files) {
        Array.from(files).forEach(file => {
            const fileId = this.generateUserId();
            const fileUrl = URL.createObjectURL(file);
            
            this.localFiles.set(fileId, {
                id: fileId,
                name: file.name,
                size: this.formatFileSize(file.size),
                type: file.type,
                url: fileUrl,
                file: file
            });
        });
        
        this.updateLocalFilesDisplay();
    }

    updateLocalFilesDisplay() {
        this.localFilesList.innerHTML = '';
        
        if (this.localFiles.size === 0) {
            this.localFilesList.innerHTML = `
                <div class="queue-placeholder">
                    <i class="fas fa-folder-open"></i>
                    <p>No local files</p>
                </div>
            `;
            return;
        }

        this.localFiles.forEach((file, fileId) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-icon">
                    <i class="fas fa-${file.type.startsWith('video/') ? 'video' : 'music'}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${file.size}</div>
                </div>
            `;
            fileItem.addEventListener('click', () => this.playLocalFile(file));
            this.localFilesList.appendChild(fileItem);
        });
    }

    playLocalFile(file) {
        const video = {
            id: file.id,
            title: file.name,
            channel: 'Local File',
            thumbnail: '',
            duration: 'Unknown',
            isLocal: true,
            url: file.url,
            type: file.type
        };
        
        this.addToQueue(video);
        this.currentIndex = this.queue.length - 1;
        this.loadVideo(video);
        this.socket.emit('videoChanged', { video: video, index: this.currentIndex });
    }

    setupVideoSync() {
        const video = document.getElementById('syncVideo');
        if (!video) return;

        video.removeEventListener('play', this.handleVideoPlay);
        video.removeEventListener('pause', this.handleVideoPause);
        video.removeEventListener('seeked', this.handleVideoSeek);
        video.removeEventListener('timeupdate', this.handleVideoTimeUpdate);
        video.removeEventListener('volumechange', this.handleVideoVolumeChange);
        video.removeEventListener('loadedmetadata', this.handleVideoLoaded);

        this.handleVideoPlay = () => {
            if (!this.isSyncing) {
                this.isPlaying = true;
                this.updatePlayPauseButton();
                this.socket.emit('playbackStateChanged', { 
                    isPlaying: true, 
                    currentTime: video.currentTime 
                });
            }
        };

        this.handleVideoPause = () => {
            if (!this.isSyncing) {
                this.isPlaying = false;
                this.updatePlayPauseButton();
                this.socket.emit('playbackStateChanged', { 
                    isPlaying: false, 
                    currentTime: video.currentTime 
                });
            }
        };

        this.handleVideoSeek = () => {
            if (!this.isSyncing) {
                this.socket.emit('videoSeeked', { currentTime: video.currentTime });
            }
        };

        this.handleVideoTimeUpdate = () => {
            if (!this.isSyncing) {
                this.updateProgressBar(video.currentTime, video.duration);
            }
        };

        this.handleVideoVolumeChange = () => {
            if (!this.isSyncing) {
                this.volume = video.volume;
                this.isMuted = video.muted;
                this.volumeSlider.value = this.volume * 100;
                this.updateMuteButton();
            }
        };

        this.handleVideoLoaded = () => {
            // Set initial volume and unmute when video loads
            video.volume = this.volume;
            video.muted = this.isMuted;
            console.log('Video loaded, volume set to:', this.volume, 'muted:', this.isMuted);
        };

        video.addEventListener('play', this.handleVideoPlay);
        video.addEventListener('pause', this.handleVideoPause);
        video.addEventListener('seeked', this.handleVideoSeek);
        video.addEventListener('timeupdate', this.handleVideoTimeUpdate);
        video.addEventListener('volumechange', this.handleVideoVolumeChange);
        video.addEventListener('loadedmetadata', this.handleVideoLoaded);
        
        // Set initial volume immediately and when loaded
        video.volume = this.volume;
        video.muted = this.isMuted;
        
        // Also try to set it again after a short delay to ensure it takes effect
        setTimeout(() => {
            video.volume = this.volume;
            video.muted = this.isMuted;
        }, 100);
        
        this.playPauseBtn.disabled = false;
    }

    // Player Controls
    togglePlayPause() {
        const video = document.getElementById('syncVideo');
        
        if (video) {
            if (this.isPlaying) {
                video.pause();
            } else {
                video.play();
            }
        } else if (this.youtubePlayer && this.youtubePlayer.playVideo) {
            if (this.isPlaying) {
                this.youtubePlayer.pauseVideo();
            } else {
                this.youtubePlayer.playVideo();
            }
        }
    }

    updatePlayPauseButton() {
        this.playPauseBtn.innerHTML = `<i class="fas fa-${this.isPlaying ? 'pause' : 'play'}"></i>`;
        this.playPauseBtn.style.opacity = '1';
        this.playPauseBtn.style.visibility = 'visible';
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        
        const video = document.getElementById('syncVideo');
        if (video) {
            video.muted = this.isMuted;
        } else if (this.youtubePlayer && this.youtubePlayer.mute) {
            if (this.isMuted) {
                this.youtubePlayer.mute();
            } else {
                this.youtubePlayer.unMute();
            }
        }
        
        this.updateMuteButton();
    }

    updateMuteButton() {
        this.muteBtn.innerHTML = `<i class="fas fa-volume-${this.isMuted ? 'mute' : 'up'}"></i>`;
    }

    setVolume(value) {
        this.volume = value;
        this.isMuted = value === 0;
        
        const video = document.getElementById('syncVideo');
        if (video) {
            video.volume = this.volume;
            video.muted = this.isMuted;
        } else if (this.youtubePlayer && this.youtubePlayer.setVolume) {
            this.youtubePlayer.setVolume(this.volume * 100);
            if (this.isMuted) {
                this.youtubePlayer.mute();
            } else {
                this.youtubePlayer.unMute();
            }
        }
        
        this.updateMuteButton();
    }

    toggleAudioOnly() {
        this.isAudioOnly = !this.isAudioOnly;
        this.audioOnlyBtn.classList.toggle('active', this.isAudioOnly);
        
        if (this.isAudioOnly) {
            this.applyAudioOnlyMode();
        } else {
            this.removeAudioOnlyMode();
        }
        
        this.showToast(`Audio only mode ${this.isAudioOnly ? 'enabled' : 'disabled'}`, 'info');
    }

    applyAudioOnlyMode() {
        const video = document.getElementById('syncVideo');
        
        if (video) {
            // For local videos, just hide the video element but keep it playing
            video.style.display = 'none';
            
            // Show audio only overlay
            const existingOverlay = document.getElementById('audioOnlyOverlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            const overlay = document.createElement('div');
            overlay.id = 'audioOnlyOverlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #000;
                color: white;
                text-align: center;
                z-index: 10;
            `;
            overlay.innerHTML = `
                <div>
                    <i class="fas fa-music" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Audio Only Mode</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">Video disabled to save data</p>
                </div>
            `;
            this.videoPlayer.appendChild(overlay);
        } else if (this.youtubePlayer && this.youtubePlayer.getIframe) {
            // For YouTube videos, hide the iframe but keep it playing
            const iframe = this.youtubePlayer.getIframe();
            if (iframe) {
                iframe.style.display = 'none';
                
                // Show audio only overlay
                const existingOverlay = document.getElementById('audioOnlyOverlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }
                
                const overlay = document.createElement('div');
                overlay.id = 'audioOnlyOverlay';
                overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #000;
                    color: white;
                    text-align: center;
                    z-index: 10;
                `;
                overlay.innerHTML = `
                    <div>
                        <i class="fas fa-music" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Audio Only Mode</p>
                        <p style="font-size: 0.9rem; opacity: 0.7;">Video disabled to save data</p>
                    </div>
                `;
                this.videoPlayer.appendChild(overlay);
            }
        }
    }

    removeAudioOnlyMode() {
        // Remove audio only overlay
        const overlay = document.getElementById('audioOnlyOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        const video = document.getElementById('syncVideo');
        
        if (video) {
            // For local videos, just show the video element again
            video.style.display = 'block';
        } else if (this.youtubePlayer && this.youtubePlayer.getIframe) {
            // For YouTube videos, show the iframe again
            const iframe = this.youtubePlayer.getIframe();
            if (iframe) {
                iframe.style.display = 'block';
            }
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.videoPlayer.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    updateProgressBar(currentTime, duration) {
        if (duration > 0) {
            const percentage = (currentTime / duration) * 100;
            this.progressFill.style.width = percentage + '%';
            this.currentTime.textContent = this.formatTime(currentTime);
            this.duration.textContent = this.formatTime(duration);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    seekTo(percentage) {
        const video = document.getElementById('syncVideo');
        
        if (video && video.duration) {
            const newTime = video.duration * percentage;
            video.currentTime = newTime;
            this.socket.emit('videoSeeked', { currentTime: newTime });
        } else if (this.youtubePlayer && this.youtubePlayer.getDuration) {
            const duration = this.youtubePlayer.getDuration();
            const newTime = duration * percentage;
            this.youtubePlayer.seekTo(newTime, true);
            this.socket.emit('videoSeeked', { currentTime: newTime });
        }
    }

    shuffleQueue() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
        this.currentIndex = 0;
        this.updateQueueDisplay();
        this.socket.emit('queueUpdated', { queue: this.queue });
        this.showToast('Queue shuffled', 'success');
    }

    clearQueue() {
        this.queue = [];
        this.currentIndex = 0;
        this.updateQueueDisplay();
        this.socket.emit('queueUpdated', { queue: this.queue });
        this.showToast('Queue cleared', 'success');
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.results-container').forEach(container => container.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Results`).classList.add('active');
    }

    handleVideoChanged(data) {
        this.loadVideo(data.video);
        this.currentIndex = data.index;
        this.updateQueueDisplay();
    }

    handleQueueUpdated(data) {
        this.queue = data.queue;
        this.updateQueueDisplay();
    }

    handlePlaybackStateChanged(data) {
        this.isPlaying = data.isPlaying;
        this.updatePlayPauseButton();
        
        const video = document.getElementById('syncVideo');
        if (video) {
            this.isSyncing = true;
            if (data.isPlaying) {
                video.play();
            } else {
                video.pause();
            }
            
            if (data.currentTime !== undefined) {
                const timeDiff = Math.abs(video.currentTime - data.currentTime);
                if (timeDiff > 1) {
                    video.currentTime = data.currentTime;
                }
            }
            
            setTimeout(() => {
                this.isSyncing = false;
            }, 100);
        } else if (this.youtubePlayer && this.youtubePlayer.playVideo) {
            this.isSyncing = true;
            if (data.isPlaying) {
                this.youtubePlayer.playVideo();
            } else {
                this.youtubePlayer.pauseVideo();
            }
            
            if (data.currentTime !== undefined) {
                const currentTime = this.youtubePlayer.getCurrentTime();
                const timeDiff = Math.abs(currentTime - data.currentTime);
                if (timeDiff > 1) {
                    this.youtubePlayer.seekTo(data.currentTime, true);
                }
            }
            
            setTimeout(() => {
                this.isSyncing = false;
            }, 100);
        }
    }

    handleVideoSeeked(data) {
        const video = document.getElementById('syncVideo');
        if (video) {
            this.isSyncing = true;
            video.currentTime = data.currentTime;
            setTimeout(() => {
                this.isSyncing = false;
            }, 100);
        } else if (this.youtubePlayer && this.youtubePlayer.seekTo) {
            this.isSyncing = true;
            this.youtubePlayer.seekTo(data.currentTime, true);
            setTimeout(() => {
                this.isSyncing = false;
            }, 100);
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('active', show);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the application
const app = new FusionRoom();