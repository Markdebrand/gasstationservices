import { StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: Colors.light.background },
  modalTop: { borderRadius: 0, paddingVertical: 8, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%', backgroundColor: 'transparent' },
  modalBack: { height: 40, width: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(185,28,28,0.06)', marginRight: 6 },
  modalOverline: { fontSize: 13, color: Colors.light.muted, fontWeight: '700', letterSpacing: 0.4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.light.text, marginTop: -1 },
  mapFullRoot: { flex: 1, backgroundColor: Colors.dark.background },
  mapFull: { ...StyleSheet.absoluteFillObject },
  floatingActions: { position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 40, flexDirection: 'column' },
  floatingButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  floatingButtonText: { color: Colors.light.background, fontWeight: '700', fontSize: 15 },
  floatingSearch: { position: 'absolute', left: 16, right: 16, zIndex: 50, alignItems: 'center' },
  compactSearchCard: { width: '100%', backgroundColor: Colors.light.background, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.cardBorder },
  compactSearchInput: { flex: 1, color: Colors.light.text, paddingVertical: 6, paddingLeft: 6 },
  compactSearchBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  locateButton: { position: 'absolute', right: 20, backgroundColor: Colors.light.background, width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6, zIndex: 60 },
  compassButton: { position: 'absolute', left: 20, backgroundColor: Colors.light.background, width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6, zIndex: 60 },
  routeInfo: { position: 'absolute', width: 96, backgroundColor: Colors.light.subtleBg, borderRadius: 12, padding: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.light.cardBorder, zIndex: 70, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  routeActions: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, zIndex: 80 },
  routeActionBtn: { backgroundColor: Colors.light.background, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.light.cardBorder, alignItems: 'center', justifyContent: 'center' },
  routeActionBtnGreen: { backgroundColor: Colors.light.tint, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // New button variants for RouteActions
  ra_btn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6, minWidth: 96 },
  ra_primary: { backgroundColor: Colors.light.tint, shadowColor: Colors.light.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
  ra_secondary: { backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.cardBorder },
  ra_disabled: { opacity: 0.6 },
  ra_text_primary: { color: Colors.light.background, fontWeight: '700' },
  ra_text_secondary: { color: Colors.light.text, fontWeight: '700' },
  // Selected location info card
  selectedCard: { paddingHorizontal: 12, paddingBottom: 8 },
  selectedTitle: { color: Colors.light.text, fontWeight: '700' },
  selectedCoords: { color: Colors.light.muted, marginTop: 4 },
  // Time badge that appears above selected marker
  timeBadge: { backgroundColor: Colors.light.primaryDark, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
  timeBadgeText: { color: Colors.light.background, fontWeight: '700' },
  // increased background alpha to make the panel less translucent (more solid)
  routeActionsBg: { position: 'absolute', left: 16, right: 16, borderRadius: 14, padding: 6, paddingVertical: 8, overflow: 'hidden', zIndex: 90, borderWidth: 1, borderColor: Colors.light.cardBorder, backgroundColor: Colors.light.subtleBg, maxHeight: 180 },
  routeActionsInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeActionsContent: { paddingTop: 12 },
});

export default styles;
