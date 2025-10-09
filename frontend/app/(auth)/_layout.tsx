(function () {
	// This file intentionally left as a module to be updated by the layout export below
})();

import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
	// Disable the native header for all screens in this group
	return <Stack screenOptions={{ headerShown: false }} />;
}

