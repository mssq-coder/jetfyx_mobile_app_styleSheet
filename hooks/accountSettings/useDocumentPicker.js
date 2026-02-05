import * as DocumentPicker from "expo-document-picker";

export default function useDocumentPicker() {
  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return [];
    const assets = result.assets || [];

    return assets.map((a) => ({
      uri: a.uri,
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
    }));
  };

  return { pickDocuments };
}
