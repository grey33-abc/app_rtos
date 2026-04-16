#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==== CẤU HÌNH WIFI & MQTT ====
const char* ssid = "YOUR_WIFI_SSID";             // Đổi thành tên WiFi của bạn
const char* password_wifi = "YOUR_WIFI_PASS";    // Đổi thành mật khẩu WiFi của bạn
const char* mqtt_server = "broker.emqx.io";      // MQTT Broker public (có thể đổi sang broker khác nếu muốn)

WiFiClient espClient;
PubSubClient client(espClient);

// ==== CẤU HÌNH SERIAL GIAO TIẾP VỚI STM32 ====
// ESP32 sử dụng Serial2 (RX2=GPIO16, TX2=GPIO17) kết nối chéo với TX/RX của STM32
#define STM32_SERIAL Serial2 
#define RXD2 16
#define TXD2 17

long lastReconnectAttempt = 0;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Đang kết nối WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password_wifi);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("\nKết nối WiFi thành công!");
    Serial.print("Địa chỉ IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nKết nối WiFi thất bại. Sẽ thử lại sau.");
  }
}

// Hàm callback nhận dữ liệu từ MQTT gửi về
void mqttCallback(char* topic, byte* message, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) {
    msg += (char)message[i];
  }
  
  Serial.print("MQTT lệnh nhận được từ chủ đề [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(msg);

  // Nếu nhận lệnh điều khiển (Chống trộm, Mở khóa qua App v.v...)
  if (String(topic) == "home/control") {
    // format ví dụ: {"type":"ANTI_THEFT", "val": 1}
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, msg);
    if(!error) {
      // Đẩy lệnh xuống STM32 dưới dạng JSON qua UART
      STM32_SERIAL.print("CMD:");
      STM32_SERIAL.println(msg);
    } else {
      Serial.println("Lỗi parse JSON MQTT control.");
    }
  } 
  // Nếu nhận lệnh thay đổi mật khẩu từ App
  else if (String(topic) == "home/door/password") {
    // msg là 4 số mới
    if(msg.length() == 4) {
      STM32_SERIAL.print("PASS:");
      STM32_SERIAL.println(msg);
    }
  }
}

void reconnect() {
  if (WiFi.status() != WL_CONNECTED) {
    setup_wifi();
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      Serial.print("Đang thử kết nối lại tới MQTT Broker...");
      String clientId = "ESP32Bridge-SmartHome-";
      clientId += String(random(0xffff), HEX);
      
      // Connect với Last Will (LWT) để báo Offline
      if (client.connect(clientId.c_str(), NULL, NULL, "home/status", 0, true, "OFFLINE")) {
        Serial.println("Đã kết nối ngõ MQTT!");
        client.publish("home/status", "ONLINE", true);
        
        // Theo dõi (Subscribe) các lệnh từ Server/App
        client.subscribe("home/control");
        client.subscribe("home/door/password");
      } else {
        Serial.print("Thất bại, mã lỗi rc=");
        Serial.print(client.state());
        Serial.println(" thử lại sau 5 giây.");
      }
    }
  }
}

void setup() {
  Serial.begin(115200);   // Giao tiếp với Serial Monitor để Debug
  
  // STM32 dùng 115200 baudrate (Serial3.begin(115200) trong stm32_core.ino)
  STM32_SERIAL.begin(115200, SERIAL_8N1, RXD2, TXD2); 

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(mqttCallback);

  lastReconnectAttempt = 0;
}

void loop() {
  // Quản lý duy trì MQTT
  if (!client.connected()) {
    Serial.println("[MQTT] Mất kết nối! Đang reconnect...");
    long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      reconnect();
    }
  } else {
    client.loop();
  }

  // ==== NHẬN DỮ LIỆU TỪ STM32 & ĐẨY LÊN MQTT SERVER ====
  if (STM32_SERIAL.available()) {
    String incomingData = STM32_SERIAL.readStringUntil('\n');
    incomingData.trim(); // Loại bỏ kí tự khoảng trắng thừa, \r \n
    
    if (incomingData.length() > 0) {
      // In ra Monitor để Debug
      Serial.println("STM32 Gửi: " + incomingData); 
      
      // Data Môi trường & Cảm biến (Gói JSON)
      if (incomingData.startsWith("{") && incomingData.endsWith("}")) {
        client.publish("home/sensors/data", incomingData.c_str());
      }
      // Data Trạng thái riêng của cửa chính (DOOR:...)
      else if (incomingData.startsWith("DOOR:")) {
        String statusJson = incomingData.substring(5);
        client.publish("home/door/status", statusJson.c_str());
      }
    }
  }
}
