import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="two" 
        options={{
          title: 'Favoris',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 24 }}>⭐</Text>
          ),
        }}
      />

      {/* AJOUTEZ CECI POUR MASQUER L'ONGLET EXPLORE S'IL EXISTE ENCORE */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Cette ligne cache l'onglet de la barre de navigation
        }}
      />
    </Tabs>
  );
}