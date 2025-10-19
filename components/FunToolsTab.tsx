import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, Modal } from 'react-native';

interface FunToolsTabProps {
  onNavigateToTool: (toolId: string) => void;
  onNavigateToScreen: (screen: string) => void;
}

const FunToolsTab: React.FC<FunToolsTabProps> = ({ onNavigateToTool, onNavigateToScreen }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const tools = [
    {
      id: 'map',
      title: 'Local Map',
      description: 'Explore local area with points of interest',
      icon: '🗺️'
    },
    {
      id: 'medicine',
      title: 'Medicine Finder',
      description: 'Find medicine alternatives in foreign countries',
      icon: '💊'
    },
    {
      id: 'calculator',
      title: 'Calculator',
      description: 'Simple calculator for quick calculations',
      icon: '🧮'
    },
    {
      id: 'currency',
      title: 'Currency Converter',
      description: 'Convert between different currencies with real-time rates',
      icon: '💱'
    },
    {
      id: 'tetris',
      title: 'Stacker',
      description: 'Classic block-stacking puzzle game',
      icon: '🧩'
    }
  ];

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    // Navigate to specific tool implementation
    onNavigateToTool(toolId);
  };

  return (
    <ScrollView style={styles.tabContent}>
      <TouchableOpacity style={styles.avatarContainer} onPress={() => setShowModal(true)}>
        <Image source={require('../public/icons/Ford.png')} style={styles.avatar} />
      </TouchableOpacity>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ford Prefect's Guide</Text>
        <Text style={styles.sectionDescription}>
          Right Then
        </Text>

        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={styles.toolCard}
            onPress={() => handleToolSelect(tool.id)}
          >
            <View style={styles.toolIcon}>
              <Text style={styles.toolIconText}>{tool.icon}</Text>
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
            </View>
            <Text style={styles.toolArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalTitle}>Tool Introductions (Ford's Way)</Text>
              <Text style={styles.modalText}>
                1. <Text style={styles.linkText} onPress={() => { setShowModal(false); onNavigateToScreen('record'); }}>TRANSLATION Mode</Text>{"\n"}
                "When you need to actually communicate with someone—and I mean REALLY{"\n"}
                communicate, not just point at a menu—tap the Translation button. You can{"\n"}
                ask me how to say anything from 'Where's the best coffee?' to 'This food{"\n"}
                is giving me a mild existential crisis.' I'll give you the phrase, the{"\n"}
                proper tone, and a bit of cultural context so you don't accidentally insult{"\n"}
                anyone.{"\n\n"}
                I've been on 47 planets. Insulting locals never ends well. Trust me on this."{"\n\n"}

                2. <Text style={styles.linkText} onPress={() => { setShowModal(false); onNavigateToTool('map'); }}>LOCAL Mode (Nearby Discoveries)</Text>{"\n"}
                "See that map marker? That's LOCAL mode. It's rather brilliant, actually.{"\n"}
                It remembers everywhere you've been—every café, temple, street market, that{"\n"}
                weird pharmacy where the owner gave you free advice. Then, when you're{"\n"}
                wandering around bored, it whispers, 'Oh, you're near that brilliant street{"\n"}
                food stall you found last week. Fancy some pad thai?'{"\n\n"}
                It's like having a friend who remembers all your favorite spots. Except I'm{"\n"}
                technically not a friend. I'm an AI. But I'm excellent at remembering things."{"\n\n"}

                3. <Text style={styles.linkText} onPress={() => { setShowModal(false); onNavigateToScreen('fun'); }}>QUICK NOTES with Zaphod</Text>{"\n"}
                "You know Zaphod Beeblebrox? Two-headed, dangerously impulsive, President of{"\n"}
                the Galaxy? Now he's your Quick Note handler. Sometimes you're exhausted and{"\n"}
                you just type 'ran 5k, bp meds, had coffee' because you haven't the energy{"\n"}
                for proper sentences.{"\n\n"}
                Zaphod takes that chaos and makes it actually useful while being absolutely{"\n"}
                hilarious about it. Plus he'll organize it with tags so you can actually find{"\n"}
                it later. The man's impulsive but he's competent.{"\n\n"}
                Fair warning: His commentary is sassy."{"\n\n"}

                4. <Text style={styles.linkText} onPress={() => { setShowModal(false); onNavigateToScreen('record'); }}>HEALTH TRACKING (Vitals)</Text>{"\n"}
                "If you're going to be adventuring for weeks or months, you should probably{"\n"}
                check in with how your body's doing. Weight, blood pressure, sleep patterns,{"\n"}
                whether that street food is finally stopping making you regret everything—{"\n"}
                that sort of thing.{"\n\n"}
                I'm not going to pretend I'm a doctor. I'm absolutely not. But I can help{"\n"}
                you track patterns and tell you when you should probably find actual medical{"\n"}
                attention. Also, noting your vitals means when you do get home, you have{"\n"}
                actual data instead of vague handwaving about 'yes, I definitely got more fit.'"{"\n\n"}

                Try the medicine finder below to find alternatives for meds that you forgot to bring on your trip.{"\n\n"}

                6. <Text style={styles.linkText} onPress={() => { setShowModal(false); onNavigateToScreen('calendar'); }}>TRAVEL PLANNING</Text>{"\n"}
                "Got a question about where to go next? How to get there? Where to sleep?{"\n"}
                What's actually worth seeing vs. what's just crowded tourist nonsense?{"\n\n"}
                Tap the date icon on the landing page. I'll help you plan your next leg, think{"\n"}
                about logistics, and draw on your actual travel history to suggest things you{"\n"}
                might actually love instead of things the guidebook says you should love.{"\n\n"}
                Honestly, this mode is where the real magic happens. Because the best itinerary{"\n"}
                is one that's just slightly unexpected."{"\n\n"}

                7. <Text style={styles.linkText} onPress={() => { setShowModal(false); onNavigateToScreen('fun'); }}>Trip42 HELP</Text>{"\n"}
                "If you're ever confused about what any of this does or how to use it, ask Arthur..{"\n"}
                That's literally just me explaining the app in a way that actually makes sense.{"\n"}
                No corporate jargon, no nonsense—just straightforward explanations."
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = {
  tabContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 20,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  toolCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 16,
  },
  toolIconText: {
    fontSize: 24,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  toolArrow: {
    fontSize: 20,
    color: '#f59e0b',
    fontWeight: 'bold' as const,
  },
  avatarContainer: {
    position: 'absolute' as const,
    top: 20,
    right: 20,
    zIndex: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: 320,
    maxHeight: 400,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  modalText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  linkText: {
    fontSize: 16,
    color: '#f59e0b',
    lineHeight: 24,
    textDecorationLine: 'underline' as const,
  },
  closeButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    alignItems: 'center' as const,
  },
  closeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
};

export default FunToolsTab;