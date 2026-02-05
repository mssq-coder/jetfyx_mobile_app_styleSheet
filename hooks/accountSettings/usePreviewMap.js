import { useCallback, useState } from "react";
import { previewFile } from "../../api/getServices";

export default function usePreviewMap() {
  const [previewImage, setPreviewImage] = useState(null);
  const [previewMap, setPreviewMap] = useState({});

  const ensurePreview = useCallback(
    async (path) => {
      if (!path) return null;
      if (previewMap[path]) return previewMap[path];
      const uri = await previewFile(path);
      setPreviewMap((prev) => ({ ...prev, [path]: uri }));
      return uri;
    },
    [previewMap],
  );

  return { previewImage, setPreviewImage, ensurePreview };
}
