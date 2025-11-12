import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import { sharedStyles } from '../styles';
import { marvinCurrencyConversion } from '../services/geminiService';
import { getPrompt, getCharacterForPromptType } from '../services/promptService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CurrencyConverterTool = ({
  savedNotes,
  setSavedNotes,
  setActiveTab,
  setRecordingViewMode,
  setTypedText,
  setNoteTitle,
  tags,
  setTags,
  aiTheme = 'h2g2'
}: {
  savedNotes: any[];
  setSavedNotes: (notes: any[]) => void;
  setActiveTab: (tab: string) => void;
  setRecordingViewMode: (mode: string) => void;
  setTypedText: (text: string) => void;
  setNoteTitle: (title: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  aiTheme?: string;
}) => {
  const [userInput, setUserInput] = useState('');
  const [marvinResponse, setMarvinResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userDefaultCurrency, setUserDefaultCurrency] = useState('USD'); // TODO: Load from settings
  const [currencyCharacter, setCurrencyCharacter] = useState<{ character?: string; avatar?: string }>({});

  // Load theme character for currency conversion when theme changes
  useEffect(() => {
    const loadCurrencyCharacter = async () => {
      try {
        const characterData = await getCharacterForPromptType(aiTheme, 'currencyConversion');
        setCurrencyCharacter(characterData);
        console.log('🎯 Loaded currency character:', characterData.character);
      } catch (error) {
        console.log('⚠️ Could not load currency character, using fallback');
        // Fallback to theme-specific defaults
        const fallbackCharacters: { [theme: string]: { character?: string; avatar?: string } } = {
          'h2g2': { character: 'Marvin', avatar: 'marvin.png' },
          'QT-GR': { character: 'Vincent', avatar: 'vincent.png' },
          'TP': { character: 'Vimes', avatar: 'vimes.png' }
        };
        setCurrencyCharacter(fallbackCharacters[aiTheme] || fallbackCharacters['h2g2']);
      }
    };
    loadCurrencyCharacter();
  }, [aiTheme]);

  const getCurrencyAvatar = () => {
    if (currencyCharacter.avatar?.startsWith('http')) {
      return { uri: currencyCharacter.avatar };
    }
    // Fallback mapping for local avatars
    const avatarMap: { [key: string]: any } = {
      'marvin.png': require('../public/icons/marvin.png'),
      'vincent.png': require('../public/icons/vincent.png'),
      'vimes.png': require('../public/icons/vimes.png'),
    };
    return avatarMap[currencyCharacter.avatar || 'marvin.png'] || require('../public/icons/marvin.png');
  };

  const getCurrencyTitle = () => {
    return `${currencyCharacter.character || 'Marvin'}'s Currency Converter`;
  };

  const getCurrencyGreeting = () => {
    const greetings: { [theme: string]: string } = {
      'h2g2': "I Suppose I'd Better Calculate That",
      'QT-GR': "Let's Make Some Money Moves",
      'TP': "Guards! Guards! The Money's Moving"
    };
    return greetings[aiTheme] || "I Suppose I'd Better Calculate That";
  };

  // Currency extraction logic
  const extractCurrencyInfo = (text: string) => {
    const lowerText = text.toLowerCase();

    // Extract amount (numbers)
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

    // Extract currencies
    let fromCurrency = null;
    let toCurrency = null;

    // Common currency codes and names
    const currencyMap: { [key: string]: string } = {
      'usd': 'USD', 'dollar': 'USD', 'dollars': 'USD', 'us dollar': 'USD', 'american dollar': 'USD',
      'eur': 'EUR', 'euro': 'EUR', 'euros': 'EUR',
      'gbp': 'GBP', 'pound': 'GBP', 'pounds': 'GBP', 'british pound': 'GBP', 'sterling': 'GBP',
      'jpy': 'JPY', 'yen': 'JPY', 'japanese yen': 'JPY',
      'cad': 'CAD', 'canadian dollar': 'CAD',
      'aud': 'AUD', 'australian dollar': 'AUD',
      'chf': 'CHF', 'franc': 'CHF', 'swiss franc': 'CHF',
      'cny': 'CNY', 'yuan': 'CNY', 'chinese yuan': 'CNY',
      'inr': 'INR', 'rupee': 'INR', 'rupees': 'INR', 'indian rupee': 'INR',
      'krw': 'KRW', 'won': 'KRW', 'korean won': 'KRW',
      'brl': 'BRL', 'real': 'BRL', 'brazilian real': 'BRL',
      'mxn': 'MXN', 'peso': 'MXN', 'mexican peso': 'MXN',
      'sgd': 'SGD', 'singapore dollar': 'SGD',
      'hkd': 'HKD', 'hong kong dollar': 'HKD',
      'thb': 'THB', 'baht': 'THB', 'thai baht': 'THB',
      'myr': 'MYR', 'ringgit': 'MYR', 'malaysian ringgit': 'MYR',
      'idr': 'IDR', 'rupiah': 'IDR', 'indonesian rupiah': 'IDR',
      'php': 'PHP', 'philippine peso': 'PHP',
      'vnd': 'VND', 'dong': 'VND', 'vietnamese dong': 'VND',
      'khr': 'KHR', 'riel': 'KHR', 'cambodian riel': 'KHR', 'cambodia riel': 'KHR', 'cambodia': 'KHR',
      'lak': 'LAK', 'kip': 'LAK', 'laotian kip': 'LAK', 'laos kip': 'LAK',
      'mmk': 'MMK', 'kyat': 'MMK', 'myanmar kyat': 'MMK'
    };

    // Country to currency mapping
    const countryCurrencyMap: { [key: string]: string } = {
      'usa': 'USD', 'united states': 'USD', 'america': 'USD',
      'uk': 'GBP', 'united kingdom': 'GBP', 'britain': 'GBP', 'england': 'GBP',
      'japan': 'JPY',
      'canada': 'CAD',
      'australia': 'AUD', 'australian': 'AUD',
      'switzerland': 'CHF', 'swiss': 'CHF',
      'china': 'CNY',
      'india': 'INR',
      'south korea': 'KRW', 'korea': 'KRW',
      'brazil': 'BRL',
      'mexico': 'MXN',
      'singapore': 'SGD',
      'hong kong': 'HKD',
      'thailand': 'THB', 'thai': 'THB',
      'malaysia': 'MYR',
      'indonesia': 'IDR',
      'philippines': 'PHP',
      'vietnam': 'VND', 'vietnamese': 'VND',
      'cambodia': 'KHR', 'cambodian': 'KHR',
      'laos': 'LAK', 'laotian': 'LAK',
      'myanmar': 'MMK', 'burma': 'MMK'
    };

    // Check for country names first (before currency codes)
    for (const [country, code] of Object.entries(countryCurrencyMap)) {
      if (lowerText.includes(country)) {
        if (!fromCurrency) {
          fromCurrency = code;
        } else if (code !== fromCurrency) {
          toCurrency = code;
          break;
        }
      }
    }

    // Find currencies in text
    for (const [key, code] of Object.entries(currencyMap)) {
      if (lowerText.includes(key)) {
        if (!fromCurrency) {
          fromCurrency = code;
        } else if (code !== fromCurrency) {
          toCurrency = code;
          break;
        }
      }
    }

    // If no toCurrency found, check for countries
    if (!toCurrency && fromCurrency) {
      for (const [country, code] of Object.entries(countryCurrencyMap)) {
        if (lowerText.includes(country)) {
          toCurrency = code;
          break;
        }
      }
    }

    // If still no toCurrency, default to USD
    if (!toCurrency && fromCurrency) {
      toCurrency = 'USD';
    }

    return { amount, fromCurrency, toCurrency };
  };

  const handleCurrencyConversion = async () => {
    if (!userInput.trim()) {
      Alert.alert('Input Required', 'Please enter what you want to convert');
      return;
    }

    const { amount, fromCurrency, toCurrency } = extractCurrencyInfo(userInput);

    if (!amount) {
      Alert.alert('Amount Missing', 'Please specify an amount (e.g., 100)');
      return;
    }

    if (!fromCurrency) {
      Alert.alert('Currency Missing', 'Please specify the currency to convert from (e.g., USD, THB)');
      return;
    }

    const extractedText = `Convert ${amount} ${fromCurrency} to ${toCurrency}`;
    setMarvinResponse(`🤖 ${currencyCharacter.character || 'Marvin'} is thinking...`);
    setIsProcessing(true);

    try {
      // Get the theme-specific prompt
      const systemPrompt = await getPrompt(aiTheme, 'currencyConversion');
      const response = await marvinCurrencyConversion(extractedText, systemPrompt || '', undefined, aiTheme);

      setMarvinResponse(response);

    } catch (error) {
      console.error('Marvin response error:', error);
      setMarvinResponse("I'm afraid my brain the size of a planet is having one of its off days. The conversion is accurate, but the meaning of it all... well, I suppose you'll figure it out eventually.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToNote = () => {
    // Save the conversation to a note
    const conversationText = `Currency Conversion Request:\n${userInput}\n\nConversion Result:\n${marvinResponse}`;
    const noteTitle = `Currency Conversion - ${new Date().toLocaleDateString()}`;
    
    setTypedText(conversationText);
    setNoteTitle(noteTitle);
    setTags(['currency', 'finance']);
    setActiveTab('record');
    setRecordingViewMode('tabs');
  };


  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={sharedStyles.tabContent}>
        <View style={sharedStyles.section}>
          <View style={sharedStyles.avatarContainer}>
            <Image source={getCurrencyAvatar()} style={sharedStyles.avatar} />
          </View>
          <Text style={sharedStyles.sectionTitle}>🤖 {getCurrencyTitle()}</Text>
          <Text style={[sharedStyles.sectionDescription, { color: '#f59e0b', fontWeight: 'bold' }]}>
            {"\n"}
            "{getCurrencyGreeting()}"
          </Text>

          {/* Input */}
          <View style={sharedStyles.searchSection}>
            <TextInput
              style={sharedStyles.searchInput}
              placeholder="Enter currency to convert and what to convert to; e.g. 500 THB to USD"
              placeholderTextColor="#fff"
              value={userInput}
              onChangeText={setUserInput}
              multiline={true}
              numberOfLines={3}
            />
          </View>

          {/* Character's Response */}
          {marvinResponse && (
            <View style={sharedStyles.resultsSection}>
              <Text style={sharedStyles.sectionTitle}>🤖 {currencyCharacter.character || 'Marvin'} Says</Text>
              <View style={{ backgroundColor: '#1f2937', padding: 16, borderRadius: 8, marginTop: 8 }}>
                <Text style={{ color: '#fff', fontSize: 14 }}>{marvinResponse}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer with buttons */}
      <View style={sharedStyles.footer}>
        <TouchableOpacity
          style={sharedStyles.searchButton}
          onPress={() => {
            // Navigate back to fun tools
            setActiveTab('fun');
          }}
        >
          <Text style={sharedStyles.searchButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={sharedStyles.searchButton}
          onPress={marvinResponse ? handleSaveToNote : handleCurrencyConversion}
          disabled={isProcessing}
        >
          <Text style={sharedStyles.searchButtonText}>
            {isProcessing ? `🤖 ${currencyCharacter.character || 'Marvin'} is thinking...` : (marvinResponse ? 'Save to Note' : 'OK')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CurrencyConverterTool;