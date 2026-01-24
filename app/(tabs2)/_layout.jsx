import React from 'react'
import { Stack } from 'expo-router'

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="orderScreen" options={{ headerShown: false }} />
      <Stack.Screen name="themeChange" options={{ headerShown: false }} />
      <Stack.Screen name="more" options={{ headerShown: false }} />
      <Stack.Screen name="accountSettings" options={{ headerShown: false }} />
      <Stack.Screen name="deposit" options={{ headerShown: false }} />
      <Stack.Screen name="withdrawal" options={{ headerShown: false }} />
      <Stack.Screen name="internalTransfer" options={{ headerShown: false }} />
    </Stack>
  )
}