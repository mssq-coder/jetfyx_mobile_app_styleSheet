export function normalizeCountriesResponse(raw) {
  const list = raw?.data ?? raw ?? [];
  if (!Array.isArray(list)) return [];

  return list
    .map((c) => {
      if (typeof c === "string") return c;
      return c?.name || c?.countryName || c?.CountryName || c?.country || "";
    })
    .filter(Boolean);
}

export function parseDobTextToObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const dt = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dt.getTime())) return null;

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const dayOfWeek = dayNames[dt.getUTCDay()] || "Sunday";
  return { year, month, day, dayOfWeek };
}

export function getDobTextFromUser(user) {
  const dobRaw = user?.dateOfBirth || user?.dob || user?.DateOfBirth || "";

  if (typeof dobRaw === "string") {
    const m = dobRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  }

  if (dobRaw && typeof dobRaw === "object") {
    const year = dobRaw.year ?? dobRaw.Year;
    const month = dobRaw.month ?? dobRaw.Month;
    const day = dobRaw.day ?? dobRaw.Day;

    if (year && month && day) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return "";
}

export function parseInterestsRaw(raw) {
  if (!raw) return [];

  try {
    if (Array.isArray(raw)) return raw;

    if (typeof raw === "string") {
      const s = raw.trim();
      if (!s) return [];

      if (s.startsWith("[")) {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : [];
      }

      if (s.includes(",")) return s.split(",");
      return [s];
    }
  } catch (_e) {
    // ignore
  }

  return [];
}

export function getInitialAccountSettingsForm(user) {
  const first = user?.firstName || user?.FirstName || "";
  const last = user?.lastName || user?.LastName || "";
  const mobile =
    user?.mobile || user?.mobileNumber || user?.phone || user?.Mobile || "";

  const street = user?.street || user?.Street || "";
  const city = user?.city || user?.City || "";
  const stateProv = user?.state || user?.State || "";
  const zip = user?.zip || user?.Zip || "";
  const country = user?.country || user?.Country || "";

  const dobText = getDobTextFromUser(user);

  const gender0 = user?.gender || user?.Gender || "";
  const income0 = user?.income || user?.Income || "";

  const interestsRaw =
    user?.Intrest ||
    user?.intrest ||
    user?.Interest ||
    user?.interest ||
    user?.Interests ||
    user?.interests ||
    [];

  const interests = parseInterestsRaw(interestsRaw)
    .map((x) =>
      String(x || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  const comment =
    user?.Comment || user?.comment || user?.Comments || user?.comments || "";

  return {
    firstName: String(first || ""),
    lastName: String(last || ""),
    mobileNumber: String(mobile || ""),
    dobText,
    street: String(street || ""),
    city: String(city || ""),
    stateProv: String(stateProv || ""),
    zip: String(zip || ""),
    country: String(country || ""),
    gender: String(gender0 || "")
      .trim()
      .toLowerCase(),
    income: String(income0 || "").trim(),
    interests: Array.from(new Set(interests)),
    comment: String(comment || ""),
  };
}

export function buildUpdateUserPayload({
  user,
  form,
  idProofUploads,
  addressProofUploads,
}) {
  return {
    Id: user?.id ?? user?.Id ?? 0,
    FirstName: (form?.firstName || "").trim(),
    LastName: (form?.lastName || "").trim(),
    Email: user?.email || user?.Email || "",
    DateOfBirth: form?.dobText || "",
    Phone: form?.mobileNumber || "",
    Street: form?.street || "",
    City: form?.city || "",
    State: form?.stateProv || "",
    Zip: form?.zip || "",
    Country: form?.country || "",
    Gender: form?.gender || "",
    Income: form?.income || "",
    Intrest:
      Array.isArray(form?.interests) && form.interests.length > 0
        ? form.interests
        : [],
    Comment: form?.comment || "",
    ...(Array.isArray(idProofUploads) && idProofUploads.length > 0
      ? { idProofPath: idProofUploads }
      : {}),
    ...(Array.isArray(addressProofUploads) && addressProofUploads.length > 0
      ? { addressProofPath: addressProofUploads }
      : {}),
  };
}
