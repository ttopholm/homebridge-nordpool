var Service, Characteristic;
import {nordpool} from 'nordpool'
import {scheduleJob} from 'node-schedule'

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
   this.manufacturer = config["manufacturer"] || "@ttopholm";
   this.model = config["model"] || "Model not available";
   this.serial = config["serial"] || "Non-defined serial";
   this.VAT = config['VAT'] || 25;
   this.area = config['area'] || 'DK1'
   this.currency = config['currency'] || 'DKK'
   this._currentPrice = 0;

   
   //Get the price first
   this.getPriceNow()

   const hourlyJob = scheduleJob('0 * * * * ', function() {
      this.getPriceNow()
   })
}

Hb_Nordpool.prototype = {
   getCurrentPrice: function (callback) {
     callback(null, this._currentPrice);
   },
   identify: function (callback) {
      this.log("Identify requested!");
      callback(); // success
   },
   getPriceNow: function() {
      prices.at({area:this.area, currency: this.currency}).then( results => {
         const price = Math.round(data.value * ((100+this.VAT)/100))
         this._currentPrice = price
         this.homebridgeService.setCharacteristic(Characteristic.CurrentAmbientLightLevel, price);
      })
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
