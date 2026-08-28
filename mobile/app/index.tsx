import { StyleSheet, Text, View } from 'react-native';

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>CIVIA</Text>
      <Text style={styles.subtitle}>
        Gestión inteligente de reportes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FB',
    paddingHorizontal: 24,
  },
  brand: {
    fontSize: 42,
    fontWeight: '700',
    color: '#17365D',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: '#667085',
    textAlign: 'center',
  },
});
