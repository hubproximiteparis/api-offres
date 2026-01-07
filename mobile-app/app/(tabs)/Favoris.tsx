import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInRight, LinearTransition } from 'react-native-reanimated';
import { jobService, Offre } from '../../services/api';

/**
 * FavorisScreen - Standard Industriel
 * Optimisations : Suppression groupée, feedback haptique visuel, gestion d'état atomique.
 */
export default function FavorisScreen() {
  const [favoris, setFavoris] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const isDark = useColorScheme() === 'dark';

  // Chargement des données à chaque focus sur l'écran
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const load = async () => {
        setLoading(true);
        try {
          const data = await jobService.getFavoris();
          if (isMounted) setFavoris(data);
        } catch (e) {
          Alert.alert("Erreur", "Impossible de synchroniser les favoris.");
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      load();
      return () => { isMounted = false; };
    }, [])
  );

  // Gestion de la sélection multiple
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Suppression groupée (API optimisée)
  const executerSuppression = () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      "Confirmation",
      `Voulez-vous supprimer ces ${selectedIds.length} favoris ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: async () => {
            const success = await jobService.removeMultipleFavoris(selectedIds);
            if (success) {
              setFavoris(prev => prev.filter(f => !selectedIds.includes(f.id)));
              setSelectedIds([]);
              setIsEditMode(false);
            } else {
              Alert.alert("Erreur", "Le serveur n'a pas pu traiter la demande.");
            }
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* HEADER PROFESSIONNEL */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, isDark && styles.textDark]}>Mes Favoris</Text>
          <Text style={styles.countText}>{favoris.length} offre(s) enregistrée(s)</Text>
        </View>
        
        {favoris.length > 0 && (
          <TouchableOpacity 
            style={[styles.editBtn, isEditMode && styles.editBtnActive]} 
            onPress={() => { setIsEditMode(!isEditMode); setSelectedIds([]); }}
          >
            <Text style={[styles.editBtnText, isEditMode && styles.textWhite]}>
              {isEditMode ? "Annuler" : "Modifier"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LISTE ANIMÉE */}
      {loading && favoris.length === 0 ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        <Animated.FlatList
          data={favoris}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          itemLayoutAnimation={LinearTransition.springify()} 
          ListEmptyComponent={
            <Text style={styles.emptyText}>Votre liste est vide pour le moment.</Text>
          }
          renderItem={({ item, index }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <Animated.View 
                entering={FadeInRight.delay(index * 30)}
                layout={LinearTransition.springify()}
              >
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => isEditMode ? toggleSelection(item.id) : null}
                  style={[
                    styles.card, 
                    isDark && styles.cardDark,
                    isSelected && styles.cardSelected
                  ]}
                >
                  {isEditMode && (
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  )}
                  
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, isDark && styles.textDark]}>{item.name}</Text>
                    <Text style={[styles.cardCity, isDark && styles.textSecondaryDark]}>📍 {item.city}</Text>
                  </View>
                  
                  {!isEditMode && (
                    <TouchableOpacity 
                      onPress={() => { toggleSelection(item.id); setIsEditMode(true); }}
                      hitSlop={15}
                    >
                      <Text style={{ fontSize: 18, color: '#CCC' }}>⋮</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      )}

      {/* BARRE DE SUPPRESSION FLOTTANTE */}
      {isEditMode && selectedIds.length > 0 && (
        <Animated.View entering={FadeInRight} style={styles.deleteBar}>
          <TouchableOpacity style={styles.deleteBtn} onPress={executerSuppression}>
            <Text style={styles.deleteBtnText}>Supprimer la sélection ({selectedIds.length})</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  containerDark: { backgroundColor: '#121212' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15 
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
  countText: { fontSize: 13, color: '#666' },
  textDark: { color: '#FFF' },
  textWhite: { color: '#FFF' },
  textSecondaryDark: { color: '#AAA' },
  editBtn: { backgroundColor: '#E9ECEF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  editBtnActive: { backgroundColor: '#666' },
  editBtnText: { color: '#007AFF', fontWeight: 'bold' },
  card: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardDark: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333' },
  cardSelected: { borderColor: '#007AFF', borderWidth: 2, backgroundColor: '#F0F7FF' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardCity: { color: '#666', fontSize: 13 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#007AFF', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#007AFF' },
  checkMark: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#999', fontSize: 16 },
  deleteBar: { 
    position: 'absolute', 
    bottom: 30, 
    left: 20, 
    right: 20,
    elevation: 10
  },
  deleteBtn: { 
    backgroundColor: '#FF3B30', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center',
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});