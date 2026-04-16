const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const sensorController = require('../controllers/sensor.controller');
const deviceController = require('../controllers/device.controller');
const doorController = require('../controllers/door.controller');

router.get('/sensor/history', sensorController.getHistory);


router.get('/dashboard', deviceController.getDashboard);
router.post('/devices/control', deviceController.controlDevice);
router.post('/login', authController.login);

router.post('/door/change-password', doorController.changePassword);

module.exports = router;