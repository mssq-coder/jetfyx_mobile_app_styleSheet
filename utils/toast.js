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

export const showModalToast = ({
  title,
  message,
  variant = "info", // info | success | error
  buttonText = "OK",
  autoHide = true,
  visibilityTime = 1800,
} = {}) => {
  Toast.show({
    type: "modal",
    text1: title,
    text2: message,
    position: "top",
    topOffset: 0,
    bottomOffset: 0,
    autoHide: Boolean(autoHide),
    visibilityTime: Number(visibilityTime) || 1800,
    props: {
      variant,
      buttonText,
    },
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
