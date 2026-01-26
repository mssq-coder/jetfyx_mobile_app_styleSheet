import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { getAccountType, getCountries, registerUser, verifyOtp } from "../../api/auth";
import Logo from "../../assets/images/icon.png";

export default function SignUpScreen({ navigation }) {
  const [accountTypes, setAccountTypes] = useState([]);
  const [demoAccountTypes, setDemoAccountTypes] = useState([]);
  const [accountTypesLoading, setAccountTypesLoading] = useState(false);
  const [accountTypesError, setAccountTypesError] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  useEffect(() => {
    const fetchBootstrapData = async () => {
      setAccountTypesLoading(true);
      setAccountTypesError(null);
      setCountriesLoading(true);
      setCountriesError(null);
      try {
        const [types, countriesResp] = await Promise.all([
          getAccountType(),
          getCountries(),
        ]);

        // Countries
        const countriesPayload =
          countriesResp && countriesResp.data
            ? countriesResp.data
            : countriesResp;
        const countriesList = Array.isArray(countriesPayload)
          ? countriesPayload
          : [];
        const normalizedCountries = countriesList
          .filter((c) => c && c.phoneCode)
          .map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            phoneCode: c.phoneCode,
          }));
        setCountries(normalizedCountries);

        // Account types
        // Ensure we have an array
        // Some API responses wrap the array in a `data` field
        const payload = types && types.data ? types.data : types;
        const list = Array.isArray(payload) ? payload : [];
        // Only include visible types
        const visible = list.filter(
          (t) => t.visibility === true || t.visibility === "true",
        );
        const demos = visible
          .filter((t) => t.isDemo === true || t.isDemo === "true")
          .map((t) => ({ id: t.id, name: t.accountName || t.name }));
        const lives = visible
          .filter((t) => !(t.isDemo === true || t.isDemo === "true"))
          .map((t) => ({ id: t.id, name: t.accountName || t.name }));
        setDemoAccountTypes(demos);
        setAccountTypes(lives);

        // If current form selection is invalid, set sensible defaults
        setForm((s) => {
          const next = { ...s };
          if (s.accountCreationType === "demo") {
            if (demos.length > 0) {
              next.accountType = demos[0].name;
              next.accountTypeId = demos[0].id;
            }
          } else {
            if (lives.length > 0) {
              next.accountType = lives[0].name;
              next.accountTypeId = lives[0].id;
            }
          }
          return next;
        });
      } catch (err) {
        console.warn("Failed to load bootstrap data", err);
        setAccountTypesError(err?.message || "Failed to load account types");
        setCountriesError(err?.message || "Failed to load countries");
      } finally {
        setAccountTypesLoading(false);
        setCountriesLoading(false);
      }
    };

    fetchBootstrapData();
  }, []);
  // Use a simple palette similar to LoginScreen
  const palette = {
    heading: "#111827",
    subtleText: "#6B7280",
    input: "#E9EAEE",
    border: "#E0E3E8",
    surface: "#ffffff",
    primary: "#C40042",
  };
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+91",
    phoneNumber: "",
    accountType: "CLASSIC",
    accountTypeId: null,
    accountCreationType: "live",
    referralCode: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});

  const [verification, setVerification] = useState(["", "", "", "", "", ""]);
  const verificationRefs = useRef(
    Array.from({ length: 6 }, () => React.createRef()),
  );

  const [countryOpen, setCountryOpen] = useState(false);

  // accountTypes and demoAccountTypes are loaded from backend

  const handleChange = (key, value) => {
    setForm((s) => ({ ...s, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleCodeInput = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...verification];
    updated[index] = value;
    setVerification(updated);
    if (value && index < 5) {
      const next = verificationRefs.current[index + 1];
      next && next.current && next.current.focus && next.current.focus();
    }
    if (!value && index > 0) {
      const prev = verificationRefs.current[index - 1];
      prev && prev.current && prev.current.focus && prev.current.focus();
    }
  };

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const validateDetails = () => {
    const next = {};
    if (!form.firstName || form.firstName.trim().length === 0)
      next.firstName = "First name is required";
    if (!form.lastName || form.lastName.trim().length === 0)
      next.lastName = "Last name is required";
    if (!form.email || !validateEmail(form.email))
      next.email = "Valid email is required";
    if (!form.phoneNumber || form.phoneNumber.trim().length < 6)
      next.phoneNumber = "Valid phone is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateAccount = () => {
    const next = {};
    if (!form.accountTypeId) next.accountType = "Please select an account type";
    if (!form.terms) next.terms = "You must accept the terms";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinueDetails = () => {
    if (validateDetails()) setStep(2);
  };

  const handleContinueAccount = async () => {
    if (!validateAccount()) return;
    setRegisterLoading(true);
    setRegisterError(null);
    try {
      const phone = `${form.countryCode}-${form.phoneNumber}`;
      const response = await registerUser({
        accountCreationType: form.accountCreationType,
        accountTypeId: form.accountTypeId,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone,
      });
      // console.log("Registration successful", response);

      // Many endpoints return { message, statusCode, data: {...} }
      const regPayload = response && response.data ? response.data : response;
      const userId =
        regPayload?.userId ??
        regPayload?.id ??
        regPayload?.user?.id ??
        regPayload?.user?.userId;
      if (userId) setRegisteredUserId(userId);

      setStep(3);
    } catch (err) {
      console.warn("Register failed", err);
      setRegisterError(
        err?.response?.data?.message || err?.message || "Registration failed",
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVerify = async () => {
    const otp = verification.join("");
    if (!registeredUserId) {
      setVerifyError("Missing userId. Please register again.");
      return;
    }
    if (!/^[0-9]{6}$/.test(otp)) {
      setVerifyError("Please enter a valid 6-digit OTP");
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const response = await verifyOtp({
        userId: registeredUserId,
        accountTypeId: String(form.accountTypeId ?? ""),
        otp,
      });
      // console.log("OTP verification success", response);
      alert("OTP verified successfully");
      router.push("/(auth)/login");
    } catch (err) {
      console.warn("Verify OTP failed", err);
      setVerifyError(
        err?.response?.data?.message ||
          err?.message ||
          "OTP verification failed",
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  useEffect(() => {
    if (form.accountCreationType === "demo") {
      if (
        demoAccountTypes.length > 0 &&
        form.accountType !== demoAccountTypes[0].name
      ) {
        setForm((s) => ({
          ...s,
          accountType: demoAccountTypes[0].name,
          accountTypeId: demoAccountTypes[0].id,
        }));
      }
    } else {
      if (
        accountTypes.length > 0 &&
        !accountTypes.some((a) => a.name === form.accountType)
      ) {
        setForm((s) => ({
          ...s,
          accountType: accountTypes[0].name,
          accountTypeId: accountTypes[0].id,
        }));
      }
    }
  }, [
    form.accountCreationType,
    form.accountType,
    accountTypes,
    demoAccountTypes,
  ]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#DC2626", "#E00055"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topGradient}
      />
      <LinearGradient
        colors={["#DC2626", "#DC2626"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bottomGradient}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.centerContent}>
          <View style={styles.logoContainer}>
            <Image source={Logo} style={styles.logo} />
          </View>

          <View style={styles.card}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>
                {step === 1
                  ? "Create Account"
                  : step === 2
                    ? "Account Setup"
                    : "Verify Email"}
              </Text>
            </View>

            {step === 1 && (
              <>
                <View style={styles.nameRow}>
                  <View style={[styles.nameField, styles.nameFieldLeft]}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                      placeholder="First Name"
                      placeholderTextColor={palette.subtleText}
                      style={styles.textInput}
                      value={form.firstName}
                      onChangeText={(t) => handleChange("firstName", t)}
                      autoCapitalize="words"
                    />
                    {errors.firstName ? (
                      <Text style={styles.errorText}>{errors.firstName}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.nameField, styles.nameFieldRight]}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                      placeholder="Last Name"
                      placeholderTextColor={palette.subtleText}
                      style={styles.textInput}
                      value={form.lastName}
                      onChangeText={(t) => handleChange("lastName", t)}
                      autoCapitalize="words"
                    />
                    {errors.lastName ? (
                      <Text style={styles.errorText}>{errors.lastName}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={palette.subtleText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.textInput}
                    value={form.email}
                    onChangeText={(t) => handleChange("email", t)}
                  />
                  {errors.email ? (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  ) : null}
                </View>

                <View style={styles.countryPhoneRow}>
                  <View style={styles.countryCodeField}>
                    <Text style={styles.label}>Country Code</Text>
                    <View>
                      <Pressable
                        onPress={() => setCountryOpen(true)}
                        style={styles.countryCodeButton}
                      >
                        <Text style={styles.subtleText}>
                          {form.countryCode}
                        </Text>
                        <Text style={styles.subtleText}>▾</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.phoneField}>
                    <Text style={styles.label}>Phone</Text>
                    <TextInput
                      placeholder="Phone Number"
                      placeholderTextColor={palette.subtleText}
                      keyboardType="number-pad"
                      style={styles.textInput}
                      value={form.phoneNumber}
                      onChangeText={(t) =>
                        handleChange("phoneNumber", t.replace(/[^0-9]/g, ""))
                      }
                    />
                    {errors.phoneNumber ? (
                      <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Country selection modal */}
                <Modal
                  visible={countryOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setCountryOpen(false)}
                >
                  <TouchableWithoutFeedback
                    onPress={() => setCountryOpen(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                          Select Country Code
                        </Text>
                        {countriesLoading ? (
                          <Text style={styles.subtleText}>
                            Loading countries...
                          </Text>
                        ) : countriesError ? (
                          <Text style={styles.modalError}>
                            Failed to load countries
                          </Text>
                        ) : (
                          <ScrollView style={styles.countriesList}>
                            {countries.map((item) => (
                              <Pressable
                                key={item.id}
                                onPress={() => {
                                  handleChange("countryCode", item.phoneCode);
                                  setCountryOpen(false);
                                }}
                                style={[
                                  styles.countryItem,
                                  form.countryCode === item.phoneCode &&
                                    styles.countryItemActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.countryItemText,
                                    form.countryCode === item.phoneCode &&
                                      styles.countryItemTextActive,
                                  ]}
                                >
                                  {item.phoneCode} - {item.name}
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        )}
                        <Pressable
                          onPress={() => setCountryOpen(false)}
                          style={styles.modalCloseButton}
                        >
                          <Text>Close</Text>
                        </Pressable>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>

                <View style={styles.formField}>
                  <Text style={styles.label}>Referral Code (optional)</Text>
                  <TextInput
                    placeholder="Referral Code"
                    placeholderTextColor={palette.subtleText}
                    style={styles.textInput}
                    value={form.referralCode}
                    onChangeText={(t) => handleChange("referralCode", t)}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.continueButtonContainer}>
                  <LinearGradient
                    colors={["#DC2626", "#DC2626"]}
                    style={styles.gradient}
                  >
                    <Pressable
                      style={styles.continueButton}
                      onPress={handleContinueDetails}
                    >
                      <Text style={styles.continueButtonText}>Continue</Text>
                    </Pressable>
                  </LinearGradient>
                </View>

                <View style={styles.signInContainer}>
                  <Text style={styles.subtleText}>
                    Already have an account?
                  </Text>
                  <Pressable onPress={() => router.push("/(auth)/login")}>
                    <Text style={styles.signInLink}>Sign In</Text>
                  </Pressable>
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.subtleText}>Account Creation</Text>
                <View style={styles.segmentedControl}>
                  {["live", "demo"].map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        const list =
                          t === "live" ? accountTypes : demoAccountTypes;
                        const first = list[0];
                        setForm((s) => ({
                          ...s,
                          accountCreationType: t,
                          accountType: first?.name ?? s.accountType,
                          accountTypeId: first?.id ?? s.accountTypeId,
                        }));
                      }}
                      style={[
                        styles.segmentButton,
                        form.accountCreationType === t &&
                          styles.segmentButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          form.accountCreationType === t &&
                            styles.segmentTextActive,
                        ]}
                      >
                        {t === "live" ? "Live Account" : "Demo Account"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.subtleText}>Account Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.accountTypeScroll}
                >
                  {(form.accountCreationType === "live"
                    ? accountTypes
                    : demoAccountTypes
                  ).map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        handleChange("accountType", t.name);
                        handleChange("accountTypeId", t.id);
                      }}
                      style={[
                        styles.accountTypeButton,
                        form.accountType === t.name &&
                          styles.accountTypeButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.accountTypeText,
                          form.accountType === t.name &&
                            styles.accountTypeTextActive,
                        ]}
                      >
                        {t.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {errors.accountType ? (
                  <Text style={styles.errorText}>{errors.accountType}</Text>
                ) : null}

                {accountTypesLoading ? (
                  <Text style={styles.subtleText}>
                    Loading account types...
                  </Text>
                ) : accountTypesError ? (
                  <Text style={styles.errorText}>
                    Failed to load account types
                  </Text>
                ) : form.accountCreationType === "live" ? (
                  accountTypes.length === 0 && (
                    <Text style={styles.subtleText}>
                      No live account types available
                    </Text>
                  )
                ) : (
                  demoAccountTypes.length === 0 && (
                    <Text style={styles.subtleText}>
                      No demo account types available
                    </Text>
                  )
                )}

                <Pressable
                  onPress={() => {
                    handleChange("terms", !form.terms);
                    setErrors((s) => ({ ...s, terms: undefined }));
                  }}
                  style={styles.termsCheckbox}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: form.terms ? palette.primary : "#bbb",
                        backgroundColor: form.terms
                          ? palette.primary
                          : "transparent",
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: form.terms }}
                  >
                    {form.terms ? (
                      <Text style={styles.checkmark}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.subtleText}>
                    I agree to Terms & Privacy Policy
                  </Text>
                </Pressable>

                <View style={styles.continueButtonContainer}>
                  <LinearGradient
                    colors={["#DC2626", "#DC2626"]}
                    style={styles.gradient}
                  >
                    <Pressable
                      style={[
                        styles.continueButton,
                        { opacity: !form.terms ? 0.5 : 1 },
                      ]}
                      onPress={handleContinueAccount}
                      disabled={!form.terms || registerLoading}
                    >
                      <Text style={styles.continueButtonText}>
                        {registerLoading ? "Processing..." : "Continue"}
                      </Text>
                    </Pressable>
                  </LinearGradient>
                </View>

                {registerError ? (
                  <Text style={styles.errorText}>{registerError}</Text>
                ) : null}

                {errors.terms ? (
                  <Text style={styles.errorText}>{errors.terms}</Text>
                ) : null}

                <Pressable onPress={() => setStep(1)} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.subtleText}>
                  Enter 6-digit code sent to:
                </Text>
                <Text style={styles.emailDisplay}>{form.email}</Text>

                <View style={styles.otpContainer}>
                  {verification.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={verificationRefs.current[i]}
                      style={styles.otpInput}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(t) => handleCodeInput(i, t)}
                    />
                  ))}
                </View>

                <View style={styles.continueButtonContainer}>
                  <LinearGradient
                    colors={["#DC2626", "#DC2626"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                  >
                    <Pressable
                      style={[
                        styles.continueButton,
                        {
                          opacity:
                            verifyLoading || verification.join("").length !== 6
                              ? 0.7
                              : 1,
                        },
                      ]}
                      onPress={handleVerify}
                      disabled={
                        verifyLoading || verification.join("").length !== 6
                      }
                    >
                      <Text style={styles.continueButtonText}>
                        {verifyLoading ? "Verifying..." : "Verify"}
                      </Text>
                    </Pressable>
                  </LinearGradient>
                </View>

                {verifyError ? (
                  <Text style={styles.errorText}>{verifyError}</Text>
                ) : null}

                <Pressable onPress={() => setStep(1)} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "38%",
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
  },
  keyboardAvoid: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 140,
    height: 58,
    resizeMode: "contain",
  },
  card: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 16,
    alignSelf: "center",
    width: "92%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    marginBottom: 16,
    textAlign: "center",
    color: "#111827",
    fontWeight: "600",
  },
  nameRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  nameField: {
    flex: 1,
  },
  nameFieldLeft: {
    paddingRight: 6,
  },
  nameFieldRight: {
    paddingLeft: 6,
  },
  formField: {
    marginBottom: 12,
  },
  label: {
    color: "#6B7280",
    marginBottom: 6,
    fontSize: 14,
  },
  textInput: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#E9EAEE",
    borderColor: "#E0E3E8",
    color: "#111827",
  },
  errorText: {
    color: "#dc2626",
    marginTop: 4,
    fontSize: 12,
  },
  subtleText: {
    color: "#6B7280",
    fontSize: 14,
  },
  countryPhoneRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  countryCodeField: {
    width: 120,
    paddingRight: 12,
  },
  countryCodeButton: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E9EAEE",
  },
  phoneField: {
    flex: 1,
    paddingLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  countriesList: {
    maxHeight: 260,
  },
  countryItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  countryItemActive: {
    backgroundColor: "#fee2e2",
  },
  countryItemText: {
    color: "#111827",
  },
  countryItemTextActive: {
    color: "#dc2626",
  },
  modalError: {
    color: "#dc2626",
    fontSize: 14,
  },
  modalCloseButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#f2f2f6",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#dc2626",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  segmentTextActive: {
    color: "#fff",
  },
  accountTypeScroll: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  accountTypeButton: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  accountTypeButtonActive: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  accountTypeText: {
    color: "#9CA3AF",
    fontWeight: "600",
  },
  accountTypeTextActive: {
    color: "#fff",
  },
  termsCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#fff",
    fontSize: 10,
  },
  continueButtonContainer: {
    marginTop: 8,
  },
  gradient: {
    borderRadius: 30,
  },
  continueButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    borderRadius: 30,
  },
  continueButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  signInContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  signInLink: {
    color: "#dc2626",
    marginTop: 6,
  },
  backButton: {
    marginTop: 12,
  },
  backButtonText: {
    color: "#C40042",
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  otpInput: {
    width: 40,
    height: 48,
    textAlign: "center",
    fontSize: 18,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 4,
    backgroundColor: "#E9EAEE",
    borderColor: "#E0E3E8",
  },
  emailDisplay: {
    color: "#111827",
    fontWeight: "600",
    marginBottom: 20,
  },
});
