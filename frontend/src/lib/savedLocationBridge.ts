
type SelectionListener = ((loc: { name: string; address: string; lat: number; lon: number }) => void) | null;
type ChangeListener = (() => void) | null;

export const SavedLocationBridge = {
  _selectionListener: null as SelectionListener,
  _changeListener: null as ChangeListener,
  // selection listener (when user taps Use)
  setSelectionListener(fn: SelectionListener) { this._selectionListener = fn; },
  clearSelectionListener() { this._selectionListener = null; },
  notifySelection(loc: { name: string; address: string; lat: number; lon: number }) {
    try { if (this._selectionListener) this._selectionListener(loc); } catch (e) { /* ignore */ }
  },
  // change listener (when saved list is modified)
  setChangeListener(fn: ChangeListener) { this._changeListener = fn; },
  clearChangeListener() { this._changeListener = null; },
  notifyChange() {
    try { if (this._changeListener) this._changeListener(); } catch (e) { /* ignore */ }
  }
};

export default SavedLocationBridge;
