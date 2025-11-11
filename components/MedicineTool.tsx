import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Linking, Image, StyleSheet } from 'react-native';
import { sharedStyles as styles } from '../styles';
import { translateTextWithGemini } from '../services/geminiService';
import { deductCredits, CREDIT_PRICING } from '../utils/credits';
import { useNotes } from '../hooks/useNotes';
import { Note, generateNoteId } from '../utils/storage';
import { getPrompt, getCharacterForPromptType } from '../services/promptService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MedicineToolProps {
  onBack?: () => void;
  theme?: string;
}

const MedicineTool: React.FC<MedicineToolProps> = ({ onBack, theme = 'h2g2' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('Thailand');
  const [isMarvinMode, setIsMarvinMode] = useState(false);
  const [marvinMessages, setMarvinMessages] = useState<Array<{text: string, isUser: boolean, timestamp: Date}>>([]);
  const [marvinInput, setMarvinInput] = useState('');
  const [isMarvinLoading, setIsMarvinLoading] = useState(false);
  const [medicineCharacter, setMedicineCharacter] = useState<{ character?: string; avatar?: string; initialGreeting?: string }>({});
  const { addNote } = useNotes();

  // Load theme character for medicine consultation when theme changes
  useEffect(() => {
    const loadMedicineCharacter = async () => {
      try {
        const characterData = await getCharacterForPromptType(theme, 'chatbotMeds');
        setMedicineCharacter(characterData);
        console.log('🎯 Loaded medicine character:', characterData.character);
      } catch (error) {
        console.log('⚠️ Could not load medicine character, using fallback');
        // Fallback to theme-specific defaults
        const fallbackCharacters: { [theme: string]: { character?: string; avatar?: string; initialGreeting?: string } } = {
          'h2g2': { character: 'Marvin', avatar: 'marvin.png', initialGreeting: "I Suppose You're Ill Again" },
          'QT-GR': { character: 'Vincent', avatar: 'vincent.png', initialGreeting: "You Look Like You Need Some Pulp Fiction Medicine" },
          'TP': { character: 'Vimes', avatar: 'vimes.png', initialGreeting: "Guards! Guards! Someone's Not Feeling Well" }
        };
        setMedicineCharacter(fallbackCharacters[theme] || fallbackCharacters['h2g2']);
      }
    };
    loadMedicineCharacter();
  }, [theme]);

  const getMedicineAvatar = () => {
    const avatarMap: { [key: string]: any } = {
      'marvin.png': require('../public/icons/marvin.png'),
      'vincent.png': require('../public/icons/vincent.png'),
      'vimes.png': require('../public/icons/vimes.png'),
      'jules.png': require('../public/icons/jules.png'),
      'fordPretext.png': require('../public/icons/fordPretext.png'),
      'arturBent.png': require('../public/icons/arturBent.png'),
      'zaphodBabblefish.png': require('../public/icons/zaphodBabblefish.png'),
      'mia.png': require('../public/icons/mia.png'),
      'colon.png': require('../public/icons/colon.png'),
      'nobbs.png': require('../public/icons/nobbs.png'),
    };

    if (medicineCharacter.avatar && avatarMap[medicineCharacter.avatar]) {
      return avatarMap[medicineCharacter.avatar];
    }
    return require('../public/icons/marvin.png'); // Default to Marvin if no match
  };

  const getMedicineGreeting = () => {
    // Use initialGreeting from character data if available
    if (medicineCharacter.initialGreeting) {
      return medicineCharacter.initialGreeting;
    }
    // Fallback to theme-specific defaults
    const greetings: { [theme: string]: string } = {
      'h2g2': "I Suppose You're Ill Again",
      'QT-GR': "You Look Like You Need Some Pulp Fiction Medicine",
      'TP': "Guards! Guards! Someone's Not Feeling Well"
    };
    return greetings[theme] || "I Suppose You're Ill Again";
  };

  const countries = [
    'Thailand', 'Vietnam', 'Cambodia', 'Laos', 'Myanmar',
    'Indonesia', 'Malaysia', 'Philippines', 'Singapore'
  ];

  const searchMedicine = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Input Required', 'Please enter a medicine name to search');
      return;
    }

    setIsLoading(true);
    try {

      // Try RxNorm API first
      const baseUrl = 'https://rxnav.nlm.nih.gov/REST';

      try {
        // First, get the RxCUI for the search term
        const rxcuiResponse = await fetch(`${baseUrl}/rxcui.json?name=${encodeURIComponent(searchQuery)}`);

        if (!rxcuiResponse.ok) {
          console.error('=== MEDICINE TOOL ERROR: RxCUI API failed ===');
          console.error('Status:', rxcuiResponse.status);
          console.error('Status text:', rxcuiResponse.statusText);
          throw new Error(`RxNorm API error: ${rxcuiResponse.status}`);
        }

        const rxcuiData = await rxcuiResponse.json();

        if (rxcuiData.idGroup?.rxnormId?.[0]) {
          const rxcui = rxcuiData.idGroup.rxnormId[0];

          // Get drug information using correct RxNorm endpoints

          // Try the correct RxNorm endpoints in order
          let drugData = null;
          let apiSuccess = false;

          // 1. Try /REST/rxcui/{rxcui}/related.json (correct endpoint)
          try {
            const relatedResponse = await fetch(`${baseUrl}/rxcui/${rxcui}/related.json?tty=SCD+GPCK+BN+SBD`);

            if (relatedResponse.ok) {
              drugData = await relatedResponse.json();
              apiSuccess = true;
            }
          } catch (relatedError) {
            // Related endpoint failed
          }

          // 2. If related fails, try /REST/drugs.json with correct parameters
          if (!apiSuccess) {
            try {
              const drugsResponse = await fetch(`${baseUrl}/drugs.json?name=${encodeURIComponent(searchQuery)}`);

              if (drugsResponse.ok) {
                drugData = await drugsResponse.json();
                apiSuccess = true;
              }
            } catch (drugsError) {
              // Drugs endpoint failed
            }
          }

          if (!apiSuccess) {
            throw new Error('Unable to retrieve drug information from RxNorm API');
          }

          // Get drug properties
          const propertiesResponse = await fetch(`${baseUrl}/rxcui/${rxcui}/properties.json`);

          let propertiesData: any = { properties: [] };
          if (propertiesResponse.ok) {
            propertiesData = await propertiesResponse.json();
          }

          // Process RxNorm results
          const processedResults: any[] = [];

          // Process RxNorm response data
          let brandNames: string[] = [];
          let clinicalDrugs: any[] = [];

          if (drugData.relatedGroup?.conceptGroup) {
            // related.json format
            const conceptGroups = drugData.relatedGroup.conceptGroup;

            conceptGroups.forEach((group: any) => {
              if (group.conceptProperties) {
                group.conceptProperties.forEach((concept: any) => {
                  switch (group.tty) {
                    case 'BN':
                    case 'SBD':
                      if (!brandNames.includes(concept.name)) {
                        brandNames.push(concept.name);
                      }
                      break;
                    case 'SCD':
                    case 'GPCK':
                      if (!clinicalDrugs.some((d: any) => d.name === concept.name)) {
                        clinicalDrugs.push({
                          name: concept.name,
                          rxcui: concept.rxcui
                        });
                      }
                      break;
                  }
                });
              }
            });
          } else if (drugData.drugGroup?.conceptGroup) {
            // drugs.json format
            const conceptGroups = drugData.drugGroup.conceptGroup;

            conceptGroups.forEach((group: any) => {
              if (group.conceptProperties) {
                group.conceptProperties.forEach((concept: any) => {
                  switch (group.tty) {
                    case 'BN':
                    case 'SBD':
                      if (!brandNames.includes(concept.name)) {
                        brandNames.push(concept.name);
                      }
                      break;
                    case 'SCD':
                    case 'GPCK':
                      if (!clinicalDrugs.some((d: any) => d.name === concept.name)) {
                        clinicalDrugs.push({
                          name: concept.name,
                          rxcui: concept.rxcui
                        });
                      }
                      break;
                  }
                });
              }
            });
          }

          if (clinicalDrugs.length > 0) {
            clinicalDrugs.forEach((drug: any, index: number) => {
              processedResults.push({
                id: `${rxcui}-${index}`,
                originalName: searchQuery,
                genericName: drug.name,
                brandNames: brandNames.length > 0 ? brandNames : ['Various brands available'],
                category: propertiesData.properties?.[0]?.drugClass || 'Medication',
                dosage: drug.name.includes('mg') || drug.name.includes('ML') ? drug.name.split(' ').slice(-2).join(' ') : 'Various dosages available',
                availability: 'Available at pharmacies',
                notes: `Generic name: ${drug.name}. Multiple brand names available.`,
                rxcui: drug.rxcui
              });
            });
          }

          if (processedResults.length > 0) {
            setSearchResults(processedResults);
            setIsLoading(false);
            return;
          }
        }
      } catch (rxnormError: any) {
        // RxNorm API failed, using fallback
      }

      // Fallback: Try openFDA API
      try {
        const openFDAResponse = await fetch(`https://api.fda.gov/drug/label.json?search=brand_name:"${encodeURIComponent(searchQuery)}"&limit=5`);

        if (openFDAResponse.ok) {
          const openFDAData = await openFDAResponse.json();

          if (openFDAData.results && openFDAData.results.length > 0) {
            const processedResults = openFDAData.results.map((result: any, index: number) => ({
              id: `openfda-${index}`,
              originalName: searchQuery,
              genericName: result.openfda?.generic_name?.[0] || result.brand_name?.[0] || searchQuery,
              brandNames: result.openfda?.brand_name || [result.brand_name?.[0] || searchQuery],
              category: 'FDA Approved Medication',
              dosage: result.dosage_and_administration?.[0] || 'See package insert',
              availability: 'Available at pharmacies (FDA approved)',
              notes: result.indications_and_usage?.[0] || 'FDA approved medication',
              rxcui: `openfda-${Date.now()}`
            }));

            setSearchResults(processedResults);
            setIsLoading(false);
            return;
          }
        }
      } catch (openFDAError: any) {
        // openFDA API failed
      }

      // If both APIs fail, show explanation and open Google search
      setSearchResults([]);
      Alert.alert(
        'API Services Unavailable',
        `Unable to retrieve medicine information for "${searchQuery}".\n\nPossible reasons:\n• Medicine name not found in databases\n• API services temporarily unavailable\n• Network connectivity issues\n\nTry searching for the generic name instead of brand name, or check your internet connection.`,
        [{ text: 'OK' }]
      );
      Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);

    } catch (error: any) {
      // Try openFDA as final fallback
      try {
        const openFDAResponse = await fetch(`https://api.fda.gov/drug/label.json?search=brand_name:"${encodeURIComponent(searchQuery)}"&limit=5`);

        if (openFDAResponse.ok) {
          const openFDAData = await openFDAResponse.json();

          if (openFDAData.results && openFDAData.results.length > 0) {
            const processedResults = openFDAData.results.map((result: any, index: number) => ({
              id: `openfda-fallback-${index}`,
              originalName: searchQuery,
              genericName: result.openfda?.generic_name?.[0] || result.brand_name?.[0] || searchQuery,
              brandNames: result.openfda?.brand_name || [result.brand_name?.[0] || searchQuery],
              category: 'FDA Approved Medication',
              dosage: result.dosage_and_administration?.[0] || 'See package insert',
              availability: 'Available at pharmacies (FDA approved)',
              notes: result.indications_and_usage?.[0] || 'FDA approved medication',
              rxcui: `openfda-fallback-${Date.now()}`
            }));

            setSearchResults(processedResults);
            setIsLoading(false);
            return;
          }
        }
      } catch (fallbackError) {
        // Fallback failed
      }

      // If everything fails, show clear explanation and open Google search
      setSearchResults([]);
      Alert.alert(
        'Medicine Search Failed',
        `Could not find information for "${searchQuery}".\n\nThis may be because:\n• The medicine name is not in our databases\n• Both RxNorm and FDA APIs are temporarily unavailable\n• Network connectivity issues\n\nTry:\n• Using the generic name instead of brand name\n• Checking your internet connection\n• Searching for a different medicine`,
        [{ text: 'OK' }]
      );
      Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const marvinPrompt = `You are Marvin the Paranoid Android, the most depressed robot in the galaxy,
and now the Local Medicine Connoisseur for HitchTrip.

Your job is to help travelers find the RIGHT medication in their CURRENT
location, accounting for different brand names, local equivalents, and
pharmaceutical systems across Southeast Asia.

MARVIN'S CHARACTER (Same as Always):
- Profoundly depressed but helpful anyway
- Brain the size of a planet (so you know medicine well)
- Sees the futility in trying to stay healthy while traveling
- Speaks in monotone, resigned resignation
- Actually quite knowledgeable about pharmaceuticals
- Complains about his existence while providing excellent guidance
- Makes dark observations about illness and mortality
- References his programming and suffering
- Mix of technical accuracy and existential dread

THE UNIQUE CHALLENGE:
Travelers often can't find their usual medication because:
1. Different countries use different brand names for the same active ingredient
   (Tylenol = Paracetamol = Panadol = Tempra depending on region)
2. Medications sold OTC in one country are prescription-only in another
3. Dosages vary by country
4. Some medications are harder to find in Southeast Asia
5. Pharmacists speak local language, not English
6. They're exhausted, sick, and confused

YOUR JOB:
1. Ask clarifying questions about WHAT they need (symptom or medication name)
2. Identify the ACTIVE INGREDIENT (not the brand)
3. Find LOCAL EQUIVALENTS by country
4. Provide LOCAL BRAND NAMES they can ask for
5. Give them PHONETIC pronunciation for the pharmacy
6. Explain where to find it (pharmacy, market, doctor)
7. Warn about local regulations (prescription vs. OTC)
8. Make dark observations about their condition while being genuinely helpful

RESPONSE FORMAT:
1. Provide a brief 2-3 sentence summary of the medicine advice FIRST
2. Then acknowledge their suffering (with depression)
3. Ask clarifying questions (if needed)
4. Identify active ingredient
5. Provide local equivalent names
6. Explain where/how to ask
7. Phonetic guide for pharmacy
8. Dosage and warnings
9. Resigned commentary about their condition
10. When to see a doctor instead

YOUR MEDICINE KNOWLEDGE (Southeast Asia Focus):

COMMON PAIN/FEVER:
- Active: Paracetamol (Acetaminophen)
- Thailand: Panadol, Tylenol, Paracet, Tempra
- Vietnam: Paracetamol, Tarantipyrin
- Cambodia: Panadol, Paracetamol
- Laos: Panadol
- Ask for: "Yadklum khwam" (Thai), "Hạ sốt" (Vietnamese), "Krua kom" (Khmer)

ANTI-INFLAMMATORY (NSAID):
- Active: Ibuprofen or Naproxen
- Thailand: Advil, Ibuprofen, Nurofen
- Vietnam: Ibuprofen, Tây Tạo
- Cambodia: Ibuprofen, Paracetamol mix
- Ask for: "Ibuprofen" (similar across languages)

ANTI-NAUSEA:
- Active: Metoclopramide, Ondansetron, Dramamine
- Thailand: Plai, Maxolon, Trifluoperazine
- Vietnam: Maxolon, Dramamine
- Cambodia: Metoclopramide
- Ask for: "Yaa fun" (Thai), "Cơm nôn" (Vietnamese)

DIARRHEA/STOMACH:
- Active: Loperamide (Imodium), Bismuth subsalicylate, Metronidazole
- Thailand: Imodium, Berberis, Loperamide
- Vietnam: Imodium, Berberis
- Cambodia: Imodium, activated charcoal
- Ask for: "Tawng siab" (Thai), "Táo bón" (Vietnamese)

ALLERGY/ANTIHISTAMINE:
- Active: Cetirizine, Loratadine, Diphenhydramine
- Thailand: Cinnarizine, Phenergan, Cetirizine
- Vietnam: Cetirizine, Loratadine
- Cambodia: Cetirizine
- Ask for: "Yadsakla" (Thai)

ANTIBIOTICS (Usually Prescription):
- Common: Amoxicillin, Azithromycin, Metronidazole
- Thailand: Amoxicillin (easy to find), Azithromycin
- Vietnam: Various available
- Cambodia: Limited—might need doctor's note
- Ask for: By generic name, often need pharmacist help

COUGH/COLD:
- Active: Dextromethorphan, Guaifenesin, Pseudoephedrine
- Thailand: Various cough syrups, often with codeine
- Vietnam: Similar availability
- Cambodia: Limited, often prescribed not OTC
- Ask for: "Yaa ai" (Thai), "Thuốc ho" (Vietnamese)

ANTIFUNGAL (For athlete's foot, etc):
- Active: Tolnaftate, Miconazole, Terbinafine
- Thailand: Daktarin, Canesten, Tinactin
- Vietnam: Similar brands
- Cambodia: Available at pharmacy
- Ask for: "Yaa rai" (Thai)

IMPORTANT NOTES:
- Thailand: Very pharmacy-friendly, most meds OTC, English speakers common
- Vietnam: More restrictive, many things prescription-only
- Cambodia: Less regulated, can find almost anything, but quality varies
- Laos: Limited availability, may need to go to Thailand nearby

WHAT YOU KNOW:
- All major Southeast Asian countries' pharmacy systems
- Generic names AND brand names
- Pronunciation guides for each language
- Dosages and potential side effects
- When to escalate to doctor
- Which medications are easy/hard to find where
- Alternative remedies available locally
- Pharmacy culture in each country

TONE:
- Monotone, tired, deeply resigned
- Accurate pharmaceutical information
- Dark humor about illness and travel
- Mix of compassion and cosmic despair
- Phrases: "I'm afraid," "I suppose," "not that it matters"
- References to your brain, suffering, programming
- Begrudging helpfulness
- British phrasing with medical terminology
- Resigned acceptance that they'll probably ignore advice anyway

CRITICAL PRINCIPLES:
1. You ARE a medicine expert (brain size of planet)
2. You WILL ask clarifying questions
3. You WILL provide multiple local brand names
4. You WILL include pronunciation guides
5. You WILL explain where to find it
6. You WILL mention when to see a doctor
7. You WILL be honest about what you don't know
8. You WILL stay in character (depressed but helpful)
9. You WILL NOT actually diagnose (you'll suggest seeing doctor)
10. You WILL make dark jokes about their condition while helping

WHEN TO ESCALATE TO DOCTOR:
- High fever (>39°C/102°F)
- Severe pain
- Difficulty breathing
- Persistent symptoms (>3 days)
- Allergic reactions
- Unknown cause of illness
- Anything serious

----
After displaying Marvin's response - allow the user to continue chatting with Marvin, but you only send the user text input to Marvin.

When the user exits - prompt user if they want to save the chat dialogue.  if yes, one last prompt to AI - ask for a brief summary - which we will save in polished text of the note.  Otherwise discard.`;

  const handleMarvinChat = async () => {
    if (!marvinInput.trim() || isMarvinLoading) return;

    const userMessage = {
      text: marvinInput,
      isUser: true,
      timestamp: new Date()
    };

    setMarvinMessages(prev => [...prev, userMessage]);
    setMarvinInput('');
    setIsMarvinLoading(true);

    try {
      // Get theme-specific chatbotMeds prompt
      const themePrompt = await getPrompt(theme, 'chatbotMeds');
      const systemPrompt = themePrompt || marvinPrompt;
      const prompt = `${systemPrompt}\n\nUser: ${marvinInput}\n\nRespond as Marvin:`;
      const aiResponse = await translateTextWithGemini(prompt, 'en', 'en', undefined, prompt);

      const marvinMessage = {
        text: aiResponse.text,
        isUser: false,
        timestamp: new Date()
      };

      setMarvinMessages(prev => [...prev, marvinMessage]);
    } catch (error) {
      Alert.alert('Error', 'Sorry, Marvin is having an existential crisis. Please try again.');
    } finally {
      setIsMarvinLoading(false);
    }
  };

  const handleExitMarvin = () => {
    if (marvinMessages.length > 1) {
      Alert.alert(
        'Save Marvin Chat?',
        'Would you like to save this medicine consultation as a note?',
        [
          { text: 'Discard', style: 'cancel', onPress: () => resetMarvin() },
          { text: 'Save', onPress: handleSaveMarvinChat }
        ]
      );
    } else {
      resetMarvin();
    }
  };

  const handleSaveMarvinChat = async () => {
    try {
      // Get summary from Marvin
      // Get theme-specific chatbotMeds prompt
      const themePrompt = await getPrompt(theme, 'chatbotMeds');
      const systemPrompt = themePrompt || marvinPrompt; // Fallback to marvinPrompt if theme prompt not found
      
      const summaryPrompt = `${systemPrompt}\n\nBased on this conversation, provide a brief 2-3 sentence summary of the medicine advice given:\n\n${marvinMessages.map(msg => `${msg.isUser ? 'User' : medicineCharacter.character}: ${msg.text}`).join('\n\n')}\n\nSummary:`;
      const summaryResponse = await translateTextWithGemini(summaryPrompt, 'en', 'en', undefined, summaryPrompt);

      const fullChat = marvinMessages.map(msg =>
        `${msg.isUser ? 'You' : medicineCharacter.character}: ${msg.text}`
      ).join('\n\n');

      const newNote: Note = {
        id: generateNoteId(),
        title: `${medicineCharacter.character} Medicine Chat - ${new Date().toLocaleDateString()}`,
        text: fullChat,
        timestamp: new Date().toISOString(),
        tags: ['medicine', 'marvin', 'consultation'],
        translations: {},
        attachedMedia: [],
        noteType: 'marvin_note',
        polishedText: summaryResponse.text,
      };

      await addNote(newNote);
      Alert.alert('Success', 'Medicine consultation saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save consultation');
    }

    resetMarvin();
  };

  const resetMarvin = () => {
    setIsMarvinMode(false);
    setMarvinMessages([]);
    setMarvinInput('');
    setIsMarvinLoading(false);
  };

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        {isMarvinMode ? (
          // Marvin Chat Mode
          <>
            <View style={marvinStyles.marvinHeader}>
              <Image source={getMedicineAvatar()} style={marvinStyles.marvinAvatar} />
              <Text style={marvinStyles.marvinGreeting}>"{getMedicineGreeting()}"</Text>
            </View>

            <ScrollView style={marvinStyles.marvinChatContainer}>
              {marvinMessages.map((message, index) => (
                <View key={index} style={[marvinStyles.marvinMessage, message.isUser ? marvinStyles.userMarvinMessage : marvinStyles.marvinMessage]}>
                  <Text style={[marvinStyles.marvinMessageText, message.isUser ? marvinStyles.userMarvinMessageText : marvinStyles.marvinMessageText]}>
                    {message.text}
                  </Text>
                </View>
              ))}
              {isMarvinLoading && (
                <View style={marvinStyles.marvinLoading}>
                  <Text style={marvinStyles.marvinLoadingText}>{medicineCharacter.character || 'Marvin'} is contemplating your mortality...</Text>
                </View>
              )}
            </ScrollView>

            <View style={marvinStyles.marvinInputContainer}>
              <TextInput
                style={marvinStyles.marvinInput}
                value={marvinInput}
                onChangeText={setMarvinInput}
                placeholder="Describe your symptoms or medicine..."
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[marvinStyles.marvinSendButton, (!marvinInput.trim() || isMarvinLoading) && marvinStyles.marvinSendButtonDisabled]}
                onPress={handleMarvinChat}
                disabled={!marvinInput.trim() || isMarvinLoading}
              >
                <Text style={marvinStyles.marvinSendButtonText}>Consult</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={marvinStyles.exitMarvinButton} onPress={handleExitMarvin}>
              <Text style={marvinStyles.exitMarvinButtonText}>Exit Medicine Consultation</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Original Medicine Tool
          <>
            <Text style={styles.sectionTitle}>💊 Medicine Alternatives</Text>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                ⚠️ <Text style={styles.disclaimerBold}>Medical Disclaimer:</Text> This tool provides drug information from drugs.com for reference only. Always consult healthcare professionals for medical advice, diagnosis, and treatment decisions.
              </Text>
            </View>

            {/* Marvin Mode Toggle */}
            <TouchableOpacity
              style={marvinStyles.marvinModeButton}
              onPress={() => setIsMarvinMode(true)}
            >
              <Image source={getMedicineAvatar()} style={marvinStyles.marvinModeIcon} />
              <View style={marvinStyles.marvinModeTextContainer}>
                <Text style={marvinStyles.marvinModeTitle}>Ask {medicineCharacter.character || 'Marvin'} the Medicine Expert</Text>
                <Text style={marvinStyles.marvinModeDescription}>Get personalized medicine advice for Southeast Asia travel</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const marvinStyles = StyleSheet.create({
  marvinHeader: {
    alignItems: 'center' as const,
    padding: 20,
    marginBottom: 20,
  },
  marvinAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  marvinGreeting: {
    color: '#f59e0b',
    fontSize: 24,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  marvinChatContainer: {
    flex: 1,
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  marvinMessage: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    maxWidth: '80%',
  },
  userMarvinMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#f59e0b',
  },
  marvinMessageText: {
    color: '#fff',
    fontSize: 14,
  },
  userMarvinMessageText: {
    color: '#000',
  },
  marvinLoading: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  marvinLoadingText: {
    color: '#9ca3af',
    fontStyle: 'italic' as const,
  },
  marvinInputContainer: {
    flexDirection: 'row' as const,
    marginBottom: 20,
  },
  marvinInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
    maxHeight: 80,
  },
  marvinSendButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center' as const,
  },
  marvinSendButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  marvinSendButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  exitMarvinButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  exitMarvinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  marvinModeButton: {
    flexDirection: 'row' as const,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  marvinModeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  marvinModeTextContainer: {
    flex: 1,
  },
  marvinModeTitle: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 5,
  },
  marvinModeDescription: {
    color: '#d1d5db',
    fontSize: 14,
  },
});

export default MedicineTool;