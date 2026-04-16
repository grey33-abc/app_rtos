require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db.config');
const initData = require('./services/init.service');
const { initMqtt } = require('./services/mqtt.service');
const apiRoutes = require('./routes/api.routes');
const notificationRoutes = require('./routes/notification.routes');


connectDB();
initData();

const app = express();
app.use(cors());
app.use(express.json());


const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});


initMqtt(io);


app.use('/api', apiRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(` Server chạy tại port ${PORT}`));