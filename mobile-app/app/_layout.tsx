import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

// Empêche la splash screen de se cacher automatiquement avant le chargement des ressources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // S'assure que le rechargement (reload) revient toujours sur les onglets
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // Chargement des polices (Optionnel, mais recommandé pour le look industriel)
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFF',
        },
        headerTintColor: colorScheme === 'dark' ? '#FFF' : '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
        {/* L'écran principal contenant les onglets */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />
        
        {/* Configuration de la modale de détails si nécessaire */}
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal', 
            title: 'Détails de l\'offre',
            headerTitle: 'Informations' 
          }} 
        />
      </Stack>
      
      {/* Barre d'état adaptative (heure, batterie, etc.) */}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}