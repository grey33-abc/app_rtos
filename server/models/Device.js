const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    name: String,
    type: String,
    device_id: { type: Number, default: 0 },
    status: { type: Boolean, default: false },
    isConnected: { type: Boolean, default: false }
});

module.exports = mongoose.model('Device', DeviceSchema);
