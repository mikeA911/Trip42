import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { sharedStyles as styles } from '../styles';

interface CalculatorToolProps {
  onBack?: () => void;
}

const CalculatorTool: React.FC<CalculatorToolProps> = ({ onBack }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num: number) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const getCalculationDescription = (): string => {
    if (!previousValue || !operation) return display;
    return `${previousValue} ${operation} ${display} = ${parseFloat(display)}`;
  };

  const buttons = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=']
  ];

  const handleButtonPress = (value: string) => {
    switch (value) {
      case 'C':
        clear();
        break;
      case '=':
        performCalculation();
        break;
      case '±':
        setDisplay(String(parseFloat(display) * -1));
        break;
      case '%':
        setDisplay(String(parseFloat(display) / 100));
        break;
      case '÷':
      case '×':
      case '-':
      case '+':
        performOperation(value);
        break;
      case '.':
        inputDecimal();
        break;
      default:
        if (!isNaN(Number(value))) {
          inputNumber(parseInt(value));
        }
        break;
    }
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧮 Calculator</Text>
        <Text style={styles.sectionDescription}>
          Simple calculator with save functionality
        </Text>

        {/* Display */}
        <View style={styles.calculatorDisplay}>
          <Text style={styles.calculatorDisplayText}>
            {getCalculationDescription()}
          </Text>
          <Text style={styles.calculatorResultText}>
            {display}
          </Text>
        </View>

        {/* Keypad */}
        <View style={styles.calculatorKeypad}>
          {buttons.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.calculatorRow}>
              {row.map((button) => (
                <TouchableOpacity
                  key={button}
                  style={[
                    styles.calculatorButton,
                    button === '=' && styles.calculatorButtonEquals,
                    ['C', '±', '%'].includes(button) && styles.calculatorButtonSpecial
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text style={[
                    styles.calculatorButtonText,
                    button === '=' && styles.calculatorButtonTextEquals,
                    ['C', '±', '%'].includes(button) && styles.calculatorButtonTextSpecial
                  ]}>
                    {button}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.calculatorInstructions}>
          <Text style={styles.instructionTitle}>💡 How to use:</Text>
          <Text style={styles.instructionText}>
            • Tap numbers to input values
          </Text>
          <Text style={styles.instructionText}>
            • Use operation buttons (+, -, ×, ÷) for calculations
          </Text>
          <Text style={styles.instructionText}>
            • Press = to calculate result
          </Text>
          <Text style={styles.instructionText}>
            • Press C to clear everything
          </Text>
        </View>
      </View>
    </View>
  );
};

export default CalculatorTool;