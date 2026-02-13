import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { previewFile } from "../api/allServices";
import AppIcon from "./AppIcon";

function toPreviewPath(urlOrPath) {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath);

  if (raw.startsWith("file:") || raw.startsWith("data:")) return raw;

  // Only decode our protected preview URLs into a relative preview path.
  // For normal remote URLs (e.g., Azure Blob), pass through as-is so
  // `previewFile()` can download it directly.
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      const marker = "/shared/file-preview/preview/";
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) {
        const encoded = u.pathname.slice(idx + marker.length);
        return decodeURIComponent(encoded);
      }

      if (u.hostname.toLowerCase().endsWith(".blob.core.windows.net")) {
        const p = decodeURIComponent(u.pathname.replace(/^\//, ""));
        const parts = p.split("/").filter(Boolean);
        return parts.length >= 2 ? parts.slice(1).join("/") : p;
      }

      return raw;
    } catch (_e) {
      return raw;
    }
  }

  return raw;
}

export default function PreviewedImage({
  uriOrPath,
  style,
  theme,
  fallbackIcon = "image",
}) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = toPreviewPath(uriOrPath);
      if (!p) {
        if (mounted) setUri(null);
        return;
      }

      if (p.startsWith("file:") || p.startsWith("data:")) {
        if (mounted) setUri(p);
        return;
      }

      try {
        const localUri = await previewFile(p);
        if (mounted) setUri(localUri);
      } catch (_e) {
        const raw = String(uriOrPath || "");
        const isBlob = /(^https?:\/\/[^/]+\.blob\.core\.windows\.net\/)/i.test(
          raw,
        );
        if (mounted) setUri(isBlob ? null : raw);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [uriOrPath]);

  if (!uri) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: theme?.background,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <AppIcon name={fallbackIcon} color={theme?.secondary} size={22} />
      </View>
    );
  }

  return <Image source={{ uri }} style={style} />;
}
