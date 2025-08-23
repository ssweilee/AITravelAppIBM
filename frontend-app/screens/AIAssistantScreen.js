// AIAssistantScreen.js
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';

/* ---------------- Token helpers ---------------- */
async function getAuthToken() {
  const keys = ['auth_token','token','access_token','accessToken','jwt','userToken','id_token'];
  for (const k of keys) {
    const raw = await AsyncStorage.getItem(k);
    const t = normalizeToken(raw);
    if (t) return t;
  }
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(allKeys);
    for (const [, value] of pairs) {
      const t = normalizeToken(value);
      if (t) return t;
    }
  } catch {}
  return null;
}
function normalizeToken(raw) {
  if (!raw) return null;
  let v = String(raw).trim();
  try {
    if (v.startsWith('{') && v.endsWith('}')) {
      const o = JSON.parse(v);
      v = o.token || o.access_token || o.accessToken || o.jwt || o.id_token || o.value || '';
    }
  } catch {}
  v = v.replace(/^"+|"+$/g, '');
  v = v.replace(/^Bearer\s+/i, '');
  return v || null;
}

/* ---------------- Itinerary helpers ---------------- */
function normalizeItinerary(it) {
  if (!it || typeof it !== 'object') return null;
  const title = it.title || 'Trip';
  const description = it.description || '';
  const destination = it.destination || '';
  let days = Array.isArray(it.days) ? it.days : [];
  if (days.length === 0) {
    days = [{ notes: '', activities: [{ description: `Explore ${destination || 'destination'}`, location: destination }] }];
  } else {
    days = days.map(d => ({
      notes: d?.notes || '',
      activities: Array.isArray(d?.activities) && d.activities.length > 0
        ? d.activities.map(a => ({
            description: a?.description || `Activity in ${destination || 'destination'}`,
            location: a?.location || destination
          }))
        : [{ description: `Explore ${destination || 'destination'}`, location: destination }]
    }));
  }
  return { title, description, destination, days };
}
function parseItineraryIfJSON(maybeJSON) {
  try {
    const obj = JSON.parse(String(maybeJSON));
    if (obj && typeof obj === 'object' && Array.isArray(obj.days)) {
      return normalizeItinerary(obj);
    }
  } catch {}
  return null;
}

/* ---------------- Minimal sanitizer (keeps Markdown!) ---------------- */
function softSanitizeForMarkdown(text) {
  if (!text) return '';
  let out = String(text).replace(/\r/g, '');

  // Remove leading role/label lines
  out = out.replace(/^\s*Assistant\s*:\s*/i, '');
  out = out.replace(/^\s*(Answer|Response|Reply)\s*:\s*/i, '');

  // If a later role label appears (rare), cut at it
  const roleIdx = out.search(/[\n\r]+(?:User|Assistant|System)\s*:/i);
  if (roleIdx !== -1) out = out.slice(0, roleIdx);

  // Keep Markdown intact: no stripping of **, _, ``` etc.
  return out.trim();
}

/* ---------------- UI subcomponents ---------------- */
const AIMessageInput = React.memo(({ input, setInput, loading, onSend }) => (
  <View style={styles.inputContainer}>
    <TextInput
      style={styles.input}
      value={input}
      onChangeText={setInput}
      placeholder="Ask me anything about travel..."
      multiline
      maxLength={500}
      textAlignVertical="top"
      returnKeyType="default"
      blurOnSubmit={false}
    />
    <TouchableOpacity
      style={[styles.sendButton, (loading) && styles.sendButtonDisabled]}
      onPress={onSend}
      disabled={loading}
    >
      <Text style={styles.sendButtonText}>Send</Text>
    </TouchableOpacity>
  </View>
));

const ItineraryCard = React.memo(({ itinerary, onImport }) => {
  const daysCount = itinerary?.days?.length || 0;
  return (
    <View style={styles.itinCard}>
      <View style={styles.itinHeader}>
        <Text style={styles.itinTitle} numberOfLines={1}>
          {itinerary.title || (itinerary.destination ? `Trip to ${itinerary.destination}` : 'Trip')}
        </Text>
        {itinerary.destination ? (
          <Text style={styles.itinSubtitle} numberOfLines={1}>
            {itinerary.destination} • {daysCount} {daysCount === 1 ? 'day' : 'days'}
          </Text>
        ) : (
          <Text style={styles.itinSubtitle} numberOfLines={1}>
            {daysCount} {daysCount === 1 ? 'day' : 'days'}
          </Text>
        )}
      </View>

      {itinerary.description ? (
        <Text style={styles.itinDesc} numberOfLines={3}>{itinerary.description}</Text>
      ) : null}

      <TouchableOpacity style={styles.itinBtn} onPress={onImport}>
        <Text style={styles.itinBtnText}>Import Itinerary</Text>
      </TouchableOpacity>
    </View>
  );
});

const MessageBubble = React.memo(({ item, onImportItinerary }) => {
  const itinerary = parseItineraryIfJSON(item.content);

  // If this assistant message contains itinerary JSON, render the fixed card inside the bubble
  if (item.role === 'assistant' && itinerary) {
    return (
      <View style={[styles.bubble, styles.assistant]}>
        <ItineraryCard
          itinerary={itinerary}
          onImport={() => onImportItinerary(itinerary)}
        />
      </View>
    );
  }

  // Otherwise render Markdown (both user & assistant look nice)
  const colorStyle = item.role === 'user' ? styles.user : styles.assistant;
  const textColor = item.role === 'user' ? styles.userText : null;
  const content = softSanitizeForMarkdown(item.content);

  return (
    <View style={[styles.bubble, colorStyle, { padding: 10 }]}>
      {/* Wrap Markdown so long code blocks can't overflow */}
      <Markdown
        style={markdownStyles(item.role === 'user')}
        onLinkPress={(url) => { Linking.openURL(url).catch(() => {}); return false; }}
      >
        {content}
      </Markdown>
    </View>
  );
});

/* ---------------- Main screen ---------------- */
export default function AIAssistantScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your travel AI assistant. How can I help you today?', _id: `seed-${Date.now()}` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);        // chat send in-flight
  const [creating, setCreating] = useState(false);      // new chat in-flight
  const [sessionId, setSessionId] = useState(null);

  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Restore previous sessionId
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('travel_ai_session_id');
      if (stored) setSessionId(stored);
    })();
  }, []);

  // Load messages for current session (so embedded itinerary cards persist)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionId) return;
      const token = await getAuthToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/sessions/${sessionId}`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.messages?.length) {
          const restored = data.messages.map((m, i) => ({
            role: m.role,
            content: m.content,
            _id: m._id || `m-${i}-${Date.now()}`
          }));
          setMessages([{ role: 'assistant', content: 'Resuming your chat.', _id: `resume-${Date.now()}` }, ...restored]);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  /* -------- New chat only -------- */
  const doNewChat = useCallback(async () => {
    if (creating || loading) return;
    setCreating(true);
    try {
      const token = await getAuthToken();
      if (!token) { Alert.alert('Not signed in', 'Please sign in.'); setCreating(false); return; }
      const res = await fetch(`${API_BASE_URL}/api/ai/sessions/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create session');
      setSessionId(data.sessionId);
      AsyncStorage.setItem('travel_ai_session_id', data.sessionId).catch(() => {});
      setMessages([{ role: 'assistant', content: 'New chat started. How can I help?', _id: `seed-${Date.now()}` }]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not start a new chat.');
    } finally {
      setCreating(false);
    }
  }, [creating, loading]);

  /* ---------------- Itinerary import ---------------- */
  const handleImportItinerary = useCallback((itinerary) => {
    if (!itinerary) {
      Alert.alert('No itinerary', 'Ask for an itinerary first (e.g., "Plan a 3-day trip to Rome").');
      return;
    }
    navigation.navigate('CreateItinerary', { aiItinerary: itinerary });
  }, [navigation]);

  /* ---------------- Send message ---------------- */
  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || creating) return;

    const userMessage = input.trim();
    const uMsg = { role: 'user', content: userMessage, _id: `u-${Date.now()}` };
    const optimistic = [...messages, uMsg];
    setMessages(optimistic);
    setInput('');
    setLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        setMessages(prev => [
          ...optimistic,
          { role: 'assistant', content: 'You need to be logged in to chat. Please sign in and try again.', _id: `err-${Date.now()}` }
        ]);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sessionId, message: userMessage })
      });

      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        setMessages(prev => [
          ...optimistic,
          { role: 'assistant', content: 'Your session has expired. Please sign in again.', _id: `exp-${Date.now()}` }
        ]);
        return;
      }
      if (!res.ok) {
        setMessages(prev => [...optimistic, { role: 'assistant', content: data?.error || 'AI error', _id: `err-${Date.now()}` }]);
        return;
      }

      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
        AsyncStorage.setItem('travel_ai_session_id', data.sessionId).catch(() => {});
      }

      let aiReply = data.reply || 'Sorry, I could not process that.';

      if (data.expectingItinerary) {
        try {
          const parsed = JSON.parse(aiReply);
          if (parsed && data.itineraryValid) {
            const displayMsg = {
              role: 'assistant',
              content: JSON.stringify(parsed), // store JSON string; renderer shows embedded card
              _id: `itin-${Date.now()}`
            };
            setMessages(prev => [...optimistic, displayMsg]);
            return;
          }
        } catch {}
        setMessages(prev => [...optimistic, { role: 'assistant', content: 'I tried to generate an itinerary but the format wasn’t valid. Please try again.', _id: `bad-${Date.now()}` }]);
      } else {
        // Keep Markdown intact
        aiReply = softSanitizeForMarkdown(aiReply);
        setMessages(prev => [...optimistic, { role: 'assistant', content: aiReply, _id: `a-${Date.now()}` }]);
      }
    } catch (err) {
      setMessages(prev => [...optimistic, { role: 'assistant', content: 'Error contacting AI.', _id: `net-${Date.now()}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, sessionId, loading, creating]);

  /* ---------------- List renderers ---------------- */
  const renderMessage = useCallback(
    ({ item }) => <MessageBubble item={item} onImportItinerary={handleImportItinerary} />,
    [handleImportItinerary]
  );
  const keyExtractor = useCallback((item, index) => item._id || `msg-${index}-${String(item.content).slice(0, 10)}`, []);

  const ListHeader = useMemo(() => (
    <View style={styles.toolbar}>
      <TouchableOpacity
        style={[styles.toolbarBtn, (creating || loading) && styles.toolbarBtnDisabled]}
        onPress={doNewChat}
        disabled={creating || loading}
      >
        <Text style={styles.toolbarBtnText}>New Chat</Text>
      </TouchableOpacity>
    </View>
  ), [doNewChat, creating, loading]);

  const ListFooter = useMemo(() => (
    <View>
      {(loading || creating) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#00C7BE" />
        </View>
      )}
    </View>
  ), [loading, creating]);

  /* ---------------- Render ---------------- */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 64) : 84}
    >
      <View style={{ flex: 1, flexDirection: 'column' }}>
        <KeyboardAwareFlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 10, paddingBottom: 16, flexGrow: 1 }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          extraHeight={0}
          enableOnAndroid
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardOpeningTime={0}
          removeClippedSubviews={false}
          windowSize={10}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
        />
        <View style={{ backgroundColor: '#fff', paddingBottom: insets.bottom }}>
          <AIMessageInput input={input} setInput={setInput} loading={loading || creating} onSend={sendMessage} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------------- Markdown theme ---------------- */
const markdownStyles = (isUser) => ({
  body: {
    color: isUser ? '#fff' : '#333',
    fontSize: 16,
    lineHeight: 22,
  },
  bullet_list: { marginTop: 4, marginBottom: 4 },
  ordered_list: { marginTop: 4, marginBottom: 4 },
  list_item: { marginVertical: 2 },
  strong: { color: isUser ? '#fff' : '#0B4F4B' }, // bold
  em: { fontStyle: 'italic' },
  link: { color: isUser ? '#fff' : '#007A74', textDecorationLine: 'underline' },
  code_inline: {
    backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : '#F4F6F6',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  fence: {
    backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : '#F4F6F6',
    padding: 8,
    borderRadius: 8,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  heading1: { color: isUser ? '#fff' : '#0B4F4B', fontSize: 20, marginVertical: 4 },
  heading2: { color: isUser ? '#fff' : '#0B4F4B', fontSize: 18, marginVertical: 4 },
  heading3: { color: isUser ? '#fff' : '#0B4F4B', fontSize: 17, marginVertical: 4 },
});

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  toolbarBtn: {
    backgroundColor: '#E6F7F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00C7BE',
  },
  toolbarBtnDisabled: { opacity: 0.6 },
  toolbarBtnText: { color: '#007A74', fontWeight: '700' },

  bubble: { marginBottom: 12, borderRadius: 16, maxWidth: '80%' },
  user: { alignSelf: 'flex-end', backgroundColor: '#00C7BE' },
  assistant: { alignSelf: 'flex-start', backgroundColor: '#eee' },
  text: { fontSize: 16, color: '#333' },
  userText: { color: '#fff' },

  // Embedded itinerary card – app-styled, fixed to its message
  itinCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00C7BE',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itinHeader: { marginBottom: 6 },
  itinTitle: { color: '#007A74', fontSize: 16, fontWeight: '700' },
  itinSubtitle: { color: '#4A6765', fontSize: 13, marginTop: 2 },
  itinDesc: { color: '#444', fontSize: 14, marginVertical: 8 },
  itinBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#00C7BE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  itinBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  loadingContainer: { alignItems: 'center', marginVertical: 8 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    maxHeight: 120,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#00C7BE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});