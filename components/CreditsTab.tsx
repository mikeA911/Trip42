import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { getCredits, redeemVoucher, UserCredits, CreditHistoryEntry } from '../utils/credits';

interface CreditsTabProps {
  onBack: () => void;
}

const CreditsTab: React.FC<CreditsTabProps> = ({ onBack }) => {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const creditsData = await getCredits();
      setCredits(creditsData);
    } catch (error) {
      console.error('Error loading credits:', error);
      Alert.alert('Error', 'Failed to load credits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKoFiPayment = async () => {
    // Open Ko-Fi payment page in browser
    const kofiUrl = 'https://ko-fi.com/hitchtrip'; // Replace with actual Ko-Fi link
    try {
      const supported = await Linking.canOpenURL(kofiUrl);
      if (supported) {
        await Linking.openURL(kofiUrl);
      } else {
        Alert.alert('Error', 'Cannot open payment link. Please visit ko-fi.com/hitchtrip manually.');
      }
    } catch (error) {
      console.error('Error opening Ko-Fi link:', error);
      Alert.alert('Error', 'Failed to open payment link');
    }
  };

  const handleRedeemVoucher = async () => {
    if (!voucherCode.trim()) {
      Alert.alert('Error', 'Please enter a voucher code');
      return;
    }

    setIsRedeeming(true);
    try {
      let result;

      // Special hidden voucher for testing
      if (voucherCode.trim().toLowerCase() === '42ikigai') {
        // Add 100 credits for testing
        result = await redeemVoucher('42ikigai');
      } else {
        result = await redeemVoucher(voucherCode.trim());
      }

      if (result.success) {
        setVoucherCode('');
        // Reload credits to show updated balance
        await loadCredits();
        Alert.alert('Success', `Successfully redeemed ${result.creditsRedeemed} credits!`);
      } else {
        Alert.alert('Error', result.error || 'Failed to redeem voucher');
      }
    } catch (error) {
      console.error('Redeem error:', error);
      Alert.alert('Error', 'Failed to redeem voucher. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading credits...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.creditsHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.creditsTitle}>Credits</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>{credits?.balance || 0}c</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Purchase Credits</Text>
        <Text style={styles.infoText}>
          Support Trip42 and get credits for translations and AI features.
        </Text>

        <TouchableOpacity
          style={styles.kofiButton}
          onPress={handleKoFiPayment}
        >
          <Text style={styles.kofiButtonText}>☕ Buy Credits on Ko-Fi</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>OR</Text>

        <Text style={styles.voucherTitle}>Redeem Voucher</Text>
        <Text style={styles.infoText}>
          Enter your voucher code below to redeem credits.
        </Text>
        <View style={styles.voucherSection}>
          <TextInput
            style={styles.voucherInput}
            placeholder="Enter voucher code"
            value={voucherCode}
            onChangeText={setVoucherCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.redeemButton, isRedeeming && styles.disabledButton]}
            onPress={handleRedeemVoucher}
            disabled={isRedeeming}
          >
            <Text style={styles.redeemButtonText}>
              {isRedeeming ? 'Redeeming...' : 'Redeem'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>History</Text>
        <View style={styles.historyList}>
          {credits?.history
            .sort((a: CreditHistoryEntry, b: CreditHistoryEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((item: CreditHistoryEntry, index: number) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyContent}>
                  <Text style={styles.historyDescription}>{item.description}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.date).toLocaleString()}
                  </Text>
                </View>
                <Text style={[
                  styles.historyAmount,
                  item.amount > 0 ? styles.positiveAmount : styles.negativeAmount
                ]}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </Text>
              </View>
            ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  loadingText: {
    color: '#f59e0b',
    fontSize: 16,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  creditsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 15,
    backgroundColor: '#1f2937',
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  creditsTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  headerPlaceholder: {
    width: 50,
  },
  balanceCard: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 20,
    margin: 15,
    alignItems: 'center' as const,
  },
  balanceLabel: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 10,
  },
  balanceAmount: {
    color: '#f59e0b',
    fontSize: 36,
    fontWeight: 'bold' as const,
  },
  infoCard: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 20,
    margin: 15,
    marginTop: 0,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 10,
  },
  infoText: {
    color: '#9ca3af',
    fontSize: 16,
    lineHeight: 24,
  },
  historySection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 15,
  },
  historyList: {
    marginTop: 10,
  },
  historyItem: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 15,
    marginBottom: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  historyDate: {
    color: '#9ca3af',
    fontSize: 12,
  },
  historyAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  positiveAmount: {
    color: '#10b981',
  },
  negativeAmount: {
    color: '#ef4444',
  },
  voucherSection: {
    marginTop: 15,
    marginBottom: 15,
  },
  voucherInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
  },
  redeemButton: {
    backgroundColor: '#f59e0b',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  redeemButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  kofiButton: {
    backgroundColor: '#ff5f5f',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center' as const,
    marginBottom: 15,
  },
  kofiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  orText: {
    textAlign: 'center' as const,
    color: '#9ca3af',
    fontSize: 14,
    marginVertical: 10,
    fontWeight: 'bold' as const,
  },
  voucherTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 5,
    marginTop: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
};

export default CreditsTab;