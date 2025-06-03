
# XMPP Chat Application

A modern, real-time chat application built with React and XMPP protocol, featuring end-to-end encryption, file sharing, and comprehensive messaging capabilities.

## 🚀 Features

### Core Messaging
- **Real-time messaging** with instant delivery and read receipts
- **Direct chats** and **group chat rooms** (MUC - Multi-User Chat)
- **Message status tracking** (sent, delivered, read)
- **Typing indicators** with real-time chat state notifications
- **Message reactions** with emoji support
- **File sharing** with support for images, documents, and media
- **Polls** with multiple choice options and real-time voting

### Security & Privacy
- **OMEMO encryption** support for end-to-end encrypted messaging
- **Automatic encryption detection** and fallback handling
- **Privacy-focused** design with secure message handling

### User Management
- **Contact management** with presence status tracking
- **User discovery** and search capabilities
- **Server user browsing** with JID-based search
- **Automatic roster synchronization**
- **Presence states** (online, away, do not disturb, extended away)

### Room Management
- **Create and manage chat rooms** with custom configurations
- **Room permissions** and affiliation management (owner, admin, member)
- **Persistent rooms** with configurable privacy settings
- **Room descriptions** and avatar support
- **Real-time participant tracking**

### Advanced Features
- **Message Archive Management (MAM)** for message history synchronization
- **Connection health monitoring** with automatic reconnection
- **Push notifications** with customizable settings
- **Offline message handling** and synchronization
- **Responsive design** optimized for desktop and mobile

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive, utility-first styling
- **shadcn/ui** component library for consistent UI elements
- **Zustand** for global state management with persistence

### XMPP Integration
- **@xmpp/client** for WebSocket-based XMPP connections
- **ejabberd server** integration (ejabberd.voicehost.io)
- **XEP compliance** for standard XMPP extensions:
  - XEP-0085: Chat State Notifications (typing indicators)
  - XEP-0184: Message Delivery Receipts
  - XEP-0313: Message Archive Management (MAM)
  - XEP-0384: OMEMO Encryption
  - XEP-0045: Multi-User Chat (MUC)

### State Management
- **Modular store architecture** with specialized modules:
  - Connection management and health monitoring
  - Message handling and synchronization
  - Presence and contact management
  - Room and MUC operations
  - Typing indicators and chat states
  - Notification system
  - OMEMO encryption handling

### Key Components
- **ChatInterface**: Main application layout with sidebar and chat area
- **Sidebar**: Contact and room management with search functionality
- **ChatArea**: Message display, input, and real-time interactions
- **Connection management**: Automatic reconnection and health checks
- **Stanza handlers**: Protocol-specific message processing

## 🛠️ Technical Features

### Connection Management
- **WebSocket connections** with automatic reconnection
- **Connection health monitoring** with ping/pong mechanisms
- **Graceful error handling** and connection recovery
- **Session persistence** with state restoration

### Message Processing
- **Real-time stanza handling** for all XMPP message types
- **MAM integration** for message history synchronization
- **Receipt tracking** for delivery and read confirmations
- **Chat state processing** for typing indicators
- **File attachment handling** with out-of-band (OOB) data

### Data Persistence
- **Local storage integration** with Zustand persistence
- **Read status tracking** across sessions
- **User preferences** and notification settings
- **Connection state restoration**

## 🔧 Development

### Prerequisites
- Node.js & npm (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Setup
```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🔗 XMPP Server Configuration

### Required Server Features
- WebSocket connections (RFC 7395)
- Message Archive Management (XEP-0313)
- Multi-User Chat (XEP-0045)
- Service Discovery (XEP-0030)
- Message Delivery Receipts (XEP-0184)
- Chat State Notifications (XEP-0085)

## 📱 Browser Support

- Modern browsers with WebSocket support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers on iOS and Android

## 🔐 Security Considerations

- OMEMO encryption for end-to-end security
- Secure WebSocket connections (WSS)
- No sensitive data stored in local storage
- Automatic session cleanup on disconnect

## 📄 License

AGPL-3.0

---