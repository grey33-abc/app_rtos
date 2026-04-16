const Door = require('../models/Door');

exports.login = async (req, res) => {
    try {
        const { password } = req.body;
        const door = await Door.findOne();
        if (!door) return res.status(404).json({ msg: 'Lỗi: Chưa cấu hình cửa trong DB!' });
        if (door.password !== password) return res.status(401).json({ msg: 'Mật khẩu không chính xác!' });
        res.json({ success: true, msg: 'Đăng nhập thành công!' });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
};
