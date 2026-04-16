const Door = require('../models/Door');
const Device = require('../models/Device');

const initData = async () => {
    try {
        const doorCount = await Door.countDocuments();
        if (doorCount === 0) {
            await Door.create({ password: '4242', status: 'CLOSED' });
            console.log(' Đã tạo mật khẩu cửa mặc định: 4242');
        }

        const antiTheft = await Device.findOne({ type: 'ANTI_THEFT' });
        if (!antiTheft) {
            await Device.create({ name: 'Chống Trộm', type: 'ANTI_THEFT', device_id: 0, status: false });
            console.log(' Đã tạo thiết bị ANTI_THEFT mặc định');
        }
    } catch (e) {
        console.log('Lỗi khởi tạo dữ liệu:', e);
    }
};

module.exports = initData;
