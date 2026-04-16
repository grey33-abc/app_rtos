// Sensor history không còn dùng MongoDB model riêng
// Data cảm biến được stream trực tiếp qua MQTT → Socket.IO
exports.getHistory = async (req, res) => {
    res.json([]);
};
