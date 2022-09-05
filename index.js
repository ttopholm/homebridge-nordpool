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
   this._maxPricePerHour = 0;
   this._minPricePerHour = 0;
   that = this
   
   //Get the price first
   this.getPriceNow()

   const hourlyJob = scheduleJob('0 * * * * ', function() {
      that.getPriceNow()
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
      prices.at({area:this.area, currency: this.currency}).then( data => {
         const price = Math.round(data.value * ((100+this.VAT)/100))
         this._currentPrice = price
         this.lightSensorService.setCharacteristic(Characteristic.CurrentAmbientLightLevel, price);
      })
   },
   getServices: function () {
      this.informationService = new Service.AccessoryInformation();
      this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);

      this.lightSensorService = new Service.LightSensor(this.name);
      this.lightSensorService
         .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
         .on('get', this.getCurrentPrice.bind(this));

      return [this.informationService, this.lightSensorService];
   }
};
