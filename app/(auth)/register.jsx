import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppButton from '../../components/Button';
import Logo from '../../assets/images/icon.png';
import { router } from 'expo-router';
import { getAccountType , getCountries } from '../../api/auth';
import { registerUser, verifyOtp } from '../../api/auth';


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
        const [types, countriesResp] = await Promise.all([getAccountType(), getCountries()]);

        // Countries
        const countriesPayload = countriesResp && countriesResp.data ? countriesResp.data : countriesResp;
        const countriesList = Array.isArray(countriesPayload) ? countriesPayload : [];
        const normalizedCountries = countriesList
          .filter((c) => c && c.phoneCode)
          .map((c) => ({ id: c.id, name: c.name, code: c.code, phoneCode: c.phoneCode }));
        setCountries(normalizedCountries);

        // Account types
        // Ensure we have an array
        // Some API responses wrap the array in a `data` field
        const payload = types && types.data ? types.data : types;
        const list = Array.isArray(payload) ? payload : [];
        // Only include visible types
        const visible = list.filter((t) => t.visibility === true || t.visibility === 'true');
        const demos = visible.filter((t) => t.isDemo === true || t.isDemo === 'true').map((t) => ({ id: t.id, name: t.accountName || t.name }));
        const lives = visible.filter((t) => !(t.isDemo === true || t.isDemo === 'true')).map((t) => ({ id: t.id, name: t.accountName || t.name }));
        setDemoAccountTypes(demos);
        setAccountTypes(lives);

        // If current form selection is invalid, set sensible defaults
        setForm((s) => {
          const next = { ...s };
          if (s.accountCreationType === 'demo') {
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
        console.warn('Failed to load bootstrap data', err);
        setAccountTypesError(err?.message || 'Failed to load account types');
        setCountriesError(err?.message || 'Failed to load countries');
      } finally {
        setAccountTypesLoading(false);
        setCountriesLoading(false);
      }
    };

    fetchBootstrapData();
  }, []);
  // Use a simple palette similar to LoginScreen
  const palette = {
    heading: '#111827',
    subtleText: '#6B7280',
    input: '#E9EAEE',
    border: '#E0E3E8',
    surface: '#ffffff',
    primary: '#C40042',
  };
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    phoneNumber: '',
    accountType: 'CLASSIC',
    accountTypeId: null,
    accountCreationType: 'live',
    referralCode: '',
    terms: false,
  });
  const [errors, setErrors] = useState({});

  const [verification, setVerification] = useState(['', '', '', '', '', '']);
  const verificationRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));

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
    if (!form.firstName || form.firstName.trim().length === 0) next.firstName = 'First name is required';
    if (!form.lastName || form.lastName.trim().length === 0) next.lastName = 'Last name is required';
    if (!form.email || !validateEmail(form.email)) next.email = 'Valid email is required';
    if (!form.phoneNumber || form.phoneNumber.trim().length < 6) next.phoneNumber = 'Valid phone is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateAccount = () => {
    const next = {};
    if (!form.accountTypeId) next.accountType = 'Please select an account type';
    if (!form.terms) next.terms = 'You must accept the terms';
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
      console.log('Registration successful', response);

      // Many endpoints return { message, statusCode, data: {...} }
      const regPayload = response && response.data ? response.data : response;
      const userId = regPayload?.userId ?? regPayload?.id ?? regPayload?.user?.id ?? regPayload?.user?.userId;
      if (userId) setRegisteredUserId(userId);

      setStep(3);
    } catch (err) {
      console.warn('Register failed', err);
      setRegisterError(err?.response?.data?.message || err?.message || 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVerify = async () => {
    const otp = verification.join('');
    if (!registeredUserId) {
      setVerifyError('Missing userId. Please register again.');
      return;
    }
    if (!/^[0-9]{6}$/.test(otp)) {
      setVerifyError('Please enter a valid 6-digit OTP');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const response = await verifyOtp({
        userId: registeredUserId,
        accountTypeId: String(form.accountTypeId ?? ''),
        otp,
      });
      console.log('OTP verification success', response);
      alert('OTP verified successfully');
      router.push('/(auth)/login');
    } catch (err) {
      console.warn('Verify OTP failed', err);
      setVerifyError(err?.response?.data?.message || err?.message || 'OTP verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  useEffect(() => {
    if (form.accountCreationType === 'demo') {
      if (demoAccountTypes.length > 0 && form.accountType !== demoAccountTypes[0].name) {
        setForm((s) => ({ ...s, accountType: demoAccountTypes[0].name, accountTypeId: demoAccountTypes[0].id }));
      }
    } else {
      if (accountTypes.length > 0 && !accountTypes.some((a) => a.name === form.accountType)) {
        setForm((s) => ({ ...s, accountType: accountTypes[0].name, accountTypeId: accountTypes[0].id }));
      }
    }
  }, [form.accountCreationType, form.accountType, accountTypes, demoAccountTypes]);

  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={['#DC2626', '#E00055']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
          borderBottomLeftRadius: 120,
          borderBottomRightRadius: 120,
        }}
      />
      <LinearGradient
        colors={['#DC2626', '#DC2626']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '38%',
          borderTopLeftRadius: 140,
          borderTopRightRadius: 140,
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-center px-5">
          <View className="items-center mb-4">
            <Image source={Logo} className="w-[140px] h-[58px]" style={{ resizeMode: 'contain' }} />
          </View>

          <View className="bg-white px-4 pt-4 pb-4 rounded-[16px] self-center w-[92%] max-w-[420px] shadow-lg">
            <View className="items-center mb-3">
              <Text className="text-[22px] mb-4 text-center text-heading">
                {step === 1 ? 'Create Account' : step === 2 ? 'Account Setup' : 'Verify Email'}
              </Text>
            </View>

            {step === 1 && (
              <>
                <View className="flex-row mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-subtle mb-1.5">First Name</Text>
                    <TextInput
                      placeholder="First Name"
                      placeholderTextColor={palette.subtleText}
                      className="py-2 px-3 rounded-[10px] border bg-input border-border"
                      value={form.firstName}
                      onChangeText={(t) => handleChange('firstName', t)}
                      autoCapitalize="words"
                    />
                    {errors.firstName ? <Text className="text-red-600 mt-1">{errors.firstName}</Text> : null}
                  </View>
                  <View className="flex-1 pl-2">
                    <Text className="text-subtle mb-1.5">Last Name</Text>
                    <TextInput
                      placeholder="Last Name"
                      placeholderTextColor={palette.subtleText}
                      className="py-2 px-3 rounded-[10px] border bg-input border-border"
                      value={form.lastName}
                      onChangeText={(t) => handleChange('lastName', t)}
                      autoCapitalize="words"
                    />
                    {errors.lastName ? <Text className="text-red-600 mt-1">{errors.lastName}</Text> : null}
                  </View>
                </View>

                <View className="mb-3">
                  <Text className="text-subtle mb-1.5">Email</Text>
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={palette.subtleText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="p-3 rounded-xl border bg-input border-border text-heading"
                    value={form.email}
                    onChangeText={(t) => handleChange('email', t)}
                  />
                  {errors.email ? <Text className="text-red-600 mt-1">{errors.email}</Text> : null}
                </View>

                <View className="flex-row mb-3">
                  <View className="w-[120px] pr-3">
                    <Text className="text-subtle mb-1.5">Country Code</Text>
                    <View>
                      <Pressable onPress={() => setCountryOpen(true)} className="rounded-md p-2 flex-row justify-between items-center bg-input">
                        <Text className="text-subtle">{form.countryCode}</Text>
                        <Text className="text-subtle">▾</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View className="flex-1 pl-3">
                    <Text className="text-subtle mb-1.5">Phone</Text>
                    <TextInput
                      placeholder="Phone Number"
                      placeholderTextColor={palette.subtleText}
                      keyboardType="number-pad"
                      className="p-3 rounded-xl border bg-input border-border text-heading"
                      value={form.phoneNumber}
                      onChangeText={(t) => handleChange('phoneNumber', t.replace(/[^0-9]/g, ''))}
                    />
                    {errors.phoneNumber ? <Text className="text-red-600 mt-1">{errors.phoneNumber}</Text> : null}
                  </View>
                </View>

                {/* Country selection modal */}
                <Modal
                  visible={countryOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setCountryOpen(false)}
                >
                  <TouchableWithoutFeedback onPress={() => setCountryOpen(false)}>
                    <View className="flex-1 bg-black/40 justify-end">
                      <View className="bg-white rounded-t-xl p-4">
                        <Text className="text-base font-semibold mb-3">Select Country Code</Text>
                        {countriesLoading ? (
                          <Text className="text-subtle">Loading countries...</Text>
                        ) : countriesError ? (
                          <Text className="text-subtle text-red-600">Failed to load countries</Text>
                        ) : (
                          <ScrollView style={{ maxHeight: 260 }}>
                            {countries.map((item) => (
                              <Pressable
                                key={item.id}
                                onPress={() => {
                                  handleChange('countryCode', item.phoneCode);
                                  setCountryOpen(false);
                                }}
                                className={`py-3 px-2 rounded-md ${form.countryCode === item.phoneCode ? 'bg-red-50' : ''}`}
                              >
                                <Text className={`${form.countryCode === item.phoneCode ? 'text-red-600' : 'text-heading'}`}>{item.phoneCode} - {item.name}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        )}
                        <Pressable onPress={() => setCountryOpen(false)} className="mt-3 py-3 items-center rounded-md bg-gray-100">
                          <Text>Close</Text>
                        </Pressable>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
                <View className="mb-2">
                  <Text className="text-subtle mb-1.5">Referral Code (optional)</Text>
                  <TextInput placeholder="Referral Code" placeholderTextColor={palette.subtleText} className="p-3 rounded-xl border bg-input border-border text-heading" value={form.referralCode} onChangeText={(t) => handleChange('referralCode', t)} autoCapitalize="characters" />
                </View>

                <View className="mt-1">
                  <LinearGradient colors={['#DC2626', '#DC2626']} style={{ borderRadius: 30 }}>
                    <AppButton
                      title="Continue"
                      onPress={handleContinueDetails}
                      size="lg"
                      color="#ffffff"
                      style={{ backgroundColor: '#DC2626' }}
                    />
                  </LinearGradient>
                </View>

                <View className="mt-3 items-center">
                  <Text className="text-subtle">Already have an account?</Text>
                  <Pressable onPress={() => router.push('/(auth)/login')}>
                    <Text className="text-red-600 mt-1.5">Sign In</Text>
                  </Pressable>
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <Text className="text-subtle mb-2">Account Creation</Text>
                <View className="flex-row bg-[#f2f2f6] p-1 rounded-full mb-3">
                  {['live', 'demo'].map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        const list = t === 'live' ? accountTypes : demoAccountTypes;
                        const first = list[0];
                        setForm((s) => ({
                          ...s,
                          accountCreationType: t,
                          accountType: first?.name ?? s.accountType,
                          accountTypeId: first?.id ?? s.accountTypeId,
                        }));
                      }}
                      className={`flex-1 py-2 rounded-full items-center ${form.accountCreationType === t ? 'bg-red-600' : 'bg-transparent'}`}
                    >
                      <Text className={`${form.accountCreationType === t ? 'text-white' : 'text-gray-500'} text-[13px] font-semibold`}>{t === 'live' ? 'Live Account' : 'Demo Account'}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text className="text-subtle mb-2">Account Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-3 px-1"
                >
                  {(form.accountCreationType === 'live' ? accountTypes : demoAccountTypes).map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        handleChange('accountType', t.name);
                        handleChange('accountTypeId', t.id);
                      }}
                      className={`min-w-[120px] px-3 py-3 rounded-xl border border-gray-200 items-center justify-center mr-2 ${form.accountType === t.name ? 'bg-red-600' : 'bg-transparent'}`}
                    >
                      <Text className={`${form.accountType === t.name ? 'text-white' : 'text-gray-500'} font-semibold`}>{t.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {errors.accountType ? <Text className="text-red-600 mb-2">{errors.accountType}</Text> : null}

                {accountTypesLoading ? (
                  <Text className="text-subtle">Loading account types...</Text>
                ) : accountTypesError ? (
                  <Text className="text-subtle text-red-600">Failed to load account types</Text>
                ) : (form.accountCreationType === 'live' ? accountTypes.length === 0 && <Text className="text-subtle">No live account types available</Text> : demoAccountTypes.length === 0 && <Text className="text-subtle">No demo account types available</Text>)}

                <Pressable onPress={() => { handleChange('terms', !form.terms); setErrors((s) => ({ ...s, terms: undefined })); }} className="flex-row items-center my-2" hitSlop={8}>
                  <View
                    className={`w-4 h-4 rounded-sm mr-2 flex items-center justify-center ${form.terms ? '' : 'bg-transparent'}`}
                    style={{ borderWidth: 1, borderColor: form.terms ? palette.primary : '#bbb', backgroundColor: form.terms ? palette.primary : 'transparent' }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: form.terms }}
                  >
                    {form.terms ? <Text style={{ color: '#fff', fontSize: 8 }}>✓</Text> : null}
                  </View>
                  <Text className="text-subtle">I agree to Terms & Privacy Policy</Text>
                </Pressable>

                <View className="mt-1">
                  <LinearGradient colors={['#DC2626', '#DC2626']} style={{ borderRadius: 30 }}>
                    <AppButton
                      title="Continue"
                      onPress={handleContinueAccount}
                      variant={form.terms ? 'primary' : 'ghost'}
                      size="lg"
                      color="#ffffff"
                      disabled={!form.terms || registerLoading}
                      style={!form.terms ? { opacity: 0.5 } : {}}
                    />
                  </LinearGradient>
                </View>

                {registerError ? <Text className="text-red-600 mt-2">{registerError}</Text> : null}

                {errors.terms ? <Text className="text-red-600 mt-2">{errors.terms}</Text> : null}

                <Pressable onPress={() => setStep(1)} style={{ marginTop: 12 }}>
                  <Text style={{ color: palette.primary, textAlign: 'center' }}>Back</Text>
                </Pressable>
              </>
            )}

            {step === 3 && (
              <>
                <Text className="text-subtle mb-2.5">Enter 6-digit code sent to:</Text>
                <Text className="text-heading font-bold mb-5">{form.email}</Text>

                <View className="flex-row justify-center mb-4">
                  {verification.map((digit, i) => (
                    <TextInput key={i} ref={verificationRefs.current[i]} className="w-10 h-12 text-center text-[18px] rounded-[10px] border mx-1 bg-input border-border" maxLength={1} keyboardType="number-pad" value={digit} onChangeText={(t) => handleCodeInput(i, t)} />
                  ))}
                </View>

                <View className="mt-2">
                  <LinearGradient colors={['#DC2626', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 30 }}>
                    <AppButton
                      title={verifyLoading ? 'Verifying...' : 'Verify'}
                      onPress={handleVerify}
                      size="lg"
                      color="#ffffff"
                      disabled={verifyLoading || verification.join('').length !== 6}
                      style={{ backgroundColor: '#DC2626', opacity: verifyLoading || verification.join('').length !== 6 ? 0.7 : 1 }}
                    />
                  </LinearGradient>
                </View>

                {verifyError ? <Text className="text-red-600 mt-2">{verifyError}</Text> : null}

                <Pressable onPress={() => setStep(1)} style={{ marginTop: 12 }}>
                  <Text style={{ color: palette.primary, textAlign: 'center' }}>Back</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
