var Service, Characteristic;
import {nordpool} from 'nordpool'
import pollingtoevent from 'polling-to-event'

const prices = new nordpool.Prices()

export default (homebridge) => {
   Service = homebridge.hap.Service;
   Characteristic = homebridge.hap.Characteristic;
   homebridge.registerAccessory("homebridge-nordpool", "Nordpool", Hb_Nordpool);
}


function Hb_Nordpool(log, config) {
   this.log = log;

   // url info
   this.name = config["name"];
   this.manufacturer = config["manufacturer"] || "@lagunacomputer";
   this.model = config["model"] || "Model not available";
   this.serial = config["serial"] || "Non-defined serial";
   this.VAT = config['VAT'] || 25;
   this.area = config['area'] || 'DK1'
   this.currency = config['currency'] || 'DKK'
   this._priceValue = 0;
   var that = this;
   var emitter = pollingtoevent(function(done) {
    const item = prices.at({area:that.area, currency: that.currency}).then( 
      item => done(null, item)
    )
  }, {interval:60*1000, longpolling:true, longpollEventName:'NordPoolPoll'});

  emitter.on("NordPoolPoll", function(data) {
    const price = Math.round(data.value * ((100+that.VAT)/100))
    that._priceValue = price
  });
}

Hb_Nordpool.prototype = {
   getState: function (callback) {
     callback(null, this._priceValue);
   },
   identify: function (callback) {
      this.log("Identify requested!");
      callback(); // success
   },

   getServices: function () {
      this.informationService = new Service.AccessoryInformation();
      this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);

      this.temperatureService = new Service.LightSensor(this.name);
      this.temperatureService
         .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
         .on('get', this.getState.bind(this));

      return [this.informationService, this.temperatureService];
   }
};
