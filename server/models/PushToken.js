const mongoose = require('mongoose');

const PushTokenSchema = new mongoose.Schema({
    token: { type: String, unique: true }
});

module.exports = mongoose.model('PushToken', PushTokenSchema);
