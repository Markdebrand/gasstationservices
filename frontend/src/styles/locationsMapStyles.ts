import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  modalTop: { borderRadius: 0, paddingVertical: 8, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%', backgroundColor: 'transparent' },
  modalBack: { height: 40, width: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,97,123,0.06)', marginRight: 6 },
  modalOverline: { fontSize: 13, color: '#64748B', fontWeight: '700', letterSpacing: 0.4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: -1 },
  mapFullRoot: { flex: 1, backgroundColor: '#000' },
  mapFull: { ...StyleSheet.absoluteFillObject },
  floatingActions: { position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 40, flexDirection: 'column' },
  floatingButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  floatingButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  floatingSearch: { position: 'absolute', left: 16, right: 16, zIndex: 50, alignItems: 'center' },
  compactSearchCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E6EEF0' },
  compactSearchInput: { flex: 1, color: '#0F172A', paddingVertical: 6, paddingLeft: 6 },
  compactSearchBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  locateButton: { position: 'absolute', right: 20, backgroundColor: '#FFFFFF', width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6, zIndex: 60 },
  compassButton: { position: 'absolute', left: 20, backgroundColor: '#FFFFFF', width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6, zIndex: 60 },
  routeInfo: { position: 'absolute', width: 96, backgroundColor: '#E6FAF2', borderRadius: 12, padding: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C7F0E0', zIndex: 70, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  routeActions: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, zIndex: 80 },
  routeActionBtn: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E6EDF0', alignItems: 'center', justifyContent: 'center' },
  routeActionBtnGreen: { backgroundColor: '#b91c1c', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // New button variants for RouteActions
  ra_btn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6, minWidth: 96 },
  ra_primary: { backgroundColor: '#b91c1c', shadowColor: '#3a0b0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
  ra_secondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EDF0' },
  ra_disabled: { opacity: 0.6 },
  ra_text_primary: { color: '#FFFFFF', fontWeight: '700' },
  ra_text_secondary: { color: '#0F172A', fontWeight: '700' },
  // Selected location info card
  selectedCard: { paddingHorizontal: 12, paddingBottom: 8 },
  selectedTitle: { color: '#0F172A', fontWeight: '700' },
  selectedCoords: { color: '#64748B', marginTop: 4 },
  // Time badge that appears above selected marker
  timeBadge: { backgroundColor: '#991B1B', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  timeBadgeText: { color: '#fff', fontWeight: '700' },
  // increased background alpha to make the panel less translucent (more solid)
  routeActionsBg: { position: 'absolute', left: 16, right: 16, borderRadius: 14, padding: 6, paddingVertical: 8, overflow: 'hidden', zIndex: 90, borderWidth: 1, borderColor: 'rgba(255,235,235,0.14)', backgroundColor: 'rgba(255,245,245,0.92)', maxHeight: 180 },
  routeActionsInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeActionsContent: { paddingTop: 12 },
});

export default styles;
