const Device = require('../models/Device');
const Door = require('../models/Door');
const { publishMqtt } = require('../services/mqtt.service');

exports.getDashboard = async (req, res) => {
    try {
        const devices = await Device.find();
        const door = await Door.findOne();
        res.json({ devices, doorStatus: door ? door.status : 'CLOSED' });
    } catch (e) {
        res.status(500).json({ msg: e.message });
    }
};

exports.controlDevice = async (req, res) => {
    try {
        const { type, id, value } = req.body;

        if (type === 'PCF_LED') {
            await Device.findOneAndUpdate({ type: 'PCF_LED', device_id: id }, { status: !!value });
        } else if (type === 'MAIN_LED') {
            await Device.findOneAndUpdate({ type: 'MAIN_LED' }, { status: !!value });
        } else if (type === 'ANTI_THEFT') {
            await Device.findOneAndUpdate({ type: 'ANTI_THEFT' }, { status: !!value });
        }

        const command = JSON.stringify({ type, id: id || 0, val: value ? 1 : 0 });
        publishMqtt('home/control', command);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
};
