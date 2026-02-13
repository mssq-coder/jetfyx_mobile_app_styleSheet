import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { marginRight: 16 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  pageSubTitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 160,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "900",
  },
  tabBar: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "900",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: "800",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  helper: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  optionCard: {
    width: 160,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  optionImage: {
    width: "100%",
    height: 80,
    borderRadius: 10,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  optionSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  currencyChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  methodLine: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "800",
  },
  methodMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  methodImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },

  bigValue: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  inputRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  dollar: { fontSize: 16, fontWeight: "800" },
  amountInputSmall: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    padding: 0,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  historyTitle: { fontSize: 13, fontWeight: "900" },
  historySub: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  historyAmt: { fontSize: 13, fontWeight: "900" },
});

export default styles;
