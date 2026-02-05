import Toast from "react-native-toast-message";

export const showToast = ({ type = "info", title, message, ...rest } = {}) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: "bottom",
    ...rest,
  });
};

export const showSuccessToast = (message, title = "Success") => {
  showToast({ type: "success", title, message });
};

export const showErrorToast = (message, title = "Error") => {
  showToast({ type: "error", title, message });
};

export const showInfoToast = (message, title = "Info") => {
  showToast({ type: "info", title, message });
};

export const showConfirmToast = ({
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
} = {}) => {
  Toast.show({
    type: "confirm",
    text1: title,
    text2: message,
    position: "bottom",
    autoHide: false,
    props: {
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    },
  });
};
