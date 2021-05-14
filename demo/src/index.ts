import { mount, VnodeDOM } from "mithril";
import h from "mithril/hyperscript";

import { Config } from "chessground/config";
import { Color } from "chessground/types";
import { ChessgroundUci } from "chessground-promotion/uci";

import { Chess } from "chessops/chess";
import { makeBoardFen } from "chessops/fen";
import { parseUci } from "chessops/util";
import { chessgroundDests } from "chessops/compat";

const isChecked = (e: MouseEvent): boolean =>
  (e.currentTarget as HTMLInputElement).checked;

const App = () => {
  let cg: ChessgroundUci;
  let orientation: Color = "white";
  let freeMode: boolean = true;
  let freeFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
  let position: Chess = Chess.default();

  const onUci = (uci?: string) => {
    if (!uci) {
      // Promotion dialog is cancelled
      cg.set(makeConfig());
      return;
    }
    if (freeMode) {
      freeFen = cg.cg.getFen();
      return;
    }
    position.play(parseUci(uci)!);
    cg.set(makeConfig());
  };

  const makeConfig = (): Config => {
    return {
      orientation,
      fen: freeMode ? freeFen : makeBoardFen(position.board),
      turnColor: freeMode ? undefined : position.turn,
      lastMove: undefined,
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
  };

  const oncreate = (vnode: VnodeDOM) => {
    cg = new ChessgroundUci(
      vnode.dom.querySelector(".board")!,
      onUci,
      makeConfig()
    );
  };

  const onbeforeremove = () => {
    cg.cg.destroy();
  };

  const view = () => {
    return h("#root", [
      h(".board"),
      h(".controls", [
        h("div", [
          h("label", [
            h("input", {
              type: "checkbox",
              checked: orientation == "black",
              onchange: (e: MouseEvent) => {
                orientation = isChecked(e) ? "black" : "white";
                cg.set({ orientation });
                cg.cgPromotion.redraw();
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
                cg.set(makeConfig());
              },
            }),
            "Free mode",
          ]),
        ]),
      ]),
    ]);
  };

  return { oncreate, onbeforeremove, view };
};

const start = () => {
  mount(document.body, App);
};

start();
