// Wrapper for Chessground and ChessgroundPromotion altogether

import { Chessground } from "chessground";
import { Api } from "chessground/api";
import { Config } from "chessground/config";
import { Key, Piece, Role } from "chessground/types";

import { ChessgroundPromotion } from "./index";

// `uci == undefined` when move is cancelled (e.g. from promotion dialog)
type OnUci = (uci?: string) => void;

const roleToChar = (s: string) => {
  if (s == "knight") {
    return "n";
  }
  return s[0];
};

const toUci = (orig: Key, dest: Key, promotion?: Role) => {
  return orig + dest + (promotion ? roleToChar(promotion) : "");
};

export class ChessgroundUci {
  public cg: Api;
  public cgPromotion: ChessgroundPromotion;

  constructor(private el: HTMLElement, private onUci: OnUci, config?: Config) {
    const elCg = document.createElement("div");
    const elCgPromotion = document.createElement("div");
    elCg.classList.add("cg");
    elCg.classList.add("cg-wrap");
    elCgPromotion.classList.add("cg-promotion");
    elCgPromotion.classList.add("cg-wrap");
    this.el.appendChild(elCg);
    this.el.appendChild(elCgPromotion);

    this.cgPromotion = new ChessgroundPromotion(elCgPromotion, () => this.cg);
    this.cg = Chessground(elCg, config && this.patch(config));
  }

  patch(config: Config): Config {
    if (!config.events) {
      config.events = {};
    }
    config.events.move = this.cgPromotion.patch(
      this.onMove.bind(this),
      this.onPromotion.bind(this)
    );
    return config;
  }

  set(config: Config) {
    this.cg.set(this.patch(config));
  }

  onMove(orig: Key, dest: Key, _capt?: Piece) {
    this.onUci(toUci(orig, dest));
  }

  onPromotion(orig: Key, dest: Key, _capt?: Piece, role?: Role) {
    this.onUci(role && toUci(orig, dest, role));
  }
}
