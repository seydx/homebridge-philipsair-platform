'use strict';

const { validIP } = require('../utils/utils');

const Config = (deviceConfig) => {
  return {
    active: deviceConfig.active || false,
    name: deviceConfig.name,
    manufacturer: deviceConfig.manufacturer || 'Philips',
    model: deviceConfig.model || 'Air Purifier',
    serialNumber: deviceConfig.serialNumber || '000000',
    host: validIP(deviceConfig.host),
    port: deviceConfig.port || 5683,
    light: deviceConfig.light || false,
    temperature: deviceConfig.temperature || false,
    humidity: deviceConfig.humidity || false,
    humidifier: deviceConfig.humidifier || false,
    allergicFunc: deviceConfig.allergicFunc || false,
    sleepSpeed: deviceConfig.sleepSpeed || false,
  };
};

module.exports = Config;
