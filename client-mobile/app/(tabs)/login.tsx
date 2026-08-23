import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, getRouteRole } from '@/context/AuthContext';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');

function OamsLogo({
  style,
  outline,
}: {
  style: { height: number; width: number };
  outline: boolean;
}) {
  if (!outline) {
    return <Image source={oamsLogo} style={style} resizeMode="contain" />;
  }
  const layerStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: style.width,
    height: style.height,
  };
  return (
    <View style={[style, { position: 'relative', overflow: 'hidden' }]}>
      {[
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].map(([dx, dy]) => (
        <Image
          key={`${dx}-${dy}`}
          source={oamsLogo}
          resizeMode="contain"
          style={[
            layerStyle,
            { tintColor: '#ffffff', transform: [{ translateX: dx }, { translateY: dy }] },
          ]}
        />
      ))}
      <Image source={oamsLogo} resizeMode="contain" style={layerStyle} />
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const handleSubmit = async () => {
    if (!email && !password) {
      Alert.alert('Missing information', 'Please enter your Email or School ID and password.');
      return;
    }
    if (!email) {
      Alert.alert('Missing information', 'Please enter your Email or School ID.');
      return;
    }
    if (!password) {
      Alert.alert('Missing information', 'Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const authedUser = await login(email, password);
      const routeRole = getRouteRole(authedUser.role);
      switch (routeRole) {
        case 'student':
          router.replace('/pages/student/student_dashboard');
          break;
        case 'professor':
          router.replace('/pages/professor/professor_dashboard');
          break;
        case 'admin':
          router.replace('/pages/admin/admin_dashboard');
          break;
        case 'superadmin':
          router.replace('/pages/superadmin/superadmin_dashboard');
          break;
      }
    } catch (error: any) {
      Alert.alert(
        'Sign in failed',
        error?.response?.data?.error ?? 'Please check your credentials and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradient} style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.iconBtn} />
        </Pressable>

        <Pressable style={styles.themeBtn} onPress={toggleTheme} hitSlop={10}>
          <Image
            source={isDarkMode ? sunIcon : darkModeIcon}
            style={styles.themeBtnImg}
            resizeMode="contain"
          />
        </Pressable>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Branding */}
            <View style={styles.branding}>
              <View style={styles.logosRow}>
                <Image source={pncLogo} style={styles.pncLogo} resizeMode="contain" />
                <OamsLogo style={styles.oamsLogo} outline />
              </View>
              <Text style={styles.universityName}>University of Cabuyao</Text>
              <Text style={styles.universitySub}>(Pamantasan ng Cabuyao)</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Welcome Back</Text>
                  <Ionicons name="sparkles" size={18} color="#22c55e" />
                </View>
                <Text style={styles.cardDesc}>
                  Sign in with your @pnc.edu.ph email or School ID
                </Text>
                <Text style={styles.cardHint}>
                  Your account type will be automatically detected
                </Text>
              </View>

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email or School ID</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={16} color={theme.inputIcon} style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email or School ID"
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="username"
                    style={styles.input}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color={theme.inputIcon} style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    style={[styles.input, styles.inputPassword]}
                    editable={!isLoading}
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={16}
                      color={theme.inputIcon}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Submit */}
              <Pressable
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.submitBtnText}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.footerCopy}>
              © 2026 University of Cabuyao (Pamantasan ng Cabuyao). All rights reserved.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const greenGradientTop = '#22c55e';
const greenGradientBottom = '#00a63e';

type ThemePalette = {
  background: string;
  gradient: readonly [string, string, ...string[]];
  cardBg: string;
  text: string;
  subtext: string;
  hint: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  inputIcon: string;
  placeholder: string;
  iconBtn: string;
};

const darkPalette: ThemePalette = {
  background: '#0a0f0a',
  gradient: ['#0a0f0a', '#0f1f13', '#0a0f0a'],
  cardBg: 'rgba(17, 26, 17, 0.95)',
  text: '#f0fdf4',
  subtext: '#94a3b8',
  hint: '#4b5563',
  cardBorder: 'rgba(34, 197, 94, 0.2)',
  inputBg: '#0d1410',
  inputBorder: 'rgba(34, 197, 94, 0.2)',
  inputIcon: '#4b5563',
  placeholder: '#374151',
  iconBtn: '#94a3b8',
};

const lightPalette: ThemePalette = {
  background: '#ffffff',
  gradient: ['#ffffff', '#eefcf1', '#ffffff'],
  cardBg: '#f9fafb',
  text: '#1f2937',
  subtext: '#6b7280',
  hint: '#9ca3af',
  cardBorder: 'rgba(34, 197, 94, 0.15)',
  inputBg: '#ffffff',
  inputBorder: 'rgba(34, 197, 94, 0.2)',
  inputIcon: '#9ca3af',
  placeholder: '#d1d5db',
  iconBtn: '#666666',
};

function createStyles(theme: ThemePalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    backBtn: {
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 10,
      padding: 8,
      borderRadius: 8,
    },
    themeBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 8,
      padding: 8,
    },
    themeBtnImg: { width: 18, height: 18 },

    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingTop: 56,
      paddingBottom: 32,
      gap: 12,
    },

    // Branding
    branding: {
      alignItems: 'center',
      width: '100%',
      maxWidth: 360,
    },
    logosRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    pncLogo: { height: 56, width: 56 },
    oamsLogo: { height: 56, width: 115 },
    universityName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    universitySub: {
      fontSize: 12,
      color: theme.subtext,
      textAlign: 'center',
      marginTop: 2,
    },

    // Card
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 18,
      padding: 24,
      gap: 16,
    },
    cardHeader: {
      alignItems: 'center',
      marginBottom: 4,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
    },
    cardDesc: {
      fontSize: 13,
      color: theme.subtext,
      textAlign: 'center',
      marginTop: 2,
    },
    cardHint: {
      fontSize: 11,
      color: '#22c55e',
      opacity: 0.7,
      textAlign: 'center',
      marginTop: 4,
    },

    // Fields
    field: {
      gap: 7,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    inputWrap: {
      position: 'relative',
      justifyContent: 'center',
    },
    inputIcon: {
      position: 'absolute',
      left: 13,
      zIndex: 1,
    },
    input: {
      width: '100%',
      backgroundColor: theme.inputBg,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 10,
      paddingVertical: 11,
      paddingLeft: 38,
      paddingRight: 14,
      fontSize: 14,
      color: theme.text,
    },
    inputPassword: {
      paddingRight: 40,
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      padding: 4,
    },

    // Submit
    submitBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: greenGradientBottom,
      marginTop: 4,
      shadowColor: greenGradientTop,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },

    footerCopy: {
      fontSize: 11,
      color: theme.hint,
      textAlign: 'center',
    },
  });
}
