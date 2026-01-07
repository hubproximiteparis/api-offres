import React, { useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  FlatList, Linking, ActivityIndicator, Alert, Keyboard,
  Platform, Share, useColorScheme, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { jobService, Offre, Suggestion } from '../../services/api';

/**
 * COMPOSANT CARTE - MÉMOÏSÉ POUR LA PERFORMANCE
 * Utilise React.memo pour éviter des re-rendus inutiles lors de la frappe clavier
 */
const OffreCard = React.memo(({ item, index, onAddFavori, isDark }: { 
  item: Offre, 
  index: number, 
  onAddFavori: (o: Offre) => void,
  isDark: boolean 
}) => {
  
  const partagerOffre = async () => {
    try {
      await Share.share({
        message: `🔍 Job trouvé : ${item.name} (${item.city})\nPostuler ici : ${item.link}`,
        title: "Partage d'opportunité",
      });
    } catch (err) {
      console.warn("Erreur partage:", err);
    }
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 40).duration(300)} 
      layout={Layout.springify()}
      style={[styles.card, isDark && styles.cardDark]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.cardCity, isDark && styles.textSecondaryDark]}>📍 {item.city}</Text>
        
        {item.typeContrat && (
          <View style={[styles.badge, isDark && styles.badgeDark]}>
            <Text style={styles.badgeText}>{item.typeContrat}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.viewBtn} 
          activeOpacity={0.7}
          onPress={() => Linking.openURL(item.link)}
        >
          <Text style={styles.viewBtnText}>Voir</Text>
        </TouchableOpacity>
        
        <View style={styles.iconActions}>
          <TouchableOpacity onPress={() => onAddFavori(item)} hitSlop={15}>
            <Text style={styles.iconBtn}>⭐</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={partagerOffre} hitSlop={15}>
            <Text style={styles.iconBtn}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

export default function HomeScreen() {
  const isDark = useColorScheme() === 'dark';

  // --- ÉTATS ---
  const [metier, setMetier] = useState('');
  const [ville, setVille] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedVilleCode, setSelectedVilleCode] = useState('');
  const [selectedContrats, setSelectedContrats] = useState<string[]>([]);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchingGéo, setIsSearchingGéo] = useState(false);

  // --- LOGIQUE GÉO ---
  const handleVilleChange = async (text: string) => {
    setVille(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearchingGéo(true);
    const results = await jobService.getSuggestions(text);
    setSuggestions(results);
    setIsSearchingGéo(false);
  };

  const selectionnerSuggestion = (item: Suggestion) => {
    setVille(item.label);
    setSelectedVilleCode(item.value);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  // --- FILTRES ---
  const toggleContrat = useCallback((type: string) => {
    setSelectedContrats(prev => 
      prev.includes(type) ? prev.filter(c => c !== type) : [...prev, type]
    );
  }, []);

  // --- RECHERCHE ---
  const rechercherOffres = async () => {
    if (!metier.trim()) {
      Alert.alert("Attention", "Veuillez indiquer un métier pour lancer la recherche.");
      return;
    }
    
    setLoading(true);
    Keyboard.dismiss();
    
    try {
      const localisation = selectedVilleCode || ville;
      const data = await jobService.search(metier, localisation, selectedContrats);
      setOffres(data);
    } catch (error) {
      Alert.alert("Erreur Réseau", "Impossible de contacter le serveur Hub Emploi.");
    } finally {
      setLoading(false);
    }
  };

  const ajouterFavori = async (offre: Offre) => {
    const success = await jobService.addFavori(offre);
    if (success) {
      // Feedback haptique visuel simple via Toast ou Alert
      Alert.alert("Favoris", "L'offre a été sauvegardée.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      
      {/* SECTION RECHERCHE FIXE */}
      <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>Hub Emploi</Text>
        
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Quel métier ?"
          placeholderTextColor={isDark ? '#666' : '#999'}
          value={metier}
          onChangeText={setMetier}
          returnKeyType="search"
          onSubmitEditing={rechercherOffres}
        />
        
        <View style={{ zIndex: 10 }}>
          <View style={[styles.inputWithIcon, isDark && styles.inputDark]}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: 'transparent' }]}
              placeholder="Localisation (Ville ou Dépt)..."
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={ville}
              onChangeText={handleVilleChange}
            />
            {isSearchingGéo && <ActivityIndicator size="small" color="#007AFF" style={{marginRight: 10}} />}
          </View>
          
          {suggestions.length > 0 && (
            <Animated.View entering={FadeInUp} style={[styles.suggestionsList, isDark && styles.suggestionsDark]}>
              {suggestions.map((item, index) => (
                <TouchableOpacity 
                  key={`${item.value}-${index}`} 
                  style={styles.suggestionItem} 
                  onPress={() => selectionnerSuggestion(item)}
                >
                  <Text style={[styles.suggestionText, isDark && styles.textDark]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </View>

        {/* FILTRES DE CONTRAT */}
        <View style={styles.filterRow}>
          {['CDI', 'CDD', 'MIS'].map((type) => {
            const isActive = selectedContrats.includes(type);
            return (
              <TouchableOpacity 
                key={type}
                activeOpacity={0.8}
                style={[styles.chip, isDark && styles.chipDark, isActive && styles.chipActive]}
                onPress={() => toggleContrat(type)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive, isDark && !isActive && styles.textDark]}>
                  {type === 'MIS' ? 'Intérim' : type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.searchBtn, loading && styles.btnDisabled]} 
          onPress={rechercherOffres} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchBtnText}>Trouver des opportunités</Text>}
        </TouchableOpacity>
      </View>

      {/* LISTE DE RÉSULTATS */}
      <FlatList
        data={offres}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <OffreCard item={item} index={index} onAddFavori={ajouterFavori} isDark={isDark} />
        )}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>Commencez votre recherche pour voir les offres</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  containerDark: { backgroundColor: '#121212' },
  searchBox: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#E9ECEF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  searchBoxDark: { backgroundColor: '#1E1E1E', borderColor: '#333' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', marginBottom: 15 },
  textDark: { color: '#FFF' },
  textSecondaryDark: { color: '#AAA' },
  input: { backgroundColor: '#F1F3F5', padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 16 },
  inputDark: { backgroundColor: '#2C2C2C', color: '#FFF' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F5', borderRadius: 12, marginBottom: 12 },
  suggestionsList: { 
    position: 'absolute', 
    top: 55, 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    elevation: 10, 
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#eee'
  },
  suggestionsDark: { backgroundColor: '#2C2C2C', borderColor: '#444' },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
  suggestionText: { color: '#333', fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DEE2E6' },
  chipDark: { backgroundColor: '#2C2C2C', borderColor: '#444' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#495057', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  searchBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 5 },
  btnDisabled: { opacity: 0.7 },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  listContent: { padding: 15, paddingBottom: 40 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 15, flexDirection: 'row', elevation: 2 },
  cardDark: { backgroundColor: '#1E1E1E', elevation: 0, borderWidth: 1, borderColor: '#333' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#212529', marginBottom: 6, lineHeight: 22 },
  cardCity: { fontSize: 14, color: '#6C757D', marginBottom: 12 },
  badge: { backgroundColor: '#E7F5FF', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeDark: { backgroundColor: '#004A77' },
  badgeText: { color: '#228BE6', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  cardActions: { alignItems: 'center', justifyContent: 'space-between', marginLeft: 15 },
  viewBtn: { backgroundColor: '#212529', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 },
  viewBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  iconActions: { flexDirection: 'row', gap: 18, marginTop: 15 },
  iconBtn: { fontSize: 22 },
  emptyText: { textAlign: 'center', marginTop: 80, color: '#ADB5BD', fontSize: 15, fontStyle: 'italic' }
});