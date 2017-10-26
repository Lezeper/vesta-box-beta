function parseEstimoteIDTelemetryPacket(data) {
  var frameType = data.readUInt8(0) & 0b00001111;
  var ESTIMOTE_FRAME_TYPE_TELEMETRY = 2;
  if (frameType != ESTIMOTE_FRAME_TYPE_TELEMETRY) { return; }

  var protocolVersion = (data.readUInt8(0) & 0b11110000) >> 4;
  if (protocolVersion > 2) { return; }

  var shortIdentifier = data.toString('hex', 1, 9);

  var subFrameType = data.readUInt8(9) & 0b00000011;

  var ESTIMOTE_TELEMETRY_SUBFRAME_A = 0;
  var ESTIMOTE_TELEMETRY_SUBFRAME_B = 1;

  if (subFrameType == ESTIMOTE_TELEMETRY_SUBFRAME_A) {

    // ***** ACCELERATION
    // var acceleration = {
    //   x: data.readInt8(10) * 2 / 127.0,
    //   y: data.readInt8(11) * 2 / 127.0,
    //   z: data.readInt8(12) * 2 / 127.0
    // };

    // ***** MOTION STATE
    var isMoving = (data.readUInt8(15) & 0b00000011) == 1;

    return {
      shortIdentifier, isMoving
    };

  // ****************
  // * SUBFRAME "B" *
  // ****************
  } else if (subFrameType == ESTIMOTE_TELEMETRY_SUBFRAME_B) {
    // ***** BATTERY LEVEL
    var batteryLevel;
    if (protocolVersion >= 1) {
      batteryLevel = data.readUInt8(19);
      if (batteryLevel == 0b11111111) { batteryLevel = undefined; }
    }

    return {
      shortIdentifier, batteryLevel
    };
  }
}

function parseEstimoteTelemetryPacket(data) { // data is a 0-indexed byte array/buffer

  // byte 0, lower 4 bits => frame type, for Telemetry it's always 2 (i.e., 0b0010)
  var frameType = data.readUInt8(0) & 0b00001111;
  var ESTIMOTE_FRAME_TYPE_TELEMETRY = 2;
  if (frameType != ESTIMOTE_FRAME_TYPE_TELEMETRY) { return; }

  // byte 0, upper 4 bits => Telemetry protocol version ("0", "1", "2", etc.)
  var protocolVersion = (data.readUInt8(0) & 0b11110000) >> 4;
  // this parser only understands version up to 2
  // (but at the time of this commit, there's no 3 or higher anyway :wink:)
  if (protocolVersion > 2) { return; }

  // bytes 1, 2, 3, 4, 5, 6, 7, 8 => first half of the identifier of the beacon
  var shortIdentifier = data.toString('hex', 1, 9);

  // byte 9, lower 2 bits => Telemetry subframe type
  // to fit all the telemetry data, we currently use two packets, "A" (i.e., "0")
  // and "B" (i.e., "1")
  var subFrameType = data.readUInt8(9) & 0b00000011;

  var ESTIMOTE_TELEMETRY_SUBFRAME_A = 0;
  var ESTIMOTE_TELEMETRY_SUBFRAME_B = 1;

  if (subFrameType == ESTIMOTE_TELEMETRY_SUBFRAME_B) {

    // ***** AMBIENT LIGHT
    // byte 13 => ambient light level RAW_VALUE
    // the RAW_VALUE byte is split into two halves
    // pow(2, RAW_VALUE_UPPER_HALF) * RAW_VALUE_LOWER_HALF * 0.72 = light level in lux (lx)
    var ambientLightUpper = (data.readUInt8(13) & 0b11110000) >> 4;
    var ambientLightLower = data.readUInt8(13) & 0b00001111;
    var ambientLightLevel = Math.pow(2, ambientLightUpper) * ambientLightLower * 0.72;

    // ***** BEACON UPTIME
    // byte 14 + 6 lower bits of byte 15 (i.e., 14 bits total)
    // - the lower 12 bits (i.e., byte 14 + lower 4 bits of byte 15) are
    //   a 12-bit unsigned integer
    // - the upper 2 bits (i.e., bits 4 and 5 of byte 15) denote the unit:
    //   0b00 = seconds, 0b01 = minutes, 0b10 = hours, 0b11 = days
    var uptimeUnitCode = (data.readUInt8(15) & 0b00110000) >> 4;
    var uptimeUnit;
    switch (uptimeUnitCode) {
      case 0: uptimeUnit = 'seconds'; break;
      case 1: uptimeUnit = 'minutes'; break;
      case 2: uptimeUnit = 'hours'; break;
      case 3: uptimeUnit = 'days'; break;
    }
    var uptime = {
      number: ((data.readUInt8(15) & 0b00001111) << 8) | data.readUInt8(14),
      unit: uptimeUnit
    };

    // ***** AMBIENT TEMPERATURE
    // upper 2 bits of byte 15 + byte 16 + lower 2 bits of byte 17
    // => ambient temperature RAW_VALUE, signed (two's complement) 12-bit integer
    // RAW_VALUE / 16.0 = ambient temperature in degrees Celsius
    var temperatureRawValue =
      ((data.readUInt8(17) & 0b00000011) << 10) |
       (data.readUInt8(16)               <<  2) |
      ((data.readUInt8(15) & 0b11000000) >>  6);
    if (temperatureRawValue > 2047) {
      // JavaScript way to convert an unsigned integer to a signed one (:
      temperatureRawValue = temperatureRawValue - 4096;
    }
    temperature = temperatureRawValue / 16.0;

    // ***** BATTERY VOLTAGE
    // upper 6 bits of byte 17 + byte 18 => battery voltage in mini-volts (mV)
    //                                      (unsigned 14-bit integer)
    // if all bits are set to 1, it means it hasn't been measured yet
    var batteryVoltage =
       (data.readUInt8(18)               << 6) |
      ((data.readUInt8(17) & 0b11111100) >> 2);
    if (batteryVoltage == 0b11111111111111) { batteryVoltage = undefined; }

    // ***** ERROR CODES
    // byte 19, lower 2 bits
    // see subframe A documentation of the error codes
    // starting in protocol version 1, error codes were moved to subframe A,
    // thus, you will only find them in subframe B in Telemetry protocol ver 0
    var errors;
    if (protocolVersion == 0) {
      errors = {
        hasFirmwareError: (data.readUInt8(19) & 0b00000001) == 1,
        hasClockError: ((data.readUInt8(19) & 0b00000010) >> 1) == 1
      };
    }

    // ***** BATTERY LEVEL
    // byte 19 => battery level, between 0% and 100%
    // if all bits are set to 1, it means it hasn't been measured yet
    // added in protocol version 1
    var batteryLevel;
    if (protocolVersion >= 1) {
      batteryLevel = data.readUInt8(19);
      if (batteryLevel == 0b11111111) { batteryLevel = undefined; }
    }

    return {
      shortIdentifier, protocolVersion,
      ambientLightLevel, temperature,
      uptime, batteryVoltage, batteryLevel, errors
    };
  }
}

function parseIBeacon(peripheral) {
  if (peripheral.advertisement.manufacturerData && peripheral.advertisement.manufacturerData.byteLength == 25) {
    let rssi = peripheral.rssi;
    let uuid = peripheral.advertisement.manufacturerData.slice(4, 20).toString('hex');
    let major = peripheral.advertisement.manufacturerData.readUIntBE(20, 2);
    let minor = peripheral.advertisement.manufacturerData.readUIntBE(22, 2);

    return { rssi, uuid, major, minor };
  }
}

module.exports = {
  parseEstimoteTelemetryPacket: parseEstimoteTelemetryPacket,
  parseEstimoteIDTelemetryPacket: parseEstimoteIDTelemetryPacket,
  parseIBeacon: parseIBeacon
}