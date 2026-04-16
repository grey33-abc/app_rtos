const Door = require('../models/Door');
const { publishMqtt } = require('../services/mqtt.service');

exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword || newPassword.length !== 4) {
            return res.status(400).json({ msg: 'Mật khẩu mới phải là 4 số!' });
        }

        const door = await Door.findOne();
        if (!door) return res.status(404).json({ msg: 'Lỗi DB: Không tìm thấy cửa!' });
        if (door.password !== oldPassword) return res.status(400).json({ msg: 'Mật khẩu cũ không chính xác!' });

        door.password = newPassword;
        await door.save();

        publishMqtt('home/door/password', newPassword);
        console.log(` Đổi mật khẩu thành công: ${newPassword}`);
        res.json({ success: true, msg: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
};
