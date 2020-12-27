import { Mod } from "../mod";
import { Logger } from "app/core/electron/logger.helper";
import { environment } from '../../../../environments/environment';
import * as firebase from "firebase";
import "firebase/firestore";

export class PriceCollector extends Mod {
  private db: any;
  private server: number = this.wGame.gui.serversData.connectedServerId;
  private data: any[] = [];
  private dataPushed: any = {};

  startMod(): void {
    this.params = this.settings.option.vip.general.pricecollector;
    if (this.params) {
      Logger.info("- enable Price-Collector");
      if (firebase.apps.length === 0) // Eviter d'init une app déjà init
        firebase.initializeApp(environment.firebaseTerracogita);
      this.db = firebase.firestore();
      this.on(this.wGame.dofus.connectionManager, 'ExchangeTypesItemsExchangerDescriptionForUserMessage', this.getPrice.bind(this));
      this.on(this.wGame.dofus.connectionManager, 'ExchangeBidhouseMinimumItemPriceListMessage', this.getPriceWithMin.bind(this));
      this.on(this.wGame.dofus.connectionManager, 'ExchangeLeaveMessage', this.insertInDB.bind(this));
    }
  }

  private insertInDB() {
    if (this.data.length > 0) {
      const mac = electronSettings.get("macAddress");

      let seed = 0, i, chr;
      for (i = 0; i < mac.length; i++) {
        chr   = mac.charCodeAt(i);
        seed  = ((seed << 5) - seed) + chr;
        seed |= 0; // Convert to 32bit integer
      }
      this.db.collection("prices").add({ author: seed, data: this.data, server: this.server });
      this.data = [];
    }
  }

  private isAlreadyPushed(item: number) {
    const now = new Date();

    if (this.dataPushed[item] && this.dataPushed[item].getTime() > now.getTime() - 60*60*1000)
      return true;
    this.dataPushed[item] = now;
    return false;
  }

  private getPrice(data: any) {
    const windowTitle = this.wGame.document.querySelector(".tradeItemWindow > .windowContent > .windowHeadWrapper > .windowTitle").innerHTML;
    const regExp = /\(([^)]+)\)/;
    const matches = regExp.exec(windowTitle);
    if (matches === null || matches === undefined || matches.length <= 0) return;
    const itemId = +matches[1]; // On parse le DOM pour récuperer l'id de l'item consulté

    if (this.isAlreadyPushed(itemId)) return;

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
  }

  private getPriceWithMin(data: any) {
    const itemId = data.objectGID;

    if (this.isAlreadyPushed(itemId)) return;

    const unit = data.prices[0];
    const decade = data.prices[1];
    const hundred = data.prices[2];

    this.data.push({ itemId, unit, decade, hundred, date: new Date() });
  }
}
