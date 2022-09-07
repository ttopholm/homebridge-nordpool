var Service, Characteristic;
import {nordpool} from 'nordpool'
import {schedule} from 'node-cron'

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
   this._maxHourPrice = 0;
   this._minHourPrice = 0;
   
   //Get the prices first
   this.getDailyPrices(Date.now());
   this.getCurrentPrice();
   

   const hourlyJob = schedule('0 1-23  * * * * ', () => {
      this.getCurrentPrice()

   });
   
   const dailyJob = schedule('0 0 * * *', () => {
      this.getDailyPrices()
      this.getCurrentPrice()
   });


}

Hb_Nordpool.prototype = {
   getPrice: function (callback) {
     callback(null, this._currentPrice);
   },
   getOccupancyLowState: function(callback) {
      const currentHour = new Date().getHours()

      if (currentHour == this._minHourPrice) {
         callback(null, Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
      }
      callback(null, Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
   },
   getOccupancyHighState: function(callback) {
      const currentHour = new Date().getHours()

      if (currentHour == this._maxHourPrice) {
         callback(null, Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
      }
      callback(null, Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
   },
   identify: function (callback) {
      this.log("Identify requested!");
      callback(); // success
   },
   getDailyPrices: function() {
      prices.hourly({area:this.area, currency:this.currency, date: Date.now()}).then(results => {
         results.sort(function(a,b) {return a.value - b.value})
         this._maxHourPrice = new Date(results.at(-1).date).getHours()
         this._minHourPrice = new Date(results.at(0).date).getHours()
      })     
   },
   getCurrentPrice: function() {
      prices.at({area:this.area, currency: this.currency}).then( data => {
         const price = Math.round(data.value * ((100+this.VAT)/100))
         this._currentPrice = price
         this.lightSensorService.setCharacteristic(Characteristic.CurrentAmbientLightLevel, price);
         
         const currentHour = new Date().getHours()

   
         if (currentHour == this._minHourPrice) {
            this.occupancyServiceLow.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
            this.occupancyServiceHigh.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
            this.occupancyServiceLow.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
         } else if (currentHour == this._maxHourPrice) {
            this.occupancyServiceLow.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
            this.occupancyServiceHigh.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
            this.occupancyServiceHigh.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
         }
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
         .on('get', this.getPrice.bind(this));

      
      this.occupancyServiceLow = new Service.OccupancySensor(this.name + "_lowPrice", this.name + "_lowPrice");
      this.occupancyServiceLow.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
      this.occupancyServiceLow
        .getCharacteristic(Characteristic.OccupancyDetected)
        .on('get', this.getOccupancyLowState.bind(this));

      this.occupancyServiceHigh = new Service.OccupancySensor(this.name + "_highPrice", this.name + "_highPrice");
      this.occupancyServiceHigh.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
      this.occupancyServiceHigh
        .getCharacteristic(Characteristic.OccupancyDetected)
        .on('get', this.getOccupancyHighState.bind(this));

      return [this.informationService, this.lightSensorService, this.occupancyServiceLow, this.occupancyServiceHigh];
   }
};
