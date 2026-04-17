#include <Arduino.h>
#include <Wire.h>
#include <Servo.h>
#include <Keypad.h>
#include <DHT.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <EEPROM.h>

#include <STM32FreeRTOS.h>
#include <semphr.h>
#include <queue.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h> 

// Khởi tạo cứng Serial3 cho giao tiếp với ESP32 
HardwareSerial Serial3(PB11, PB10); // RX = PB11, TX = PB10
// cấu hình chân
#define FLAME_ANALOG PA1
#define GAS_ANALOG PA2
#define PIR_PIN PE2
#define VIB_PIN PE3
#define BUZZER PD11
#define ALARM_LED PD14
#define BUTTON PA0
#define SERVO_PIN PB0
#define DHTPIN PB1

// lcd i2c
LiquidCrystal_I2C lcd(0x27, 16, 2);

// oled
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// dth22
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// servo
Servo doorServo;
#define DOOR_LOCK_ANGLE 0
#define DOOR_UNLOCK_ANGLE 90

// keypad
#define ROWS 4
#define COLS 4

char keys[ROWS][COLS] = {
  { '1', '2', '3', 'A' },
  { '4', '5', '6', 'B' },
  { '7', '8', '9', 'C' },
  { '*', '0', '#', 'D' }
};

byte rowPins[ROWS] = { PC0, PC1, PC4, PC5 };
byte colPins[COLS] = { PC6, PC7, PC8, PC9 };

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ngưỡng cảm biến
#define FLAME_THRESHOLD 500
#define GAS_THRESHOLD 800
#define DOOR_OPEN_TIME_MS 5000

#define MAX_WRONG_ATTEMPTS 3
#define LOCKOUT_TIME_MS 60000UL


volatile uint32_t pirLastDetectMs = 0;
volatile uint32_t vibLastDetectMs = 0;

#define PIR_HOLD_TIME_MS 2000UL
#define VIB_HOLD_TIME_MS 2000UL

// freertos object
SemaphoreHandle_t lcdMutex; 
SemaphoreHandle_t stateMutex; 
QueueHandle_t lcdQueue; 


// cấu trúc message
typedef struct {
  char line1[17];
  char line2[17];
} LCDMessage;

// biến trạng thái
volatile bool gasAlarm = false;
volatile bool flameAlarm = false;
volatile bool pirAlarm = false;
volatile bool vibAlarm = false;

volatile bool lcdLockedByKeypad = false;
volatile bool antiTheftArmed = false;
volatile bool doorOpen = false;

volatile int currentGasValue = 0;
volatile int currentFlameValue = 0;

volatile uint32_t lastButtonPress = 0;

// DHT data
volatile float currentTemp = 0.0f;
volatile float currentHum = 0.0f;
volatile bool dhtValid = false;

// pass / lockout
char enteredPassword[9] = "";
uint8_t enteredLen = 0;
char correctPassword[5] = "1234";

#define EEPROM_PASS_ADDR 0
#define EEPROM_MAGIC 0xAB

void savePasswordToEEPROM(const char* pass) {
  EEPROM.write(EEPROM_PASS_ADDR, EEPROM_MAGIC);
  for (int i = 0; i < 4; i++) {
    EEPROM.write(EEPROM_PASS_ADDR + 1 + i, (uint8_t)pass[i]);
  }
}

void loadPasswordFromEEPROM() {
  if (EEPROM.read(EEPROM_PASS_ADDR) == EEPROM_MAGIC) {
    for (int i = 0; i < 4; i++) {
      correctPassword[i] = (char)EEPROM.read(EEPROM_PASS_ADDR + 1 + i);
    }
    correctPassword[4] = '\0';
  }
}

volatile int wrongAttempts = 0;
volatile bool keypadLocked = false;
volatile uint32_t lockoutStartMs = 0;

void sendLCDMessage(const char *l1, const char *l2) {
  if (lcdQueue == NULL) return;

  LCDMessage msg;
  snprintf(msg.line1, sizeof(msg.line1), "%-16s", l1);
  snprintf(msg.line2, sizeof(msg.line2), "%-16s", l2);

  xQueueReset(lcdQueue);
  xQueueSend(lcdQueue, &msg, pdMS_TO_TICKS(50));
}

void clearEnteredPassword() {
  enteredLen = 0;
  enteredPassword[0] = '\0';
}

void appendPasswordChar(char c) {
  if (enteredLen < sizeof(enteredPassword) - 1) {
    enteredPassword[enteredLen++] = c;
    enteredPassword[enteredLen] = '\0';
  }
}

void makeMaskedPassword(char *out, size_t outSize) {
  size_t n = (enteredLen < outSize - 1) ? enteredLen : outSize - 1;
  for (size_t i = 0; i < n; i++) out[i] = '*';
  out[n] = '\0';
}

void lockDoor() {
  doorServo.write(DOOR_LOCK_ANGLE);
  doorOpen = false;
}

void unlockDoor() {
  doorServo.write(DOOR_UNLOCK_ANGLE);
  doorOpen = true;
}

bool fireDetected(int flameValue) {
  return (flameValue < FLAME_THRESHOLD);
}

bool gasDetected(int gasValue) {
  return (gasValue < GAS_THRESHOLD);
}

int readAverageAnalog(uint8_t pin) {
  long sum = 0;
  for (int i = 0; i < 20; i++) {
    sum += analogRead(pin);
    vTaskDelay(pdMS_TO_TICKS(5));
  }
  return (int)(sum / 20);
}

void taskLCD(void *pvParameters) {
  LCDMessage msg;

  while (1) {
    if (xQueueReceive(lcdQueue, &msg, portMAX_DELAY) == pdPASS) {
      if (xSemaphoreTake(lcdMutex, pdMS_TO_TICKS(200)) == pdTRUE) { 
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print(msg.line1);
        lcd.setCursor(0, 1);
        lcd.print(msg.line2);
        xSemaphoreGive(lcdMutex);
      }
    }
  }
}


void taskSensors(void *pvParameters) {
  while (1) {
    int flameValue = readAverageAnalog(FLAME_ANALOG);
    int gasValue = readAverageAnalog(GAS_ANALOG);

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(80)) == pdTRUE) {
      currentFlameValue = flameValue;
      currentGasValue = gasValue;
      flameAlarm = fireDetected(flameValue);
      gasAlarm = gasDetected(gasValue);

      if (!isnan(h) && !isnan(t)) {
        currentHum = h;
        currentTemp = t;
        dhtValid = true;
      } else {
        dhtValid = false;
      }

      xSemaphoreGive(stateMutex);
    }

    vTaskDelay(pdMS_TO_TICKS(1500));
  }
}


void taskOLED(void *pvParameters) {
  while (1) {
    float t, h;
    bool valid;
    bool gas, fire, armed, opened, pir, vib, locked;
    int gasValue, flameValue, wrongCnt;
    uint32_t lockStart;

    if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      t = currentTemp;
      h = currentHum;
      valid = dhtValid;

      gas = gasAlarm;
      fire = flameAlarm;
      armed = antiTheftArmed;
      opened = doorOpen;
      pir = pirAlarm;
      vib = vibAlarm;

      gasValue = currentGasValue;
      flameValue = currentFlameValue;

      locked = keypadLocked;
      wrongCnt = wrongAttempts;
      lockStart = lockoutStartMs;
      xSemaphoreGive(stateMutex);
    }

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);

    display.setCursor(0, 0);
    display.print("T:");
    if (valid) display.print(t, 1);
    else display.print("--");
    display.print("C ");

    display.print("H:");
    if (valid) display.print(h, 1);
    else display.print("--");
    display.print("%");

    display.setCursor(0, 12);
    display.print("Gas:");
    display.print(gasValue);

    display.setCursor(64, 12);
    display.print("Fl:");
    display.print(flameValue);

    display.setCursor(0, 24);
    display.print("Door:");
    display.print(opened ? "OPEN" : "LOCK");

    display.setCursor(64, 24);
    display.print("AT:");
    display.print(armed ? "ON" : "OFF");

    display.setCursor(0, 36);
    if (fire) {
      display.print("ALERT: FIRE");
    } else if (gas) {
      display.print("ALERT: GAS");
    } else if (pir) {
      display.print("ALERT: PIR");
    } else if (vib) {
      display.print("ALERT: VIB");
    } else {
      display.print("ALERT: NORMAL");
    }

    display.setCursor(0, 48);
    if (locked) {
      uint32_t elapsed = millis() - lockStart;
      uint32_t remain = (elapsed >= LOCKOUT_TIME_MS) ? 0 : ((LOCKOUT_TIME_MS - elapsed) / 1000UL);
      display.print("LOCK ");
      display.print(remain);
      display.print("s");
    } else {
      display.print("Wrong:");
      display.print(wrongCnt);
    }

    display.display();
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}


void taskAntiTheft(void *pvParameters) {
  while (1) {
    int pirCount = 0;
    int vibCount = 0;

    for (int i = 0; i < 8; i++) {
      if (digitalRead(PIR_PIN)) pirCount++;
      if (digitalRead(VIB_PIN)) vibCount++;
      vTaskDelay(pdMS_TO_TICKS(15));
    }

    bool pirDetectedNow = (pirCount >= 6);
    bool vibDetectedNow = (vibCount >= 3);

    uint32_t now = millis();

    if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      if (antiTheftArmed) {
        if (pirDetectedNow) {
          pirLastDetectMs = now;
        }

        if (vibDetectedNow) {
          vibLastDetectMs = now;
        }

        pirAlarm = (now - pirLastDetectMs < PIR_HOLD_TIME_MS);
        vibAlarm = (now - vibLastDetectMs < VIB_HOLD_TIME_MS);
      } else {
        pirAlarm = false;
        vibAlarm = false;
        pirLastDetectMs = 0;
        vibLastDetectMs = 0;
      }

      xSemaphoreGive(stateMutex);
    }

    vTaskDelay(pdMS_TO_TICKS(100));
  }
}


void taskButton(void *pvParameters) {
  bool lastBtn = HIGH;

  while (1) {
    bool currentBtn = digitalRead(BUTTON);

    if (lastBtn == HIGH && currentBtn == LOW) {
      uint32_t now = millis();
      if (now - lastButtonPress > 300) {
        lastButtonPress = now; 

        if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
          antiTheftArmed = !antiTheftArmed;

          if (!antiTheftArmed) {
            pirAlarm = false;
            vibAlarm = false;
          }
          xSemaphoreGive(stateMutex);
        }
      }
    }

    lastBtn = currentBtn;
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}


void taskKeypadDoor(void *pvParameters) {
  while (1) {
    if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
      if (keypadLocked && (millis() - lockoutStartMs >= LOCKOUT_TIME_MS)) {
        keypadLocked = false;
        clearEnteredPassword();
        xSemaphoreGive(stateMutex);

        lcdLockedByKeypad = true;
        sendLCDMessage("Het thoi gian", "Nhap lai pass");
        vTaskDelay(pdMS_TO_TICKS(1200));
        lcdLockedByKeypad = false;
      } else {
        xSemaphoreGive(stateMutex);
      }
    }

    char key = keypad.getKey();

    if (key) {
      bool lockedNow;
      uint32_t lockStartNow;

      if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
        lockedNow = keypadLocked;
        lockStartNow = lockoutStartMs;
        xSemaphoreGive(stateMutex);
      } else {
        lockedNow = false;
        lockStartNow = 0;
      }

      lcdLockedByKeypad = true;

      if (lockedNow) {
        uint32_t elapsed = millis() - lockStartNow; 
        uint32_t remain = (elapsed >= LOCKOUT_TIME_MS) ? 0 : ((LOCKOUT_TIME_MS - elapsed) / 1000UL);

        char line2[17];
        snprintf(line2, sizeof(line2), "Con %lus", remain);
        sendLCDMessage("Ban phim bi khoa", line2);
        vTaskDelay(pdMS_TO_TICKS(500));

        lcdLockedByKeypad = false;
        vTaskDelay(pdMS_TO_TICKS(80));
        continue;
      }

      if (key == '*') {
        clearEnteredPassword();
        sendLCDMessage("Nhap mat khau", "Da xoa");
        vTaskDelay(pdMS_TO_TICKS(700));
      } else if (key == '#') {
        if (strcmp(enteredPassword, correctPassword) == 0) {
          if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            wrongAttempts = 0;
            keypadLocked = false;
            xSemaphoreGive(stateMutex);
          }

          sendLCDMessage("Mat khau dung", "Dang mo cua");
          unlockDoor();
          vTaskDelay(pdMS_TO_TICKS(2000));

          sendLCDMessage("Cua dang mo", "Moi vao");
          vTaskDelay(pdMS_TO_TICKS(DOOR_OPEN_TIME_MS));

          lockDoor();
          sendLCDMessage("Da dong cua", "He thong OK");
          vTaskDelay(pdMS_TO_TICKS(1500));
        } else {
          bool justLocked = false;
          int tries = 0;

          if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            wrongAttempts++;
            tries = wrongAttempts;

            if (wrongAttempts >= MAX_WRONG_ATTEMPTS) {
              keypadLocked = true;
              lockoutStartMs = millis();
              justLocked = true;
            }

            xSemaphoreGive(stateMutex);
          }

          if (justLocked) {
            sendLCDMessage("Sai qua 3 lan", "Khoa 60 giay");
            vTaskDelay(pdMS_TO_TICKS(1500));
          } else {
            char line2[17];
            int remain = MAX_WRONG_ATTEMPTS - tries;
            if (remain < 0) remain = 0;
            snprintf(line2, sizeof(line2), "Con %d lan", remain);
            sendLCDMessage("Sai mat khau", line2);
            vTaskDelay(pdMS_TO_TICKS(1500));
          }
        }

        clearEnteredPassword();
      } else if (key >= '0' && key <= '9') {
        appendPasswordChar(key);

        char line2[17];
        makeMaskedPassword(line2, sizeof(line2));
        sendLCDMessage("Nhap mat khau", line2);
        vTaskDelay(pdMS_TO_TICKS(150));
      } else if (key == 'A') {
        if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
          antiTheftArmed = true;
          xSemaphoreGive(stateMutex);
        }
        lcdLockedByKeypad = false;
        sendLCDMessage("Chong trom", "Da BAT");
        vTaskDelay(pdMS_TO_TICKS(500));
      } else if (key == 'B') {
        if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
          antiTheftArmed = false;
          pirAlarm = false;
          vibAlarm = false;
          xSemaphoreGive(stateMutex);
        }
        lcdLockedByKeypad = false;
        sendLCDMessage("Chong trom", "Da TAT");
        vTaskDelay(pdMS_TO_TICKS(500));
      }

      lcdLockedByKeypad = false;
    }

    vTaskDelay(pdMS_TO_TICKS(70));
  }
}

void taskAlarm(void *pvParameters) {
  bool state = false;

  while (1) {
    bool gas, fire, pir, vib;

    if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      gas = gasAlarm;
      fire = flameAlarm;
      pir = pirAlarm;
      vib = vibAlarm;
      xSemaphoreGive(stateMutex);
    }

    if (pir && vib) {
      state = !state;
      digitalWrite(BUZZER, state);
      digitalWrite(ALARM_LED, LOW);
      vTaskDelay(pdMS_TO_TICKS(150));
    }
    else if (gas || fire) {
      state = !state;
      digitalWrite(BUZZER, state);
      digitalWrite(ALARM_LED, state);
      vTaskDelay(pdMS_TO_TICKS(150));
    }
    else if (pir || vib) {
      state = !state;
      digitalWrite(BUZZER, state);
      digitalWrite(ALARM_LED, LOW);
      vTaskDelay(pdMS_TO_TICKS(600));
    }
    else {
      digitalWrite(BUZZER, LOW);
      digitalWrite(ALARM_LED, LOW);
      vTaskDelay(pdMS_TO_TICKS(100));
    }
  }
}

static uint32_t lastSerialSyncTime = 0;

// ==== TASK GIAO TIẾP VỚI ESP32 (UART) ====
void taskSerialSync(void *pvParameters) {
  while (1) {
    // 1. Chỉ chuẩn bị và gửi JSON định kỳ 2 giây/lần
    if (millis() - lastSerialSyncTime >= 2000) {
      lastSerialSyncTime = millis();
      float t, h;
      int gasVal, flameVal;
      bool pir, vib, armed, doorOp;
      
      if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        t = currentTemp;
        h = currentHum;
        gasVal = currentGasValue;
        flameVal = currentFlameValue;
        pir = pirAlarm;
        vib = vibAlarm;
        armed = antiTheftArmed;
        doorOp = doorOpen;
        xSemaphoreGive(stateMutex);
      }
      
      StaticJsonDocument<256> doc;
      doc["temperature"] = isnan(t) ? 0 : t;
      doc["humidity"] = isnan(h) ? 0 : h;
      doc["gas"] = gasVal;
      doc["fire"] = flameVal; 
      doc["pir"] = pir ? 1 : 0;
      doc["vib"] = vib ? 1 : 0;
      doc["antiTheft"] = armed;
      
      serializeJson(doc, Serial3);
      Serial3.println();

      Serial3.print("DOOR:{\"status\":\"");
      Serial3.print(doorOp ? "OPEN" : "CLOSED");
      Serial3.println("\"}");
      Serial3.flush();
    }

    // 2. Nhận lệnh từ ESP32 THƯỜNG XUYÊN
    while (Serial3.available()) {
      String line = Serial3.readStringUntil('\n');
      line.trim();
      
      if (line.startsWith("CMD:")) {
        String cmdJson = line.substring(4);
        StaticJsonDocument<200> cmdDoc;
        if (!deserializeJson(cmdDoc, cmdJson)) {
          String type = cmdDoc["type"].as<String>();
          int val = cmdDoc["val"];
          
          if (type == "SERVO") {
             if (val == 1) {
                sendLCDMessage("App: Mo Cua", "Thanh cong");
                unlockDoor();
                vTaskDelay(pdMS_TO_TICKS(DOOR_OPEN_TIME_MS));
                lockDoor();
                sendLCDMessage("Da dong cua", "Xong");
             }
          }
          else if (type == "ANTI_THEFT") {
             if (xSemaphoreTake(stateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
               antiTheftArmed = (val == 1);
               if (!antiTheftArmed) {
                  pirAlarm = false;
                  vibAlarm = false;
               }
               xSemaphoreGive(stateMutex);
             }
             if (val == 1) sendLCDMessage("Chong trom", "App BAT");
             else sendLCDMessage("Chong trom", "App TAT");
          }
        }
      }
      else if (line.startsWith("PASS:")) {
        String newPass = line.substring(5);
        if (newPass.length() == 4) {
           newPass.toCharArray(correctPassword, 5);
           savePasswordToEEPROM(correctPassword);
           sendLCDMessage("Mat khau", "Da cap nhat");
        }
      }
    }

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

void setup() {
  delay(1000);

  // Mở Serial3 cho ESP32 ở chân PB10/PB11
  Serial3.begin(115200);

  pinMode(FLAME_ANALOG, INPUT_ANALOG);
  pinMode(GAS_ANALOG, INPUT_ANALOG);

  pinMode(PIR_PIN, INPUT);
  pinMode(VIB_PIN, INPUT);

  pinMode(BUZZER, OUTPUT);
  pinMode(ALARM_LED, OUTPUT);

  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(DHTPIN, INPUT);

  digitalWrite(BUZZER, LOW);
  digitalWrite(ALARM_LED, LOW);

  Wire.begin();

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Home");
  lcd.setCursor(0, 1);
  lcd.print("Khoi dong...");

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    while (1)
      ;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("OLED Ready");
  display.display();

  dht.begin();

  doorServo.attach(SERVO_PIN);
  lockDoor();

  lcdMutex = xSemaphoreCreateMutex();
  stateMutex = xSemaphoreCreateMutex();
  lcdQueue = xQueueCreate(5, sizeof(LCDMessage));

  if (lcdMutex == NULL || stateMutex == NULL || lcdQueue == NULL) {
    while (1)
      ;
  }

  clearEnteredPassword();
  loadPasswordFromEEPROM();
  sendLCDMessage("Nhap mat khau", "Nhan # de mo");

  xTaskCreate(taskLCD, "LCD", 256, NULL, 2, NULL);
  xTaskCreate(taskSensors, "Sensors", 384, NULL, 2, NULL);
  xTaskCreate(taskOLED, "OLED", 512, NULL, 1, NULL);
  xTaskCreate(taskAntiTheft, "AntiTheft", 256, NULL, 2, NULL);
  xTaskCreate(taskButton, "Button", 192, NULL, 2, NULL);
  xTaskCreate(taskKeypadDoor, "Keypad", 1024, NULL, 4, NULL);
  xTaskCreate(taskAlarm, "Alarm", 256, NULL, 3, NULL);
  xTaskCreate(taskSerialSync, "SerialSync", 768, NULL, 2, NULL);

  vTaskStartScheduler();

  while (1)
    ;
}

void loop() {
}
