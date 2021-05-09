import { mount, redraw } from "mithril";
import h from "mithril/hyperscript";

import { Chessground } from "chessground";
import { Api } from "chessground/api";
import { Config } from "chessground/config";
import { Color, Key, Piece, Role } from "chessground/types";

import { ChessgroundPromotion } from "chessground-promotion";

import { Chess } from "chessops/chess";
import { makeBoardFen } from "chessops/fen";
import { parseUci, roleToChar } from "chessops/util";
import { chessgroundDests } from "chessops/compat";

const $ = (s: string): HTMLElement => document.querySelector(s)!;

const isChecked = (e: MouseEvent): boolean =>
  (e.currentTarget as HTMLInputElement).checked;

const App = () => {
  let cg: Api;
  let cgPromotion: ChessgroundPromotion;
  let orientation: Color = "white";
  let freeMode: boolean = true;
  let freeFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
  let position: Chess = Chess.default();

  const play = (orig: Key, dest: Key, promotion?: Role) => {
    if (freeMode) {
      freeFen = cg.getFen();
      return;
    }
    const uci = orig + dest + (promotion ? roleToChar(promotion) : "");
    const move = parseUci(uci)!;
    position.play(move);
  };

  const onMove = (orig: Key, dest: Key, capt?: Piece) => {
    play(orig, dest);
    redraw();
  };

  const onPromotion = (orig: Key, dest: Key, capt?: Piece, role?: Role) => {
    if (role) {
      play(orig, dest, role);
    }
    redraw();
  };

  const cgSet = () => {
    let config: Config = {
      orientation,
      fen: freeMode ? freeFen : makeBoardFen(position.board),
      turnColor: freeMode ? undefined : position.turn,
      events: {
        move: onMove,
      },
      movable: freeMode
        ? {
            free: true,
            color: "both",
            dests: undefined,
          }
        : {
            free: false,
            color: position.turn,
            dests: chessgroundDests(position),
          },
    };
    config = cgPromotion.patch(config);
    cg.set(config);
  };

  const oncreate = () => {
    cg = Chessground($(".cg"));
    cgPromotion = new ChessgroundPromotion($(".cg-promotion"), cg, onPromotion);
    cgSet();
  };

  const onupdate = () => {
    cgSet();
  };

  const onbeforeremove = () => {
    cg.destroy();
  };

  const view = () => {
    return h("#root", [
      h(".board", [h(".cg.cg-wrap"), h(".cg-promotion.cg-wrap")]),
      h(".controls", [
        h("div", [
          h("label", [
            h("input", {
              type: "checkbox",
              checked: orientation == "white",
              onchange: (e: MouseEvent) => {
                orientation = isChecked(e) ? "white" : "black";
              },
            }),
            "Flip board",
          ]),
        ]),
        h("div", [
          h("label", [
            h("input", {
              type: "checkbox",
              checked: freeMode,
              onchange: (e: MouseEvent) => {
                freeMode = isChecked(e);
              },
            }),
            "Free mode",
          ]),
        ]),
      ]),
    ]);
  };

  return { oncreate, onupdate, onbeforeremove, view };
};

const start = () => {
  mount(document.body, App);
};

start();
