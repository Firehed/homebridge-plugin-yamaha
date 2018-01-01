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

module.exports = homebridge => {
  Accessory = homebridge.platformAccessory;
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerAccessory(platformName, platformPrettyName, YamahaAVR, true);
};

class YamahaAVR {
  // These values are provided via Homebridge
  constructor(log, config, api) {
    this.createServices = () => {
      const infoService = new Service.AccessoryInformation();
      infoService.setCharacteristic(Characteristic.Manufacturer, 'Yamaha').setCharacteristic(Characteristic.Model, 'TODO Model').setCharacteristic(Characteristic.SerialNumber, 'TODO SN');

      const speakerService = new Service.Speaker();
      speakerService.getCharacteristic(Characteristic.Mute).on('get', this.getMute).on('set', this.setMute);
      speakerService.getCharacteristic(Characteristic.Volume).on('get', this.getVolume).on('set', this.setVolume);
      speakerService.setCharacteristic(Characteristic.Name, 'Yamaha Receiver');

      const switchService = new Service.Switch(this.name);
      switchService.getCharacteristic(Characteristic.On).on('get', this.getPower).on('set', this.setPower);

      return [infoService, speakerService, switchService];
    };

    this.getServices = () => {
      return [this.infoService,
      //      this.speakerService, // Not supported in home app yet, so just leave it
      // unimplemented for now
      this.switchService];
    };

    this.getMute = cb => this.yamaha.getBasicInfo().done(info => info.isMuted().then(muted => cb(null, muted)));

    this.setMute = (muted, cb) => {
      this.log.debug('Set mute to ' + muted);
      const res = muted ? this.yamaha.muteOn(this.zone) : this.yamaha.muteOff(this.zone);
      res.then(_ => cb());
    };

    this.getVolume = cb => {
      this.yamaha.getVolume(this.zone).then(dB => {
        this.log('raw volume: ' + dB);
        const fromMin = db - this.volumeMin;
        const percent = fromMin / (this.volumeMax - this.volumeMin);
        this.log(percent + '%');
        cb(null, percent);
      });
    };

    this.setVolume = (vol, cb) => {
      this.log('set volume to ' + vol);
      const relative = vol * (this.volumeMax - this.volumeMin);
      const target = relative + this.volumeMin;
      // todo: round to nearest this.volumeStep
      this.log('absolute target ' + target);
      this.yamaha.setVolumeTo(target, this.zone).then(_ => cb());
    };

    this.getPower = cb => this.yamaha.isOn(this.zone).then(isOn => cb(null, isOn));

    this.setPower = (on, cb) => {
      this.log.debug('Set power to ' + on);
      const res = on ? this.yamaha.powerOn(this.zone) : this.yamaha.powerOff(this.zone);
      res.then(_ => cb());
    };

    if (!config) {
      log('Ignoring receiver - no config');
      return;
    }
    this.log = log;
    this.api = api;
    const { host } = config;

    this.yamaha = new Yamaha(host);

    this.zone = config.zone || 1;

    // Educated guesses from raw API data
    this.volumeMin = -800; // -80.0dB
    this.volumeMax = 50; // +5.0dB
    this.volumeStep = 5; // 0.5dB

    this.yamaha.getSystemConfig().then(info => {
      const config = info.YAMAHA_AV.System[0].Config[0];
      log(config.Model_Name[0]);
      log(config.System_ID[0]);
      log(config.Version[0]);
    });

    [this.infoService, this.speakerService, this.switchService] = this.createServices();
  }

  // Best guess for now, this doesn't work in Home app (yet?)
}