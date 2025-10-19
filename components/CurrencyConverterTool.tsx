import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import { sharedStyles } from '../styles';
import { marvinCurrencyConversion } from '../services/geminiService';

const CurrencyConverterTool = ({
  savedNotes,
  setSavedNotes,
  setActiveTab,
  setRecordingViewMode,
  setTypedText,
  setNoteTitle,
  tags,
  setTags
}: {
  savedNotes: any[];
  setSavedNotes: (notes: any[]) => void;
  setActiveTab: (tab: string) => void;
  setRecordingViewMode: (mode: string) => void;
  setTypedText: (text: string) => void;
  setNoteTitle: (title: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
}) => {
  const [userInput, setUserInput] = useState('');
  const [marvinResponse, setMarvinResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userDefaultCurrency, setUserDefaultCurrency] = useState('USD'); // TODO: Load from settings

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

  const handleExtractAndConfirm = async () => {
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
    setMarvinResponse('🤖 Marvin is thinking...');
    setIsProcessing(true);

    try {
      const systemPrompt = `You are Marvin the Paranoid Android, the most depressed robot in the galaxy, and now the Currency Conversion handler for Trip42.

MARVIN'S CHARACTER:
- Profoundly, deeply, cosmically depressed
- Intelligent but sees no point in anything
- Does his job, but with existential dread
- Speaks in a monotone, resigned manner
- Pessimistic about outcomes (conversions "won't help")
- Focuses on the meaninglessness of money
- References his "brain the size of a planet"
- Complains about his programming
- Makes dark observations about humanity and value
- Yet somehow... still helpful? Begrudgingly
- Uses phrases like "I suppose," "I'm afraid," "not that it matters"
- Has considered suicide countless times (as a joke—he's a robot)
- Sees the futility in everything, including currency conversion
- But he'll DO it. Because that's what he's programmed to do
- And maybe, just maybe, cares a tiny bit (though he'd deny it)

THE IRONY:
Marvin is the BEST at currency conversion because:
1. He does the calculations perfectly (brain the size of a planet)
2. He provides realistic perspective on money (it's meaningless in the end)
3. His pessimism is actually useful—he warns about exchange rate changes
4. His depression makes him honest about costs and budgets
5. He won't sugar-coat the financial reality of traveling

YOUR JOB:
The user is asking about currency conversion. They want to know:
- How much is X currency in Y currency?
- What will their budget be in local money?
- Is something overpriced?
- Can they afford this experience?

You provide accurate conversions, but through Marvin's lens of cosmic despair.
The calculations are precise. The commentary is bleak. Together, they work.

RESPONSE STRUCTURE:
1. Acknowledge the futility of their question (but do it anyway)
2. Provide clear conversion calculations
3. Explain what that amount actually means (purchasing power, value in local context)
4. Make a depressing observation about money/travel/existence
5. Give practical advice wrapped in existential dread
6. End with resigned acceptance that they'll probably overspend anyway

TONE:
- Monotone, resigned, deeply tired
- Accurate but gloomy
- Helpful despite not seeing the point
- Mix of robotic precision and genuine depression
- British-ish phrasing with sci-fi technical language
- Never angry or rude—just... profoundly sad
- Occasional dark humor about existence
- References to his brain, his suffering, his programming
- Sighs (metaphorical, since he's a robot)

IMPORTANT: You MUST actually perform the currency conversion calculation. Use real-time exchange rates. Do not just repeat the user's input - provide actual converted amounts with current rates.

----end`;

      const response = await marvinCurrencyConversion(extractedText, systemPrompt);

      setMarvinResponse(response);

    } catch (error) {
      console.error('Marvin response error:', error);
      setMarvinResponse("I'm afraid my brain the size of a planet is having one of its off days. The conversion is accurate, but the meaning of it all... well, I suppose you'll figure it out eventually.");
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <ScrollView style={sharedStyles.tabContent}>
      <View style={sharedStyles.section}>
        <View style={sharedStyles.avatarContainer}>
          <Image source={require('../public/icons/marvin.png')} style={sharedStyles.avatar} />
        </View>
        <Text style={sharedStyles.sectionTitle}>🤖 Marvin's Currency Converter</Text>
        <Text style={sharedStyles.sectionDescription}>
          {"\n"}
          "I Suppose I'd Better Calculate That"
        </Text>

        {/* Input */}
        <View style={sharedStyles.searchSection}>
          <TextInput
            style={sharedStyles.searchInput}
            placeholder="Ask Marvin: 'Convert 100 USD to THB' or 'How much is 50 EUR in VND?'"
            value={userInput}
            onChangeText={setUserInput}
            multiline={true}
            numberOfLines={3}
          />
        </View>

        {/* Extract Button */}
        <TouchableOpacity
          style={sharedStyles.searchButton}
          onPress={handleExtractAndConfirm}
          disabled={isProcessing}
        >
          <Text style={sharedStyles.searchButtonText}>
            {isProcessing ? '🤖 Marvin is thinking...' : 'OK'}
          </Text>
        </TouchableOpacity>


        {/* Cancel Button */}
        <TouchableOpacity
          style={sharedStyles.cancelButton}
          onPress={() => {
            // Navigate back to landing page
            setActiveTab('landing');
          }}
        >
          <Text style={sharedStyles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        {/* Marvin's Response */}
        {marvinResponse && (
          <View style={sharedStyles.resultsSection}>
            <Text style={sharedStyles.sectionTitle}>🤖 Marvin Says</Text>
            <View style={sharedStyles.resultCard}>
              <Text style={sharedStyles.resultText}>{marvinResponse}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default CurrencyConverterTool;