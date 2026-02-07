require('dotenv').config();
const http = require('http');
const app = require('./app');
const socketUtil = require('./utils/socket');

const server = http.createServer(app);

// Initialize Socket.io
socketUtil.init(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
