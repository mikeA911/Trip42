import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

export interface CreditHistoryEntry {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
}

export interface UserCredits {
  balance: number;
  history: CreditHistoryEntry[];
  deviceId: string;
  isAnonymous: boolean;
}

// Credit pricing constants
export const CREDIT_PRICING = {
  TEXT_TRANSLATION: 5,
  SIGN_TRANSLATION: 7,
  VOICE_RECORDING: 10,
  NOTE_POLISHING: 0, // Free
  MAX_VOICE_DURATION_MINUTES: 5
};

// Device fingerprinting function for consistent device ID
export const generateDeviceFingerprint = async (): Promise<string> => {
  try {
    // Get device characteristics that remain consistent
    const deviceInfo = {
      brand: Device.brand || 'unknown',
      modelName: Device.modelName || 'unknown',
      osName: Device.osName || 'unknown',
      osVersion: Device.osVersion || 'unknown',
      deviceType: Device.deviceType || 'unknown',
      deviceName: Device.deviceName || 'unknown',
      // Add app installation timestamp as additional entropy
      installTime: 'hitchtrip-app-v1'
    };

    // Create a consistent string from device characteristics
    const fingerprintString = `${deviceInfo.brand}-${deviceInfo.modelName}-${deviceInfo.osName}-${deviceInfo.osVersion}-${deviceInfo.deviceType}-${deviceInfo.installTime}`;

    // Use a simple hash function for React Native compatibility
    const deviceId = `fp-${deviceInfo.osName.toLowerCase()}-${simpleHash(fingerprintString).substring(0, 32)}-trip42`;

    console.log('📱 Generated device fingerprint:', {
      brand: deviceInfo.brand,
      model: deviceInfo.modelName,
      os: `${deviceInfo.osName} ${deviceInfo.osVersion}`,
      fingerprint: deviceId
    });

    return deviceId;
  } catch (error) {
    console.error('❌ Error generating device fingerprint:', error);
    // Fallback to UUID if fingerprinting fails
    return `fp-fallback-${generateUUID()}`;
  }
};

// Simple hash function for React Native compatibility
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16).padStart(8, '0');
};

// UUID generation function for React Native
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Initialize credits for new device
export const initializeCredits = async (): Promise<UserCredits> => {
  try {
    console.log('=== INITIALIZING CREDITS ===');

    // Get or create device ID
    let deviceId = await AsyncStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = await generateDeviceFingerprint();
      await AsyncStorage.setItem('deviceId', deviceId);
      console.log('📱 Generated NEW device fingerprint for credits:', deviceId);
    } else {
      console.log('📱 Using EXISTING device fingerprint:', deviceId);
    }

    // Check if credits already initialized
    const existingCredits = await AsyncStorage.getItem('userCredits');
    if (existingCredits) {
      const parsedCredits = JSON.parse(existingCredits);
      console.log('💰 Existing credits found:', parsedCredits.balance);
      return parsedCredits;
    }

    // Initialize with welcome credits
    const initialCredits: UserCredits = {
      balance: 100,
      history: [{
        date: new Date().toISOString(),
        description: 'Welcome Credits',
        amount: 100,
        type: 'credit'
      }],
      deviceId,
      isAnonymous: true
    };

    await AsyncStorage.setItem('userCredits', JSON.stringify(initialCredits));
    console.log('💰 Initialized credits with 100 welcome credits');
    return initialCredits;

  } catch (error) {
    console.error('❌ Error initializing credits:', error);
    // Return fallback credits
    return {
      balance: 100,
      history: [{
        date: new Date().toISOString(),
        description: 'Welcome Credits (Fallback)',
        amount: 100,
        type: 'credit'
      }],
      deviceId: 'fallback-device',
      isAnonymous: true
    };
  }
};

// Get current credits
export const getCredits = async (): Promise<UserCredits> => {
  try {
    const creditsData = await AsyncStorage.getItem('userCredits');
    if (creditsData) {
      return JSON.parse(creditsData);
    }

    // Initialize if not found
    return await initializeCredits();
  } catch (error) {
    console.error('❌ Error getting credits:', error);
    return await initializeCredits();
  }
};

// Deduct credits for a service
export const deductCredits = async (amount: number, description: string): Promise<boolean> => {
  try {
    console.log(`Attempting to deduct ${amount} credits for: ${description}`);

    const currentCredits = await getCredits();
    console.log(`Current credits: ${currentCredits.balance}`);

    // Check if user has enough credits
    if (currentCredits.balance < amount) {
      console.log(`Insufficient credits: need ${amount}, have ${currentCredits.balance}`);
      return false;
    }

    // Deduct credits
    const newBalance = currentCredits.balance - amount;
    const newHistoryEntry: CreditHistoryEntry = {
      date: new Date().toISOString(),
      description,
      amount: -amount,
      type: 'debit'
    };

    const updatedCredits: UserCredits = {
      ...currentCredits,
      balance: newBalance,
      history: [newHistoryEntry, ...currentCredits.history]
    };

    await AsyncStorage.setItem('userCredits', JSON.stringify(updatedCredits));
    console.log(`Credits deducted successfully. New balance: ${newBalance}`);
    return true;

  } catch (error) {
    console.error('❌ Error deducting credits:', error);
    return false;
  }
};

// Add credits (for voucher redemption)
export const addCredits = async (amount: number, description: string): Promise<boolean> => {
  try {
    console.log(`Adding ${amount} credits for: ${description}`);

    const currentCredits = await getCredits();

    const newBalance = currentCredits.balance + amount;
    const newHistoryEntry: CreditHistoryEntry = {
      date: new Date().toISOString(),
      description,
      amount,
      type: 'credit'
    };

    const updatedCredits: UserCredits = {
      ...currentCredits,
      balance: newBalance,
      history: [newHistoryEntry, ...currentCredits.history]
    };

    await AsyncStorage.setItem('userCredits', JSON.stringify(updatedCredits));
    console.log(`Credits added successfully. New balance: ${newBalance}`);
    return true;

  } catch (error) {
    console.error('❌ Error adding credits:', error);
    return false;
  }
};

// Redeem voucher
export const redeemVoucher = async (voucherCode: string): Promise<{ success: boolean; creditsRedeemed?: number; error?: string }> => {
  try {
    console.log('🎫 Attempting to redeem voucher:', voucherCode.toUpperCase());

    const currentCredits = await getCredits();

    // Special hidden voucher for testing
    if (voucherCode.trim().toLowerCase() === '42ikigai') {
      console.log('🎫 Special test voucher detected: 42ikigai');
      const added = await addCredits(100, 'Test Voucher: 42ikigai');
      if (added) {
        console.log('🎫 Test voucher redeemed successfully: 100 credits');
        return { success: true, creditsRedeemed: 100 };
      } else {
        return { success: false, error: 'Failed to add test credits' };
      }
    }

    // Call the Supabase edge function for regular vouchers
    const response = await fetch('https://ofialssoolmzckjjngst.supabase.co/functions/v1/redeem-voucher', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWFsc3Nvb2xtemNrampuZ3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDQxMTMsImV4cCI6MjA3MjUyMDExM30.Dcch9cqaiqaRPQopBB384EYXq4CCIHkcDFvvFVHkXwk`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maWFsc3Nvb2xtemNrampuZ3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDQxMTMsImV4cCI6MjA3MjUyMDExM30.Dcch9cqaiqaRPQopBB384EYXq4CCIHkcDFvvFVHkXwk'
      },
      body: JSON.stringify({
        voucherCode: voucherCode.trim().toUpperCase(),
        deviceId: currentCredits.deviceId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('🎫 Voucher redemption failed:', data);
      return { success: false, error: data.error || 'Failed to redeem voucher' };
    }

    if (data.success) {
      // Add credits locally
      const added = await addCredits(data.creditsRedeemed, `Voucher redemption: ${voucherCode.toUpperCase()}`);
      if (added) {
        console.log('🎫 Voucher redeemed successfully:', data.creditsRedeemed, 'credits');
        return { success: true, creditsRedeemed: data.creditsRedeemed };
      } else {
        return { success: false, error: 'Failed to add credits locally' };
      }
    } else {
      return { success: false, error: data.error || 'Failed to redeem voucher' };
    }

  } catch (error: any) {
    console.error('🎫 Voucher redemption error:', error);
    return { success: false, error: error.message || 'Failed to redeem voucher' };
  }
};

// Update credits (for syncing with server)
export const updateCredits = async (newCredits: UserCredits): Promise<void> => {
  try {
    await AsyncStorage.setItem('userCredits', JSON.stringify(newCredits));
    console.log('💰 Credits updated:', newCredits.balance);
  } catch (error) {
    console.error('❌ Error updating credits:', error);
  }
};