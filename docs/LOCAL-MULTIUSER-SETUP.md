# Local Multi-User Setup Guide

## 🎯 Goal: Showcase Multi-User Collaboration Locally

This guide demonstrates how to add real-time multi-user collaboration to your Electron-based workspace app **before** cloud hosting. Users can collaborate on the same machine or within a local network.

---

## 🏗️ Architecture Overview

### Current Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Electron Main Process (Node.js)
- **Database**: SQLite (better-sqlite3)
- **AI**: Anthropic SDK

### Multi-User Architecture (Local)
```
┌─────────────────────────────────────────────────┐
│         Local Network (192.168.x.x)             │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Browser  │  │ Browser  │  │ Browser  │     │
│  │  Client  │  │  Client  │  │  Client  │     │
│  │   :3000  │  │   :3000  │  │   :3000  │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │             │             │             │
│       └─────────────┴─────────────┘             │
│                     │                           │
│              WebSocket (Socket.io)              │
│                     │                           │
│       ┌─────────────▼─────────────┐             │
│       │  Node.js Server (:3001)   │             │
│       │  - WebSocket Server       │             │
│       │  - Workspace State Sync   │             │
│       │  - User Presence          │             │
│       └─────────────┬─────────────┘             │
│                     │                           │
│       ┌─────────────▼─────────────┐             │
│       │     SQLite Database       │             │
│       │  - Workspace State        │             │
│       │  - Widget Positions       │             │
│       │  - User Sessions          │             │
│       └───────────────────────────┘             │
│                                                  │
│       ┌───────────────────────────┐             │
│       │  Electron Main Process    │             │
│       │  - Claude Code Instances  │             │
│       │  - File System Operations │             │
│       └───────────────────────────┘             │
└─────────────────────────────────────────────────┘
```

---

## 📋 Implementation Plan

### Phase 1: Convert Electron to Hybrid Mode ✅ Quick Win
**Goal**: Run frontend as web server, keep Electron features via API

#### Step 1.1: Add WebSocket Server
```bash
pnpm add socket.io express cors
pnpm add -D @types/express @types/cors
```

#### Step 1.2: Create Multi-User Server
Create `src/server/multiuser-server.ts`:
- WebSocket server for real-time sync
- REST API for workspace operations
- Bridge to Electron main process
- User session management

#### Step 1.3: Modify Electron Main Process
Update `src/main/index.ts`:
- Start multi-user server on port 3001
- Expose IPC handlers as HTTP endpoints
- Keep Electron for single-user mode (optional)

#### Step 1.4: Update Frontend
Update `src/Canvas.tsx` and components:
- Connect to WebSocket server
- Broadcast widget changes to all clients
- Receive real-time updates from other users
- Show user presence indicators

---

### Phase 2: Real-Time State Synchronization

#### 2.1: Workspace State Events
```typescript
// Events to broadcast
interface WorkspaceEvents {
  'widget:created': WidgetData
  'widget:updated': WidgetData
  'widget:deleted': { widgetId: string }
  'widget:moved': { widgetId: string, position: Position }
  'widget:resized': { widgetId: string, size: Size }
  'user:joined': UserPresence
  'user:left': { userId: string }
  'user:cursor': { userId: string, position: Position }
  'canvas:pan': { pan: { x: number, y: number } }
  'canvas:zoom': { scale: number }
}
```

#### 2.2: Conflict Resolution Strategy
**Last Write Wins (LWW)** with timestamps:
```typescript
interface WidgetUpdate {
  widgetId: string
  timestamp: number
  userId: string
  data: Partial<Widget>
}
```

#### 2.3: Database Schema Updates
Add to `src/main/DatabaseService.ts`:
```sql
-- User sessions table
CREATE TABLE user_sessions (
  session_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

-- Widget operation log for sync
CREATE TABLE widget_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  widget_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
```

---

### Phase 3: User Presence & Collaboration Features

#### 3.1: User Avatars & Cursors
```typescript
interface UserPresence {
  userId: string
  username: string
  color: string // Generated color per user
  cursor?: { x: number, y: number }
  activeWidget?: string
  isActive: boolean
}
```

#### 3.2: Visual Indicators
- Colored cursor dots with username labels
- Widget borders showing who's editing
- User list in toolbar
- Activity notifications

#### 3.3: Chat/Comments (Optional)
Simple message panel for team communication

---

## 🚀 Quick Start Implementation

### Option A: Minimal WebSocket Sync (Fastest - 2-3 hours)

**What you get:**
- Multiple browsers can open http://localhost:3000
- Widget changes broadcast to all clients
- Basic user presence

**Implementation:**
1. Add Socket.io server in separate Node process
2. Connect React frontend to WebSocket
3. Broadcast widget CRUD operations
4. No authentication (just username prompt)

### Option B: Full Local Network Collaboration (4-6 hours)

**What you get:**
- All Option A features
- Other computers on network can join
- User authentication (simple)
- Cursor tracking
- Operation history

**Implementation:**
1. Express server with Socket.io
2. User session management
3. Database-backed state persistence
4. Network configuration for LAN access

---

## 🔧 Configuration for Local Network

### Step 1: Get Your Local IP
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"
```

Example output: `192.168.1.100`

### Step 2: Update Vite Config
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000,
    strictPort: true,
  }
})
```

### Step 3: Start Multi-User Server
```bash
# Terminal 1: WebSocket Server
npm run server:multiuser

# Terminal 2: Frontend
npm run dev:vite

# Terminal 3: Electron (optional for host machine)
npm run dev:electron
```

### Step 4: Connect from Other Devices
On any device on the same network:
```
http://192.168.1.100:3000
```

---

## 📁 File Structure

```
src/
├── server/
│   ├── multiuser-server.ts       # Main WebSocket + Express server
│   ├── workspace-sync.ts          # State synchronization logic
│   ├── user-manager.ts            # User session management
│   └── electron-bridge.ts         # Bridge to Electron IPC
├── services/
│   ├── SocketService.ts           # Client-side Socket.io wrapper
│   └── CollaborationService.ts    # Client collaboration logic
├── hooks/
│   ├── useMultiUser.ts            # Hook for multi-user features
│   └── usePresence.ts             # Hook for user presence
└── components/
    ├── UserCursor.tsx             # Remote user cursor component
    ├── UserList.tsx               # Active users list
    └── PresenceIndicator.tsx      # Online status indicator
```

---

## 🎨 UI/UX Enhancements

### 1. User Identification
```typescript
// On first connect, prompt for username
const username = prompt('Enter your name:') || 'Anonymous';
socket.emit('user:join', { username });
```

### 2. Color-Coded Collaboration
```typescript
// Assign unique color to each user
const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', 
  '#FFA07A', '#98D8C8', '#F7DC6F'
];

function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0
  );
  return userColors[hash % userColors.length];
}
```

### 3. Widget Locks (Optional)
Prevent conflicts by locking widgets during editing:
```typescript
socket.emit('widget:lock', { widgetId });
// Show locked by [username] indicator
socket.emit('widget:unlock', { widgetId });
```

---

## 🧪 Testing Multi-User Locally

### Test 1: Same Machine
1. Open 3 browser tabs at `http://localhost:3000`
2. Create widget in Tab 1
3. Verify it appears in Tab 2 & 3 instantly
4. Move widget in Tab 2
5. Verify position updates in Tab 1 & 3

### Test 2: Local Network
1. Start server on your machine
2. Note your IP: `192.168.1.100`
3. On phone/tablet, open `http://192.168.1.100:3000`
4. On another laptop, open same URL
5. Test real-time collaboration

### Test 3: Performance
1. Open 5+ browser tabs
2. Create 20+ widgets rapidly
3. Monitor for lag or sync issues
4. Check WebSocket message rates in DevTools

---

## 🐛 Troubleshooting

### Issue: Clients Can't Connect
```bash
# Check firewall (macOS)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Allow Node.js through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node

# Check if port is listening
lsof -i :3000
lsof -i :3001
```

### Issue: State Out of Sync
- Implement operation timestamps
- Add client-side reconciliation
- Use operational transformation for conflicts

### Issue: High Latency
- Add message throttling (debounce position updates)
- Batch updates into single messages
- Optimize database writes (async/batched)

---

## 📊 Performance Optimization

### 1. Throttle Position Updates
```typescript
// Only send position every 50ms during drag
const throttledPositionUpdate = throttle((widgetId, position) => {
  socket.emit('widget:moved', { widgetId, position });
}, 50);
```

### 2. Batch Database Writes
```typescript
// Queue updates and flush every 100ms
class BatchWriter {
  private queue: WidgetUpdate[] = [];
  
  add(update: WidgetUpdate) {
    this.queue.push(update);
  }
  
  flush() {
    if (this.queue.length > 0) {
      db.saveWidgetBatch(this.queue);
      this.queue = [];
    }
  }
}
```

### 3. Optimize Widget Rendering
```typescript
// Use React.memo for widget components
const Widget = React.memo(({ data }) => {
  // Only re-render if data actually changed
}, (prev, next) => {
  return prev.data.position === next.data.position 
    && prev.data.size === next.data.size;
});
```

---

## 🎯 Success Criteria

✅ **Demo Ready** when you can:
1. Open app on 2+ devices on same network
2. Create widget on Device A → appears on Device B instantly
3. Move widget on Device B → updates on Device A in real-time
4. See list of active users
5. (Bonus) See each user's cursor position

---

## 📈 Next Steps After Local Success

Once local multi-user works:
1. **Record demo video** showing collaboration
2. **Gather feedback** on UX
3. **Test edge cases** (network drops, concurrent edits)
4. **Prepare for cloud deployment** (see CLOUD-HOSTING-GUIDE.md)

---

## 🔐 Security Considerations (Local)

**For local network demo:**
- Simple username-based identification (no passwords)
- No data encryption needed (trusted network)
- No HTTPS required

**For production** (covered in cloud guide):
- Add authentication (JWT, OAuth)
- Encrypt WebSocket connections (WSS)
- Implement authorization/permissions
- Sanitize all inputs

---

## 💡 Pro Tips

1. **Use your phone as second client** - easiest way to test without second computer
2. **Keep DevTools open** - Monitor WebSocket messages in Network tab
3. **Add debug logging** - Log all sync events during development
4. **Test offline recovery** - Disconnect/reconnect clients to verify state sync
5. **Monitor SQLite size** - Operation log can grow quickly, add cleanup

---

## 📚 Resources

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Operational Transformation Explained](https://operational-transformation.github.io/)
- [Y.js for CRDT](https://docs.yjs.dev/) - Advanced alternative
- [Electron IPC Best Practices](https://www.electronjs.org/docs/latest/tutorial/ipc)

---

## 🎬 Demo Script

**"Hey team, check out real-time collaboration!"**

1. Open app on laptop (192.168.1.100:3000)
2. Open app on phone (same URL)
3. Laptop: "I'll create a new agent widget"
4. Phone: "Look, it appeared on my screen instantly!"
5. Phone: Drag widget around
6. Laptop: "See it moving in real-time!"
7. Open third tab: "Another user can join and see everything"
8. Show user presence list

**Impact**: Proof that your app can support team collaboration before investing in cloud infrastructure.

---

*Ready to implement? See example code in `examples/multiuser-implementation/`*
