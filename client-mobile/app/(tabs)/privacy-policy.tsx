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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

const pncLogo = require('@/assets/Pnc-Logo.png');
const oamsLogo = require('@/assets/oams_logo.png');
const darkModeIcon = require('@/assets/darkmode_icon.png');
const sunIcon = require('@/assets/sun_icon.png');

// Mobile counterpart of client/src/pages/legal/PrivacyPolicy.jsx -- same
// sections, same wording, so the two clients can't drift into saying
// different things about the same database. Public/unauthenticated: reached
// from the login footer, and listed in PUBLIC_SEGMENTS in app/_layout.tsx so
// AuthGate lets a logged-out user read it (mirrors web, where the page sits
// outside ProtectedRoute).
//
// Content is grounded in what OAMS actually stores (server/oams_db.sql) and
// written for RA 10173, the Philippine Data Privacy Act of 2012 -- not a
// generic GDPR/CCPA boilerplate policy.

const LAST_UPDATED = 'Effective and last updated: September 12, 2026';

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: { lead?: string; text: string }[] };

type Section = { heading: string; blocks: Block[] };

const INTRO: Block[] = [
  {
    kind: 'p',
    text:
      'The Office Automation Management System (OAMS) is an internal system of the University of Cabuyao (Pamantasan ng Cabuyao), built to manage queueing, appointments, document requests, and announcements across college department offices. Accounts on OAMS are issued to enrolled students, faculty, and office staff of the University — this is not a public service you sign up for on your own, and this policy explains what the system collects from you as a member of the University community and what it’s used for.',
  },
  {
    kind: 'p',
    text:
      'This policy is written to comply with the Data Privacy Act of 2012 (Republic Act No. 10173) of the Philippines and its Implementing Rules and Regulations.',
  },
];

const SECTIONS: Section[] = [
  {
    heading: '1. Information We Collect',
    blocks: [
      {
        kind: 'p',
        text: 'OAMS stores the following categories of personal data, tied to your account:',
      },
      {
        kind: 'ul',
        items: [
          {
            lead: 'Identity information:',
            text: ' full name, and your student number (students) or employee ID (faculty and office staff).',
          },
          { lead: 'Contact information:', text: ' your university email address.' },
          {
            lead: 'Academic/employment information:',
            text: ' your program/course and year level (students), or department, position, and specialization (faculty and staff).',
          },
          {
            lead: 'Account credentials:',
            text: ' your password, stored only as a one-way cryptographic hash — OAMS never stores or can display your actual password.',
          },
          {
            lead: 'Login and session activity:',
            text: ' login timestamps, session expiry, IP address, and browser/device information (user agent), recorded for both successful and failed login attempts, for account-security purposes.',
          },
          {
            lead: 'Push notification identifiers:',
            text: ' if you enable notifications, a device- or browser-specific token used solely to deliver those notifications to you.',
          },
          {
            lead: 'Activity you generate while using the system:',
            text: ' queue entries, appointment bookings and their stated purpose, comments exchanged between a student and a professor on an appointment, document/document-submission requests (including any file you attach), and the notifications and announcements associated with your account.',
          },
          {
            lead: 'Administrative action logs:',
            text: ' when an administrator processes a request on your behalf (e.g., approves a document or manages a queue), that action is logged for accountability, tied to the record involved.',
          },
        ],
      },
      {
        kind: 'p',
        text:
          'OAMS does not collect payment information, government IDs beyond your existing university-issued student/employee number, or any data through advertising or analytics trackers — the system currently uses none.',
      },
    ],
  },
  {
    heading: '2. How We Use Your Information',
    blocks: [
      {
        kind: 'ul',
        items: [
          { text: 'To authenticate you and maintain your account session securely.' },
          {
            text: 'To operate the features you use — joining a queue, booking or managing an appointment, submitting or processing a document request, and sending you the notifications those actions generate.',
          },
          {
            text: 'To let the right people see the right information: your college office’s staff, and the specific faculty member or student on the other side of an appointment or document request, based on your role and department.',
          },
          {
            text: 'To detect and respond to suspicious login activity (repeated failed attempts, unrecognized devices).',
          },
          {
            text: 'To maintain an accountability trail of administrative actions taken on requests.',
          },
        ],
      },
    ],
  },
  {
    heading: '3. Who Can See Your Information',
    blocks: [
      {
        kind: 'p',
        text:
          'OAMS uses role-based access: a student cannot see another student’s records; a faculty member sees only appointments and document requests directed to them; and college office staff (administrators) can see activity within their own department only. A university-wide administrator role exists solely for system-level account management and does not routinely view the content of individual requests. OAMS does not sell, rent, or share your personal data with any outside company or third party. Data stays within University-operated infrastructure.',
      },
    ],
  },
  {
    heading: '4. Data Retention',
    blocks: [
      {
        kind: 'p',
        text:
          'Your account and its associated records are retained for as long as your enrollment or employment with the University continues, and thereafter for as long as the University’s records-retention practices require. Login/session logs and notification delivery tokens are kept only as long as needed for the security and functional purposes described above.',
      },
    ],
  },
  {
    heading: '5. Your Rights',
    blocks: [
      {
        kind: 'p',
        text:
          'Under the Data Privacy Act of 2012, you have the right to be informed, to access, to correct, and to object to the processing of your personal data, and to file a complaint with the National Privacy Commission. Because OAMS accounts are provisioned and managed by the University (there is no public self-registration for administrator- or system-managed roles), requests to access, correct, or delete your data should be directed to your college department office or the University’s data protection contact rather than through the system itself.',
      },
    ],
  },
  {
    heading: '6. Data Security',
    blocks: [
      {
        kind: 'p',
        text:
          'Passwords are never stored in plain text. All traffic between your device and OAMS is encrypted (HTTPS). Access to every part of the system requires authentication, and the system applies rate-limiting to slow down repeated unauthorized login attempts. No system is perfectly secure, and this policy does not represent a guarantee against every possible incident, but these measures reflect the safeguards currently in place.',
      },
    ],
  },
  {
    heading: '7. Changes to This Policy',
    blocks: [
      {
        kind: 'p',
        text:
          'If this policy changes, the “last updated” date above will change with it. We encourage checking back periodically, particularly if you receive a notice from the University about a change to how OAMS handles your data.',
      },
    ],
  },
  {
    heading: '8. Contact',
    blocks: [
      {
        kind: 'p',
        text:
          'For questions about this policy or your data, contact your college department office, or the University of Cabuyao (Pamantasan ng Cabuyao) administration directly.',
      },
    ],
  },
];

// Same white-stroke treatment the other screens give the OAMS wordmark: four
// white-tinted copies offset by 1px underneath the real logo. React Native
// has no CSS `filter`, so this is the stand-in for web's multi-layer
// zero-blur drop-shadow.
function OamsLogo({ style }: { style: { height: number; width: number } }) {
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

export default function PrivacyPolicyScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const styles = createStyles(theme);

  // Deep-linked or opened on a cold start there's no history to pop, so fall
  // back to login rather than leaving the reader on a dead-end screen.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  const renderBlock = (block: Block, key: string) => {
    if (block.kind === 'p') {
      return (
        <Text key={key} style={styles.paragraph}>
          {block.text}
        </Text>
      );
    }
    return (
      <View key={key} style={styles.list}>
        {block.items.map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bullet}>{'•'}</Text>
            <Text style={styles.listItemText}>
              {item.lead ? <Text style={styles.strong}>{item.lead}</Text> : null}
              {item.text}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient colors={theme.gradient} style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <Pressable style={styles.themeBtn} onPress={toggleTheme} hitSlop={10}>
          <Image
            source={isDarkMode ? sunIcon : darkModeIcon}
            style={styles.themeBtnImg}
            resizeMode="contain"
          />
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backLink} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.accent} />
            <Text style={styles.backLinkText}>Back to Login</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logosRow}>
              <Image source={pncLogo} style={styles.pncLogo} resizeMode="contain" />
              <OamsLogo style={styles.oamsLogo} />
            </View>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.updated}>{LAST_UPDATED}</Text>
          </View>

          <View>
            {INTRO.map((block, i) => renderBlock(block, `intro-${i}`))}

            {SECTIONS.map((section) => (
              <View key={section.heading}>
                <Text style={styles.heading}>{section.heading}</Text>
                {section.blocks.map((block, i) => renderBlock(block, `${section.heading}-${i}`))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type ThemePalette = {
  gradient: readonly [string, string, ...string[]];
  cardBg: string;
  cardBorder: string;
  text: string;
  body: string;
  subtext: string;
  accent: string;
};

const darkPalette: ThemePalette = {
  gradient: ['#0a0f0a', '#0f1f13', '#0a0f0a'],
  cardBg: 'rgba(17, 26, 17, 0.95)',
  cardBorder: 'rgba(34, 197, 94, 0.2)',
  text: '#f0fdf4',
  body: '#cbd5e1',
  subtext: '#94a3b8',
  accent: '#86efac',
};

const lightPalette: ThemePalette = {
  gradient: ['#ffffff', '#eefcf1', '#ffffff'],
  cardBg: '#f9fafb',
  cardBorder: 'rgba(34, 197, 94, 0.15)',
  text: '#111827',
  body: '#1f2937',
  subtext: '#6b7280',
  accent: '#16a34a',
};

function createStyles(theme: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1 },
    safeArea: { flex: 1 },

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
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 48,
    },

    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      alignSelf: 'flex-start',
      marginBottom: 20,
    },
    backLinkText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.accent,
    },

    header: {
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(34, 197, 94, 0.15)',
    },
    logosRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    pncLogo: { height: 44, width: 44 },
    oamsLogo: { height: 44, width: 90 },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
    },
    updated: {
      fontSize: 12,
      color: theme.subtext,
      marginTop: 4,
    },

    heading: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginTop: 24,
      marginBottom: 10,
    },
    // Justified to match the web page. RN supports 'justify' on iOS and on
    // Android API 26+; older Android quietly falls back to left-aligned,
    // which is an acceptable degradation for a text-only screen.
    paragraph: {
      fontSize: 14,
      lineHeight: 23,
      color: theme.body,
      textAlign: 'justify',
      marginBottom: 12,
    },
    list: {
      gap: 8,
      marginBottom: 12,
    },
    listItem: {
      flexDirection: 'row',
      paddingLeft: 4,
    },
    bullet: {
      fontSize: 14,
      lineHeight: 23,
      color: theme.body,
      width: 16,
    },
    listItemText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 23,
      color: theme.body,
      textAlign: 'justify',
    },
    strong: {
      fontWeight: '700',
      color: theme.accent,
    },
  });
}
