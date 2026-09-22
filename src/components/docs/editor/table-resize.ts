/**
 * Dragging a table's column edge, on a page that may be zoomed.
 *
 * `prosemirror-tables` resizes a column by adding the mouse's travel to the
 * column's current width: `startWidth + (event.clientX - startX)`. The two
 * terms are in different units the moment the page is not at 100%. The width
 * comes from `offsetWidth`, which is layout pixels; the travel comes from
 * `clientX`, which is screen pixels, and the sheet is drawn through a CSS
 * `transform: scale()`. At 50% the column moves half as far as the pointer, at
 * 200% twice as far, and the edge slides out from under the cursor.
 *
 * It also grows the table. On a page that is wrong: the paper is a fixed
 * width, there is no horizontal scrollbar to reach the rest, and a table wider
 * than its column prints cut off at the margin.
 *
 * So the drag is taken over here and made to behave as a word processor's
 * does. The scale is measured — the editor's rendered width over its laid-out
 * width — so it stays right however the zoom comes to be applied. Dragging an
 * inner edge moves the boundary: the column on the left takes what the column
 * on the right gives up, and the table stays the width it was. Only the last
 * edge resizes the table itself, and only inwards.
 *
 * Everything else about resizing — where the handle is, when it is shown, the
 * blue bar that marks it — is still the library's.
 */

import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TableMap, columnResizingPluginKey } from "@tiptap/pm/tables";

/** No column may be dragged narrower than this, in layout px. */
const CELL_MIN = 44;

interface ResizeState {
  activeHandle: number;
  dragging: unknown;
}

export const ColumnResize = Extension.create({
  name: "pfColumnResize",
  // Ahead of the table extension, so this mousedown is offered the drag first
  // and the library's own handler never sees it.
  priority: 200,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => startDrag(view, event as MouseEvent),
          },
        },
      }),
    ];
  },
});

function startDrag(view: EditorView, event: MouseEvent): boolean {
  if (!view.editable) return false;
  const resize = columnResizingPluginKey.getState(view.state) as ResizeState | undefined;
  if (!resize || resize.activeHandle === -1 || resize.dragging) return false;

  const handle = resize.activeHandle;
  const $cell = view.state.doc.resolve(handle);
  const cellDom = view.nodeDOM(handle) as HTMLElement | null;
  const table = cellDom?.closest("table") as HTMLTableElement | null;
  const colgroup = table?.querySelector("colgroup");
  if (!$cell.nodeAfter || !cellDom || !table || !colgroup) return false;

  const node = $cell.node(-1);
  const map = TableMap.get(node);
  const start = $cell.start(-1);
  const column = map.colCount($cell.pos - start) + ($cell.nodeAfter.attrs.colspan ?? 1) - 1;
  const widths = measureColumns(table, map.width);
  if (!widths.length) return false;

  const dom = view.dom as HTMLElement;
  // Rendered over laid out: 0.5 at half zoom, 2 at double, and exactly 1 when
  // nothing is scaled.
  const scale = dom.offsetWidth ? dom.getBoundingClientRect().width / dom.offsetWidth : 1;
  if (!Number.isFinite(scale) || scale <= 0) return false;

  const neighbour = column + 1 < widths.length ? column + 1 : -1;
  const total = widths.reduce((sum, width) => sum + width, 0);
  // An inner edge borrows from the column beside it; the last edge may only
  // give width back to the page.
  const most =
    neighbour >= 0
      ? widths[column] + widths[neighbour] - CELL_MIN
      : widths[column] + Math.max(0, dom.clientWidth - total);

  const startX = event.clientX;
  const widthsAt = (at: MouseEvent) => {
    const wanted = widths[column] + (at.clientX - startX) / scale;
    const width = Math.round(Math.max(CELL_MIN, Math.min(most, wanted)));
    const next = widths.slice();
    next[column] = width;
    if (neighbour >= 0) next[neighbour] = widths[column] + widths[neighbour] - width;
    return next;
  };

  const win = view.dom.ownerDocument.defaultView ?? window;

  const move = (at: MouseEvent) => {
    if (!at.buttons) return finish(at);
    preview(table, colgroup, widthsAt(at));
  };

  const finish = (at: MouseEvent) => {
    win.removeEventListener("mousemove", move);
    win.removeEventListener("mouseup", finish);
    const next = widthsAt(at);
    applyWidths(view, handle, [column, neighbour].filter((at2) => at2 >= 0), next);
    view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setDragging: null }));
  };

  // The library's own handlers step aside while something is being dragged, so
  // saying so here keeps its handle from wandering to another column mid-drag.
  view.dispatch(
    view.state.tr.setMeta(columnResizingPluginKey, {
      setDragging: { startX, startWidth: widths[column] },
    }),
  );
  win.addEventListener("mousemove", move);
  win.addEventListener("mouseup", finish);
  event.preventDefault();
  return true;
}

/**
 * Every column's width as it is drawn now, in layout px.
 *
 * Read from the first row rather than from the stored attributes, because a
 * table that has never been resized has no stored widths at all — it is
 * whatever the browser laid out, and that is the width the drag starts from.
 */
function measureColumns(table: HTMLTableElement, count: number): number[] {
  const row = table.rows[0];
  if (!row) return [];
  const widths: number[] = [];
  for (const cell of Array.from(row.cells)) {
    const span = cell.colSpan || 1;
    const each = cell.offsetWidth / span;
    for (let i = 0; i < span; i += 1) widths.push(each);
  }
  while (widths.length < count) widths.push(CELL_MIN);
  return widths.slice(0, count);
}

/** Show the drag as it happens, without touching the document. */
function preview(table: HTMLTableElement, colgroup: Element, widths: number[]): void {
  const columns = Array.from(colgroup.children) as HTMLElement[];
  widths.forEach((width, index) => {
    const column = columns[index];
    if (column) column.style.width = `${width}px`;
  });
  const total = widths.reduce((sum, width) => sum + width, 0);
  table.style.width = `${total}px`;
  table.style.minWidth = "";
}

/**
 * Write the dragged widths into the document.
 *
 * A column's width lives on every cell in it, so each row's cell is updated —
 * skipping the ones a rowspan already covered, which are the same cell seen
 * twice. One transaction, at the end of the drag: a transaction per mouse move
 * would fill the undo stack with a hundred steps of one gesture.
 */
function applyWidths(
  view: EditorView,
  handle: number,
  columns: number[],
  widths: number[],
): void {
  const $cell = view.state.doc.resolve(handle);
  const table = $cell.node(-1) as ProseMirrorNode;
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const tr = view.state.tr;

  for (const column of columns) {
    for (let row = 0; row < map.height; row += 1) {
      const index = row * map.width + column;
      if (row && map.map[index] === map.map[index - map.width]) continue;
      const pos = map.map[index];
      const attrs = table.nodeAt(pos)?.attrs as
        | { colspan: number; colwidth: number[] | null }
        | undefined;
      if (!attrs) continue;
      const at = attrs.colspan === 1 ? 0 : column - map.colCount(pos);
      const width = Math.round(widths[column]);
      if (attrs.colwidth && attrs.colwidth[at] === width) continue;
      const colwidth = attrs.colwidth ? attrs.colwidth.slice() : new Array(attrs.colspan).fill(0);
      colwidth[at] = width;
      tr.setNodeMarkup(start + pos, null, { ...attrs, colwidth });
    }
  }

  if (tr.docChanged) view.dispatch(tr);
}
