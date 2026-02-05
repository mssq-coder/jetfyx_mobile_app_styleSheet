import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCountries, previewFile, updateUser } from "../../api/getServices";
import {
  AccountSettingsHeader,
  DocumentPreview,
  InputRow,
  Row,
  Section,
  StatusBadge,
} from "../../components/AccountSettings";
import {
  CountryPickerModal,
  GenderModal,
  ImagePreviewModal,
  IncomeModal,
  InterestsModal,
} from "../../components/AccountSettings/modals";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useUserStore } from "../../store/userStore";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../../utils/toast";

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const parsePaths = (raw) => {
  if (!raw) return [];
  try {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
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

const parseInterestsValue = (raw) => {
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
  } catch (_e) {}
  return [];
};

const parseDobTextFromUser = (dobRaw) => {
  if (!dobRaw) return "";
  if (typeof dobRaw === "string") {
    const m = dobRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return "";
  }
  if (typeof dobRaw === "object") {
    const y = dobRaw.year ?? dobRaw.Year;
    const mo = dobRaw.month ?? dobRaw.Month;
    const d = dobRaw.day ?? dobRaw.Day;
    if (y && mo && d) {
      return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return "";
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

// Enhanced Input Component
const EnhancedInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  editable = true, 
  helperText, 
  icon, 
  theme,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  containerStyle = {},
  inputStyle = {},
  showBorder = true,
  variant = 'default' // 'default', 'filled', 'outlined', 'minimal'
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const getContainerStyle = () => {
    const baseStyle = {
      marginBottom: 16,
      ...containerStyle,
    };
    
    const variants = {
      default: {
        backgroundColor: 'transparent',
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: isFocused ? theme.primary : theme.border,
        paddingBottom: 8,
      },
      filled: {
        backgroundColor: `${theme.primary}08`,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: isFocused ? 1 : 0,
        borderColor: isFocused ? theme.primary : 'transparent',
      },
      outlined: {
        backgroundColor: 'transparent',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: isFocused ? theme.primary : theme.border,
      },
      minimal: {
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: isFocused ? theme.primary : `${theme.border}40`,
        paddingBottom: 8,
      }
    };
    
    return {
      ...baseStyle,
      ...variants[variant],
    };
  };
  
  const getInputStyle = () => {
    const baseStyle = {
      flex: 1,
      color: editable ? theme.text : `${theme.text}80`,
      fontSize: 16,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      padding: 0,
      ...inputStyle,
    };
    
    if (multiline) {
      baseStyle.minHeight = 80;
      baseStyle.textAlignVertical = 'top';
    }
    
    return baseStyle;
  };
  
  const getLabelStyle = () => ({
    fontSize: 12,
    fontWeight: '600',
    color: isFocused ? theme.primary : `${theme.text}60`,
    marginBottom: 4,
    letterSpacing: 0.5,
  });

  return (
    <View style={getContainerStyle()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        {icon && (
          <AppIcon 
            name={icon} 
            size={16} 
            color={isFocused ? theme.primary : `${theme.text}50`}
            style={{ marginRight: 8 }}
          />
        )}
        <Text style={getLabelStyle()}>
          {label}
        </Text>
      </View>
      
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={`${theme.text}40`}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={getInputStyle()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      
      {helperText && (
        <Text style={{
          fontSize: 11,
          color: editable ? `${theme.text}50` : theme.negative,
          marginTop: 4,
          fontStyle: editable ? 'normal' : 'italic',
        }}>
          {helperText}
        </Text>
      )}
    </View>
  );
};

// Enhanced Section Header
const EnhancedSectionHeader = ({ title, subtitle, theme, icon }) => (
  <View style={enhancedStyles.sectionHeader}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon && (
        <View style={[enhancedStyles.sectionIcon, { backgroundColor: `${theme.primary}15` }]}>
          <AppIcon name={icon} size={18} color={theme.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[enhancedStyles.sectionTitle, { color: theme.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[enhancedStyles.sectionSubtitle, { color: theme.secondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  </View>
);

export default function AccountSettingsScreen() {
  const { theme } = useAppTheme();
  const userData = useUserStore((s) => s.userData);
  const setUserData = useUserStore((s) => s.setUserData);
  const userId = useAuthStore((s) => s.userId);

  const user = useMemo(() => userData?.data ?? userData ?? {}, [userData]);

  const avatarUri =
    user?.avatarUrl || user?.profilePhotoUrl || user?.photoUrl || null;
  const isKycApproved =
    String(user?.overallStatus || "").toLowerCase() === "approved";
  const canEditProfile = !isKycApproved;

  const displayName = useMemo(() => {
    const first = String(user?.firstName || user?.FirstName || "").trim();
    const last = String(user?.lastName || user?.LastName || "").trim();
    const full = `${first} ${last}`.trim();
    return full || "—";
  }, [user]);

  const avatarFallbackLetter = useMemo(() => {
    const first = String(user?.firstName || user?.FirstName || "U");
    return first.slice(0, 1).toUpperCase() || "U";
  }, [user]);

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
  const [idProofPathOverride, setIdProofPathOverride] = useState(null);
  const [addressProofPathOverride, setAddressProofPathOverride] =
    useState(null);

  const [previewImage, setPreviewImage] = useState(null);
  const [previewMap, setPreviewMap] = useState({});

  const resolvePreviewUri = async (fileOrPath) => {
    if (!fileOrPath) return null;

    // If user just picked a file (expo-document-picker asset), it already has a local uri.
    if (typeof fileOrPath === "object" && typeof fileOrPath.uri === "string") {
      return fileOrPath.uri;
    }

    const path = String(fileOrPath);
    if (!path) return null;

    // Absolute URLs can be previewed directly (or via previewFile if needed).
    if (isHttpUrl(path)) return path;

    return ensurePreview(path);
  };

  const ensurePreview = async (path) => {
    if (!path) return null;
    if (previewMap[path]) return previewMap[path];
    const uri = await previewFile(path);
    setPreviewMap((prev) => (prev[path] ? prev : { ...prev, [path]: uri }));
    return uri;
  };

  const openPreview = async (fileOrPath, errorTitle = "Preview failed") => {
    try {
      const uri = await resolvePreviewUri(fileOrPath);
      if (uri) setPreviewImage(uri);
    } catch (_e) {
      showErrorToast("Unable to preview file.", errorTitle);
    }
  };

  const originalAddressProofPaths = useMemo(
    () => parsePaths(user?.addressProofPath),
    [user?.addressProofPath],
  );
  const originalIdProofPaths = useMemo(
    () => parsePaths(user?.idProofPath),
    [user?.idProofPath],
  );

  const currentIdProofPaths =
    idProofPathOverride !== null ? idProofPathOverride : originalIdProofPaths;

  const currentAddressProofPaths =
    addressProofPathOverride !== null
      ? addressProofPathOverride
      : originalAddressProofPaths;

  const hasOriginalAddressProof = originalAddressProofPaths.length > 0;
  const hasOriginalIdProof = originalIdProofPaths.length > 0;
  const addressProofWasCleared =
    addressProofPathOverride !== null &&
    addressProofPathOverride.length === 0 &&
    hasOriginalAddressProof;
  const idProofWasCleared =
    idProofPathOverride !== null &&
    idProofPathOverride.length === 0 &&
    hasOriginalIdProof;

  useEffect(() => {
    // Reset any manual overrides when fresh user data arrives.
    setAddressProofPathOverride(null);
  }, [user?.addressProofPath]);

  useEffect(() => {
    setIdProofPathOverride(null);
  }, [user?.idProofPath]);

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
    const dobStr = parseDobTextFromUser(dobRaw);

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

    const interestsRaw =
      user?.Intrest ||
      user?.intrest ||
      user?.Interest ||
      user?.interest ||
      user?.Interests ||
      user?.interests ||
      [];

    const interests0 = parseInterestsValue(interestsRaw)
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

  const pickAndAppendUploads = async (setUploads) => {
    try {
      const picked = await pickDocuments();
      if (picked.length) {
        setUploads((prev) => [...prev, ...picked]);
      }
    } catch (_e) {
      showErrorToast("Unable to pick files.", "Upload failed");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (!userId) {
      showErrorToast(
        "userId is not available. Please login again.",
        "Missing user",
      );
      return;
    }
    if (isKycApproved) {
      showInfoToast("Profile is locked after KYC approval.", "Locked");
      return;
    }

    const dobObj = parseDobToObject(dobText);
    if (dobText && !dobObj) {
      showInfoToast(
        "Date of Birth must be in YYYY-MM-DD format.",
        "Invalid date",
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
        // Web KYC sends files under these keys; backend binds them as file arrays.
        ...(idProofUploads.length > 0 ? { IdProofs: idProofUploads } : {}),
        ...(addressProofUploads.length > 0
          ? { AddressProofs: addressProofUploads }
          : {}),
        ...(idProofUploads.length === 0 && currentIdProofPaths
          ? {
              idProofPath: JSON.stringify(
                Array.isArray(currentIdProofPaths)
                  ? currentIdProofPaths
                  : parsePaths(currentIdProofPaths),
              ),
            }
          : {}),
        ...(addressProofUploads.length === 0 && currentAddressProofPaths
          ? {
              addressProofPath: JSON.stringify(
                Array.isArray(currentAddressProofPaths)
                  ? currentAddressProofPaths
                  : parsePaths(currentAddressProofPaths),
              ),
            }
          : {}),
      };
      console.log("Updating user with payload:", payload);
      const updated = await updateUser(userId, payload);
      console.log("Update response:", updated);
      setUserData(updated);
      setIdProofUploads([]);
      setAddressProofUploads([]);
      setIdProofPathOverride(null);
      setAddressProofPathOverride(null);
      showSuccessToast("Your profile has been updated successfully.", "Saved");
    } catch (e) {
      showErrorToast(
        e?.response?.data?.message || e?.message || "Unable to save changes.",
        "Save Failed",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[enhancedStyles.container, { backgroundColor: theme.background }]}
    >
      <AccountSettingsHeader
        theme={theme}
        onBack={() => router.back()}
        onSave={handleSave}
        canSave={canEditProfile}
        saving={saving}
      />

      <ScrollView
        contentContainerStyle={enhancedStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={enhancedStyles.sectionCard}>
          <EnhancedSectionHeader 
            title="Profile Information" 
            subtitle="Update your personal details"
            theme={theme}
            icon="person"
          />
          
          <View style={enhancedStyles.profileCard}>
            <View style={enhancedStyles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={enhancedStyles.avatar} />
              ) : (
                <View
                  style={[
                    enhancedStyles.avatarFallback,
                    { 
                      backgroundColor: theme.primary,
                      shadowColor: theme.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    },
                  ]}
                >
                  <Text style={enhancedStyles.avatarFallbackText}>
                    {avatarFallbackLetter}
                  </Text>
                </View>
              )}
              <View style={enhancedStyles.profileTextContainer}>
                <Text style={[enhancedStyles.profileName, { color: theme.text }]}>
                  {displayName}
                </Text>
                <View style={enhancedStyles.statusRow}>
                  <View style={[enhancedStyles.verifiedBadge, { backgroundColor: `${theme.positive}15` }]}>
                    <AppIcon name="verified" color={theme.positive} size={14} />
                    <Text style={[enhancedStyles.verifiedText, { color: theme.positive }]}>
                      Verified Account
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={enhancedStyles.formGrid}>
            <View style={enhancedStyles.formColumn}>
              <EnhancedInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                editable={canEditProfile}
                helperText={isKycApproved ? "Locked after verification" : "Required"}
                icon="person"
                theme={theme}
                variant="filled"
              />
            </View>
            
            <View style={enhancedStyles.formColumn}>
              <EnhancedInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                editable={canEditProfile}
                helperText={isKycApproved ? "Locked" : "Required"}
                icon="person-outline"
                theme={theme}
                variant="filled"
              />
            </View>
          </View>

          <EnhancedInput
            label="Date of Birth"
            value={dobText}
            onChangeText={setDobText}
            placeholder="1990-01-15"
            editable={canEditProfile}
            helperText="Format: YYYY-MM-DD"
            icon="event"
            theme={theme}
            variant="outlined"
          />

          <EnhancedInput
            label="Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="+1 (555) 123-4567"
            editable={canEditProfile}
            keyboardType="phone-pad"
            helperText="Include country code"
            icon="phone-iphone"
            theme={theme}
            variant="outlined"
          />

          <View style={[enhancedStyles.infoCard, { backgroundColor: `${theme.primary}05`, borderColor: `${theme.primary}15` }]}>
            <View style={enhancedStyles.infoCardHeader}>
              <AppIcon name="info" size={18} color={theme.primary} />
              <Text style={[enhancedStyles.infoCardTitle, { color: theme.text }]}>
                System Information
              </Text>
            </View>
            <View style={enhancedStyles.infoRow}>
              <View style={enhancedStyles.infoLabel}>
                <AppIcon name="badge" size={16} color={`${theme.text}60`} />
                <Text style={[enhancedStyles.infoLabelText, { color: `${theme.text}60` }]}>
                  Username
                </Text>
              </View>
              <Text style={[enhancedStyles.infoValue, { color: theme.text }]}>
                {user?.username || "—"}
              </Text>
            </View>
            <View style={enhancedStyles.infoRow}>
              <View style={enhancedStyles.infoLabel}>
                <AppIcon name="email" size={16} color={`${theme.text}60`} />
                <Text style={[enhancedStyles.infoLabelText, { color: `${theme.text}60` }]}>
                  Email
                </Text>
              </View>
              <Text style={[enhancedStyles.infoValue, { color: theme.text }]}>
                {user?.email || "—"}
              </Text>
            </View>
          </View>

          <Text style={[enhancedStyles.sectionSubHeader, { color: theme.primary }]}>
            Address Details
          </Text>

          <View style={enhancedStyles.formGrid}>
            <View style={enhancedStyles.formColumn}>
              <EnhancedInput
                label="Street"
                value={street}
                onChangeText={setStreet}
                placeholder="123 Main St"
                editable={canEditProfile}
                icon="home"
                theme={theme}
                variant="minimal"
              />
            </View>
            
            <View style={enhancedStyles.formColumn}>
              <EnhancedInput
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="New York"
                editable={canEditProfile}
                icon="location-city"
                theme={theme}
                variant="minimal"
              />
            </View>
          </View>

          <View style={enhancedStyles.formGrid}>
            <View style={enhancedStyles.formColumn}>
              <EnhancedInput
                label="State"
                value={stateProv}
                onChangeText={setStateProv}
                placeholder="NY"
                editable={canEditProfile}
                icon="map"
                theme={theme}
                variant="minimal"
              />
            </View>
            
            <View style={enhancedStyles.formColumn}>
              <EnhancedInput
                label="ZIP Code"
                value={zip}
                onChangeText={setZip}
                placeholder="10001"
                editable={canEditProfile}
                keyboardType="number-pad"
                icon="pin-drop"
                theme={theme}
                variant="minimal"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              enhancedStyles.selectInput,
              { 
                backgroundColor: canEditProfile ? `${theme.primary}05` : `${theme.border}20`,
                borderColor: isKycApproved ? `${theme.border}50` : theme.primary,
              }
            ]}
            onPress={() => setCountryModalOpen(true)}
            disabled={!canEditProfile}
          >
            <View style={enhancedStyles.selectInputContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="public" size={18} color={`${theme.text}60`} />
                <Text style={[enhancedStyles.selectInputLabel, { color: `${theme.text}60` }]}>
                  Country
                </Text>
              </View>
              <Text style={[enhancedStyles.selectInputValue, { color: theme.text }]}>
                {country || "Select country"}
              </Text>
            </View>
            {canEditProfile && (
              <AppIcon name="expand-more" size={20} color={`${theme.text}40`} />
            )}
          </TouchableOpacity>

          <Text style={[enhancedStyles.sectionSubHeader, { color: theme.primary, marginTop: 24 }]}>
            Additional Information
          </Text>

          <View style={enhancedStyles.formGrid}>
            <View style={enhancedStyles.formColumn}>
              <TouchableOpacity
                style={[
                  enhancedStyles.selectInput,
                  { 
                    backgroundColor: canEditProfile ? `${theme.primary}05` : `${theme.border}20`,
                    borderColor: isKycApproved ? `${theme.border}50` : theme.primary,
                  }
                ]}
                onPress={() => setGenderModalOpen(true)}
                disabled={!canEditProfile}
              >
                <View style={enhancedStyles.selectInputContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppIcon name="wc" size={18} color={`${theme.text}60`} />
                    <Text style={[enhancedStyles.selectInputLabel, { color: `${theme.text}60` }]}>
                      Gender
                    </Text>
                  </View>
                  <Text style={[enhancedStyles.selectInputValue, { color: theme.text }]}>
                    {gender || "Select"}
                  </Text>
                </View>
                {canEditProfile && (
                  <AppIcon name="expand-more" size={20} color={`${theme.text}40`} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={enhancedStyles.formColumn}>
              <TouchableOpacity
                style={[
                  enhancedStyles.selectInput,
                  { 
                    backgroundColor: canEditProfile ? `${theme.primary}05` : `${theme.border}20`,
                    borderColor: isKycApproved ? `${theme.border}50` : theme.primary,
                  }
                ]}
                onPress={() => setIncomeModalOpen(true)}
                disabled={!canEditProfile}
              >
                <View style={enhancedStyles.selectInputContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppIcon name="attach-money" size={18} color={`${theme.text}60`} />
                    <Text style={[enhancedStyles.selectInputLabel, { color: `${theme.text}60` }]}>
                      Income
                    </Text>
                  </View>
                  <Text style={[enhancedStyles.selectInputValue, { color: theme.text }]}>
                    {income || "Select"}
                  </Text>
                </View>
                {canEditProfile && (
                  <AppIcon name="expand-more" size={20} color={`${theme.text}40`} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              enhancedStyles.selectInput,
              { 
                backgroundColor: canEditProfile ? `${theme.primary}05` : `${theme.border}20`,
                borderColor: isKycApproved ? `${theme.border}50` : theme.primary,
              }
            ]}
            onPress={() => setInterestsModalOpen(true)}
            disabled={!canEditProfile}
          >
            <View style={enhancedStyles.selectInputContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="favorite" size={18} color={`${theme.text}60`} />
                <Text style={[enhancedStyles.selectInputLabel, { color: `${theme.text}60` }]}>
                  Interests
                </Text>
              </View>
              <Text style={[enhancedStyles.selectInputValue, { color: theme.text }]}>
                {interests.length > 0 ? `${interests.length} selected` : "Select interests"}
              </Text>
            </View>
            {canEditProfile && (
              <AppIcon name="expand-more" size={20} color={`${theme.text}40`} />
            )}
          </TouchableOpacity>

          <EnhancedInput
            label="Additional Comments"
            value={comment}
            onChangeText={setComment}
            placeholder="Any additional information..."
            editable={canEditProfile}
            helperText="Optional"
            multiline={true}
            icon="comment"
            theme={theme}
            variant="outlined"
            containerStyle={{ marginTop: 8 }}
          />
        </View>

        {/* KYC Section */}
        <View style={[enhancedStyles.sectionCard, { marginTop: 20 }]}>
          <EnhancedSectionHeader 
            title="KYC Verification" 
            subtitle="Complete your identity verification"
            theme={theme}
            icon="verified-user"
          />
          
          <View style={[
            enhancedStyles.kycStatusCard,
            { 
              backgroundColor: isKycApproved ? `${theme.positive}08` : `${theme.warning}08`,
              borderColor: isKycApproved ? `${theme.positive}20` : `${theme.warning}20`,
            }
          ]}>
            <View style={enhancedStyles.kycStatusHeader}>
              <View style={enhancedStyles.kycStatusTitleRow}>
                <AppIcon 
                  name={isKycApproved ? "verified" : "pending-actions"} 
                  size={24} 
                  color={isKycApproved ? theme.positive : theme.warning} 
                />
                <Text style={[enhancedStyles.kycStatusTitle, { color: theme.text }]}>
                  Verification Status
                </Text>
              </View>
              <StatusBadge status={user?.overallStatus} theme={theme} size="lg" />
            </View>
            <Text style={[enhancedStyles.kycStatusDescription, { color: theme.secondary }]}>
              {isKycApproved
                ? "Your account is fully verified and secure. All features are unlocked."
                : "Complete KYC verification to unlock all features and enhance security."}
            </Text>
          </View>

          <View style={enhancedStyles.kycDocumentSection}>
            <Text style={[enhancedStyles.documentSectionTitle, { color: theme.text }]}>
              ID Verification
            </Text>
            
            <View style={[
              enhancedStyles.documentStatusCard,
              { borderColor: `${theme.border}30` }
            ]}>
              <View style={enhancedStyles.documentStatusHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppIcon name="credit-card" size={20} color={theme.primary} />
                  <Text style={[enhancedStyles.documentStatusTitle, { color: theme.text }]}>
                    ID Proof Status
                  </Text>
                </View>
                <StatusBadge status={user?.idProofStatus} theme={theme} />
              </View>
              
              {user?.idProofRejectionReason && (
                <View style={[
                  enhancedStyles.rejectionBox,
                  { backgroundColor: `${theme.negative}08`, borderColor: `${theme.negative}20` }
                ]}>
                  <View style={enhancedStyles.rejectionHeader}>
                    <AppIcon name="error" color={theme.negative} size={18} />
                    <Text style={[enhancedStyles.rejectionTitle, { color: theme.negative }]}>
                      Rejection Reason
                    </Text>
                  </View>
                  <Text style={[enhancedStyles.rejectionText, { color: theme.text }]}>
                    {user.idProofRejectionReason}
                  </Text>
                </View>
              )}

              <Text style={[enhancedStyles.documentSubtitle, { color: theme.secondary }]}>
                Uploaded Documents
              </Text>
              
              <DocumentPreview
                paths={currentIdProofPaths}
                title="ID Proof"
                onPreview={(path) => openPreview(path)}
                theme={theme}
              />

              {!isKycApproved && (
                <>
                  {hasOriginalIdProof && (
                    <TouchableOpacity
                      onPress={() =>
                        setIdProofPathOverride(idProofWasCleared ? null : [])
                      }
                      style={[enhancedStyles.clearButton, { borderColor: theme.border }]}
                    >
                      <AppIcon
                        name={idProofWasCleared ? "undo" : "delete"}
                        color={theme.secondary}
                        size={16}
                      />
                      <Text style={[enhancedStyles.clearButtonText, { color: theme.secondary }]}>
                        {idProofWasCleared ? "Restore" : "Clear Current"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => pickAndAppendUploads(setIdProofUploads)}
                    style={[
                      enhancedStyles.uploadCard,
                      { 
                        backgroundColor: `${theme.primary}05`,
                        borderColor: `${theme.primary}20`,
                      }
                    ]}
                  >
                    <View style={enhancedStyles.uploadCardContent}>
                      <View style={[
                        enhancedStyles.uploadIcon,
                        { backgroundColor: `${theme.primary}15` }
                      ]}>
                        <AppIcon name="cloud-upload" color={theme.primary} size={24} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[enhancedStyles.uploadTitle, { color: theme.text }]}>
                          Upload New ID Proof
                        </Text>
                        <Text style={[enhancedStyles.uploadSubtitle, { color: theme.secondary }]}>
                          Passport, driver's license or national ID
                        </Text>
                      </View>
                      <AppIcon name="add-circle" color={theme.primary} size={24} />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {idProofUploads.length > 0 && (
              <View style={enhancedStyles.uploadList}>
                <Text style={[enhancedStyles.uploadListTitle, { color: theme.text }]}>
                  Selected Files ({idProofUploads.length})
                </Text>
                {idProofUploads.map((file, index) => (
                  <View
                    key={index}
                    style={[enhancedStyles.fileItem, { borderColor: `${theme.primary}20` }]}
                  >
                    <TouchableOpacity
                      style={enhancedStyles.fileInfo}
                      onPress={() => openPreview(file)}
                    >
                      <AppIcon
                        name={
                          file.name?.toLowerCase().endsWith(".pdf")
                            ? "picture-as-pdf"
                            : "image"
                        }
                        color={theme.primary}
                        size={20}
                      />
                      <Text
                        style={[enhancedStyles.fileName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {file.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setIdProofUploads((prev) =>
                          prev.filter((_, i) => i !== index),
                        );
                      }}
                      style={[enhancedStyles.deleteButton, { backgroundColor: `${theme.negative}10` }]}
                    >
                      <AppIcon name="close" color={theme.negative} size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={[enhancedStyles.kycDocumentSection, { marginTop: 24 }]}>
            <Text style={[enhancedStyles.documentSectionTitle, { color: theme.text }]}>
              Address Verification
            </Text>
            
            <View style={[
              enhancedStyles.documentStatusCard,
              { borderColor: `${theme.border}30` }
            ]}>
              <View style={enhancedStyles.documentStatusHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppIcon name="home" size={20} color={theme.primary} />
                  <Text style={[enhancedStyles.documentStatusTitle, { color: theme.text }]}>
                    Address Proof Status
                  </Text>
                </View>
                <StatusBadge status={user?.addressProofStatus} theme={theme} />
              </View>
              
              {user?.addressProofRejectionReason && (
                <View style={[
                  enhancedStyles.rejectionBox,
                  { backgroundColor: `${theme.negative}08`, borderColor: `${theme.negative}20` }
                ]}>
                  <View style={enhancedStyles.rejectionHeader}>
                    <AppIcon name="error" color={theme.negative} size={18} />
                    <Text style={[enhancedStyles.rejectionTitle, { color: theme.negative }]}>
                      Rejection Reason
                    </Text>
                  </View>
                  <Text style={[enhancedStyles.rejectionText, { color: theme.text }]}>
                    {user.addressProofRejectionReason}
                  </Text>
                </View>
              )}

              <Text style={[enhancedStyles.documentSubtitle, { color: theme.secondary }]}>
                Uploaded Documents
              </Text>
              
              <DocumentPreview
                paths={currentAddressProofPaths}
                title="Address Proof"
                onPreview={(path) => openPreview(path)}
                theme={theme}
              />

              {!isKycApproved && (
                <>
                  {hasOriginalAddressProof && (
                    <TouchableOpacity
                      onPress={() =>
                        setAddressProofPathOverride(addressProofWasCleared ? null : [])
                      }
                      style={[enhancedStyles.clearButton, { borderColor: theme.border }]}
                    >
                      <AppIcon
                        name={addressProofWasCleared ? "undo" : "delete"}
                        color={theme.secondary}
                        size={16}
                      />
                      <Text style={[enhancedStyles.clearButtonText, { color: theme.secondary }]}>
                        {addressProofWasCleared ? "Restore" : "Clear Current"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => pickAndAppendUploads(setAddressProofUploads)}
                    style={[
                      enhancedStyles.uploadCard,
                      { 
                        backgroundColor: `${theme.primary}05`,
                        borderColor: `${theme.primary}20`,
                      }
                    ]}
                  >
                    <View style={enhancedStyles.uploadCardContent}>
                      <View style={[
                        enhancedStyles.uploadIcon,
                        { backgroundColor: `${theme.primary}15` }
                      ]}>
                        <AppIcon name="cloud-upload" color={theme.primary} size={24} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[enhancedStyles.uploadTitle, { color: theme.text }]}>
                          Upload New Address Proof
                        </Text>
                        <Text style={[enhancedStyles.uploadSubtitle, { color: theme.secondary }]}>
                          Utility bill, bank statement or tax document
                        </Text>
                      </View>
                      <AppIcon name="add-circle" color={theme.primary} size={24} />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {addressProofUploads.length > 0 && (
              <View style={enhancedStyles.uploadList}>
                <Text style={[enhancedStyles.uploadListTitle, { color: theme.text }]}>
                  Selected Files ({addressProofUploads.length})
                </Text>
                {addressProofUploads.map((file, index) => (
                  <View
                    key={index}
                    style={[enhancedStyles.fileItem, { borderColor: `${theme.primary}20` }]}
                  >
                    <TouchableOpacity
                      style={enhancedStyles.fileInfo}
                      onPress={() => openPreview(file)}
                    >
                      <AppIcon
                        name={
                          file.name?.toLowerCase().endsWith(".pdf")
                            ? "picture-as-pdf"
                            : "image"
                        }
                        color={theme.primary}
                        size={20}
                      />
                      <Text
                        style={[enhancedStyles.fileName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {file.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setAddressProofUploads((prev) =>
                          prev.filter((_, i) => i !== index),
                        );
                      }}
                      style={[enhancedStyles.deleteButton, { backgroundColor: `${theme.negative}10` }]}
                    >
                      <AppIcon name="close" color={theme.negative} size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Modals */}
        <CountryPickerModal
          visible={countryModalOpen}
          theme={theme}
          countriesLoading={countriesLoading}
          countries={countries}
          selectedCountry={country}
          onSelectCountry={setCountry}
          onClose={() => setCountryModalOpen(false)}
        />

        <GenderModal
          visible={genderModalOpen}
          theme={theme}
          selectedGender={gender}
          onSelectGender={setGender}
          onClose={() => setGenderModalOpen(false)}
        />

        <IncomeModal
          visible={incomeModalOpen}
          theme={theme}
          selectedIncome={income}
          onSelectIncome={setIncome}
          onClose={() => setIncomeModalOpen(false)}
        />

        <InterestsModal
          visible={interestsModalOpen}
          theme={theme}
          selectedInterests={interests}
          onChangeInterests={setInterests}
          onClose={() => setInterestsModalOpen(false)}
        />

        <ImagePreviewModal
          uri={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const enhancedStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  sectionSubHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 16,
    marginTop: 24,
  },
  profileCard: {
    marginBottom: 24,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  profileTextContainer: {
    flex: 1,
    marginLeft: 20,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  formColumn: {
    flex: 1,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabelText: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectInput: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectInputContent: {
    flex: 1,
  },
  selectInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  selectInputValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  kycStatusCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  kycStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kycStatusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kycStatusTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  kycStatusDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  kycDocumentSection: {
    marginBottom: 16,
  },
  documentSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  documentStatusCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  documentStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  documentStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  documentSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  rejectionBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rejectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  uploadCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  uploadCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
  },
  uploadList: {
    marginTop: 16,
  },
  uploadListTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});