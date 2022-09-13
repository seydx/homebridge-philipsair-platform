'use strict';

const path = require('path');
const { exec, spawn } = require('child_process');

const logger = require('../utils/logger');

class Handler {
  constructor(api, accessory) {
    this.api = api;
    this.accessory = accessory;

    this.shutdown = false;
    this.airControl = null;
    this.obj = {};
    this.keyMaps = {};
    this.valueMaps = {};
    this.speeds = [{ om: '1' }, { om: '2' }, { om: 't' }];

    // FIXME: Sleep speed is likely to be removed with new config approach
    if (this.accessory.context.config.sleepSpeed) {
      this.speeds = [{ om: 's' }, { om: '1' }, { om: '2' }, { om: 't' }];
    }

    if (this.accessory.context.config.model == 'AC3036/10' || this.accessory.context.config.model == 'AC1715/11') {
      this.speeds = [{ mode: 'S' }, { mode: 'AG' }, { mode: 'M', om: 1 }, { mode: 'M', om: 2 }, { mode: 'T' }];
    // FIXME: Here we test for some models (set with configuration, not yet pulled from received type or modelid)
    // This should be extracted into a separate configuration function which handles different models.
    }

    if (this.accessory.context.config.model == 'AC1715/11') {
      this.keyMaps = {
        pwr: 'D03-02',
        om: 'D03-13',
        speed: 'D03-13',
        mode: 'D03-11',
        cl: 'D03-03',
        aqil: 'D03-04',
        uil: 'D03-05',
        iaql: 'D03-32',
        pm25: 'D03-33',
        fltt1: 'D05-02',
        fltt2: 'D05-03',
        flttotal0: 'D05-07',
        flttotal1: 'D05-08',
        flttotal2: 'D05-09',
        fltsts0: 'D05-13',
        fltsts1: 'D05-14',
        fltsts2: 'D05-15',
      };
      this.valueMaps = {
        pwr: {
          OFF: 0,
          ON: 1,
          0: 'OFF',
          1: 'ON',
        },
      };
    }

    this.args = [
      'python3',
      `${path.resolve(__dirname, '../../')}/lib/pyaircontrol.py`,
      '-H',
      this.accessory.context.config.host,
      '-P',
      this.accessory.context.config.port,
      this.accessory.context.config.debug ? '-D' : '',
    ].filter((cmd) => cmd);
  }

  sendCMD(args) {
    logger.debug(`CMD: ${args.join(' ')}`, this.accessory.displayName);

    return new Promise((resolve, reject) => {
      exec(args.join(' '), (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        }

        logger.debug(stderr, this.accessory.displayName);
        resolve();
      });
    });
  }

  handleResponse(json) {
    this.obj = json;

    Object.entries(this.keyMaps).forEach(([key, mappedKey]) => {
      this.obj[key] = this.valueMaps[key] ? this.valueMaps[key][this.obj[mappedKey]] : this.obj[mappedKey];
      delete this.obj[mappedKey];
    });

    logger.debug(this.obj, this.accessory.displayName);
  }

  handleCommand(key, value) {
    key = this.keyMaps[key] || key;
    value = this.valueMaps[key] ? this.valueMaps[key][value] : value;
    logger.debug(`${key}=${value}`, this.accessory.displayName);

    return `${key}=${value}`;
  }

  speedsMinStep() {
    return 100 / this.speeds.length;
  }

  rotationSpeed() {
    let speedConfigIndex = this.speeds.findIndex((speedConfig) => {
      return Object.entries(speedConfig).every(([cmd, value]) => {
        return this.obj[cmd].toString() == value.toString();
      });
    });
    let speedIndex = speedConfigIndex + 1;
    logger.debug(`#rotationSpeed: ${speedIndex * this.speedsMinStep()}`, this.accessory.displayName);
    return speedIndex * this.speedsMinStep();
  }

  //Air Purifier
  async setPurifierActive(state) {
    try {
      const stateNumber = state ? 1 : 0;

      const args = [...this.args];
      args.push('set', `${this.handleCommand('pwr', stateNumber)}`);

      this.purifierService.updateCharacteristic(this.api.hap.Characteristic.CurrentAirPurifierState, stateNumber * 2);

      logger.info(`Purifier Active: ${state}`, this.accessory.displayName);
      await this.sendCMD(args);
    } catch (err) {
      logger.warn('An error occured during changing purifier state!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }
  }

  async setPurifierTargetState(state) {
    try {
      const values = {
        mode: state ? 'P' : this.accessory.context.config.allergicFunc ? 'A' : 'M',
      };

      if (state != 0) {
        this.purifierService
          .updateCharacteristic(this.api.hap.Characteristic.RotationSpeed, 0)
          .updateCharacteristic(this.api.hap.Characteristic.TargetAirPurifierState, state);
      }

      const args = [...this.args];
      args.push('set', `${this.handleCommand('mode', values.mode)}`);

      logger.info(`Purifier Mode: ${state}`, this.accessory.displayName);

      await this.sendCMD(args);
    } catch (err) {
      logger.warn('An error occured during changing target purifier state!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }
  }

  async setPurifierLockPhysicalControls(state) {
    try {
      const values = {
        cl: state == 1,
      };

      const args = [...this.args];
      args.push('set', `${this.handleCommand('cl', values.cl)}`);

      logger.info(`Lock: ${state}`, this.accessory.displayName);

      await this.sendCMD(args);
    } catch (err) {
      logger.warn('An error occured during changing lock state!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }
  }

  async setPurifierRotationSpeed(value) {
    try {
      const speed = Math.ceil(value / this.speedsMinStep());

      if (speed > 0) {
        this.purifierService.updateCharacteristic(this.api.hap.Characteristic.TargetAirPurifierState, 0);
        logger.info(`Purifier Rotation Speed: value: ${value}`, this.accessory.displayName);

        let args = [...this.args];
        let cmds = [];
        Object.entries(this.speeds[speed - 1]).forEach(([cmd, value]) => {
          cmds.push(`${this.handleCommand(cmd, value)}`);
        });
        args.push('set', cmds.join(' '));

        logger.info(`Purifier Rotation Speed: cmds: ${cmds.join(' ')}`, this.accessory.displayName);

        await this.sendCMD(args);
      }
    } catch (err) {
      logger.warn('An error occured during changing purifier rotation speed!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }
  }

  //Humidifier
  async setHumidifierActive(state) {
    try {
      const values = {
        func: state ? 'PH' : 'P',
      };

      let water_level = 100;

      if (this.obj.func == 'PH' && this.obj.wl == 0) {
        water_level = 0;
      }

      let speed_humidity = 0;
      let state_ph = 0;

      if (this.obj.func == 'PH' && water_level == 100) {
        state_ph = 1;

        if (this.obj.rhset == 40) {
          speed_humidity = 25;
        } else if (this.obj.rhset == 50) {
          speed_humidity = 50;
        } else if (this.obj.rhset == 60) {
          speed_humidity = 75;
        } else if (this.obj.rhset == 70) {
          speed_humidity = 100;
        }
      }

      this.humidifierService.updateCharacteristic(this.api.hap.Characteristic.TargetHumidifierDehumidifierState, 1);

      if (state) {
        this.humidifierService
          .updateCharacteristic(this.api.hap.Characteristic.Active, 1)
          .updateCharacteristic(this.api.hap.Characteristic.CurrentHumidifierDehumidifierState, state_ph * 2)
          .updateCharacteristic(this.api.hap.Characteristic.RelativeHumidityHumidifierThreshold, speed_humidity);
      } else {
        this.humidifierService
          .updateCharacteristic(this.api.hap.Characteristic.Active, 0)
          .updateCharacteristic(this.api.hap.Characteristic.CurrentHumidifierDehumidifierState, 0)
          .updateCharacteristic(this.api.hap.Characteristic.RelativeHumidityHumidifierThreshold, 0);
      }

      const args = [...this.args];
      args.push('set', `${this.handleCommand('func', values.func)}`);

      logger.info(`Humidifier Active: ${state}`, this.accessory.displayName);

      await this.sendCMD(args);
    } catch (err) {
      logger.warn('An error occured during changing humidifier state!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }
  }

  /*setHumidifierCurrentState(state) {
    return new Promise((resolve, reject) => {});
  }*/

  async setHumidifierTargetState(state) {
    try {
      const speed = state;

      const values = {
        func: state ? 'PH' : 'P',
        rhset: 40,
      };

      let speed_humidity = 0;

      if (speed > 0 && speed <= 25) {
        values.rhset = 40;
        speed_humidity = 25;
      } else if (speed > 25 && speed <= 50) {
        values.rhset = 50;
        speed_humidity = 50;
      } else if (speed > 50 && speed <= 75) {
        values.rhset = 60;
        speed_humidity = 75;
      } else if (speed > 75 && speed <= 100) {
        values.rhset = 70;
        speed_humidity = 100;
      }

      let water_level = 100;

      if (this.obj.func == 'PH' && this.obj.wl == 0) {
        water_level = 0;
      }

      this.humidifierService.updateCharacteristic(this.api.hap.Characteristic.TargetHumidifierDehumidifierState, 1);

      if (speed_humidity > 0) {
        this.humidifierService
          .updateCharacteristic(this.api.hap.Characteristic.Active, 1)
          .updateCharacteristic(this.api.hap.Characteristic.CurrentHumidifierDehumidifierState, 2)
          .updateCharacteristic(this.api.hap.Characteristic.WaterLevel, water_level)
          .updateCharacteristic(this.api.hap.Characteristic.RelativeHumidityHumidifierThreshold, speed_humidity);
      } else {
        this.humidifierService.updateCharacteristic(this.api.hap.Characteristic.Active, 0);
      }

      const args1 = [...this.args];
      const args2 = [...this.args];

      args1.push('set', `${this.handleCommand('func', values.func)}`);
      args2.push('set', `${this.handleCommand('rhset', values.rhset)}`, '-I');

      logger.info(`Humidifier State: ${state}`, this.accessory.displayName);

      await this.sendCMD(args1);
      await this.sendCMD(args2);
    } catch (err) {
      logger.warn('An error occured during changing target humidifer state!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }
  }

  /*setHumidifierThreshold(value) {
    return new Promise((resolve, reject) => {});
  }*/

  //Light
  async setLightOn(state) {
    if (this.settingBrightess) {
      return;
    }

    this.settingLightState = true;

    try {
      const values = {
        aqil: state ? 100 : 0,
        uil: state ? '1' : '0',
      };

      //Light
      const args1 = [...this.args];
      const args2 = [...this.args];

      args1.push('set', `${this.handleCommand('aqil', values.aqil)}`, '-I');
      args2.push('set', `${this.handleCommand('uil', values.uil)}`);

      logger.info(`Light state: ${state}`, this.accessory.displayName);

      await this.sendCMD(args1);
      await this.sendCMD(args2);
    } catch (err) {
      logger.warn('An error occured during changing light state!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }

    this.settingLightState = false;
  }

  async setLightBrightness(value) {
    if (this.settingLightState) {
      return;
    }

    this.settingBrightess = true;

    try {
      const values = {
        aqil: value,
        uil: value ? '1' : '0',
      };

      //Light
      const args1 = [...this.args];
      const args2 = [...this.args];

      args1.push('set', `${this.handleCommand('aqil', values.aqil)}`, '-I');
      args2.push('set', `${this.handleCommand('uil', values.uil)}`);

      logger.info(`Brightness: ${value}`, this.accessory.displayName);

      await this.sendCMD(args1);
      await this.sendCMD(args2);
    } catch (err) {
      logger.warn('An error occured during changing light brightness!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }

    this.settingBrightess = false;
  }

  //Longpoll Process
  longPoll() {
    this.purifierService = this.accessory.getService(this.api.hap.Service.AirPurifier);
    this.humidifierService = this.accessory.getService('Humidifier');
    this.temperatureService = this.accessory.getService('Temperature Sensor');
    this.humidityService = this.accessory.getService('Humidity Sensor');
    this.lightService = this.accessory.getService('Light');

    this.airQualityService = this.accessory.getService('Air Quality');
    this.preFilterService = this.accessory.getService('Pre Filter');
    this.carbonFilterService = this.accessory.getService('Active carbon filter');
    this.hepaFilterService = this.accessory.getService('HEPA filter');
    this.wickFilterService = this.accessory.getService('Wick filter');

    const args = [...this.args];
    args.push('status-observe', '-J');

    this.airControl = spawn(args.shift(), args);

    this.airControl.stdout.on('data', async (data) => {
      this.handleResponse(JSON.parse(data.toString()));

      //Air Purifier
      this.purifierService
        .updateCharacteristic(this.api.hap.Characteristic.Active, parseInt(this.obj.pwr) ? 1 : 0)
        .updateCharacteristic(this.api.hap.Characteristic.CurrentAirPurifierState, parseInt(this.obj.pwr) * 2)
        .updateCharacteristic(this.api.hap.Characteristic.TargetAirPurifierState, this.obj.mode === 'M' ? 0 : 1)
        .updateCharacteristic(this.api.hap.Characteristic.LockPhysicalControls, this.obj.cl ? 1 : 0)
        .updateCharacteristic(this.api.hap.Characteristic.RotationSpeed, this.rotationSpeed());

      if (this.airQualityService) {
        this.airQualityService
          .updateCharacteristic(this.api.hap.Characteristic.AirQuality, Math.ceil(this.obj.iaql / 3))
          .updateCharacteristic(this.api.hap.Characteristic.PM2_5Density, this.obj.pm25);
      }

      if (this.temperatureService) {
        this.temperatureService.updateCharacteristic(this.api.hap.Characteristic.CurrentTemperature, this.obj.temp);
      }

      if (this.humidityService) {
        this.humidityService.updateCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity, this.obj.rh);
      }

      if (this.lightService) {
        if (this.obj.pwr == '1') {
          this.lightService
            .updateCharacteristic(this.api.hap.Characteristic.On, this.obj.aqil > 0)
            .updateCharacteristic(this.api.hap.Characteristic.Brightness, this.obj.aqil);
        } else {
          this.lightService.updateCharacteristic(this.api.hap.Characteristic.On, false);
        }
      }

      if (this.humidifierService) {
        let water_level = 100;
        let speed_humidity = 0;

        if (this.obj.func == 'PH' && this.obj.wl == 0) {
          water_level = 0;
        }

        if (this.obj.pwr == '1') {
          if (this.obj.func == 'PH' && water_level == 100) {
            if (this.obj.rhset == 40) {
              speed_humidity = 25;
            } else if (this.obj.rhset == 50) {
              speed_humidity = 50;
            } else if (this.obj.rhset == 60) {
              speed_humidity = 75;
            } else if (this.obj.rhset == 70) {
              speed_humidity = 100;
            }
          }
        }

        this.humidifierService
          .updateCharacteristic(
            this.api.hap.Characteristic.Active,
            parseInt(this.obj.pwr) ? (this.obj.func === 'PH' ? 1 : 0) : 0
          )
          .updateCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity, this.obj.rh)
          .updateCharacteristic(this.api.hap.Characteristic.WaterLevel, water_level)
          .updateCharacteristic(this.api.hap.Characteristic.TargetHumidifierDehumidifierState, 1)
          .updateCharacteristic(this.api.hap.Characteristic.RelativeHumidityHumidifierThreshold, speed_humidity);

        if (water_level == 0) {
          if (this.obj.func != 'P') {
            await this.setPurifierTargetState(true);
          }

          this.humidifierService
            .updateCharacteristic(this.api.hap.Characteristic.Active, 0)
            .updateCharacteristic(this.api.hap.Characteristic.CurrentHumidifierDehumidifierState, 0)
            .updateCharacteristic(this.api.hap.Characteristic.RelativeHumidityHumidifierThreshold, 0);
        }

        if (this.wickFilterService) {
          const fltwickchange = this.obj.wicksts == 0;
          const fltwicklife = Math.round((this.obj.wicksts / 4800) * 100);

          this.wickFilterService
            .updateCharacteristic(this.api.hap.Characteristic.FilterChangeIndication, fltwickchange)
            .updateCharacteristic(this.api.hap.Characteristic.FilterLifeLevel, fltwicklife);
        }
      }

      if (this.preFilterService) {
        const fltsts0change = this.obj.fltsts0 == 0;
        const fltsts0maxlife = this.obj.flttotal0 ? this.obj.flttotal0 : 360;
        const fltsts0life = (this.obj.fltsts0 / fltsts0maxlife) * 100;

        this.preFilterService
          .updateCharacteristic(this.api.hap.Characteristic.FilterChangeIndication, fltsts0change)
          .updateCharacteristic(this.api.hap.Characteristic.FilterLifeLevel, fltsts0life);
      }

      if (this.carbonFilterService) {
        const fltsts2change = this.obj.fltsts2 == 0;
        const fltsts2maxlife = this.obj.flttotal2 ? this.obj.flttotal2 : 4800;
        const fltsts2life = (this.obj.fltsts2 / fltsts2maxlife) * 100;

        this.carbonFilterService
          .updateCharacteristic(this.api.hap.Characteristic.FilterChangeIndication, fltsts2change)
          .updateCharacteristic(this.api.hap.Characteristic.FilterLifeLevel, fltsts2life);
      }

      if (this.hepaFilterService) {
        const fltsts1change = this.obj.fltsts1 == 0;
        const fltsts1maxlife = this.obj.flttotal1 ? this.obj.flttotal1 : 4800;
        const fltsts1life = (this.obj.fltsts1 / fltsts1maxlife) * 100;

        this.hepaFilterService
          .updateCharacteristic(this.api.hap.Characteristic.FilterChangeIndication, fltsts1change)
          .updateCharacteristic(this.api.hap.Characteristic.FilterLifeLevel, fltsts1life);
      }
    });

    this.airControl.stderr.on('data', (data) => {
      logger.debug(data.toString(), this.accessory.displayName);
    });

    this.airControl.stderr.on('exit', () => {
      logger.debug(
        `airControl process killed (${this.shutdown ? 'expected' : 'not expected'})`,
        this.accessory.displayName
      );

      clearTimeout(this.processTimeout);

      if (!this.shutdown) {
        logger.debug('Restarting polling process', this.accessory.displayName);
      }
    });

    this.processTimeout = setTimeout(() => {
      if (this.airControl) {
        this.airControl.kill();
        this.airControl = null;
      }

      this.longPoll();
    }, 1 * 60 * 1000);
  }

  kill(shutdown) {
    this.shutdown = shutdown || false;

    if (this.airControl) {
      logger.debug('Killing airControl process', this.accessory.displayName);
      this.airControl.kill();
    }
  }
}

module.exports = Handler;
