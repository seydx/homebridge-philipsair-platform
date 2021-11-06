<p align="center">
    <img src="https://github.com/SeydX/homebridge-philipsair-platform/blob/master/images/logo.png" height="200">
</p>

# homebridge-philipsair-platform

[![npm](https://img.shields.io/npm/v/homebridge-philipsair-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-philipsair-platform)
[![npm](https://img.shields.io/npm/dt/homebridge-philipsair-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-philipsair-platform)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-philipsair-platform.svg?style=flat-square)](https://github.com/SeydX/homebridge-philipsair-platform)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/kqNCe2D)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

[Click here](https://github.com/SeydX) to review more of my plugins.


## Info

This is a plugin for Philips Air Purifier/Humidifier. 

> This project is heavily inspired by https://github.com/NikDevx/homebridge-philips-air - Since the plugin didn't work for me, I wrote a new one from scratch. The **homebridge-philips-air** was a very great help for the implementation!

## Installation

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

```
sudo npm install -g --unsafe-perm homebridge-philipsair-platform@latest
```

The plugin uses a library based on `python3`. To use the plugin, Python/Pip must be installed!

```
sudo apt install python3-pip git
```

You also need the `aioairctrl` module from [Peter-J](https://github.com/Peter-J/aioairctrl)

```
sudo pip3 install -U git+https://github.com/Peter-J/aioairctrl
```

## Example Config (minimal)


```
{
   ...
    "platforms": [
        {
            "platform": "PhilipsAirPlatform",
            "name": "PhilipsAirPlatform",
            "debug": false,
            "warn": true,
            "error": true,
            "extendedError": true,
            "devices": [
                {
                    "active": true,
                    "name": "Livingroom Philips",
                    "manufacturer": "Philips",
                    "model": "AC3829",
                    "serialNumber": "000000",
                    "host": "192.168.178.111",
                    "port": 3333,
                    "light": true,
                    "temperature": true,
                    "humidity": true,
                    "humidifier": true,
                    "allergicFunc": true,
                    "sleepSpeed": false
                }
            ]
        }
    ]
}

```

For a full config.json, please look at [Example Config](https://github.com/SeydX/homebridge-philipsair-platform/blob/master/example-config.json) for more details.

# Supported clients

This plugin has been verified to work with the following apps/systems:

- iOS > 13
- Apple Home
- All 3rd party apps like Elgato Eve etc
- Homebridge >= v1.3.0
- Node >= 14


# Contributing

You can contribute to this homebridge plugin in following ways:

- Report issues and help verify fixes as they are checked in.
- Review the source code changes.
- Contribute bug fixes.
- Contribute changes to extend the capabilities
- Pull requests are accepted.

See [CONTRIBUTING](https://github.com/SeydX/homebridge-philipsair-platform/blob/master/CONTRIBUTING.md)


# Troubleshooting
If you have any issues with the plugin then you can run this plugin in debug mode, which will provide some additional information. This might be useful for debugging issues. Just open your config ui and set debug to true!

# Disclaimer

All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.

# License

### MIT License

Copyright (c) 2020-2021 SeydX

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
