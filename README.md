# Vesta-Box
Vesta Box (VB) is a terminal box for Smart Home Assistant(SHA). Followes the SHA's ESP philosophy.
The main task for this box is provided a voice driven plateform for user.
The cost is below $35(measured with the price on the market), cheap but powerful.
The biggest challenge is the ASR accurate and responsive speed.
(The server code for SHA is not going to be public)

![Alt text](http://imlewis.com/sha/v1.jpg?raw=true "Title")
![Alt text](http://imlewis.com/sha/v2.jpg?raw=true "Title")

## Some Demos
### Indoor Location Detection
When we say "turn on the light", the system would able to detect your location and turn on the light which near to you. In the demo, I used to turn off all the light when I says "turn off the light" in my bedroom.
This is the first portable version of VB.
http://imlewis.com/sha/001.mp4
### Streaming as you go
When the SAYG(steam as you go) mode turn on. You can continue doing your stuff when you leaving your desktop, it will automatically streaming to the screen which near to you.
http://imlewis.com/sha/002.mp4
### Saying by using multiple language
In the demo, I am asking Vesta the time by using English and Japanese.
http://imlewis.com/sha/004.mp4
### Wakeup Module
In the demo, I am dropping my phone(or glasses) in the box and it will trigger the sleeping mode, turn off all the light and computer. Take out the phone from the box and the system will assume you are wakeup, then giving your information about today's weather and plan.
http://imlewis.com/sha/006.mp4
### OLED version of VB
The second version of VB, I removed this OLED later since I dont think it is necessary.
http://imlewis.com/sha/003.mp4

## Install and configuration
* Install vesta box ISO image
* Change HostName
* Expand File system
* Config vesta-box/config.js
*   -> Change Id
    -> Confirm server address
* node starter

## Component
* Class D Amplifier $5.95
* 3W 40hm Speaker   $1.5
* Sony PE           $5.99
* Pi Zero W         $10
* Micro SD 16G      $7.99

Total:              $31.43
### Optional Component
* 128x64 OLED I2C   $5.25
* RP Camera         $10

## Features
* Hotword wakeup for calling different AI speaker
* Text-To-Speech, support Japanese and English
* Playing audio remotely, able to playing follow user's location
* Collect userIdTag signal and telemetry package from local sensor
* Low power consumption, able to drive by USB port
* Loud and decent audio quality
* Only trigger HW when focused

## Development Tools Features
* JSON format Logger file, easy to convert to object to extract info
* SOX wrapper audio Player allow repeat playing
* Follows AGDW(Auto Generated Documentation Website) format

## MQTT
(* means not be used yet)
### Publish
vb/{id}/connected  - ipAddr
vb/{id}/disconnected   - ipAddr
vb/{id}/ild/{userId}/rssi  - value
sensor/{shortIdentifier}/lightLevel  - value
idTag/{userId}/isMoving - boolean
*idTag/{userId}/battery - value

### Subscribe
vb/{id}/focusMode - true or false
vb/{id}/responsed
vb/{id}/audioPlayer - url

## HTTP API (:3000)
POST /config     - get config info(task) from server
GET  /logger   - return all logger

## Convention
* MQTT Topic convention: DeviceCategory/DeviceId/...
* return status 200 with nothing if everything is good. Or return 'errMsg'
* return GET request result in the property 'data'
* never ever change the port on both server and box
* user input speech text all lower case and only characters

## TODO
process (AEC)Acoustic Echo Cancelling
get WIFI and serverIP dynamically (BLE communication)
* Interrupt(decreasing volume) player by calling AI name
Clound Hotword Verification (Double Check)
Volume Button
Stop Button
Audio Streaming Player

## Consideration
* May not be a good idea to add a small OLED and Camera, it will make device too complicated.
* Audio streaming directly from server is taking 95% CPU on rpi-zero, but 7% on rpi3.

## BUGS
* ps3 eye will not working on reboot
* MUST do AEC, or listening to music will never triger the wakeup word.
