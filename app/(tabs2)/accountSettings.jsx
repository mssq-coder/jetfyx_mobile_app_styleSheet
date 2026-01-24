import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCountries, previewFile, updateUser } from "../../api/getServices";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useUserStore } from "../../store/userStore";
import { clearBiometricCredentials } from "../../utils/secureAuth";

function Row({
  label,
  value,
  right,
  onPress,
  disabled,
  theme,
  showChevron = true,
  locked = false,
  helperText,
}) {
  const canPress = Boolean(onPress) && !disabled && !locked;

  return (
    <TouchableOpacity
      activeOpacity={canPress ? 0.7 : 1}
      onPress={canPress ? onPress : undefined}
      style={[styles.row, { borderBottomColor: theme.border }]}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, { color: theme.secondary }]}>
          {label}
        </Text>
        {helperText ? (
          <Text style={[styles.rowHelper, { color: theme.secondary }]}>
            {helperText}
          </Text>
        ) : null}
      </View>

      <View style={styles.rowRight}>
        {value != null ? (
          <Text
            style={[
              styles.rowValue,
              { color: theme.text, opacity: locked ? 0.7 : 1 },
            ]}
            numberOfLines={1}
          >
            {String(value)}
          </Text>
        ) : null}

        {right ? right : null}

        {locked ? (
          <AppIcon name="lock" color={theme.secondary} size={18} />
        ) : showChevron && canPress ? (
          <AppIcon name="chevron-right" color={theme.secondary} size={20} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
  theme,
  helperText,
  disabled = false,
}) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, { color: theme.secondary }]}>
          {label}
        </Text>
        {helperText ? (
          <Text style={[styles.rowHelper, { color: theme.secondary }]}>
            {helperText}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

function InputRow({
  label,
  value,
  onChangeText,
  theme,
  placeholder,
  editable = true,
  keyboardType,
  helperText,
  multiline = false,
}) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, { color: theme.secondary }]}>
          {label}
        </Text>
        {helperText ? (
          <Text style={[styles.rowHelper, { color: theme.secondary }]}>
            {helperText}
          </Text>
        ) : null}
      </View>

      <View style={styles.rowRight}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.secondary}
          editable={editable}
          keyboardType={keyboardType}
          multiline={multiline}
          style={[
            styles.input,
            {
              color: theme.text,
              opacity: editable ? 1 : 0.7,
            },
            multiline ? { height: 70, textAlignVertical: "top" } : null,
          ]}
        />
      </View>
    </View>
  );
}

function Section({ title, children, theme }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        {children}
      </View>
    </View>
  );
}

export default function AccountSettingsScreen() {
  const { theme } = useAppTheme();
  const userData = useUserStore((s) => s.userData);
  const setUserData = useUserStore((s) => s.setUserData);
  const userId = useAuthStore((s) => s.userId);
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useSettingsStore((s) => s.setBiometricEnabled);

  // API responses in this project vary (sometimes { data: ... }).
  const user = useMemo(() => userData?.data ?? userData ?? {}, [userData]);

  const [biometricBusy, setBiometricBusy] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(true);
  const [quickTradeEnabled, setQuickTradeEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [marginCallAlerts, setMarginCallAlerts] = useState(true);

  const avatarUri =
    user?.avatarUrl || user?.profilePhotoUrl || user?.photoUrl || null;

  const isKycApproved =
    String(user?.overallStatus || "").toLowerCase() === "approved";

  const canEditProfile = !isKycApproved;

  const [saving, setSaving] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countryModalOpen, setCountryModalOpen] = useState(false);

  const [formInitialized, setFormInitialized] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dobText, setDobText] = useState(""); // YYYY-MM-DD
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  const [idProofUploads, setIdProofUploads] = useState([]);
  const [addressProofUploads, setAddressProofUploads] = useState([]);

  const [previewImage, setPreviewImage] = useState(null);
  const [previewMap, setPreviewMap] = useState({});

  const ensurePreview = async (path) => {
    if (!path) return null;
    if (previewMap[path]) return previewMap[path];
    const uri = await previewFile(path);
    setPreviewMap((prev) => ({ ...prev, [path]: uri }));
    return uri;
  };

  const parsePaths = (raw) => {
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
  };

  const normalizeCountries = (raw) => {
    const list = raw?.data ?? raw ?? [];
    if (!Array.isArray(list)) return [];
    return list
      .map((c) => {
        if (typeof c === "string") return c;
        return c?.name || c?.countryName || c?.CountryName || c?.country || "";
      })
      .filter(Boolean);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setCountriesLoading(true);
        const data = await getCountries();
        if (!mounted) return;
        setCountries(normalizeCountries(data));
      } catch (_e) {
        // non-blocking
      } finally {
        if (mounted) setCountriesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (formInitialized) return;

    const first = user?.firstName || user?.FirstName || "";
    const last = user?.lastName || user?.LastName || "";
    const full = `${first}${first && last ? " " : ""}${last}`.trim();
    const mobile =
      user?.mobile || user?.mobileNumber || user?.phone || user?.Mobile || "";

    const street0 = user?.street || user?.Street || "";
    const city0 = user?.city || user?.City || "";
    const state0 = user?.state || user?.State || "";
    const zip0 = user?.zip || user?.Zip || "";
    const country0 = user?.country || user?.Country || "";

    const dobRaw = user?.dateOfBirth || user?.dob || user?.DateOfBirth || "";
    let dobStr = "";
    if (typeof dobRaw === "string") {
      // try ISO or YYYY-MM-DD
      const m = dobRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) dobStr = `${m[1]}-${m[2]}-${m[3]}`;
    } else if (dobRaw && typeof dobRaw === "object") {
      const y = dobRaw.year ?? dobRaw.Year;
      const mo = dobRaw.month ?? dobRaw.Month;
      const d = dobRaw.day ?? dobRaw.Day;
      if (y && mo && d) {
        dobStr = `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }

    setFullName(full);
    setMobileNumber(String(mobile || ""));
    setDobText(dobStr);
    setStreet(String(street0 || ""));
    setCity(String(city0 || ""));
    setStateProv(String(state0 || ""));
    setZip(String(zip0 || ""));
    setCountry(String(country0 || ""));

    setFormInitialized(true);
  }, [formInitialized, user]);

  const splitName = (name) => {
    const raw = String(name || "").trim();
    if (!raw) return { firstName: "", lastName: "" };
    const parts = raw.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts.slice(-1).join(" "),
    };
  };

  const parseDobToObject = (text) => {
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
  };

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

  const mimeFromName = (name) => {
    const n = String(name || "").toLowerCase();
    if (n.endsWith(".png")) return "image/png";
    if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
    if (n.endsWith(".webp")) return "image/webp";
    if (n.endsWith(".gif")) return "image/gif";
    if (n.endsWith(".pdf")) return "application/pdf";
    return "application/octet-stream";
  };

  const assetToDataUri = async (asset) => {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const mime = asset.mimeType || mimeFromName(asset.name);
    return `data:${mime};base64,${base64}`;
  };

  const handleSave = async () => {
    if (saving) return;
    if (!userId) {
      Alert.alert(
        "Missing user",
        "userId is not available. Please login again.",
      );
      return;
    }
    if (isKycApproved) {
      Alert.alert("Locked", "Profile is locked after KYC approval.");
      return;
    }

    const dobObj = parseDobToObject(dobText);
    if (dobText && !dobObj) {
      Alert.alert(
        "Invalid date",
        "Date of Birth must be in YYYY-MM-DD format.",
      );
      return;
    }

    try {
      setSaving(true);

      const nameParts = splitName(fullName);

      const existingIdProofs = parsePaths(
        user?.IdProofs || user?.idProofs || user?.idProofPath,
      );
      const existingAddressProofs = parsePaths(
        user?.AddressProofs || user?.addressProofs || user?.addressProofPath,
      );

      const uploadedIdProofs = await Promise.all(
        idProofUploads.map((a) => assetToDataUri(a)),
      );
      const uploadedAddressProofs = await Promise.all(
        addressProofUploads.map((a) => assetToDataUri(a)),
      );

      const payload = {
        Id: user?.id ?? user?.Id ?? 0,
        FirstName: nameParts.firstName || "",
        LastName: nameParts.lastName || "",
        IsActive: user?.isActive ?? user?.IsActive ?? true,
        DateOfBirth: dobObj ?? null,
        Street: street || "",
        City: city || "",
        State: stateProv || "",
        Zip: zip || "",
        Country: country || "",
        Gender: user?.gender || user?.Gender || "",
        Occupation: user?.occupation || user?.Occupation || "",
        Income: user?.income || user?.Income || "",
        Interests: Array.isArray(user?.interests || user?.Interests)
          ? user?.interests || user?.Interests
          : [],
        Comments: user?.comments || user?.Comments || "",
        MobileNumber: mobileNumber || "",
        Mobile: mobileNumber || "",
        IdProofs:
          uploadedIdProofs.length > 0 ? uploadedIdProofs : existingIdProofs,
        AddressProofs:
          uploadedAddressProofs.length > 0
            ? uploadedAddressProofs
            : existingAddressProofs,
        RoleName: user?.roleName || user?.RoleName || "",
      };

      const updated = await updateUser(userId, payload);
      console.log("Profile updated:", updated);
      setUserData(updated);
      setIdProofUploads([]);
      setAddressProofUploads([]);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e) {
      Alert.alert(
        "Save failed",
        e?.response?.data?.message || e?.message || "Unable to save.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBiometric = async (nextValue) => {
    if (biometricBusy) return;
    if (!nextValue) {
      setBiometricEnabled(false);
      // Clear stored credentials when biometrics is turned off
      await clearBiometricCredentials();
      return;
    }

    try {
      setBiometricBusy(true);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(
          "Biometrics not available",
          "This device does not support biometric authentication.",
        );
        setBiometricEnabled(false);
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          "No biometrics enrolled",
          "Please enroll Face ID / Touch ID / Fingerprint in device settings first.",
        );
        setBiometricEnabled(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable biometric login",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (result?.success) {
        setBiometricEnabled(true);
      } else {
        setBiometricEnabled(false);
      }
    } catch (e) {
      setBiometricEnabled(false);
      Alert.alert(
        "Biometric error",
        e?.message || "Failed to enable biometrics.",
      );
    } finally {
      setBiometricBusy(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AppIcon name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account settings</Text>

        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canEditProfile || saving}
          style={[
            styles.saveButton,
            { opacity: !canEditProfile || saving ? 0.6 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Profile & Personal Information" theme={theme}>
          <View
            style={[styles.profileHeader, { borderBottomColor: theme.border }]}
          >
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Text style={styles.avatarFallbackText}>
                    {(user?.firstName || "U").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileHeaderText}>
              <Text
                style={[styles.profileName, { color: theme.text }]}
                numberOfLines={1}
              >
                {user?.firstName + " " + (user?.lastName || "") || "—"}
              </Text>
              <Text
                style={[styles.profileSub, { color: theme.secondary }]}
                numberOfLines={1}
              >
                {user?.email || "—"}
              </Text>
            </View>
          </View>

          <Row
            label="Full Name"
            value={null}
            theme={theme}
            locked={false}
            showChevron={false}
            right={
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor={theme.secondary}
                editable={canEditProfile}
                style={[
                  styles.input,
                  { color: theme.text, opacity: canEditProfile ? 1 : 0.7 },
                ]}
              />
            }
            helperText={
              isKycApproved
                ? "Locked (KYC approved)"
                : "Editable until verification"
            }
          />
          <Row
            label="Username"
            value={user?.username || user?.userName || "—"}
            theme={theme}
            onPress={() => {}}
          />
          <Row
            label="Email Address"
            value={user?.email || "—"}
            helperText="Verified"
            theme={theme}
            onPress={() => {}}
          />
          <Row
            label="Mobile Number"
            value={null}
            theme={theme}
            locked={false}
            showChevron={false}
            helperText={canEditProfile ? "Editable" : "Locked"}
            right={
              <TextInput
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="Enter mobile number"
                placeholderTextColor={theme.secondary}
                editable={canEditProfile}
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  { color: theme.text, opacity: canEditProfile ? 1 : 0.7 },
                ]}
              />
            }
          />
          <Row
            label="Date of Birth"
            value={null}
            theme={theme}
            locked={false}
            showChevron={false}
            helperText={"YYYY-MM-DD"}
            right={
              <TextInput
                value={dobText}
                onChangeText={setDobText}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.secondary}
                editable={canEditProfile}
                style={[
                  styles.input,
                  { color: theme.text, opacity: canEditProfile ? 1 : 0.7 },
                ]}
              />
            }
          />
          <Row
            label="Country / Tax Residency"
            value={country || "—"}
            theme={theme}
            locked={!canEditProfile}
            onPress={() => setCountryModalOpen(true)}
            helperText={
              countriesLoading ? "Loading countries..." : "Select from list"
            }
          />

          <InputRow
            label="Street"
            value={street}
            onChangeText={setStreet}
            theme={theme}
            placeholder="Street"
            editable={canEditProfile}
          />
          <InputRow
            label="City"
            value={city}
            onChangeText={setCity}
            theme={theme}
            placeholder="City"
            editable={canEditProfile}
          />
          <InputRow
            label="State"
            value={stateProv}
            onChangeText={setStateProv}
            theme={theme}
            placeholder="State"
            editable={canEditProfile}
          />
          <InputRow
            label="ZIP"
            value={zip}
            onChangeText={setZip}
            theme={theme}
            placeholder="ZIP"
            editable={canEditProfile}
            keyboardType="number-pad"
          />
        </Section>

        <Section title="Security & Access Control" theme={theme}>
          <Row
            label="Change Password"
            value={""}
            theme={theme}
            onPress={() => {}}
          />
          <ToggleRow
            label="Biometric Login"
            value={biometricEnabled}
            onValueChange={handleToggleBiometric}
            helperText="Face ID / Touch ID / Fingerprint"
            theme={theme}
            disabled={biometricBusy}
          />
        </Section>

        <Section title="KYC Documents" theme={theme}>
          <Row
            label="Overall Status"
            value={user?.overallStatus || "—"}
            theme={theme}
            locked
          />

          <Row
            label="ID Proof Status"
            value={user?.idProofStatus || "—"}
            theme={theme}
            locked={isKycApproved}
          />
          {user?.idProofRejectionReason ? (
            <Row
              label="ID Proof Rejection"
              value={user.idProofRejectionReason}
              theme={theme}
              locked={true}
            />
          ) : null}

          {/* id proof images */}
          {parsePaths(user?.idProofPath).length > 0 && (
            <View style={[styles.card, { padding: 12, marginTop: 8 }]}>
              <Text
                style={[
                  styles.rowLabel,
                  { color: theme.secondary, marginBottom: 8 },
                ]}
              >
                ID Proof
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {parsePaths(user?.idProofPath).map((p, i) => {
                  const thumbUri = previewMap[p];
                  return (
                    <TouchableOpacity
                      key={`id-${i}`}
                      onPress={async () => {
                        try {
                          const uri = await ensurePreview(p);
                          if (uri) setPreviewImage(uri);
                        } catch (e) {
                          Alert.alert(
                            "Preview failed",
                            e?.message || "Unable to preview file.",
                          );
                        }
                      }}
                    >
                      {thumbUri ? (
                        <Image
                          source={{ uri: thumbUri }}
                          style={{ width: 80, height: 80, borderRadius: 8 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                            backgroundColor: theme.background,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AppIcon
                            name="image"
                            color={theme.secondary}
                            size={22}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {!isKycApproved ? (
            <View style={{ padding: 12 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const picked = await pickDocuments();
                    if (picked.length) {
                      setIdProofUploads((prev) => [...prev, ...picked]);
                    }
                  } catch (e) {
                    Alert.alert(
                      "Upload failed",
                      e?.message || "Unable to pick file.",
                    );
                  }
                }}
                style={[styles.uploadBtn, { borderColor: theme.border }]}
              >
                <AppIcon
                  name="cloud-upload"
                  color={theme.secondary}
                  size={18}
                />
                <Text style={[styles.uploadBtnText, { color: theme.text }]}>
                  Upload ID Proof
                </Text>
              </TouchableOpacity>

              {idProofUploads.length ? (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {idProofUploads.map((f, idx) => (
                    <View
                      key={`id-up-${idx}`}
                      style={[styles.fileChip, { borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text }} numberOfLines={1}>
                        {f.name || "file"}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setIdProofUploads((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <AppIcon
                          name="close"
                          color={theme.secondary}
                          size={16}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <Row
            label="Address Proof Status"
            value={user?.addressProofStatus || "—"}
            theme={theme}
            locked={isKycApproved}
          />
          {user?.addressProofRejectionReason ? (
            <Row
              label="Address Proof Rejection"
              value={user.addressProofRejectionReason}
              theme={theme}
              locked={true}
            />
          ) : null}

          {parsePaths(user?.addressProofPath).length > 0 && (
            <View style={[styles.card, { padding: 12, marginTop: 8 }]}>
              <Text
                style={[
                  styles.rowLabel,
                  { color: theme.secondary, marginBottom: 8 },
                ]}
              >
                Address Proof
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {parsePaths(user?.addressProofPath).map((p, i) => {
                  const thumbUri = previewMap[p];
                  return (
                    <TouchableOpacity
                      key={`addr-${i}`}
                      onPress={async () => {
                        try {
                          const uri = await ensurePreview(p);
                          if (uri) setPreviewImage(uri);
                        } catch (e) {
                          Alert.alert(
                            "Preview failed",
                            e?.message || "Unable to preview file.",
                          );
                        }
                      }}
                    >
                      {thumbUri ? (
                        <Image
                          source={{ uri: thumbUri }}
                          style={{ width: 80, height: 80, borderRadius: 8 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                            backgroundColor: theme.background,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AppIcon
                            name="image"
                            color={theme.secondary}
                            size={22}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {!isKycApproved ? (
            <View style={{ padding: 12 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const picked = await pickDocuments();
                    if (picked.length) {
                      setAddressProofUploads((prev) => [...prev, ...picked]);
                    }
                  } catch (e) {
                    Alert.alert(
                      "Upload failed",
                      e?.message || "Unable to pick file.",
                    );
                  }
                }}
                style={[styles.uploadBtn, { borderColor: theme.border }]}
              >
                <AppIcon
                  name="cloud-upload"
                  color={theme.secondary}
                  size={18}
                />
                <Text style={[styles.uploadBtnText, { color: theme.text }]}>
                  Upload Address Proof
                </Text>
              </TouchableOpacity>

              {addressProofUploads.length ? (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {addressProofUploads.map((f, idx) => (
                    <View
                      key={`addr-up-${idx}`}
                      style={[styles.fileChip, { borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text }} numberOfLines={1}>
                        {f.name || "file"}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setAddressProofUploads((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <AppIcon
                          name="close"
                          color={theme.secondary}
                          size={16}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Image preview modal */}
          <Modal visible={!!previewImage} transparent animationType="fade">
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.8)",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setPreviewImage(null)}
            >
              {previewImage ? (
                <Image
                  source={{ uri: previewImage }}
                  style={{ width: "90%", height: "70%", resizeMode: "contain" }}
                />
              ) : null}
            </TouchableOpacity>
          </Modal>
        </Section>

        <Section title="Trading Preferences" theme={theme}>
          <Row
            label="Default Trade Size"
            value={user?.defaultTradeSize ?? "—"}
            theme={theme}
            onPress={() => {}}
          />
          <ToggleRow
            label="Order Confirmation"
            value={orderConfirmation}
            onValueChange={setOrderConfirmation}
            theme={theme}
          />
          <ToggleRow
            label="One-Tap / Quick Trade"
            value={quickTradeEnabled}
            onValueChange={setQuickTradeEnabled}
            theme={theme}
          />
        </Section>

        {/* Country picker modal */}
        <Modal visible={countryModalOpen} transparent animationType="fade">
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              padding: 16,
              justifyContent: "center",
            }}
            activeOpacity={1}
            onPress={() => setCountryModalOpen(false)}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 12,
                maxHeight: "70%",
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "700",
                  fontSize: 16,
                  marginBottom: 10,
                }}
              >
                Select Country
              </Text>

              {countriesLoading ? (
                <View style={{ paddingVertical: 18, alignItems: "center" }}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : countries.length ? (
                <ScrollView>
                  {countries.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => {
                        setCountry(c);
                        setCountryModalOpen(false);
                      }}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <Text style={{ color: theme.text }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={{ color: theme.secondary }}>
                  No countries available.
                </Text>
              )}

              <TouchableOpacity
                onPress={() => setCountryModalOpen(false)}
                style={{
                  marginTop: 10,
                  alignSelf: "flex-end",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: "700" }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  profileHeaderText: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileSub: {
    marginTop: 2,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowHelper: {
    marginTop: 3,
    fontSize: 12,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 180,
    textAlign: "right",
  },
  input: {
    minWidth: 160,
    maxWidth: 220,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    maxWidth: "100%",
  },
});
