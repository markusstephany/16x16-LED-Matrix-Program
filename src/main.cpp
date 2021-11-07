#include <Arduino.h>
#include <LG_Matrix_Print.h>
#include "WiFi.h"
#include "SPIFFS.h"
#include "ESPAsyncWebServer.h"
#include <ArduinoOTA.h>

AsyncWebServer server(80);

#define LEDMATRIX_CS_PIN 16

#define LEDMATRIX_SEGMENTS 4

#define MAX_FRAMES_DATA_SIZE 49152

#define OTA_PASSWORD "OTA_PASSWORD"

#define USEWPS

#ifndef USEWPS
const char *ssid = "WIFI SSID";
const char *password = "WIFI PASSPHRASE";
#else
#include "esp_wps.h"

#define ESP_WPS_MODE WPS_TYPE_PBC
#define ESP_MANUFACTURER "ESPRESSIF"
#define ESP_MODEL_NUMBER "ESP32"
#define ESP_MODEL_NAME "ESPRESSIF IOT"
#define ESP_DEVICE_NAME "LedMatrix16x16_1"

#endif

LG_Matrix_Print lmd(LEDMATRIX_SEGMENTS, LEDMATRIX_CS_PIN, 0);

// Matrix Setup - START
ushort _matrix[16][16] = {
    {
        0x718,
        0x618,
        0x518,
        0x418,
        0x318,
        0x218,
        0x118,
        0x18,
        0x710,
        0x610,
        0x510,
        0x410,
        0x310,
        0x210,
        0x110,
        0x10,
    },
    {
        0x719,
        0x619,
        0x519,
        0x419,
        0x319,
        0x219,
        0x119,
        0x19,
        0x711,
        0x611,
        0x511,
        0x411,
        0x311,
        0x211,
        0x111,
        0x11,
    },
    {
        0x71A,
        0x61A,
        0x51A,
        0x41A,
        0x31A,
        0x21A,
        0x11A,
        0x1A,
        0x712,
        0x612,
        0x512,
        0x412,
        0x312,
        0x212,
        0x112,
        0x12,
    },
    {
        0x71B,
        0x61B,
        0x51B,
        0x41B,
        0x31B,
        0x21B,
        0x11B,
        0x1B,
        0x713,
        0x613,
        0x513,
        0x413,
        0x313,
        0x213,
        0x113,
        0x13,
    },
    {
        0x71C,
        0x61C,
        0x51C,
        0x41C,
        0x31C,
        0x21C,
        0x11C,
        0x1C,
        0x714,
        0x614,
        0x514,
        0x414,
        0x314,
        0x214,
        0x114,
        0x14,
    },
    {
        0x71D,
        0x61D,
        0x51D,
        0x41D,
        0x31D,
        0x21D,
        0x11D,
        0x1D,
        0x715,
        0x615,
        0x515,
        0x415,
        0x315,
        0x215,
        0x115,
        0x15,
    },
    {
        0x71E,
        0x61E,
        0x51E,
        0x41E,
        0x31E,
        0x21E,
        0x11E,
        0x1E,
        0x716,
        0x616,
        0x516,
        0x416,
        0x316,
        0x216,
        0x116,
        0x16,
    },
    {
        0x71F,
        0x61F,
        0x51F,
        0x41F,
        0x31F,
        0x21F,
        0x11F,
        0x1F,
        0x717,
        0x617,
        0x517,
        0x417,
        0x317,
        0x217,
        0x117,
        0x17,
    },
    {
        0xF,
        0x10F,
        0x20F,
        0x30F,
        0x40F,
        0x50F,
        0x60F,
        0x70F,
        0x7,
        0x107,
        0x207,
        0x307,
        0x407,
        0x507,
        0x607,
        0x707,
    },
    {
        0xE,
        0x10E,
        0x20E,
        0x30E,
        0x40E,
        0x50E,
        0x60E,
        0x70E,
        0x6,
        0x106,
        0x206,
        0x306,
        0x406,
        0x506,
        0x606,
        0x706,
    },
    {
        0xD,
        0x10D,
        0x20D,
        0x30D,
        0x40D,
        0x50D,
        0x60D,
        0x70D,
        0x5,
        0x105,
        0x205,
        0x305,
        0x405,
        0x505,
        0x605,
        0x705,
    },
    {
        0xC,
        0x10C,
        0x20C,
        0x30C,
        0x40C,
        0x50C,
        0x60C,
        0x70C,
        0x4,
        0x104,
        0x204,
        0x304,
        0x404,
        0x504,
        0x604,
        0x704,
    },
    {
        0xB,
        0x10B,
        0x20B,
        0x30B,
        0x40B,
        0x50B,
        0x60B,
        0x70B,
        0x3,
        0x103,
        0x203,
        0x303,
        0x403,
        0x503,
        0x603,
        0x703,
    },
    {
        0xA,
        0x10A,
        0x20A,
        0x30A,
        0x40A,
        0x50A,
        0x60A,
        0x70A,
        0x2,
        0x102,
        0x202,
        0x302,
        0x402,
        0x502,
        0x602,
        0x702,
    },
    {
        0x9,
        0x109,
        0x209,
        0x309,
        0x409,
        0x509,
        0x609,
        0x709,
        0x1,
        0x101,
        0x201,
        0x301,
        0x401,
        0x501,
        0x601,
        0x701,
    },
    {
        0x8,
        0x108,
        0x208,
        0x308,
        0x408,
        0x508,
        0x608,
        0x708,
        0x0,
        0x100,
        0x200,
        0x300,
        0x400,
        0x500,
        0x600,
        0x700,
    },
};

// Matrix Setup - END

int numFrames = 0;
int sizeFrames = 0;
int frameStart = 0;
int windowStart = 0;
int windowEnd = 0;
ulong restartEsp = 0;
ushort *frames = NULL;

void clearMatrix()
{
  lmd.clear();
  lmd.display();
}

void setPixel(byte x, byte y, bool on)
{
  lmd.setPixel(_matrix[y & 15][x & 15] & 255, _matrix[y & 15][x & 15] / 256, on);
}

void setRow(int row, ushort data)
{
  for (int i = 0; i < 16; i++)
  {
    setPixel(i, row, (data & 1) != 0);
    data = data >> 1;
  }
}

void reloadDataFile()
{
  numFrames = 0;
  windowStart = 0;
  windowEnd = 0;
  File data = SPIFFS.open("/data", "r");
  if (data)
  {
    ushort numF;
    ushort numLoad = 0;
    ushort sizeF;
    ushort minDur = 0xffff;
    ushort minIndex = 0;
    ushort maxDur = 0;
    ushort maxIndex = 0;
    data.readBytes((char *)&numF, sizeof(numF));
    data.readBytes((char *)&sizeF, sizeof(sizeF));
    Serial.print("numF :");
    Serial.print(numF);
    Serial.print(", sizeF :");
    Serial.print(sizeF);
    Serial.print(", total :");
    Serial.println((uint)numF * (uint)sizeF);
    numLoad = numF;
    while (((uint)numLoad * (uint)sizeF) > MAX_FRAMES_DATA_SIZE)
      numLoad >>= 1;
    Serial.print("numLoad :");
    Serial.print(numLoad);
    Serial.print(", sizeF :");
    Serial.print(sizeF);
    Serial.print(", total :");
    Serial.println((uint)numLoad * (uint)sizeF);
    if (frames != NULL)
    {
      delete[] frames;
      frames = NULL;
    }
    Serial.println(ESP.getFreeHeap());
    Serial.println("Reserving memory");
    frames = new ushort[numLoad * sizeF];
    Serial.println("Reading data");
    data.readBytes((char *)&frames[0], (uint)numLoad * (uint)sizeF);
    data.close();
    for (int i = 0; i < numLoad; i++)
    {
      if (frames[i * sizeF / 2] > maxDur)
      {
        maxDur = frames[i * sizeF / 2];
        maxIndex = i;
      }
      if (frames[i * sizeF / 2] < minDur)
      {
        minDur = frames[i * sizeF / 2];
        minIndex = i;
      }
    }
    Serial.print("minDur :");
    Serial.print(minDur);
    Serial.print(" at i=");
    Serial.print(minIndex);
    Serial.print(", maxDur :");
    Serial.print(maxDur);
    Serial.print(" at i=");
    Serial.println(maxIndex);
    frameStart = 0;
    sizeFrames = sizeF / 2;
    numFrames = numF;
    windowStart = 0;
    windowEnd = numLoad - 1;
    Serial.print("windowStart :");
    Serial.println(windowStart);
    Serial.print("windowEnd :");
    Serial.println(windowEnd);
    Serial.print("numFrames :");
    Serial.println(numFrames);
    Serial.println("Data read.");
  }
}

void loadPart(int startIndex, String fn = "/data")
{
  File data = SPIFFS.open(fn, "r");
  if (data)
  {
    ushort numF;
    ushort numLoad = 0;
    ushort sizeF;
    data.readBytes((char *)&numF, sizeof(numF));
    data.readBytes((char *)&sizeF, sizeof(sizeF));
    data.seek(startIndex * sizeF, fs::SeekMode::SeekCur);
    numF -= startIndex;
    numLoad = numF;
    while (((uint)numLoad * (uint)sizeF) > MAX_FRAMES_DATA_SIZE)
      numLoad >>= 1;
    if (frames != NULL)
    {
      delete[] frames;
      frames = NULL;
    }
    frames = new ushort[numLoad * sizeF];
    data.readBytes((char *)&frames[0], (uint)numLoad * (uint)sizeF);
    data.close();
    sizeFrames = sizeF / 2;
    numFrames = numF + startIndex;
    windowStart = startIndex;
    windowEnd = startIndex + numLoad - 1;
  }
}

void loadPart_debug(int startIndex)
{
  Serial.print("---> ");
  Serial.println(startIndex);
  File data = SPIFFS.open("/data", "r");
  if (data)
  {
    ushort numF;
    ushort numLoad = 0;
    ushort sizeF;
    ushort minDur = 0xffff;
    ushort minIndex = 0;
    ushort maxDur = 0;
    ushort maxIndex = 0;
    data.readBytes((char *)&numF, sizeof(numF));
    data.readBytes((char *)&sizeF, sizeof(sizeF));
    data.seek(startIndex * sizeF, fs::SeekMode::SeekCur);
    numF -= startIndex;
    Serial.print("numF :");
    Serial.print(numF);
    Serial.print(", sizeF :");
    Serial.print(sizeF);
    Serial.print(", total :");
    Serial.println((uint)numF * (uint)sizeF);
    Serial.print("StartIndex :");
    Serial.println(startIndex);
    numLoad = numF;
    while (((uint)numLoad * (uint)sizeF) > MAX_FRAMES_DATA_SIZE)
      numLoad >>= 1;
    Serial.print("numLoad :");
    Serial.print(numLoad);
    Serial.print(", sizeF :");
    Serial.print(sizeF);
    Serial.print(", total :");
    Serial.println((uint)numLoad * (uint)sizeF);
    if (frames != NULL)
    {
      delete[] frames;
      frames = NULL;
    }
    Serial.println(ESP.getFreeHeap());
    Serial.println("Reserving memory");
    frames = new ushort[numLoad * sizeF];
    Serial.println("Reading data");
    data.readBytes((char *)&frames[0], (uint)numLoad * (uint)sizeF);
    data.close();
    for (int i = 0; i < numLoad; i++)
    {
      if (frames[i * sizeF / 2] > maxDur)
      {
        maxDur = frames[i * sizeF / 2];
        maxIndex = i;
      }
      if (frames[i * sizeF / 2] < minDur)
      {
        minDur = frames[i * sizeF / 2];
        minIndex = i;
      }
    }
    Serial.print("minDur :");
    Serial.print(minDur);
    Serial.print(" at i=");
    Serial.print(minIndex + startIndex);
    Serial.print(", maxDur :");
    Serial.print(maxDur);
    Serial.print(" at i=");
    Serial.println(maxIndex + startIndex);
    sizeFrames = sizeF / 2;
    numFrames = numF + startIndex;
    windowStart = startIndex;
    windowEnd = startIndex + numLoad - 1;
    Serial.print("windowStart :");
    Serial.println(windowStart);
    Serial.print("windowEnd :");
    Serial.println(windowEnd);
    Serial.print("numFrames :");
    Serial.println(numFrames);
    Serial.println("Data read.");
  }
}

void playCourtain()
{
  for (int i = 0; i < 8; i++)
  {
    delay(50);
    for (int j = 0; j < 16; j++)
    {
      setPixel(i, j, true);
      setPixel(15 - i, j, true);
    }
    lmd.display();
  }
  delay(250);
  for (int i = 7; i >= 0; i--)
  {
    delay(50);
    for (int j = 0; j < 16; j++)
    {
      setPixel(i, j, false);
      setPixel(15 - i, j, false);
    }
    lmd.display();
  }
  delay(250);
}

void playTicker();

void setupWebServer()
{
  lmd.clear();
  setRow(0x00, 0x0080);
  setRow(0x01, 0x01c0);
  setRow(0x02, 0x03e0);
  setRow(0x03, 0x07f0);
  setRow(0x04, 0x0ff8);
  setRow(0x05, 0x0ff8);
  setRow(0x06, 0x0bf8);
  setRow(0x07, 0x09e8);
  setRow(0x08, 0x0ad8);
  setRow(0x09, 0x0aa8);
  setRow(0x0a, 0x0a98);
  setRow(0x0b, 0x0aa8);
  setRow(0x0c, 0x0490);
  setRow(0x0d, 0x02a0);
  setRow(0x0e, 0x01c0);
  setRow(0x0f, 0x0080);
  lmd.display();

  server.on("/resetdata", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              Serial.println("/resetdata");
              if (SPIFFS.exists("/data"))
              {
                if (SPIFFS.exists("/data.bak"))
                  SPIFFS.remove("/data.bak");
                SPIFFS.rename("/data", "/data.bak");
              }
              File file = SPIFFS.open("/data", FILE_WRITE);
              file.close();
              Serial.println("------");
              request->send(200, "text/plain", "OK");
            });

  server.on("/restartfilm", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              Serial.println("/restartfilm");
              if (SPIFFS.exists("/data"))
              {
                reloadDataFile();
              }
              request->send(200, "text/plain", "OK");
            });

  server.on("/restart", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              Serial.println("/restart");
              request->send(200, "text/plain", "OK");
              restartEsp = millis() + 500;
            });

  server.on("/ping", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              Serial.println("/ping");
              request->send(200, "text/plain", "OK");
            });

  server.on("/writedata", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              int paramsNr = request->params();
              Serial.print("/writedata: ");
              Serial.println(paramsNr);
              String response = "0";
              for (int i = 0; i < paramsNr; i++)
              {

                AsyncWebParameter *p = request->getParam(i);
                Serial.print("Param name: ");
                Serial.println(p->name());
                Serial.print("Param length: ");
                Serial.println(p->value().length());
                if (p->name() == "p")
                {
                  response = p->value();
                  if (response.length() > 0)
                  {
                    char *hexData = (char *)response.c_str();
                    int index = 0;
                    char data[3];
                    data[2] = 0;

                    File file = SPIFFS.open("/data", FILE_APPEND);

                    while (index < response.length())
                    {
                      data[0] = hexData[index++];
                      data[1] = hexData[index++];

                      file.write((byte)strtoul(data, 0, 16));
                    }
                    file.close();
                  }
                  else
                    reloadDataFile();
                }
                Serial.println("------");
              }

              request->send(200, "text/plain", response);
            });

  server.on("/resettext", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              Serial.println("/resettext");
              if (SPIFFS.exists("/data.txt"))
              {
                if (SPIFFS.exists("/datat.bak"))
                  SPIFFS.remove("/datat.bak");
                SPIFFS.rename("/data.txt", "/datat.bak");
              }
              File file = SPIFFS.open("/data.txt", FILE_WRITE);
              file.close();
              Serial.println("------");
              request->send(200, "text/plain", "OK");
            });

  server.on("/writetext", HTTP_GET, [](AsyncWebServerRequest *request)
            {
              int paramsNr = request->params();
              Serial.print("/writetext: ");
              Serial.println(paramsNr);
              String response = "0";
              for (int i = 0; i < paramsNr; i++)
              {

                AsyncWebParameter *p = request->getParam(i);
                Serial.print("Param name: ");
                Serial.println(p->name());
                Serial.print("Param length: ");
                Serial.println(p->value().length());
                if (p->name() == "p")
                {
                  response = p->value();
                  if (response.length() > 0)
                  {
                    File file = SPIFFS.open("/data.txt", FILE_APPEND);
                    file.print(response);
                    file.close();
                  }
                }
                Serial.println("------");
              }

              request->send(200, "text/plain", response);
            });

  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");
  server.begin();

  Serial.println("HTTP server started");
}
#ifndef USEWPS
bool wpsConnected = true;
#else
bool wpsConnected = false;
static esp_wps_config_t config;

void wpsInitConfig()
{
  config.crypto_funcs = &g_wifi_default_wps_crypto_funcs;
  config.wps_type = ESP_WPS_MODE;
  strcpy(config.factory_info.manufacturer, ESP_MANUFACTURER);
  strcpy(config.factory_info.model_number, ESP_MODEL_NUMBER);
  strcpy(config.factory_info.model_name, ESP_MODEL_NAME);
  strcpy(config.factory_info.device_name, ESP_DEVICE_NAME);
}

void wpsStart()
{
  if (esp_wifi_wps_enable(&config))
  {
    Serial.println("WPS Enable Failed");
  }
  else if (esp_wifi_wps_start(0))
  {
    Serial.println("WPS Start Failed");
  }
}

void wpsStop()
{
  if (esp_wifi_wps_disable())
  {
    Serial.println("WPS Disable Failed");
  }
}

String wpspin2string(uint8_t a[])
{
  char wps_pin[9];
  for (int i = 0; i < 8; i++)
  {
    wps_pin[i] = a[i];
  }
  wps_pin[8] = '\0';
  return (String)wps_pin;
}

void WiFiEvent(WiFiEvent_t event, system_event_info_t info)
{
  switch (event)
  {
  case SYSTEM_EVENT_STA_START:
    Serial.println("Station Mode Started");
    break;
  case SYSTEM_EVENT_STA_GOT_IP:
    Serial.println("Connected to :" + String(WiFi.SSID()));
    Serial.print("Got IP: ");
    Serial.println(WiFi.localIP());
    wpsConnected = true;
    break;
  case SYSTEM_EVENT_STA_DISCONNECTED:
    Serial.println("Disconnected from station, attempting reconnection");
    wpsConnected = false;
    WiFi.reconnect();
    break;
  case SYSTEM_EVENT_STA_WPS_ER_SUCCESS:
    Serial.println("WPS Successful, stopping WPS and connecting to: " + String(WiFi.SSID()));
    wpsStop();
    delay(10);
    WiFi.begin();
    break;
  case SYSTEM_EVENT_STA_WPS_ER_FAILED:
    Serial.println("WPS Failed, retrying");
    wpsStop();
    wpsStart();
    break;
  case SYSTEM_EVENT_STA_WPS_ER_TIMEOUT:
    Serial.println("WPS Timedout, retrying");
    wpsStop();
    wpsStart();
    break;
  case SYSTEM_EVENT_STA_WPS_ER_PIN:
    Serial.println("WPS_PIN = " + wpspin2string(info.sta_er_pin.pin_code));
    break;
  default:
    break;
  }
}
#endif

void initWifi()
{
  wpsConnected = true;
  byte pos = 0xff;
#ifndef USEWPS

  // Connect to Wi-Fi network with SSID and password
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  int dotDelay = 500;
#else

  // connect using wps
  Serial.println("Starting WPS...");
  ulong endWait = millis() + 5000;
  int dotDelay = 1000;
  WiFi.begin();
  while (WiFi.status() != WL_CONNECTED)
  {
    if (millis() < endWait)
    {
      delay(dotDelay);
      setPixel(15 - (pos & 15), pos / 16, true);
      lmd.display();
      pos--;
      Serial.print(".");
    }
    else
      break;
  }
  if (WiFi.status() != WL_CONNECTED)
  {
    wpsConnected = false;
    WiFi.onEvent(WiFiEvent);
    WiFi.mode(WIFI_MODE_STA);
    wpsInitConfig();
    wpsStart();
  }
#endif
  while ((!wpsConnected) || (WiFi.status() != WL_CONNECTED))
  {
    delay(dotDelay);
    setPixel(15 - (pos & 15), pos / 16, true);
    lmd.display();
    pos--;
    Serial.print(".");
  }

  // Print local IP address and start web server
  Serial.println("");
  Serial.println("WiFi connected.");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void setupOTA()
{
  ArduinoOTA
      .setPassword(OTA_PASSWORD)
      .onStart([]()
               {
                 String type;
                 int command = ArduinoOTA.getCommand();
                 if (command == U_FLASH)
                   type = "sketch";
                 else if (command == U_SPIFFS)
                 {
                   SPIFFS.end();
                   type = "filesystem";
                 }
                 // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
                 Serial.println("Start updating " + type);
               })
      .onEnd([]()
             { Serial.println("\nEnd"); })
      .onProgress([](unsigned int progress, unsigned int total)
                  { Serial.printf("Progress: %u%%\r", (progress / (total / 100))); })
      .onError([](ota_error_t error)
               {
                 Serial.printf("Error[%u]: ", error);
                 if (error == OTA_AUTH_ERROR)
                   Serial.println("Auth Failed");
                 else if (error == OTA_BEGIN_ERROR)
                   Serial.println("Begin Failed");
                 else if (error == OTA_CONNECT_ERROR)
                   Serial.println("Connect Failed");
                 else if (error == OTA_RECEIVE_ERROR)
                   Serial.println("Receive Failed");
                 else if (error == OTA_END_ERROR)
                   Serial.println("End Failed");
               });

  ArduinoOTA.begin();
}

void setup()
{
  Serial.begin(115200);
  lmd.setEnabled(true);
  lmd.setIntensity(0); // 0 = low, 15 = high
  playCourtain();

  lmd.clear();
  setRow(0x00, 0x07c0);
  setRow(0x01, 0x1ff0);
  setRow(0x02, 0x7ffc);
  setRow(0x03, 0x0ff0);
  setRow(0x04, 0x47c4);
  setRow(0x05, 0x701c);
  setRow(0x06, 0x7c7c);
  setRow(0x07, 0x3ff8);
  setRow(0x08, 0x1ff0);
  setRow(0x09, 0x47c4);
  setRow(0x0a, 0x701c);
  setRow(0x0b, 0x7c7c);
  setRow(0x0c, 0x3ff8);
  setRow(0x0d, 0x1ff0);
  setRow(0x0e, 0x07c0);
  setRow(0x0f, 0x0000);
  lmd.display();
  // Initialize SPIFFS
  if (!SPIFFS.begin(true))
  {
    Serial.println("An Error has occurred while mounting SPIFFS");
    return;
  }

  delay(500);
  lmd.clear();
  setRow(0x00, 0x0000);
  setRow(0x01, 0x0000);
  setRow(0x02, 0x3c00);
  setRow(0x03, 0x0700);
  setRow(0x04, 0x03c0);
  setRow(0x05, 0x38e0);
  setRow(0x06, 0x0e70);
  setRow(0x07, 0x0330);
  setRow(0x08, 0x3998);
  setRow(0x09, 0x0cd8);
  setRow(0x0a, 0x064c);
  setRow(0x0b, 0x3b64);
  setRow(0x0c, 0x3924);
  setRow(0x0d, 0x3924);
  setRow(0x0e, 0x0000);
  setRow(0x0f, 0x0000);
  lmd.display();

  initWifi();

  delay(500);
  setupWebServer();
  setupOTA();

  delay(500);
  playCourtain();
  playTicker();
  reloadDataFile();
  playCourtain();
}

int checkFrameStart(int frameIndex)
{
  if (frameIndex >= windowStart)
    if (frameIndex <= windowEnd)
      return frameIndex - windowStart;
  loadPart(frameIndex);
  return frameIndex - windowStart;
}

void setMatrix()
{
  lmd.clear();
  int frameS = checkFrameStart(frameStart);
  for (int i = 1; i < 17; i++)
    setRow(16 - i, frames[(frameS + 1) * sizeFrames - i]);
  lmd.display();
}

void loop()
{
  static bool initialized = false;
  static int64_t lastDuration = 0;
  static ulong lastTime = 0;
  static int64_t delta = 0;
  static ulong currentTime = 0;
  while (frameStart < numFrames)
  {
    ArduinoOTA.handle();
    currentTime = millis();
    if (restartEsp != 0 && restartEsp < currentTime)
    {
      restartEsp = 0;
      Serial.println("ESP.restart();");
      ESP.restart();
    }
    delta = currentTime - lastTime - lastDuration;
    lastTime = currentTime;
    if (!initialized)
    {
      delta = 0;
      initialized = true;
    }
    setMatrix();
    int frameS = checkFrameStart(frameStart);
    lastDuration = frames[frameS * sizeFrames];
    if ((lastDuration - delta) > 0)
      delay(lastDuration - delta);
    frameStart++;
  }
  frameStart = 0;
}

void playTicker()
{
  loadPart(0, "/spy");
  frameStart = 0;
  while (frameStart < numFrames)
  {
    ulong m = millis();

    setMatrix();
    int frameS = checkFrameStart(frameStart);
    delay(frames[frameS * sizeFrames] + millis() - m);
    frameStart++;
  }
}
