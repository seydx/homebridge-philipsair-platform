/**
 * v1
 *
 * @url https://github.com/SeydX/homebridge-philipsair-platform
 * @author SeydX <seydx@outlook.de>
 *
 **/

module.exports = (homebridge) => {
  const PhilipsAirPlatform = require('./src/platform')(homebridge);
  homebridge.registerPlatform('homebridge-philipsair-platform', 'PhilipsAirPlatform', PhilipsAirPlatform, true);
};
