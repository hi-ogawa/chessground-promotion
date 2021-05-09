import { Api } from "chessground/api";
import { Config } from "chessground/config";
import { Key, Piece, Role, Color } from "chessground/types";

import { render as mRender, Vnode } from "mithril";
import h from "mithril/hyperscript";

// `role == undefined` when promotion dialog is canceled
type Callback = (
  orig: Key,
  dest: Key,
  capturedPiece?: Piece,
  role?: Role
) => void;

const kPromotionRoles: Role[] = ["queen", "knight", "rook", "bishop"];

const isPromotion = (orig: Key, dest: Key, piece: Piece): boolean => {
  return (
    piece.role == "pawn" &&
    ((piece.color == "white" && dest[1] == "8") ||
      (piece.color == "black" && dest[1] == "1"))
  );
};

export class ChessgroundPromotion {
  constructor(
    private el: HTMLElement,
    private api: Api,
    private onPromotion: Callback
  ) {}

  patch(config: Config): Config {
    if (!config.events) {
      config.events = {};
    }
    const onMoveOld = config.events.move;
    const onMoveNew = (orig: Key, dest: Key, capturedPiece?: Piece) => {
      const piece = this.api.state.pieces.get(dest);
      if (!piece) {
        return;
      }
      if (!isPromotion(orig, dest, piece)) {
        if (onMoveOld) {
          onMoveOld(orig, dest, capturedPiece);
        }
        return;
      }
      this.prompt(dest, piece.color).then((role) => {
        if (role) {
          this.api.setPieces(
            new Map([
              [dest, { color: piece.color, role: role, promoted: true }],
            ])
          );
        }
        this.onPromotion(orig, dest, capturedPiece, role);
      });
    };
    config.events.move = onMoveNew;
    return config;
  }

  async prompt(dest: Key, color: Color): Promise<Role | undefined> {
    this.el.classList.add("cg-promotion--open");
    const role = await new Promise((resolve) => {
      mRender(
        this.el,
        this.render(dest, color, this.api.state.orientation, resolve)
      );
    });
    this.el.classList.remove("cg-promotion--open");
    mRender(this.el, null);
    return role as Promise<Role | undefined>;
  }

  render(
    dest: Key,
    color: Color,
    orientation: Color,
    resolve: (role: Role | undefined) => void
  ): Vnode {
    let left = dest.charCodeAt(0) - "a".charCodeAt(0);
    let top = color == "white" ? 0 : 7;
    let topStep = color == "white" ? 1 : -1;
    if (orientation == "black") {
      left = 7 - left;
      top = 7 - top;
      topStep *= -1;
    }
    return h(
      "cg-helper",
      h(
        "cg-container",
        h(
          "cg-board",
          { onclick: () => resolve(undefined) },
          kPromotionRoles.map((role, i) =>
            h(
              "square",
              {
                style: `top: ${(top + i * topStep) * 12.5}%; left: ${
                  left * 12.5
                }%`,
                onclick: () => resolve(role),
              },
              h(`piece.${color}.${role}`)
            )
          )
        )
      )
    );
  }
}
