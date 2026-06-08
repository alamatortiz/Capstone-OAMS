import React from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

// Mock Screens (replace with your actual screens)
const LoginScreen = () => (
  <View style={styles.container}>
    <Text>Login Screen</Text>
  </View>
);
const StudentDashboardScreen = () => (
  <View style={styles.container}>
    <Text>Student Dashboard</Text>
  </View>
);
const FacultyDashboardScreen = () => (
  <View style={styles.container}>
    <Text>Faculty Dashboard</Text>
  </View>
);
const AdminDashboardScreen = () => (
  <View style={styles.container}>
    <Text>Admin Dashboard</Text>
  </View>
);

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading user session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Tab.Navigator>
          {user?.role === "student" && (
            <Tab.Screen name="Student" component={StudentDashboardScreen} />
          )}
          {user?.role === "faculty" && (
            <Tab.Screen name="Faculty" component={FacultyDashboardScreen} />
          )}
          {user?.role === "admin" && (
            <Tab.Screen name="Admin" component={AdminDashboardScreen} />
          )}
          {/* Add more common tabs or a default if no role-specific screen is found */}
        </Tab.Navigator>
      ) : (
        <AuthStack.Navigator>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  // You might need to adjust or remove these styles if they conflict with new components
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  card: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    color: "#555",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: "#777",
  },
});
