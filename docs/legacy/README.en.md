# Chatlog Web

<div align="center">

![Chatlog Web Logo](https://img.shields.io/badge/Chatlog-Web-blue?style=for-the-badge&logo=vue.js&logoColor=white)

**Modern Vue.js-based Chat Log Visualization and Management System**

[![Vue](https://img.shields.io/badge/Vue.js-3.3.0-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.3.0-409EFF?style=flat&logo=element&logoColor=white)](https://element-plus.org/)
[![ECharts](https://img.shields.io/badge/ECharts-5.6.0-AA344D?style=flat&logo=apache-echarts&logoColor=white)](https://echarts.apache.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green?style=flat)](LICENSE)

English | [简体中文](README.md)

</div>

## 📖 About

Chatlog Web is a modern web management interface for the [chatlog](https://github.com/sjzar/chatlog) project, providing powerful chat log visualization analysis and management features. Through intuitive charts and data analysis, it helps users better understand and explore their chat data.

### ✨ Key Features

- 🎯 **Real-time Data Analysis** - Deep data analysis based on actual chat records
- 📊 **Stunning Data Visualization** - 6 professional charts showcasing chat trends and patterns
- 🔥 **User Behavior Insights** - Activity heatmaps and time distribution analysis
- 💬 **Smart Content Analysis** - Message type recognition and high-frequency word extraction
- 🏆 **Chat Group Activity Rankings** - TOP10 most active chat groups
- 📱 **Responsive Design** - Perfect adaptation for desktop and mobile devices
- 🎨 **Modern UI** - Element Plus + gradient animations + card design
- ⚡ **High Performance** - Asynchronous data loading + smart caching

## 🚀 Demo Screenshots

### 🏠 Management Dashboard

<div align="center">
<img src="images/dashboard.jpg" alt="Management Dashboard" width="70%" />
</div>

*📊 Data Overview | 📈 Mini Charts | 🚀 Quick Actions | 📝 Recent Sessions*

### 📊 Analytics Dashboard

<div align="center">
<img src="images/analytics.jpg" alt="Analytics Dashboard" width="70%" />
</div>

*📈 Message Trends | 🔥 User Activity Heatmap | 🥧 Chat Type Distribution | ☁️ Word Frequency | ⏰ 24h Activity | 🏆 Group Rankings*

## 📋 Prerequisites

Before using Chatlog Web, you need to install and run the [chatlog](https://github.com/sjzar/chatlog) backend service:

### 1. Install Chatlog Backend

```bash
# Method 1: Install from source
go install github.com/sjzar/chatlog@latest

# Method 2: Download precompiled version
# Visit https://github.com/sjzar/chatlog/releases
```

### 2. Get WeChat Data Key and Decrypt

```bash
# Start Terminal UI
chatlog

# Or use command line mode
chatlog key     # Get key
chatlog decrypt # Decrypt data
```

### 3. Start HTTP API Service

```bash
# Start service (default port 5030)
chatlog server

# Verify service status
curl http://127.0.0.1:5030/api/v1/session
```

> 📖 For detailed steps, refer to [chatlog official documentation](https://github.com/sjzar/chatlog#quick-start)

## ⚡ Quick Start

### Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

### Start Development Server

```bash
# Development mode (default port 8080)
npm run serve

# Access application
open http://localhost:8080
```

### Build for Production

```bash
# Build production version
npm run build

# Preview build result
npm run preview
```

## 🎯 Features

### 📊 Analytics Page (`/analytics`)

- **📈 Real-time Statistics Overview**
  - Total messages based on actual chat records
  - Active users (deduplicated senders)
  - Daily average messages over 90 days
  - Response rate based on user activity

- **📊 Six Data Visualization Charts**

1. **📈 Message Trend Analysis**
   - Support for 7/30/90 day time ranges
   - Smooth curves with gradient fill effects
   - Based on real chat record data

2. **🔥 User Activity Heatmap**
   - 24-hour × 7-day activity matrix
   - Color depth mapping activity levels
   - Intuitive display of chat time distribution

3. **🥧 Chat Type Distribution**
   - Smart recognition: text/image/voice/video/file
   - Modern donut chart design
   - Hover enlargement effects

4. **☁️ High-frequency Word Analysis**
   - Automatic extraction of chat content keywords
   - Filter stop words for optimization
   - Word cloud visualization

5. **⏰ 24-hour Activity Distribution**
   - Analysis based on real message timestamps
   - 2-hour time segment statistics
   - Colorful bar chart display

6. **🏆 Chat Group Activity Rankings**
   - TOP10 most active chat groups
   - Horizontal bar chart display
   - Real-time data updates

### 🏠 Management Dashboard (`/`)

- **Quick Statistics** - Total contacts, groups, sessions
- **Mini Charts** - 7-day message trend preview
- **Quick Actions** - One-click navigation to feature modules
- **Recent Sessions** - Display recently active chat objects

### 📱 Other Feature Pages

- **👥 Contact Management** (`/contacts`) - View and manage contact information
- **🔍 Chat Log** (`/chatlog`) - Search and browse chat records
- **💬 Group Management** (`/chatrooms`) - Group chat information management
- **📂 Session List** (`/sessions`) - Recent session overview
- **📎 Media Management** (`/media`) - Image, video, file management

## 🛠️ Tech Stack

### Frontend Framework
- **Vue.js 3.3** - Progressive JavaScript framework
- **Vue Router 4.2** - Official routing manager
- **Vuex 4.0** - State management pattern

### UI Component Library
- **Element Plus 2.3** - Vue 3-based component library
- **Element Plus Icons** - Official icon library

### Data Visualization
- **ECharts 5.6** - Powerful data visualization library
- **Vue-ECharts 7.0** - ECharts wrapper for Vue 3

### Development Tools
- **Vue CLI 5.0** - Vue.js development toolchain
- **ESLint** - JavaScript code linting tool
- **Babel** - JavaScript compiler

### Styling and Animation
- **CSS3** - Modern CSS features
- **Animate.css** - CSS animation library
- **Custom Theme** - Customized design based on Element Plus

## 📊 Data Interfaces

Chatlog Web retrieves data through the following API interfaces:

| Interface | Method | Description |
|-----------|--------|-------------|
| `/api/v1/chatlog` | GET | Get chat records |
| `/api/v1/contact` | GET | Get contact list |
| `/api/v1/chatroom` | GET | Get group chat list |
| `/api/v1/session` | GET | Get session list |
| `/image/<id>` | GET | Get image resources |
| `/video/<id>` | GET | Get video resources |
| `/voice/<id>` | GET | Get voice resources |

> For detailed API documentation, refer to [chatlog API documentation](https://github.com/sjzar/chatlog#http-api)

## 🚀 Deployment Guide

### Development Environment

```bash
# 1. Start chatlog backend service
chatlog server

# 2. Start frontend development server
npm run serve

# 3. Access application
open http://localhost:8080
```

### Production Environment

```bash
# 1. Build production version
npm run build

# 2. Deploy to web server
# Deploy dist/ directory to Nginx, Apache, etc.
```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile
FROM node:16-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🤝 Contributing

We welcome all forms of contributions! Please check the [Contributing Guide](CONTRIBUTING.md) for detailed information.

### Development Workflow

1. Fork this project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Create Pull Request

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version update history.

## 🐛 Issue Reporting

If you encounter any problems or have improvement suggestions, please:

1. Check [FAQ](docs/FAQ.md)
2. Search existing [Issues](https://github.com/sinyu1012/chatlog-web/issues)
3. Create new Issue with detailed information

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

## 🙏 Acknowledgments

- [chatlog](https://github.com/sjzar/chatlog) - Powerful chat log backend service
- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [Element Plus](https://element-plus.org/) - Excellent Vue 3 component library
- [ECharts](https://echarts.apache.org/) - Professional data visualization library
- [Animate.css](https://animate.style/) - CSS animation library

## 📞 Contact Us

- **Project Homepage**: https://github.com/sinyu1012/chatlog-web
- **Issue Reports**: https://github.com/sinyu1012/chatlog-web/issues
- **Feature Suggestions**: https://github.com/sinyu1012/chatlog-web/discussions

---

<div align="center">

**⭐ If this project helps you, please give us a star!**

Made with ❤️ by Chatlog Web Team

</div> 