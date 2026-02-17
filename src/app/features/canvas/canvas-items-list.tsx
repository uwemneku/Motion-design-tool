import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { setSelectedId } from "../../store/editor-slice";

export default function CanvasItemsList() {
  const dispatch = useDispatch<AppDispatch>();
  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const itemsRecord = useSelector((state: RootState) => state.editor.itemsRecord);
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        Canvas Items
      </h2>

      {canvasItemIds.length === 0 ? (
        <p className="text-sm text-slate-500">No items on canvas</p>
      ) : (
        <ul className="space-y-1">
          {canvasItemIds.map((id) => {
            const item = itemsRecord[id];
            const name = item?.name ?? id;
            const isSelected = selectedId === id;

            return (
              <li key={id}>
                <button
                  type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    isSelected
                      ? "border-emerald-500/70 bg-emerald-500/15 font-semibold text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  }`}
                  onClick={() => {
                    dispatch(setSelectedId(id));
                  }}
                >
                  {name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
