import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

export default function OffreCard({ offre }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{offre.intitule}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{offre.code_rome}</Text>
      </View>
      
      <Text style={styles.description}>
        Poste basé à {offre.code_postal}. Consultez les détails du métier sur Métierscope.
      </Text>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => Linking.openURL(offre.url_metierscope)}
      >
        <Text style={styles.buttonText}>📊 Voir la fiche Métierscope</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  badge: { backgroundColor: '#e1f5fe', alignSelf: 'flex-start', padding: 4, borderRadius: 4, marginVertical: 8 },
  badgeText: { color: '#0288d1', fontWeight: 'bold', fontSize: 12 },
  description: { color: '#7f8c8d', marginBottom: 15 },
  button: { backgroundColor: '#007aff', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' }
});