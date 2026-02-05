import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useMemo } from "react";
import {
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { WebView } from "react-native-webview";
import AppIcon from "../../AppIcon";

export default function ImagePreviewModal({ uri, onClose }) {
  const isPdf = useMemo(() => {
    if (!uri) return false;
    const lower = String(uri).toLowerCase();
    return lower.endsWith(".pdf") || lower.includes("application/pdf");
  }, [uri]);

  const openExternally = async () => {
    if (!uri) return;
    try {
      if (/^https?:\/\//i.test(uri)) {
        await WebBrowser.openBrowserAsync(uri);
        return;
      }
    } catch (_e) {
      // fall through
    }

    try {
      await Linking.openURL(uri);
    } catch (_e) {
      // ignore
    }
  };

  return (
    <Modal visible={!!uri} transparent animationType="fade">
      <View style={styles.previewOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.previewContainer}>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.previewClose,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
          >
            <AppIcon name="close" color="#fff" size={24} />
          </TouchableOpacity>

          {uri ? (
            isPdf ? (
              <View style={styles.pdfContainer}>
                <WebView source={{ uri }} style={styles.previewPdf} />
                <TouchableOpacity
                  onPress={openExternally}
                  style={styles.openButton}
                >
                  <AppIcon name="open-in-new" color="#fff" size={18} />
                  <Text style={styles.openButtonText}>Open PDF</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Image
                source={{ uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  previewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewClose: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  previewImage: {
    width: "90%",
    height: "80%",
  },
  pdfContainer: {
    width: "90%",
    height: "80%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  previewPdf: {
    flex: 1,
  },
  openButton: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  openButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
