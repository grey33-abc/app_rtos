const mqtt = require('mqtt');
const Device = require('../models/Device');
const Door = require('../models/Door');
const PushToken = require('../models/PushToken');

const MQTT_BROKER = 'mqtt://broker.emqx.io';
let mqttClient = null;

const initMqtt = (io) => {
    mqttClient = mqtt.connect(MQTT_BROKER);

    mqttClient.on('connect', () => {
        console.log(' Connected to MQTT broker');
        mqttClient.subscribe('home/sensors/data');
        mqttClient.subscribe('home/door/status');
        mqttClient.subscribe('home/devices/update');
        mqttClient.subscribe('home/status');
    });

    mqttClient.on('message', async (topic, message) => {
        const payloadStr = message.toString();

        if (topic === 'home/sensors/data') {
            try {
                const data = JSON.parse(payloadStr);
                console.log(' Nhận data từ ESP32:', data);
                io.emit('new_sensor_data', { ...data, timestamp: new Date() });

                const isFire = data.fire < 500;
                const isGas = data.gas < 800;
                const isThief = data.pir === 1 || data.vib === 1;
                const isDanger = isFire || isGas || isThief;

                io.emit('FIRE_ALERT', isDanger);

                if (isDanger && !global.isAlerting) {
                    global.isAlerting = true;

                    let title = '🚨 BÁO ĐỘNG KHẨN CẤP!';
                    let body = 'Hệ thống nhà thông minh phát hiện bất thường!';
                    if (isFire) body = 'Phát hiện LỬA trong nhà. Hãy kiểm tra ngay lập tức!';
                    else if (isGas) body = 'Cảnh báo rò rỉ khí GAS!';
                    else if (isThief) body = 'Phát hiện có đột nhập hoặc cạy phá cửa!';

                    try {
                        const tokens = await PushToken.find();
                        if (tokens.length > 0) {
                            const { Expo } = require('expo-server-sdk');
                            const expo = new Expo();
                            const messages = tokens
                                .filter(t => Expo.isExpoPushToken(t.token))
                                .map(t => ({ to: t.token, sound: 'default', title, body }));

                            const chunks = expo.chunkPushNotifications(messages);
                            for (const chunk of chunks) {
                                await expo.sendPushNotificationsAsync(chunk);
                            }
                            console.log(`Đã đẩy Push Notification cho ${messages.length} thiết bị`);
                        }
                    } catch (err) {
                        console.error('Lỗi khi đẩy Push Notification:', err);
                    }
                } else if (!isDanger) {
                    global.isAlerting = false;
                }
            } catch (e) {
                console.error(' Lỗi parse JSON sensor:', e.message);
            }
        }
        else if (topic === 'home/devices/update') {
            try {
                const data = JSON.parse(payloadStr);
                await Device.findOneAndUpdate(
                    { type: data.type, device_id: data.id },
                    { status: data.val === 1, isConnected: true }
                );
                io.emit('device_update', data);
                console.log(` Device Sync: ${data.type} #${data.id} -> ${data.val}`);
            } catch (e) {
                console.error(' Lỗi update Device DB:', e.message);
            }
        }
        else if (topic === 'home/door/status') {
            try {
                let statusVal = payloadStr;
                try {
                    const parsed = JSON.parse(payloadStr);
                    statusVal = parsed.status || parsed.val || payloadStr;
                } catch (e) {}

                console.log(`Door Status Update: ${statusVal}`);
                await Door.findOneAndUpdate({}, { status: statusVal });
                await Device.updateMany({}, { isConnected: true });

                io.emit('door_status_change', statusVal);
                io.emit('connection_status', true);
            } catch (e) {
                console.error(' Lỗi xử lý Door MQTT:', e.message);
            }
        }
        else if (topic === 'home/status') {
            const isOnline = payloadStr === 'ONLINE';
            await Device.updateMany({}, { isConnected: isOnline });
            io.emit('connection_status', isOnline);
            console.log(` System Status: ${payloadStr}`);
        }
    });
};

const publishMqtt = (topic, message) => {
    if (mqttClient && mqttClient.connected) {
        const payload = typeof message === 'object' ? JSON.stringify(message) : String(message);
        mqttClient.publish(topic, payload);
        console.log(` MQTT Sent [${topic}]: ${payload}`);
    } else {
        console.warn(' MQTT Disconnected. Cannot send message.');
    }
};

module.exports = { initMqtt, publishMqtt };
