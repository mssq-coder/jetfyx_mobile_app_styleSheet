import * as DocumentPicker from "expo-document-picker";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Enhanced Row Component
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
  icon,
  isLast = false,
}) {
  const canPress = Boolean(onPress) && !disabled && !locked;

  return (
    <TouchableOpacity
      activeOpacity={canPress ? 0.7 : 1}
      onPress={canPress ? onPress : undefined}
      style={[
        styles.row,
        {
          borderBottomColor: isLast ? "transparent" : theme.border,
          backgroundColor: theme.card,
        },
      ]}
    >
      <View style={styles.rowLeft}>
        {icon && (
          <View
            style={[styles.rowIcon, { backgroundColor: `${theme.primary}15` }]}
          >
            <AppIcon name={icon} color={theme.primary} size={16} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          {helperText ? (
            <Text style={[styles.rowHelper, { color: theme.secondary }]}>
              {helperText}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rowRight}>
        {value != null ? (
          <Text
            style={[
              styles.rowValue,
              {
                color: locked ? theme.secondary : theme.text,
                fontWeight: locked ? "500" : "600",
              },
            ]}
            numberOfLines={1}
          >
            {String(value)}
          </Text>
        ) : null}

        {right ? right : null}

        {locked ? (
          <View
            style={[
              styles.lockIcon,
              { backgroundColor: `${theme.secondary}15` },
            ]}
          >
            <AppIcon name="lock" color={theme.secondary} size={14} />
          </View>
        ) : showChevron && canPress ? (
          <AppIcon name="chevron-right" color={theme.secondary} size={20} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// Enhanced ToggleRow Component
function ToggleRow({
  label,
  value,
  onValueChange,
  theme,
  helperText,
  disabled = false,
  icon,
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={styles.rowLeft}>
        {icon && (
          <View
            style={[styles.rowIcon, { backgroundColor: `${theme.primary}15` }]}
          >
            <AppIcon name={icon} color={theme.primary} size={16} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          {helperText ? (
            <Text style={[styles.rowHelper, { color: theme.secondary }]}>
              {helperText}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// Enhanced InputRow Component
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
  icon,
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={styles.rowLeft}>
        {icon && (
          <View
            style={[styles.rowIcon, { backgroundColor: `${theme.primary}15` }]}
          >
            <AppIcon name={icon} color={theme.primary} size={16} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          {helperText ? (
            <Text style={[styles.rowHelper, { color: theme.secondary }]}>
              {helperText}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: editable ? `${theme.background}80` : "transparent",
            borderWidth: editable ? 1 : 0,
            borderColor: theme.border,
          },
        ]}
      >
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

// Enhanced Section Component
function Section({ title, children, theme, subtitle }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: theme.secondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// Status Badge Component
function StatusBadge({ status, theme }) {
  const statusLower = String(status || "").toLowerCase();

  let backgroundColor = theme.secondary;
  let textColor = "#FFFFFF";

  if (statusLower === "approved") {
    backgroundColor = theme.positive;
  } else if (statusLower === "pending" || statusLower === "processing") {
    backgroundColor = "#FFA000";
  } else if (statusLower === "rejected" || statusLower === "failed") {
    backgroundColor = theme.negative;
  } else if (statusLower === "verified") {
    backgroundColor = theme.primary;
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <Text style={[styles.statusText, { color: textColor }]}>
        {status || "Unknown"}
      </Text>
    </View>
  );
}

// Document Preview Component
function DocumentPreview({ paths, title, onPreview, theme }) {
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

  const documents = parsePaths(paths);

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
          key={index}
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

export default function AccountSettingsScreen() {
  const { theme } = useAppTheme();
  const userData = useUserStore((s) => s.userData);
  const setUserData = useUserStore((s) => s.setUserData);
  const userId = useAuthStore((s) => s.userId);
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useSettingsStore((s) => s.setBiometricEnabled);

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dobText, setDobText] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [income, setIncome] = useState("");
  const [interests, setInterests] = useState([]);
  const [comment, setComment] = useState("");
  const [genderModalOpen, setGenderModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [interestsModalOpen, setInterestsModalOpen] = useState(false);

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

    setFirstName(String(first || ""));
    setLastName(String(last || ""));
    setMobileNumber(String(mobile || ""));
    setDobText(dobStr);
    setStreet(String(street0 || ""));
    setCity(String(city0 || ""));
    setStateProv(String(state0 || ""));
    setZip(String(zip0 || ""));
    setCountry(String(country0 || ""));

    const gender0 = user?.gender || user?.Gender || "";
    const income0 = user?.income || user?.Income || "";

    const parseInterests = (raw) => {
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
          // comma separated
          if (s.includes(",")) return s.split(",");
          return [s];
        }
      } catch (_e) {}
      return [];
    };

    const interestsRaw =
      user?.Intrest ||
      user?.intrest ||
      user?.Interest ||
      user?.interest ||
      user?.Interests ||
      user?.interests ||
      [];

    const interests0 = parseInterests(interestsRaw)
      .map((x) =>
        String(x || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);

    const comment0 =
      user?.Comment || user?.comment || user?.Comments || user?.comments || "";

    setGender(
      String(gender0 || "")
        .trim()
        .toLowerCase(),
    );
    setIncome(String(income0 || "").trim());
    setInterests(Array.from(new Set(interests0)));
    setComment(String(comment0 || ""));

    setFormInitialized(true);
  }, [formInitialized, user]);

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

      // NOTE: Files must be sent as multipart/form-data (binary). We pass
      // picked assets (uri/name/mimeType) to `updateUser`, which converts to FormData.

      const payload = {
        Id: user?.id ?? user?.Id ?? 0,
        FirstName: (firstName || "").trim(),
        LastName: (lastName || "").trim(),
        Email: user?.email || user?.Email || "",
        DateOfBirth: dobText || "",
        Phone: mobileNumber || "",
        Street: street || "",
        City: city || "",
        State: stateProv || "",
        Zip: zip || "",
        Country: country || "",
        Gender: gender || "",
        Income: income || "",
        Intrest: interests && interests.length > 0 ? interests : [],
        Comment: comment || "",
        ...(idProofUploads.length > 0 ? { IdProof: idProofUploads } : {}),
        ...(addressProofUploads.length > 0
          ? { AdressProof: addressProofUploads }
          : {}),
      };
      console.log("Updating profile with payload:", payload);

      const updated = await updateUser(userId, payload);
      console.log("Profile updated:", updated);
      setUserData(updated);
      setIdProofUploads([]);
      setAddressProofUploads([]);
      Alert.alert("✅ Saved", "Your profile has been updated successfully.");
    } catch (e) {
      Alert.alert(
        "❌ Save Failed",
        e?.response?.data?.message || e?.message || "Unable to save changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBiometric = async (nextValue) => {
    if (biometricBusy) return;
    if (!nextValue) {
      setBiometricEnabled(false);
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
        Alert.alert("✅ Success", "Biometric login enabled successfully.");
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

      {/* Enhanced Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AppIcon name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Account Settings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your profile & security
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!canEditProfile || saving}
          style={[
            styles.saveButton,
            {
              backgroundColor: canEditProfile
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.1)",
              opacity: !canEditProfile || saving ? 0.6 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <AppIcon name="check" color="#fff" size={16} />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Section
          title="Profile Information"
          theme={theme}
          subtitle="Update your personal details"
        >
          <View
            style={[
              styles.profileHeader,
              { borderBottomColor: `${theme.border}80` },
            ]}
          >
            <View style={styles.avatarSection}>
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
              <View style={styles.profileInfo}>
                <Text
                  style={[styles.profileName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {user?.firstName + " " + (user?.lastName || "") || "—"}
                </Text>
                <View style={styles.profileMeta}>
                  <View
                    style={[
                      styles.verifiedBadge,
                      { backgroundColor: `${theme.positive}20` },
                    ]}
                  >
                    <AppIcon name="verified" color={theme.positive} size={12} />
                    <Text
                      style={[styles.verifiedText, { color: theme.positive }]}
                    >
                      Verified Account
                    </Text>
                  </View>
                  <Text style={[styles.profileSub, { color: theme.secondary }]}>
                    Member since 2024
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <InputRow
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            theme={theme}
            placeholder="Enter first name"
            editable={canEditProfile}
            helperText={
              isKycApproved
                ? "Locked (KYC approved)"
                : "Editable until verification"
            }
            icon="person"
          />

          <InputRow
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            theme={theme}
            placeholder="Enter last name"
            editable={canEditProfile}
            helperText={
              isKycApproved
                ? "Locked (KYC approved)"
                : "Editable until verification"
            }
            icon="person-outline"
          />

          <Row
            label="Username"
            value={user?.username || user?.userName || "—"}
            theme={theme}
            onPress={() => {}}
            icon="badge"
            locked={true}
          />

          <Row
            label="Email Address"
            value={user?.email || "—"}
            helperText="Verified & secured"
            theme={theme}
            onPress={() => {}}
            icon="email"
            locked={true}
          />

          <InputRow
            label="Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            theme={theme}
            placeholder="Enter mobile number"
            editable={canEditProfile}
            keyboardType="phone-pad"
            helperText={
              canEditProfile ? "Editable" : "Locked after verification"
            }
            icon="phone"
          />

          <InputRow
            label="Date of Birth"
            value={dobText}
            onChangeText={setDobText}
            theme={theme}
            placeholder="YYYY-MM-DD"
            editable={canEditProfile}
            helperText="Format: YYYY-MM-DD"
            icon="cake"
          />

          <Row
            label="Country"
            value={country || "Select country"}
            theme={theme}
            locked={!canEditProfile}
            onPress={() => setCountryModalOpen(true)}
            helperText={countriesLoading ? "Loading..." : "Select your country"}
            icon="public"
          />

          <Text
            style={[styles.sectionLabel, { color: theme.text, marginTop: 16 }]}
          >
            Address Information
          </Text>

          <InputRow
            label="Street"
            value={street}
            onChangeText={setStreet}
            theme={theme}
            placeholder="Street address"
            editable={canEditProfile}
            icon="home"
          />
          <InputRow
            label="City"
            value={city}
            onChangeText={setCity}
            theme={theme}
            placeholder="City"
            editable={canEditProfile}
            icon="location-city"
          />
          <InputRow
            label="State"
            value={stateProv}
            onChangeText={setStateProv}
            theme={theme}
            placeholder="State / Province"
            editable={canEditProfile}
            icon="map"
          />
          <InputRow
            label="ZIP Code"
            value={zip}
            onChangeText={setZip}
            theme={theme}
            placeholder="Postal code"
            editable={canEditProfile}
            keyboardType="number-pad"
            icon="pin-drop"
            isLast={false}
          />

          <Text
            style={[styles.sectionLabel, { color: theme.text, marginTop: 16 }]}
          >
            Additional Information
          </Text>

          <Row
            label="Gender"
            value={gender || "Select gender"}
            theme={theme}
            locked={!canEditProfile}
            onPress={() => setGenderModalOpen(true)}
            helperText="Select your gender"
            icon="wc"
          />

          <Row
            label="Income"
            value={income || "Select income range"}
            theme={theme}
            locked={!canEditProfile}
            onPress={() => setIncomeModalOpen(true)}
            helperText="Select your income range"
            icon="attach-money"
          />

          <Row
            label="Interests"
            value={
              interests.length > 0
                ? `${interests.length} selected`
                : "Select interests"
            }
            theme={theme}
            locked={!canEditProfile}
            onPress={() => setInterestsModalOpen(true)}
            helperText="Select your interests"
            icon="favorite"
            isLast={false}
          />

          <InputRow
            label="Comment"
            value={comment}
            onChangeText={setComment}
            theme={theme}
            placeholder="Add a comment"
            editable={canEditProfile}
            helperText="Optional"
            multiline={true}
            icon="comment"
          />
        </Section>

        {/* Security Section */}
        <Section
          title="Security & Access"
          theme={theme}
          subtitle="Manage your account security"
        >
          <Row
            label="Change Password"
            value={""}
            theme={theme}
            onPress={() => {}}
            icon="lock"
          />

          <ToggleRow
            label="Biometric Login"
            value={biometricEnabled}
            onValueChange={handleToggleBiometric}
            helperText="Face ID / Touch ID / Fingerprint"
            theme={theme}
            disabled={biometricBusy}
            icon="fingerprint"
          />

          <ToggleRow
            label="Two-Factor Authentication"
            value={twoFactorEnabled}
            onValueChange={setTwoFactorEnabled}
            helperText="Add extra security layer"
            theme={theme}
            icon="security"
          />
        </Section>

        {/* KYC Section */}
        <Section
          title="KYC Verification"
          theme={theme}
          subtitle="Complete your identity verification"
        >
          <View
            style={[
              styles.kycHeader,
              { borderBottomColor: `${theme.border}80` },
            ]}
          >
            <View style={styles.kycStatus}>
              <Text style={[styles.kycTitle, { color: theme.text }]}>
                Verification Status
              </Text>
              <StatusBadge status={user?.overallStatus} theme={theme} />
            </View>
            <Text style={[styles.kycDescription, { color: theme.secondary }]}>
              {isKycApproved
                ? "Your account is fully verified and secure"
                : "Complete KYC verification to unlock all features"}
            </Text>
          </View>

          <Row
            label="ID Proof Status"
            value={""}
            theme={theme}
            locked={isKycApproved}
            icon="credit-card"
            right={<StatusBadge status={user?.idProofStatus} theme={theme} />}
          />

          {user?.idProofRejectionReason && (
            <View
              style={[
                styles.rejectionBox,
                { backgroundColor: `${theme.negative}10` },
              ]}
            >
              <View style={styles.rejectionHeader}>
                <AppIcon name="error" color={theme.negative} size={16} />
                <Text
                  style={[styles.rejectionTitle, { color: theme.negative }]}
                >
                  Rejection Reason
                </Text>
              </View>
              <Text style={[styles.rejectionText, { color: theme.text }]}>
                {user.idProofRejectionReason}
              </Text>
            </View>
          )}

          <Text
            style={[styles.documentTitle, { color: theme.text, marginTop: 16 }]}
          >
            Uploaded ID Documents
          </Text>
          <DocumentPreview
            paths={user?.idProofPath}
            title="ID Proof"
            onPreview={async (path) => {
              try {
                const uri = await ensurePreview(path);
                if (uri) setPreviewImage(uri);
              } catch (e) {
                Alert.alert("Preview failed", "Unable to preview file.");
              }
            }}
            theme={theme}
          />

          {!isKycApproved && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  const picked = await pickDocuments();
                  if (picked.length) {
                    setIdProofUploads((prev) => [...prev, ...picked]);
                  }
                } catch (e) {
                  Alert.alert("Upload failed", "Unable to pick files.");
                }
              }}
              style={[styles.uploadButton, { borderColor: theme.border }]}
            >
              <View
                style={[
                  styles.uploadIcon,
                  { backgroundColor: `${theme.primary}15` },
                ]}
              >
                <AppIcon name="cloud-upload" color={theme.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadTitle, { color: theme.text }]}>
                  Upload ID Proof
                </Text>
                <Text
                  style={[styles.uploadSubtitle, { color: theme.secondary }]}
                >
                  Upload passport, driver's license or national ID
                </Text>
              </View>
              <AppIcon name="add" color={theme.primary} size={20} />
            </TouchableOpacity>
          )}

          {idProofUploads.length > 0 && (
            <View style={styles.uploadList}>
              <Text style={[styles.uploadListTitle, { color: theme.text }]}>
                Selected Files ({idProofUploads.length})
              </Text>
              {idProofUploads.map((file, index) => (
                <View
                  key={index}
                  style={[styles.fileItem, { borderColor: theme.border }]}
                >
                  <View style={styles.fileInfo}>
                    <AppIcon
                      name={
                        file.name?.toLowerCase().endsWith(".pdf")
                          ? "picture-as-pdf"
                          : "image"
                      }
                      color={theme.primary}
                      size={18}
                    />
                    <Text
                      style={[styles.fileName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {file.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIdProofUploads((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <AppIcon name="close" color={theme.secondary} size={18} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Row
            label="Address Proof Status"
            value={""}
            theme={theme}
            locked={isKycApproved}
            icon="home"
            right={
              <StatusBadge status={user?.addressProofStatus} theme={theme} />
            }
          />

          {user?.addressProofRejectionReason && (
            <View
              style={[
                styles.rejectionBox,
                { backgroundColor: `${theme.negative}10` },
              ]}
            >
              <View style={styles.rejectionHeader}>
                <AppIcon name="error" color={theme.negative} size={16} />
                <Text
                  style={[styles.rejectionTitle, { color: theme.negative }]}
                >
                  Rejection Reason
                </Text>
              </View>
              <Text style={[styles.rejectionText, { color: theme.text }]}>
                {user.addressProofRejectionReason}
              </Text>
            </View>
          )}

          <Text
            style={[styles.documentTitle, { color: theme.text, marginTop: 16 }]}
          >
            Uploaded Address Documents
          </Text>
          <DocumentPreview
            paths={user?.addressProofPath}
            title="Address Proof"
            onPreview={async (path) => {
              try {
                const uri = await ensurePreview(path);
                if (uri) setPreviewImage(uri);
              } catch (e) {
                Alert.alert("Preview failed", "Unable to preview file.");
              }
            }}
            theme={theme}
          />

          {!isKycApproved && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  const picked = await pickDocuments();
                  if (picked.length) {
                    setAddressProofUploads((prev) => [...prev, ...picked]);
                  }
                } catch (e) {
                  Alert.alert("Upload failed", "Unable to pick files.");
                }
              }}
              style={[styles.uploadButton, { borderColor: theme.border }]}
            >
              <View
                style={[
                  styles.uploadIcon,
                  { backgroundColor: `${theme.primary}15` },
                ]}
              >
                <AppIcon name="cloud-upload" color={theme.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadTitle, { color: theme.text }]}>
                  Upload Address Proof
                </Text>
                <Text
                  style={[styles.uploadSubtitle, { color: theme.secondary }]}
                >
                  Upload utility bill, bank statement or tax document
                </Text>
              </View>
              <AppIcon name="add" color={theme.primary} size={20} />
            </TouchableOpacity>
          )}

          {addressProofUploads.length > 0 && (
            <View style={styles.uploadList}>
              <Text style={[styles.uploadListTitle, { color: theme.text }]}>
                Selected Files ({addressProofUploads.length})
              </Text>
              {addressProofUploads.map((file, index) => (
                <View
                  key={index}
                  style={[styles.fileItem, { borderColor: theme.border }]}
                >
                  <View style={styles.fileInfo}>
                    <AppIcon
                      name={
                        file.name?.toLowerCase().endsWith(".pdf")
                          ? "picture-as-pdf"
                          : "image"
                      }
                      color={theme.primary}
                      size={18}
                    />
                    <Text
                      style={[styles.fileName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {file.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setAddressProofUploads((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <AppIcon name="close" color={theme.secondary} size={18} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* Trading Preferences */}
        <Section
          title="Trading Preferences"
          theme={theme}
          subtitle="Customize your trading experience"
        >
          <Row
            label="Default Trade Size"
            value={
              user?.defaultTradeSize
                ? `${user.defaultTradeSize} lots`
                : "Not set"
            }
            theme={theme}
            onPress={() => {}}
            icon="trending-up"
          />

          <ToggleRow
            label="Order Confirmation"
            value={orderConfirmation}
            onValueChange={setOrderConfirmation}
            theme={theme}
            helperText="Show confirmation before placing orders"
            icon="check-circle"
          />

          <ToggleRow
            label="One-Tap Trading"
            value={quickTradeEnabled}
            onValueChange={setQuickTradeEnabled}
            theme={theme}
            helperText="Execute trades with single tap"
            icon="flash-on"
            isLast={true}
          />
        </Section>

        {/* Country Picker Modal */}
        <Modal visible={countryModalOpen} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCountryModalOpen(false)}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.card,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Select Country
                </Text>
                <TouchableOpacity
                  onPress={() => setCountryModalOpen(false)}
                  style={[
                    styles.modalClose,
                    { backgroundColor: `${theme.border}50` },
                  ]}
                >
                  <AppIcon name="close" color={theme.secondary} size={18} />
                </TouchableOpacity>
              </View>

              {countriesLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator color={theme.primary} size="large" />
                  <Text
                    style={[
                      styles.modalLoadingText,
                      { color: theme.secondary },
                    ]}
                  >
                    Loading countries...
                  </Text>
                </View>
              ) : countries.length > 0 ? (
                <ScrollView style={styles.modalList}>
                  {countries.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => {
                        setCountry(c);
                        setCountryModalOpen(false);
                      }}
                      style={[
                        styles.modalItem,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <Text
                        style={[styles.modalItemText, { color: theme.text }]}
                      >
                        {c}
                      </Text>
                      {country === c && (
                        <AppIcon name="check" color={theme.primary} size={20} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.modalEmpty}>
                  <AppIcon
                    name="search-off"
                    color={theme.secondary}
                    size={40}
                  />
                  <Text
                    style={[styles.modalEmptyText, { color: theme.secondary }]}
                  >
                    No countries available
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Gender Modal */}
        <Modal visible={genderModalOpen} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setGenderModalOpen(false)}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.card,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Select Gender
                </Text>
                <TouchableOpacity
                  onPress={() => setGenderModalOpen(false)}
                  style={[
                    styles.modalClose,
                    { backgroundColor: `${theme.border}50` },
                  ]}
                >
                  <AppIcon name="close" color={theme.secondary} size={18} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {["male", "female", "other"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => {
                      setGender(g);
                      setGenderModalOpen(false);
                    }}
                    style={[
                      styles.modalItem,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.modalItemText, { color: theme.text }]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                    {gender === g && (
                      <AppIcon name="check" color={theme.primary} size={20} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Income Modal */}
        <Modal visible={incomeModalOpen} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIncomeModalOpen(false)}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.card,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Select Income Range
                </Text>
                <TouchableOpacity
                  onPress={() => setIncomeModalOpen(false)}
                  style={[
                    styles.modalClose,
                    { backgroundColor: `${theme.border}50` },
                  ]}
                >
                  <AppIcon name="close" color={theme.secondary} size={18} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {[
                  "0-25000",
                  "25000-50000",
                  "50000-100000",
                  "100000-250000",
                  "250000+",
                ].map((inc) => (
                  <TouchableOpacity
                    key={inc}
                    onPress={() => {
                      setIncome(inc);
                      setIncomeModalOpen(false);
                    }}
                    style={[
                      styles.modalItem,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.modalItemText, { color: theme.text }]}>
                      {inc}
                    </Text>
                    {income === inc && (
                      <AppIcon name="check" color={theme.primary} size={20} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Interests Modal */}
        <Modal visible={interestsModalOpen} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setInterestsModalOpen(false)}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.card,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Select Interests
                </Text>
                <TouchableOpacity
                  onPress={() => setInterestsModalOpen(false)}
                  style={[
                    styles.modalClose,
                    { backgroundColor: `${theme.border}50` },
                  ]}
                >
                  <AppIcon name="close" color={theme.secondary} size={18} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {[
                  { label: "Technology", value: "technology" },
                  { label: "Sports", value: "sports" },
                  { label: "Reading", value: "reading" },
                  { label: "Travel", value: "travel" },
                  { label: "Music", value: "music" },
                  { label: "Cooking", value: "cooking" },
                ].map(({ label, value }) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => {
                      if (interests.includes(value)) {
                        setInterests(interests.filter((i) => i !== value));
                      } else {
                        setInterests([...interests, value]);
                      }
                    }}
                    style={[
                      styles.modalItem,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.modalItemText, { color: theme.text }]}>
                      {label}
                    </Text>
                    {interests.includes(value) && (
                      <AppIcon name="check" color={theme.primary} size={20} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Image Preview Modal */}
        <Modal visible={!!previewImage} transparent animationType="fade">
          <TouchableOpacity
            style={styles.previewOverlay}
            onPress={() => setPreviewImage(null)}
            activeOpacity={1}
          >
            <View style={styles.previewContainer}>
              <TouchableOpacity
                onPress={() => setPreviewImage(null)}
                style={[
                  styles.previewClose,
                  { backgroundColor: "rgba(0,0,0,0.5)" },
                ]}
              >
                <AppIcon name="close" color="#fff" size={24} />
              </TouchableOpacity>
              {previewImage && (
                <Image
                  source={{ uri: previewImage }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  profileHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  profileMeta: {
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  profileSub: {
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowHelper: {
    marginTop: 4,
    fontSize: 12,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowValue: {
    fontSize: 15,
    maxWidth: 180,
    textAlign: "right",
  },
  lockIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    minWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  input: {
    padding: 0,
    fontSize: 15,
    fontWeight: "600",
    minWidth: 120,
    textAlign: "right",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  kycHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  kycStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kycTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  kycDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rejectionBox: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  rejectionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
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
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 16,
    padding: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 12,
  },
  uploadList: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  uploadListTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalEmpty: {
    padding: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    marginTop: 12,
    fontSize: 16,
  },
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
});
