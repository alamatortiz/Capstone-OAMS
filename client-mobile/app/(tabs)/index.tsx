import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const ccsLogo = require('@/assets/CCS.png');
const cbaaLogo = require('@/assets/CBAA.png');
const coedLogo = require('@/assets/COED.png');
const coeLogo = require('@/assets/COE.png');
const casLogo = require('@/assets/CAS.png');
const chasLogo = require('@/assets/CHAS.png');

const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');
const personsIcon = require('@/assets/persons_icon.png');
const nextIcon = require('@/assets/next_icon.png');
const queueIcon = require('@/assets/queue_management.png');
const appointmentIcon = require('@/assets/appointment_management.png');
const documentIcon = require('@/assets/document_processing.png');
const transactionIcon = require('@/assets/transaction_tracking.png');

const colleges = [
  { logo: ccsLogo, name: 'College of Computing Studies' },
  { logo: cbaaLogo, name: 'College of Business, Accountancy and Administration' },
  { logo: coedLogo, name: 'College of Education' },
  { logo: coeLogo, name: 'College of Engineering' },
  { logo: casLogo, name: 'College of Arts and Sciences' },
  { logo: chasLogo, name: 'College of Health and Allied Sciences' },
];

const features = [
  {
    icon: queueIcon,
    title: 'Queue Management',
    desc: 'Join virtual queues and track your position in real-time',
  },
  {
    icon: appointmentIcon,
    title: 'Appointment Scheduling',
    desc: 'Book and manage appointments with faculty and staff',
  },
  {
    icon: documentIcon,
    title: 'Document Processing',
    desc: 'Request and track official documents online',
  },
  {
    icon: transactionIcon,
    title: 'Transaction Tracking',
    desc: 'Monitor all your activities and service requests',
  },
];

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

export default function WelcomeScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        {/* Navbar */}
        <View style={styles.navbar}>
          <View style={styles.navbarBrand}>
            <Image source={pncLogo} style={styles.navPncImg} resizeMode="contain" />
            <OamsLogo style={styles.navLogoImg} outline={isDarkMode} />
          </View>
          <View style={styles.navbarActions}>
            <Pressable style={styles.iconBtn} onPress={toggleTheme}>
              <Image
                source={isDarkMode ? sunIcon : darkModeIcon}
                style={styles.iconBtnImg}
                resizeMode="contain"
              />
            </Pressable>
            <Pressable style={styles.btnSignin}>
              <Text style={styles.btnSigninText}>Sign In</Text>
              <Image source={nextIcon} style={styles.btnIconImg} resizeMode="contain" />
            </Pressable>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroLogosRow}>
            <Image source={pncLogo} style={styles.heroPncLogoImg} resizeMode="contain" />
            <OamsLogo style={styles.heroLogoImg} outline={isDarkMode} />
          </View>
          <Text style={styles.heroTitle}>Office Automation{'\n'}Management System</Text>
          <Text style={styles.heroSubtitle}>
            A centralized platform for students, professors, and administrators to
            streamline university services and enhance productivity.
          </Text>
          <Pressable style={styles.btnHero}>
            <Text style={styles.btnHeroText}>Sign In to Get Started</Text>
            <Image source={nextIcon} style={styles.btnIconImg} resizeMode="contain" />
          </Pressable>
        </View>

        {/* Key Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((f) => (
              <View style={styles.featureCard} key={f.title}>
                <View style={styles.featureIcon}>
                  <Image source={f.icon} style={styles.featureIconImg} resizeMode="contain" />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Serving All Colleges */}
        <View style={styles.collegesSection}>
          <Text style={styles.sectionTitle}>Serving All Colleges</Text>
          <Text style={styles.collegesDescription}>
            Our system serves all six colleges of the University of Cabuyao
            (Pamantasan ng Cabuyao), providing seamless automation and management
            solutions.
          </Text>
          <View style={styles.collegesGrid}>
            {colleges.map((c) => (
              <View style={styles.collegeCard} key={c.name}>
                <Image source={c.logo} style={styles.collegeLogo} resizeMode="contain" />
                <Text style={styles.collegeName}>{c.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Banner */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaIcon}>
            <Image source={personsIcon} style={styles.ctaIconImg} resizeMode="contain" />
          </View>
          <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of students, professors, and staff using OAMS to
            streamline their university experience.
          </Text>
          <Pressable style={styles.btnCta}>
            <Text style={styles.btnCtaText}>Sign In Now</Text>
            <Image source={nextIcon} style={styles.btnIconImg} resizeMode="contain" />
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogosLeft}>
            <Image source={pncLogo} style={styles.footerPncLogoImg} resizeMode="contain" />
            <OamsLogo style={styles.footerLogoImg} outline={isDarkMode} />
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerTagline}>
              <Text style={styles.footerTaglineStrong}>Dangal ng Bayan, </Text>
              bringing pride and honor to the nation!
            </Text>
            <Text style={styles.footerCopy}>
              © 2026 University of Cabuyao (Pamantasan ng Cabuyao). All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const greenGradientTop = '#22c55e';
const greenGradientBottom = '#00a63e';

const lightPalette = {
  background: '#ffffff',
  sectionAlt: '#f9fafb',
  navBg: 'rgba(255, 255, 255, 0.95)',
  navBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#1f2937',
  subtext: '#6b7280',
  cardBorder: 'rgba(34, 197, 94, 0.15)',
  iconBtn: '#666666',
};

const darkPalette = {
  background: '#0a0f0a',
  sectionAlt: '#111612',
  navBg: 'rgba(17, 22, 18, 0.92)',
  navBorder: 'rgba(34, 197, 94, 0.12)',
  text: '#f0fdf4',
  subtext: '#94a3b8',
  cardBorder: 'rgba(34, 197, 94, 0.18)',
  iconBtn: '#94a3b8',
};

function createStyles(theme: typeof lightPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
    },

    // Navbar
    navbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 78,
      paddingHorizontal: 16,
      backgroundColor: theme.navBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.navBorder,
    },
    navbarBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 3,
      flexShrink: 1,
      marginRight: 'auto',
      marginTop: 36,
    },
    navPncImg: { height: 36, width: 36 },
    navLogoImg: { height: 36, width: 108 },
    navbarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 10,
      flexShrink: 0,
      marginLeft: 'auto',
      marginBottom: 22,
    },
    iconBtn: {
      padding: 5,
      borderRadius: 8,
    },
    iconBtnImg: { width: 18, height: 18 },
    btnSignin: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: greenGradientBottom,
    },
    btnSigninText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    btnIconImg: { width: 14, height: 14, tintColor: '#ffffff' },

    // Hero
    heroSection: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 56,
    },
    heroLogosRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 20,
    },
    heroPncLogoImg: { height: 56, width: 56 },
    heroLogoImg: { height: 44, width: 140 },
    heroTitle: {
      fontSize: 28,
      fontWeight: '800',
      textAlign: 'center',
      color: theme.text,
      lineHeight: 34,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    heroSubtitle: {
      fontSize: 15,
      textAlign: 'center',
      color: theme.subtext,
      lineHeight: 24,
      marginBottom: 28,
    },
    btnHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 26,
      borderRadius: 10,
      backgroundColor: greenGradientBottom,
    },
    btnHeroText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },

    sectionTitle: {
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      color: theme.text,
      marginBottom: 28,
      letterSpacing: -0.3,
    },

    // Features
    featuresSection: {
      paddingHorizontal: 20,
      paddingBottom: 48,
    },
    featuresGrid: {
      gap: 16,
    },
    featureCard: {
      backgroundColor: theme.sectionAlt,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    featureIcon: {
      width: 48,
      height: 48,
      marginBottom: 14,
    },
    featureIconImg: {
      width: 48,
      height: 48,
      borderRadius: 12,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    featureDesc: {
      fontSize: 13,
      color: theme.subtext,
      lineHeight: 20,
      textAlign: 'center',
    },

    // Colleges
    collegesSection: {
      paddingHorizontal: 20,
      paddingBottom: 48,
      alignItems: 'center',
    },
    collegesDescription: {
      fontSize: 14,
      color: theme.subtext,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 28,
    },
    collegesGrid: {
      width: '100%',
      gap: 16,
    },
    collegeCard: {
      backgroundColor: theme.sectionAlt,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 16,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 16,
    },
    collegeLogo: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    collegeName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      lineHeight: 21,
    },

    // CTA
    ctaSection: {
      alignItems: 'center',
      textAlign: 'center',
      backgroundColor: greenGradientTop,
      borderRadius: 18,
      marginHorizontal: 20,
      marginBottom: 48,
      paddingVertical: 40,
      paddingHorizontal: 24,
    },
    ctaIcon: {
      width: 48,
      height: 48,
      marginBottom: 18,
    },
    ctaIconImg: { width: 48, height: 48, tintColor: '#ffffff' },
    ctaTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#ffffff',
      marginBottom: 12,
      textAlign: 'center',
    },
    ctaSubtitle: {
      fontSize: 14,
      color: '#f0fdf4',
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 28,
    },
    btnCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 26,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.65)',
    },
    btnCtaText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },

    // Footer
    footer: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 16,
      borderTopWidth: 1,
      borderTopColor: theme.navBorder,
    },
    footerLogosLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    footerPncLogoImg: { height: 46, width: 46 },
    footerLogoImg: { height: 38, width: 114 },
    footerRight: {
      alignItems: 'center',
      gap: 4,
    },
    footerTagline: {
      fontSize: 12,
      fontStyle: 'italic',
      color: theme.subtext,
      textAlign: 'center',
    },
    footerTaglineStrong: {
      fontWeight: '700',
    },
    footerCopy: {
      fontSize: 11,
      color: theme.subtext,
      textAlign: 'center',
    },
  });
}
