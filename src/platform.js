'use strict';

const logger = require('./utils/logger');
const { version } = require('../package.json');
const { generateConfig } = require('./utils/utils');

//Accessories
const { AccessoriesService, AccessoriesSetup, AccessoriesHandler } = require('./accessories');

const PLUGIN_NAME = 'homebridge-philipsair-platform';
const PLATFORM_NAME = 'PhilipsAirPlatform';

var Accessory;

module.exports = (homebridge) => {
  Accessory = homebridge.platformAccessory;
  return PhilipsAirPlatform;
};

function PhilipsAirPlatform(log, config, api) {
  if (!api || !config) {
    return;
  }

  logger.configure(log, config);

  this.api = api;
  this.accessories = [];
  this.config = generateConfig(config);
  this.devices = new Map();

  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
}

PhilipsAirPlatform.prototype = {
  didFinishLaunching: async function () {
    //initialize devices
    AccessoriesSetup(this.devices, this.config.devices);

    //configure accessories
    this.configure();
  },

  configure() {
    //configure accessories
    for (const [uuid, device] of this.devices.entries()) {
      const cachedAccessory = this.accessories.find((curAcc) => curAcc.UUID === uuid);

      if (!cachedAccessory) {
        logger.info('Configuring new accessory...', device.name);

        const accessory = new Accessory(device.name, uuid);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.push(accessory);
      } else {
        logger.info('Configuring cached accessory...', device.name);
      }
    }

    //remove unused accessories
    this.accessories.forEach((accessory) => {
      const device = this.devices.get(accessory.UUID);

      try {
        if (!device) {
          this.removeAccessory(accessory);
        }
      } catch (err) {
        logger.info('It looks like the accessory has already been removed. Skip removing.');
        logger.debug(err);
      }
    });

    //setup new accessories
    this.accessories.forEach((accessory) => {
      const device = this.devices.get(accessory.UUID);

      if (device) {
        logger.info('Setup accessory...', device.name);
        this.setupAccessory(accessory, device);
      }
    });
  },

  setupAccessory: async function (accessory, device) {
    accessory.on('identify', () => logger.info('Identify requested.', accessory.displayName));

    accessory
      .getService(this.api.hap.Service.AccessoryInformation)
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, device.manufacturer)
      .setCharacteristic(this.api.hap.Characteristic.Model, device.model)
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, device.serialNumber)
      .setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, version);

    accessory.context.config = device;
    accessory.context.config.debug = this.config.debug;

    const handler = new AccessoriesHandler(this.api, accessory);

    this.api.on('shutdown', () => {
      handler.kill();
    });

    new AccessoriesService(this.api, accessory, handler);
  },

  configureAccessory: function (accessory) {
    this.accessories.push(accessory);
  },

  removeAccessory: function (accessory) {
    logger.info('Removing accessory...', `${accessory.displayName} (${accessory.context.config.subtype})`);
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

    this.accessories = this.accessories.filter(
      (cachedAccessory) => cachedAccessory.displayName !== accessory.displayName
    );
  },
};
