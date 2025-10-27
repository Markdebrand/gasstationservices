import React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './components/Header';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';

type Message = { id: string; text: string; from: 'user' | 'agent'; ts?: number };

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([
    { id: 'm1', text: 'Hello! ¿How can we help you today?', from: 'agent', ts: Date.now() - 60000 },
  ]);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const send = () => {
    if (!text.trim()) return;
    const m: Message = { id: String(Date.now()), text: text.trim(), from: 'user', ts: Date.now() };
    setMessages((s) => [...s, m]);
    setText('');
    // simulate agent reply
    setTimeout(() => {
      setMessages((s) => [...s, { id: `r-${Date.now()}`, text: 'Thank you, we will respond shortly.', from: 'agent', ts: Date.now() }]);
    }, 900);
  };

  return (
    <View style={styles.root}>
      <Header showBack />
      <Text style={styles.pageTitle}>Support</Text>

      <FlatList
        data={messages}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.chatContainer, { paddingBottom: 12 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.from === 'user' ? styles.bubbleRowUser : styles.bubbleRowAgent]}>
            {item.from === 'agent' && <View style={styles.agentAvatar}><Ionicons name="person" size={16} color={Colors.light.tint} /></View>}
            <View style={[styles.bubble, item.from === 'user' ? styles.bubbleUser : styles.bubbleAgent]}>
              <Text style={[styles.bubbleText, item.from === 'user' ? styles.bubbleTextUser : styles.bubbleTextAgent]}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12), marginBottom: keyboardHeight } ]}> 
          <TextInput value={text} onChangeText={setText} placeholder="Escribe un mensaje..." placeholderTextColor={Colors.light.muted} style={styles.input} />
          <Pressable onPress={send} style={styles.sendBtn}>
            <Ionicons name="paper-plane" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background, padding: 16 },
  chatContainer: { paddingTop: 8, paddingBottom: 8 },

  pageTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text, marginTop: 8, marginBottom: 6 },
  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubbleRowAgent: { justifyContent: 'flex-start' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  agentAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.light.subtleBg, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 12 },
  bubbleAgent: { backgroundColor: Colors.light.subtleBg, borderTopLeftRadius: 6, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  bubbleUser: { backgroundColor: Colors.light.tint, borderTopLeftRadius: 12, borderTopRightRadius: 6, borderBottomLeftRadius: 12 },
  bubbleText: { fontSize: 14 },
  bubbleTextAgent: { color: Colors.light.text },
  bubbleTextUser: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: Colors.light.cardBorder, backgroundColor: Colors.light.background },
  input: { flex: 1, height: 44, borderRadius: 999, paddingHorizontal: 12, backgroundColor: Colors.light.subtleBg, color: Colors.light.text },
  sendBtn: { marginLeft: 8, width: 44, height: 44, borderRadius: 999, backgroundColor: Colors.light.tint, alignItems: 'center', justifyContent: 'center' },
});
