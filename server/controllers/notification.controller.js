const PushToken = require('../models/PushToken');

exports.registerToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        await PushToken.findOneAndUpdate({ token }, { token }, { upsert: true });
        console.log(`Received Push Token: ${token}`);
        res.status(200).json({ message: 'Push token registered successfully' });
    } catch (error) {
        console.error('Error saving push token:', error);
        res.status(500).json({ error: error.message });
    }
};
