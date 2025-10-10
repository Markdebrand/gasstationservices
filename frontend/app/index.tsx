import React from 'react';
import { Redirect } from 'expo-router';

// Redirige al splash animado en el arranque
export default function Index() {
  return <Redirect href="/splash" />;
}
