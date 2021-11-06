'use-strict';

const logger = require('../utils/logger');
const { UUIDgenerate } = require('../utils/utils');
const Config = require('./accessories.config');

const Setup = async (deviceMap, devices) => {
  for (const deviceConfig of devices) {
    let error = false;
    const device = Config(deviceConfig);

    if (!device.active) {
      error = true;
    } else if (!device.name) {
      logger.warn('One of the devices has no name configured. This device will be skipped.');
      error = true;
    } else if (!device.host) {
      logger.warn('There is no ip/host configured for this device. This device will be skipped.', device.name);
      error = true;
    }

    if (!error) {
      const uuid = UUIDgenerate(device.name);

      if (deviceMap.has(uuid)) {
        logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', device.name);
      } else {
        logger.info('Initializing device...', device.name);
        deviceMap.set(uuid, device);
      }
    }
  }
};

module.exports = Setup;
