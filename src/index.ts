import { Api } from "chessground/api";
import { Config } from "chessground/config";
import { Key, Piece, Role, Color } from "chessground/types";

import { render, Vnode } from "mithril";
import h from "mithril/hyperscript";

type OnMove = (orig: Key, dest: Key, capturedPiece?: Piece) => void;

// `role == undefined` when promotion dialog is canceled
type OnPromotion = (
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

type Resolve = (role: Role | undefined) => void;

interface State {
  dest: Key;
  color: Color;
  resolve: Resolve;
}

export class ChessgroundPromotion {
  private state?: State = undefined;

  constructor(
    private el: HTMLElement,
    private cg: () => Api // This allows instantiating `ChessgroundPromotion` before `Chessground`
  ) {
    this.redraw();
  }

  patch(onMove: OnMove, onPromotion: OnPromotion): OnMove {
    return (orig: Key, dest: Key, capturedPiece?: Piece) => {
      const piece = this.cg().state.pieces.get(dest);
      if (!piece) {
        return;
      }
      if (!isPromotion(orig, dest, piece)) {
        if (onMove) {
          onMove(orig, dest, capturedPiece);
        }
        return;
      }
      this.prompt(dest, piece.color).then((role) => {
        if (role) {
          this.cg().setPieces(
            new Map([
              [dest, { color: piece.color, role: role, promoted: true }],
            ])
          );
        }
        onPromotion(orig, dest, capturedPiece, role);
      });
    };
  }

  async prompt(dest: Key, color: Color): Promise<Role | undefined> {
    const role: Role | undefined = await new Promise((resolve: Resolve) => {
      this.state = { dest, color, resolve };
      this.redraw();
    });
    this.state = undefined;
    this.redraw();
    return role;
  }

  redraw() {
    this.el.classList.toggle("cg-promotion--open", !!this.state);
    render(this.el, this.view());
  }

  view(): Vnode {
    if (!this.state) {
      return h("cg-helper", h("cg-container", h("cg-board")));
    }
    const { dest, color, resolve } = this.state;
    const orientation = this.cg().state.orientation;
    let left = dest.charCodeAt(0) - "a".charCodeAt(0);
    let top = color == "white" ? 0 : 7;
    let topStep = color == "white" ? 1 : -1;
    if (orientation == "black") {
      left = 7 - left;
      top = 7 - top;
      topStep *= -1;
    }
    let roles: Vnode[] = kPromotionRoles.map((role, i) =>
      h(
        "square",
        {
          style: `top: ${(top + i * topStep) * 12.5}%; left: ${left * 12.5}%`,
          onclick: () => resolve(role),
        },
        h(`piece.${color}.${role}`)
      )
    );
    return h(
      "cg-helper",
      h(
        "cg-container",
        h("cg-board", { onclick: () => resolve(undefined) }, roles)
      )
    );
  }
}
