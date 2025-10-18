const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Helper function to format YouTube duration (PT4M13S -> 4:13)
function formatDuration(duration) {
    if (!duration || duration === 'Unknown') return 'Unknown';
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'Unknown';
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// YouTube search endpoint
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        // Use YouTube Data API v3 for real search results
        const apiKey = 'AIzaSyCURsBR0NEHSecNtcOMEMVcsxcyqq5UFaE';
        const maxResults = 20;
        
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`
        );
        
        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            // Get video details including duration
            const videoIds = data.items.map(item => item.id.videoId).join(',');
            const detailsResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
            );
            
            let videoDetails = {};
            if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json();
                videoDetails = detailsData.items.reduce((acc, item) => {
                    acc[item.id] = item.contentDetails.duration;
                    return acc;
                }, {});
            }
            
            const results = data.items.map(item => {
                const duration = videoDetails[item.id.videoId] || 'Unknown';
                return {
                    id: item.id.videoId,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : item.snippet.thumbnails.default.url,
                    duration: formatDuration(duration)
                };
            });
            
            res.json({ items: results });
            return;
        }
        
        // Fallback to mock data if API fails or returns no results
        console.log('Using fallback data for query:', query);
        
        // Expanded video database with more variety (fallback)
        const searchResults = [
            // Pop Music
            {
                id: 'dQw4w9WgXcQ',
                title: 'Never Gonna Give You Up - Rick Astley',
                channel: 'Rick Astley',
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
                duration: '3:33',
                tags: ['pop', 'rick', 'astley', 'never', 'gonna', 'give', 'up']
            },
            {
                id: 'kJQP7kiw5Fk',
                title: 'Despacito - Luis Fonsi ft. Daddy Yankee',
                channel: 'Luis Fonsi',
                thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
                duration: '4:42',
                tags: ['despacito', 'luis', 'fonsi', 'daddy', 'yankee', 'spanish', 'pop', 'latin']
            },
            {
                id: 'YQHsXMglC9A',
                title: 'Adele - Hello',
                channel: 'Adele',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '4:55',
                tags: ['adele', 'hello', 'pop', 'ballad', 'soul']
            },
            {
                id: 'JGwWNGJdvx8',
                title: 'Ed Sheeran - Shape of You',
                channel: 'Ed Sheeran',
                thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg',
                duration: '3:53',
                tags: ['ed', 'sheeran', 'shape', 'you', 'pop', 'acoustic']
            },
            {
                id: '9bZkp7q19f0',
                title: 'PSY - GANGNAM STYLE',
                channel: 'officialpsy',
                thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg',
                duration: '4:12',
                tags: ['psy', 'gangnam', 'style', 'korean', 'kpop', 'dance']
            },
            
            // Rock Music
            {
                id: 'hTWKbfoikeg',
                title: 'Nirvana - Smells Like Teen Spirit',
                channel: 'Nirvana',
                thumbnail: 'https://img.youtube.com/vi/hTWKbfoikeg/mqdefault.jpg',
                duration: '5:01',
                tags: ['nirvana', 'smells', 'like', 'teen', 'spirit', 'grunge', 'rock', 'kurt', 'cobain']
            },
            {
                id: 'fJ9rUzIMcZQ',
                title: 'Queen - Bohemian Rhapsody',
                channel: 'Queen Official',
                thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg',
                duration: '5:55',
                tags: ['queen', 'bohemian', 'rhapsody', 'freddie', 'mercury', 'rock', 'opera']
            },
            {
                id: 'YlUKcNNmywk',
                title: 'Red Hot Chili Peppers - Californication',
                channel: 'Red Hot Chili Peppers',
                thumbnail: 'https://img.youtube.com/vi/YlUKcNNmywk/mqdefault.jpg',
                duration: '5:29',
                tags: ['red', 'hot', 'chili', 'peppers', 'californication', 'rock', 'funk']
            },
            {
                id: 'L_jWHffIx5E',
                title: 'Smash Mouth - All Star',
                channel: 'Smash Mouth',
                thumbnail: 'https://img.youtube.com/vi/L_jWHffIx5E/mqdefault.jpg',
                duration: '3:20',
                tags: ['smash', 'mouth', 'all', 'star', 'shrek', 'pop', 'rock']
            },
            
            // Electronic/Dance
            {
                id: 'CevxZvSJLk8',
                title: 'Daft Punk - Get Lucky',
                channel: 'Daft Punk',
                thumbnail: 'https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg',
                duration: '4:08',
                tags: ['daft', 'punk', 'get', 'lucky', 'electronic', 'disco', 'funk']
            },
            {
                id: 'YQHsXMglC9A',
                title: 'Avicii - Wake Me Up',
                channel: 'Avicii',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '4:10',
                tags: ['avicii', 'wake', 'me', 'up', 'edm', 'electronic', 'dance']
            },
            
            // Hip Hop/Rap
            {
                id: 'YQHsXMglC9A',
                title: 'Eminem - Lose Yourself',
                channel: 'Eminem',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '5:26',
                tags: ['eminem', 'lose', 'yourself', 'rap', 'hip', 'hop', '8', 'mile']
            },
            {
                id: 'YQHsXMglC9A',
                title: 'Kendrick Lamar - HUMBLE.',
                channel: 'Kendrick Lamar',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '2:57',
                tags: ['kendrick', 'lamar', 'humble', 'rap', 'hip', 'hop']
            },
            
            // Classical
            {
                id: 'YQHsXMglC9A',
                title: 'Ludovico Einaudi - Nuvole Bianche',
                channel: 'Ludovico Einaudi',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '5:57',
                tags: ['ludovico', 'einaudi', 'nuvole', 'bianche', 'classical', 'piano']
            },
            
            // Jazz
            {
                id: 'YQHsXMglC9A',
                title: 'Miles Davis - Kind of Blue',
                channel: 'Miles Davis',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '9:37',
                tags: ['miles', 'davis', 'kind', 'blue', 'jazz', 'trumpet']
            },
            
            // Country
            {
                id: 'YQHsXMglC9A',
                title: 'Johnny Cash - Hurt',
                channel: 'Johnny Cash',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '3:36',
                tags: ['johnny', 'cash', 'hurt', 'country', 'nine', 'inch', 'nails']
            },
            
            // Indie/Alternative
            {
                id: 'YQHsXMglC9A',
                title: 'Arctic Monkeys - Do I Wanna Know?',
                channel: 'Arctic Monkeys',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '4:32',
                tags: ['arctic', 'monkeys', 'do', 'i', 'wanna', 'know', 'indie', 'rock']
            },
            
            // Gaming Music
            {
                id: 'YQHsXMglC9A',
                title: 'Minecraft - C418 - Sweden',
                channel: 'C418',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '3:35',
                tags: ['minecraft', 'c418', 'sweden', 'gaming', 'ambient', 'electronic']
            },
            
            // Comedy
            {
                id: 'jNQXAC9IVRw',
                title: 'Me at the zoo',
                channel: 'jawed',
                thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
                duration: '0:19',
                tags: ['me', 'at', 'zoo', 'first', 'youtube', 'video', 'comedy']
            },
            
            // Educational
            {
                id: 'YQHsXMglC9A',
                title: 'Khan Academy - Introduction to Algebra',
                channel: 'Khan Academy',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '12:07',
                tags: ['khan', 'academy', 'algebra', 'math', 'education', 'tutorial']
            },
            
            // Nature/Relaxing
            {
                id: 'YQHsXMglC9A',
                title: 'Relaxing Music - Ocean Waves',
                channel: 'Relaxing Music',
                thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
                duration: '3:00:00',
                tags: ['relaxing', 'music', 'ocean', 'waves', 'meditation', 'sleep']
            }
        ];

        // Enhanced search algorithm with tags and fuzzy matching
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(' ').filter(word => word.length > 0);
        
        const filteredResults = searchResults.filter(video => {
            const titleLower = video.title.toLowerCase();
            const channelLower = video.channel.toLowerCase();
            const tagsLower = video.tags.map(tag => tag.toLowerCase());
            
            // Exact matches get highest priority
            if (titleLower.includes(queryLower) || channelLower.includes(queryLower)) {
                return true;
            }
            
            // Check if any query word matches title, channel, or tags
            const hasWordMatch = queryWords.some(word => 
                titleLower.includes(word) || 
                channelLower.includes(word) || 
                tagsLower.some(tag => tag.includes(word))
            );
            
            return hasWordMatch;
        });
        
        // Sort results by relevance (exact matches first, then word matches)
        filteredResults.sort((a, b) => {
            const aTitleLower = a.title.toLowerCase();
            const bTitleLower = b.title.toLowerCase();
            const aChannelLower = a.channel.toLowerCase();
            const bChannelLower = b.channel.toLowerCase();
            
            // Exact title match gets highest priority
            if (aTitleLower.includes(queryLower) && !bTitleLower.includes(queryLower)) return -1;
            if (!aTitleLower.includes(queryLower) && bTitleLower.includes(queryLower)) return 1;
            
            // Exact channel match gets second priority
            if (aChannelLower.includes(queryLower) && !bChannelLower.includes(queryLower)) return -1;
            if (!aChannelLower.includes(queryLower) && bChannelLower.includes(queryLower)) return 1;
            
            // Then by number of matching words
            const aWordMatches = queryWords.filter(word => 
                aTitleLower.includes(word) || aChannelLower.includes(word) || 
                a.tags.some(tag => tag.toLowerCase().includes(word))
            ).length;
            
            const bWordMatches = queryWords.filter(word => 
                bTitleLower.includes(word) || bChannelLower.includes(word) || 
                b.tags.some(tag => tag.toLowerCase().includes(word))
            ).length;
            
            return bWordMatches - aWordMatches;
        });

        res.json({ items: filteredResults });
    } catch (error) {
        console.error('Search error:', error);
        // Return fallback data on error
        const fallbackResults = [
            {
                id: 'dQw4w9WgXcQ',
                title: 'Never Gonna Give You Up - Rick Astley',
                channel: 'Rick Astley',
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
                duration: '3:33'
            },
            {
                id: 'jNQXAC9IVRw',
                title: 'Me at the zoo',
                channel: 'jawed',
                thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
                duration: '0:19'
            }
        ];
        res.json({ items: fallbackResults });
    }
});

// Store room data
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room
    socket.on('joinRoom', (data) => {
        const { roomCode, userName, userId } = data;
        
        if (!rooms.has(roomCode)) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const room = rooms.get(roomCode);
        const user = { id: userId, name: userName, socketId: socket.id, isOnline: true };
        
        room.users.set(userId, user);
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.userId = userId;

        // Notify others in the room
        socket.to(roomCode).emit('userJoined', { userName, userId });
        
        // Send room data to the new user
        socket.emit('roomJoined', {
            roomCode,
            userName,
            userId,
            users: Array.from(room.users.values()),
            currentVideo: room.currentVideo,
            queue: room.queue,
            isPlaying: room.isPlaying
        });

        // Update user count for all users in room
        io.to(roomCode).emit('userCountUpdated', { count: room.users.size });
    });

    // Create room
    socket.on('createRoom', (data) => {
        const { roomCode, userName, userId } = data;
        
        if (rooms.has(roomCode)) {
            socket.emit('error', { message: 'Room already exists' });
            return;
        }

        const room = {
            code: roomCode,
            users: new Map(),
            currentVideo: null,
            queue: [],
            isPlaying: false,
            currentTime: 0,
            createdAt: new Date()
        };

        const user = { id: userId, name: userName, socketId: socket.id, isOnline: true };
        room.users.set(userId, user);
        rooms.set(roomCode, room);
        
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.userId = userId;

        socket.emit('roomCreated', {
            roomCode,
            userName,
            userId
        });
    });

    // Video changed
    socket.on('videoChanged', (data) => {
        const { video, index } = data;
        const room = rooms.get(socket.roomCode);
        
        if (room) {
            room.currentVideo = video;
            room.currentIndex = index;
            socket.to(socket.roomCode).emit('videoChanged', { video, index });
        }
    });

    // Queue updated
    socket.on('queueUpdated', (data) => {
        const { queue } = data;
        const room = rooms.get(socket.roomCode);
        
        if (room) {
            room.queue = queue;
            socket.to(socket.roomCode).emit('queueUpdated', { queue });
        }
    });

    // Playback state changed
    socket.on('playbackStateChanged', (data) => {
        const { isPlaying, currentTime } = data;
        const room = rooms.get(socket.roomCode);
        
        if (room) {
            room.isPlaying = isPlaying;
            room.currentTime = currentTime || 0;
            socket.to(socket.roomCode).emit('playbackStateChanged', { 
                isPlaying, 
                currentTime: room.currentTime 
            });
        }
    });

    // Video seeked
    socket.on('videoSeeked', (data) => {
        const { currentTime } = data;
        const room = rooms.get(socket.roomCode);
        
        if (room) {
            room.currentTime = currentTime;
            socket.to(socket.roomCode).emit('videoSeeked', { currentTime });
        }
    });

    // User disconnected
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.roomCode && socket.userId) {
            const room = rooms.get(socket.roomCode);
            
            if (room && room.users.has(socket.userId)) {
                const user = room.users.get(socket.userId);
                room.users.delete(socket.userId);
                
                // Notify others in the room
                socket.to(socket.roomCode).emit('userLeft', { 
                    userName: user.name, 
                    userId: socket.userId 
                });
                
                // Update user count
                io.to(socket.roomCode).emit('userCountUpdated', { count: room.users.size });
                
                // Clean up empty rooms
                if (room.users.size === 0) {
                    rooms.delete(socket.roomCode);
                    console.log('Room deleted:', socket.roomCode);
                }
            }
        }
    });
});

// Clean up old rooms (older than 24 hours)
setInterval(() => {
    const now = new Date();
    for (const [roomCode, room] of rooms.entries()) {
        if (now - room.createdAt > 24 * 60 * 60 * 1000) {
            rooms.delete(roomCode);
            console.log('Cleaned up old room:', roomCode);
        }
    }
}, 60 * 60 * 1000); // Run every hour

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`FusionRoom server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to access the application`);
});
