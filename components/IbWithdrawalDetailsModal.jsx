import { confirmIbWithdrawal } from "../api/Services";
import WithdrawalDetailsModal from "./WithdrawalDetailsModal";

export default function IbWithdrawalDetailsModal({ confirmFn, ...props }) {
  return <WithdrawalDetailsModal {...props} confirmFn={confirmIbWithdrawal} />;
}
