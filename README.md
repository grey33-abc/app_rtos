# Smart Home Security System

Hệ thống nhà thông minh tích hợp giám sát an ninh, kiểm soát cửa, và cảnh báo khẩn cấp với điều khiển từ xa qua App mobile.

## Kiến trúc hệ thống

```
STM32 (FreeRTOS) ←→ ESP32 Bridge ←→ MQTT Broker ←→ Server (Node.js) ←→ App Mobile (React Native)
```

## Thành phần phần cứng

- **STM32**: Vi điều khiển chính chạy FreeRTOS
- **ESP32 Bridge**: Cầu nối WiFi/MQTT
- **Cảm biến**: DHT22 (nhiệt độ/độ ẩm), MQ2 (gas), Flame sensor, PIR (chuyển động), Vibration sensor
- **Thiết bị xuất**: Servo (cửa), Buzzer, LED, LCD 16x2, OLED 128x64
- **Thiết bị nhập**: Keypad 4x4, Button

## Thành phần phần mềm

### 1. STM32 Firmware (`stm32_core/`)
- **FreeRTOS Tasks**:
  - `taskSensors`: Đọc cảm biến (DHT22, gas, lửa)
  - `taskAntiTheft`: Giám sát PIR/VIB khi bật chống trộm
  - `taskAlarm`: Điều khiển còi/đèn cảnh báo
  - `taskKeypadDoor`: Xử lý nhập mật khẩu, mở cửa
  - `taskButton`: Bật/tắt chống trộm bằng nút nhấn
  - `taskLCD`: Hiển thị thông tin lên LCD
  - `taskOLED`: Hiển thị dashboard lên OLED
  - `taskSerialSync`: Giao tiếp UART với ESP32

### 2. ESP32 Bridge (`esp32_bridge/`)
- Kết nối WiFi và MQTT broker (broker.emqx.io)
- Nhận data từ STM32 qua UART → publish lên MQTT
- Subscribe MQTT nhận lệnh → forward xuống STM32 qua UART

### 3. Server (`server/`)
- **Stack**: Node.js, Express, Socket.IO, MQTT, MongoDB
- **Chức năng**:
  - Xác thực đăng nhập
  - Subscribe MQTT nhận sensor data → broadcast Socket.IO đến app
  - Nhận lệnh từ app → publish MQTT xuống hardware
  - Gửi push notification qua Expo Push API
  - Lưu trữ: devices, door status, push tokens

### 4. Mobile App (`SmartHomeApp/`)
- **Stack**: React Native, Expo, Socket.IO, Axios
- **Chức năng**:
  - Đăng nhập bằng mật khẩu cửa
  - Giám sát realtime: nhiệt độ, độ ẩm, gas, lửa, trạng thái cửa
  - Điều khiển chống trộm (bật/tắt)
  - Xem trạng thái PIR/VIB
  - Cảnh báo toàn màn hình khi có sự cố
  - Nhận push notification khi tắt app
  - Đổi mật khẩu cửa

## Cài đặt

### 1. Hardware Setup

**STM32:**
- Flash `stm32_core/stm32_core.ino` lên STM32
- Kết nối UART: STM32 Serial3 (PB10/PB11) ↔ ESP32 Serial2 (GPIO16/17)

**ESP32 Bridge:**
- Sửa WiFi credentials trong `esp32_bridge/esp32_bridge.ino`
- Flash lên ESP32

### 2. Server Setup

```bash
cd server
npm install
```

File `.env` đã có sẵn trong repo với MongoDB connection string.

Chạy server:
```bash
npm start
```

### 3. Mobile App Setup

```bash
cd SmartHomeApp
npm install
```

Cập nhật IP server trong `SmartHomeApp/constants/Config.ts`:
```ts
export const Config = {
  SERVER_URL: 'http://192.168.1.XXX:5000',
};
```

Chạy app:
```bash
npx expo start
```

## Sử dụng

### Phần cứng (Keypad)

- **Nhập mật khẩu**: Nhập 4 số → nhấn `#` để mở cửa
- **Bật chống trộm**: Nhấn phím `A`
- **Tắt chống trộm**: Nhấn phím `B`
- **Xóa nhập**: Nhấn `*`

### App Mobile

- **Đăng nhập**: Nhập mật khẩu cửa (mặc định: `4242`)
- **Giám sát**: Xem realtime nhiệt độ, độ ẩm, gas, lửa
- **Chống trộm**: Toggle switch để bật/tắt
- **Đổi mật khẩu**: Mở panel "Thay đổi password" → nhập pass cũ + mới

## Ngưỡng cảnh báo

- **Lửa**: ADC < 500
- **Gas**: ADC < 800
- **PIR**: Phát hiện chuyển động (khi chống trộm bật)
- **VIB**: Phát hiện rung (khi chống trộm bật)

## MQTT Topics

- `home/sensors/data`: STM32 → Server (sensor data)
- `home/door/status`: STM32 → Server (door status)
- `home/control`: Server → STM32 (control commands)
- `home/door/password`: Server → STM32 (password update)

MIT
