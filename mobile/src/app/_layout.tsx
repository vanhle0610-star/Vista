import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/AppProviders';
export default function RootLayout() { return <AppProviders><Stack><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="(auth)/login" options={{ title: 'Đăng nhập' }} /><Stack.Screen name="(auth)/register" options={{ title: 'Đăng ký' }} /><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="showcase" options={{ title: 'Thư viện UI' }} /></Stack><StatusBar style="dark" /></AppProviders>; }
