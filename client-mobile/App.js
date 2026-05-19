import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import axios from "axios";

// IMPORTANT: Replace with your computer's local IP, not localhost
const API = "http://192.168.100.2:5000/api";

export default function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = async () => {
    try {
      const res = await axios.get(`${API}/counter`);
      setCount(res.data.count);
    } catch (err) {
      Alert.alert("Connection Error", "Cannot reach server");
    }
  };

  const handleTap = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/counter/tap`);
      setCount(res.data.count);
    } catch (err) {
      Alert.alert("Error", "Failed to increment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OAMS Mobile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Current Number</Text>
        <Text style={styles.value}>{count}</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleTap}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Processing..." : "Tap to Increment"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        This app shares the same backend as the web version.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a252f",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 32,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  value: {
    fontSize: 64,
    fontWeight: "700",
    color: "#2563eb",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  disabled: {
    backgroundColor: "#93c5fd",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
});
