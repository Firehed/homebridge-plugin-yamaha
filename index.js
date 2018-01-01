/*
 * Expected config:
 *
 * {
 *   "platform": "YamahaAVR",
 *   "host": "192.168.1.45",
 * }
 */
var Accessory, Characteristic, Service, UUIDGen;

const platformName = 'homebridge-plugin-yamaha';
const platformPrettyName = 'YamahaAVR';
// const fetch = require('node-fetch');
const Yamaha = require('yamaha-nodejs');

module.exports = (homebridge) => {
  Accessory = homebridge.platformAccessory;
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerAccessory(platformName, platformPrettyName, YamahaAVR, true);
};

class YamahaAVR {
  // These values are provided via Homebridge
  constructor(log, config, api) {
    if (!config) {
      log('Ignoring HDMI switch - no config');
      return;
    }
    this.log = log;
    this.api = api;
    const { host } = config;

    this.yamaha = new Yamaha(host);

    this.yamaha.getAvailableZones().then(z => log(z));

    [this.infoService, this.speakerService, this.switchService] = this.createServices();
  }
 
  createServices = () => {
    const infoService = new Service.AccessoryInformation();
    infoService
      .setCharacteristic(Characteristic.Manufacturer, 'Yamaha')
      .setCharacteristic(Characteristic.Model, 'TODO Model')
      .setCharacteristic(Characteristic.SerialNumber, 'TODO SN');

    const speakerService = new Service.Speaker();
    speakerService
      .getCharacteristic(Characteristic.Mute)
      .on('get', this.getMute)
      .on('set', this.setMute);
    speakerService
      .getCharacteristic(Characteristic.Volume)
      .on('get', this.getVolume)
      .on('set', this.setVolume);
    speakerService
      .setCharacteristic(Characteristic.Name, 'Yamaha Receiver');

    const switchService = new Service.Switch(this.name);
    switchService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPower)
      .on('set', this.setPower);

    return [infoService, speakerService, switchService];
  }

  getServices = () => {
    return [
      this.infoService,
//      this.speakerService, // Not supported in home app yet, so just leave it
                             // unimplemented for now
      this.switchService,
    ]
  }

  getMute = (cb) => this.yamaha
    .getBasicInfo()
    .done(info => info.isMuted().then(muted => cb(null, muted)));

  setMute = (muted, cb) => {
    this.log('setmute ' + muted);
    cb();
  }

  getVolume = (cb) => {
    this.log('getvolume');
    cb(40);
  }

  setVolume = (vol, cb) => {
    this.log('setVolume ' + vol);
    cb();
  }

  getPower = (cb) => this.yamaha
    .isOn()
    .then(isOn => cb(null, isOn))

  setPower = (on, cb) => {
    const powerMethod = on ? this.yamaha.powerOn : this.yamaha.powerOff;
    powerMethod().then(_ => cb());
  }

}
