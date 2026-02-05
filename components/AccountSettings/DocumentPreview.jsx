import React, { useMemo } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "../AppIcon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function parsePaths(raw) {
  if (!raw) return [];
  try {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
      return JSON.parse(raw);
    }
    return [String(raw)];
  } catch (_e) {
    return [String(raw)];
  }
}

export default function DocumentPreview({ paths, onPreview, theme }) {
  const documents = useMemo(() => parsePaths(paths), [paths]);

  if (documents.length === 0) {
    return (
      <View style={[styles.emptyDocuments, { borderColor: theme.border }]}>
        <AppIcon name="image-not-supported" color={theme.secondary} size={24} />
        <Text style={[styles.emptyText, { color: theme.secondary }]}>
          No documents uploaded
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.documentGrid}>
      {documents.map((path, index) => (
        <TouchableOpacity
          key={`${path}-${index}`}
          onPress={() => onPreview?.(path)}
          style={styles.documentItem}
        >
          <View
            style={[
              styles.documentThumbnail,
              { backgroundColor: `${theme.primary}10` },
            ]}
          >
            <AppIcon
              name={
                path.toLowerCase().endsWith(".pdf") ? "picture-as-pdf" : "image"
              }
              color={theme.primary}
              size={24}
            />
          </View>
          <Text
            style={[styles.documentName, { color: theme.secondary }]}
            numberOfLines={1}
          >
            {path.split("/").pop()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyDocuments: {
    marginHorizontal: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
  },
  documentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  documentItem: {
    width: (SCREEN_WIDTH - 88) / 3,
    alignItems: "center",
  },
  documentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  documentName: {
    fontSize: 11,
    textAlign: "center",
  },
});
