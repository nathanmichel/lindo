import { Mod } from "../mod";
import { Logger } from "app/core/electron/logger.helper";
import { environment } from '../../../../environments/environment';
const firebase = require("firebase");
require("firebase/firestore");

export class PriceCollector extends Mod {
  private db: any;
  private data: any[] = [];

  startMod(): void {
    this.params = this.settings.option.vip.general.pricecollector;
    if (this.params) {
      Logger.info("- enable Price-Collector");
      firebase.initializeApp(environment.firebaseConfig);
      this.db = firebase.firestore();
      this.on(this.wGame.dofus.connectionManager, 'ExchangeTypesItemsExchangerDescriptionForUserMessage', this.getPrice.bind(this));
      this.on(this.wGame.dofus.connectionManager, 'ExchangeBidhouseMinimumItemPriceListMessage', this.getPriceWithMin.bind(this));
      this.on(this.wGame.dofus.connectionManager, 'ExchangeLeaveMessage', this.insertInDB.bind(this));
    }
  }

  private insertInDB() {
    if (this.data.length > 0) {
      this.db.collection("prices").add({ author: "Nathan", data: this.data });
      this.data = [];
    }
  }

  private getPrice(data: any) {
    const windowTitle = this.wGame.document.querySelector(".tradeItemWindow > .windowContent > .windowHeadWrapper > .windowTitle").innerHTML;
    const regExp = /\(([^)]+)\)/;
    const matches = regExp.exec(windowTitle);
    if (matches === null || matches === undefined || matches.length <= 0) return;
    const itemId = +matches[1]; // On parse le DOM pour récuperer l'id de l'item consulté

    let unit;
    let decade;
    let hundred;

    if (data.itemTypeDescriptions.length === 1) {
      const item = data.itemTypeDescriptions[0];

      unit = item.prices[0];
      decade = item.prices[1];
      hundred = item.prices[2];
      this.data.push({ itemId, unit, decade, hundred, date: new Date() });
    } else if (data.itemTypeDescriptions.length > 1) {
      data.itemTypeDescriptions.forEach(item => { // On cherche le prix le plus bas si plusieurs prix sont dispo
        unit = unit === undefined || item.prices[0] < unit ? item.prices[0] : unit;
        decade = decade === undefined || item.prices[1] < decade ? item.prices[1] : decade;
        hundred = hundred === undefined || item.prices[2] < hundred ? item.prices[2] : hundred;
      });
      this.data.push({ itemId, unit, decade, hundred, date: new Date() });
    }

    Logger.info(itemId);
    Logger.info("1: " + unit);
    Logger.info("10: " + decade);
    Logger.info("100: " + hundred);
    Logger.info("");
  }

  private getPriceWithMin(data: any) {
    const itemId = data.objectGID;

    const unit = data.prices[0];
    const decade = data.prices[1];
    const hundred = data.prices[2];

    this.data.push({ itemId, unit, decade, hundred, date: new Date() });

    Logger.info("Min: " + itemId);
    Logger.info("1: " + unit);
    Logger.info("10: " + decade);
    Logger.info("100: " + hundred);
    Logger.info("");
  }
}
