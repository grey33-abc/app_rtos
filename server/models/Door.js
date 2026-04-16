const mongoose = require('mongoose');

const DoorSchema = new mongoose.Schema({
    password: { type: String, default: '4242' },
    status: { type: String, default: 'CLOSED' }
});

module.exports = mongoose.model('Door', DoorSchema);
