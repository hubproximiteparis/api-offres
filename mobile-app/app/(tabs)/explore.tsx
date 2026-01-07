import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInRight, LinearTransition } from 'react-native-reanimated';
import { jobService, Offre } from '../../services/api';

/**
 * ExploreScreen - Version Industrielle
 * Incorpore : Sélection multiple, Feedback Haptique visuel, et Robustesse API
 */
export default function ExploreScreen() {
  const [favoris, setFavoris] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const isDark = useColorScheme() === 'dark';

  useFocusEffect(
    useCallback(() => {
      chargerFavoris();
    }, [])
  );

  const chargerFavoris = async () => {
    setLoading(true);
    try {
      const data = await jobService.getFavoris();
      setFavoris(data);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les favoris.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const supprimerSelection = () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      "Confirmation",
      `Supprimer ${selectedIds.length} favoris ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: async () => {
            const success = await jobService.removeMultipleFavoris(selectedIds);
            if (success) {
              setFavoris(prev => prev.filter(item => !selectedIds.includes(item.id)));
              setSelectedIds([]);
              setIsEditMode(false);
            } else {
              Alert.alert("Erreur", "La suppression a échoué.");
            }
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View>
          <Text style={[styles.title, isDark && styles.textDark]}>Explorer ⭐</Text>
          <Text style={styles.subtitle}>{favoris.length} enregistrements</Text>
        </View>
        
        {favoris.length > 0 && (
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => { setIsEditMode(!isEditMode); setSelectedIds([]); }}
          >
            <Text style={styles.editBtnText}>{isEditMode ? "Terminer" : "Modifier"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && favoris.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <Animated.FlatList
          data={favoris}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          itemLayoutAnimation={LinearTransition.springify()}
          ListEmptyComponent={<Text style={styles.empty}>Aucun favori trouvé.</Text>}
          renderItem={({ item, index }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <Animated.View entering={FadeInRight.delay(index * 50)}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onLongPress={() => setIsEditMode(true)}
                  onPress={() => isEditMode ? toggleSelect(item.id) : Linking.openURL(item.link)}
                  style={[
                    styles.card, 
                    isDark && styles.cardDark,
                    isSelected && styles.cardSelected
                  ]}
                >
                  {isEditMode && (
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                    </View>
                  )}
                  
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, isDark && styles.textDark]}>{item.name}</Text>
                    <Text style={styles.cardCity}>📍 {item.city}</Text>
                  </View>

                  {!isEditMode && (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      )}

      {isEditMode && selectedIds.length > 0 && (
        <TouchableOpacity style={styles.deleteBar} onPress={supprimerSelection}>
          <Text style={styles.deleteBarText}>Supprimer ({selectedIds.length})</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  containerDark: { backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  headerDark: { backgroundColor: '#1E1E1E', borderColor: '#333' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#6C757D' },
  textDark: { color: '#FFF' },
  editBtn: { backgroundColor: '#E9ECEF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  editBtnText: { color: '#007AFF', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 40, color: '#6C757D' },
  card: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2 
  },
  cardDark: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333' },
  cardSelected: { borderColor: '#007AFF', borderWidth: 1.5, backgroundColor: '#F0F7FF' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#212529', marginBottom: 4 },
  cardCity: { fontSize: 13, color: '#6C757D' },
  chevron: { fontSize: 24, color: '#CCC', marginLeft: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#007AFF', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#007AFF' },
  checkIcon: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  deleteBar: { 
    position: 'absolute', 
    bottom: 30, 
    left: 20, 
    right: 20, 
    backgroundColor: '#FF3B30', 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  deleteBarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});