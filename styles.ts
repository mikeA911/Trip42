import { StyleSheet, Platform } from 'react-native';

// Create styles object directly to avoid StyleSheet.create issues with React Native Web
const stylesObject = {
  // Landing Page Styles
  landingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  teachingContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 15,
  },
  teachingText: {
    color: '#ffff00',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '700' as const,
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  logoTouchable: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    resizeMode: 'contain',
  },
  spinButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  spinButtonText: {
    color: '#ffff00',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  dateTimeContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dateText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '400' as const,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  clockText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  versionText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '400' as const,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // Calendar Modal Styles
  calendarModalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 350,
    maxHeight: '80%',
  },
  calendarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
    textAlign: 'center',
    marginBottom: 15,
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  navButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  calendarHeaderText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold' as const,
    width: 35,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  calendarDay: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 17.5,
  },
  calendarDaySelected: {
    backgroundColor: '#f59e0b',
  },
  calendarDayText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  calendarDayTextSelected: {
    color: '#000',
    fontWeight: 'bold' as const,
  },
  calendarCloseButton: {
    backgroundColor: '#6b7280',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  calendarDayWithNotes: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  calendarDayTextWithNotes: {
    color: '#f59e0b',
    fontWeight: 'bold' as const,
  },
  noteIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f59e0b',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Fun Tools Styles
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
  // Map Tool Styles
  locationCard: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  locationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 5,
  },
  locationText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  locationAddress: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
    fontStyle: 'italic' as const,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  searchButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center' as const,
  },
  searchButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  placesSection: {
    marginBottom: 20,
  },
  placeCard: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 15,
  },
  placeIconText: {
    fontSize: 16,
  },
  placeContent: {
    flex: 1,
  },
  placeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 5,
  },
  placeDetails: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 3,
  },
  placeDetailsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  placeRating: {
    color: '#fbbf24',
    fontSize: 12,
    marginRight: 10,
  },
  placeDistance: {
    color: '#6b7280',
    fontSize: 12,
    marginRight: 10,
  },
  placePrice: {
    color: '#10b981',
    fontSize: 12,
    marginRight: 10,
  },
  placeStatus: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    marginTop: 2,
  },
  placeOpen: {
    color: '#10b981',
  },
  placeClosed: {
    color: '#ef4444',
  },
  placeAddress: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  quickSearchSection: {
    marginBottom: 20,
  },
  quickButtons: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  quickButton: {
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    margin: 4,
  },
  quickButtonText: {
    color: '#f59e0b',
    fontSize: 14,
  },
  viewMapButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    alignSelf: 'flex-start' as const,
  },
  viewMapButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  placeActions: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: 10,
  },
  directionsButton: {
    backgroundColor: '#059669',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 15,
    backgroundColor: '#1f2937',
    paddingTop: 50, // Account for status bar
  },
  mapModalCloseButton: {
    padding: 8,
  },
  mapModalCloseButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  mapModalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    marginHorizontal: 10,
  },
  mapModalPlaceholder: {
    width: 50,
  },
  mapWebView: {
    flex: 1,
  },
  locationActions: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: 10,
  },
  saveMapButton: {
    backgroundColor: '#10b981',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveMapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fullMapButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fullMapButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  mapContainer: {
    marginTop: 10,
    height: 200,
    borderRadius: 10,
    overflow: 'hidden' as const,
  },
  inlineMap: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 20,
  },
  mapPlaceholderText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  // Medicine Tool Styles
  disclaimerBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  disclaimerText: {
    color: '#92400e',
    fontSize: 12,
    lineHeight: 16,
  },
  disclaimerBold: {
    fontWeight: 'bold' as const,
  },
  countrySection: {
    marginBottom: 20,
  },
  labelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 10,
  },
  countryScroll: {
    marginTop: 10,
  },
  countryButton: {
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  countryButtonSelected: {
    backgroundColor: '#f59e0b',
  },
  countryButtonText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  countryButtonTextSelected: {
    color: '#000',
    fontWeight: 'bold' as const,
  },
  resultsSection: {
    marginBottom: 20,
  },
  medicineCard: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  resultText: {
    color: '#fff',
    fontSize: 14,
  },
  // Settings Styles
  settingsSection: {
    marginBottom: 20,
  },
  settingsLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 10,
  },
  dropdownButton: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#f59e0b',
    fontSize: 14,
  },
  dropdownList: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
  },
  tagsSection: {
    marginBottom: 15,
  },
  tagsSubLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginBottom: 10,
  },
  permanentTag: {
    backgroundColor: '#374151',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  permanentTagText: {
    color: '#f59e0b',
    fontSize: 14,
  },
  customTag: {
    backgroundColor: '#10b981',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  customTagText: {
    color: '#fff',
    fontSize: 14,
  },
  addTagContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  addTagInput: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  addTagButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  addTagButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  backButton: {
    backgroundColor: '#6b7280',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center' as const,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  medicineHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  medicineName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  saveNoteButton: {
    backgroundColor: '#10b981',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveNoteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  medicineDetail: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 5,
  },
  medicineNotes: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic' as const,
  },
  commonMedicinesSection: {
    marginBottom: 20,
  },
  commonMedicines: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  commonMedicineButton: {
    backgroundColor: '#374151',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  commonMedicineText: {
    color: '#f59e0b',
    fontSize: 12,
  },
  // Calculator Tool Styles
  calculatorDisplay: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    minHeight: 100,
    justifyContent: 'center' as const,
  },
  calculatorDisplayText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 5,
  },
  calculatorResultText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold' as const,
    textAlign: 'right' as const,
  },
  calculatorKeypad: {
    marginBottom: 20,
  },
  calculatorRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
  },
  calculatorButton: {
    backgroundColor: '#374151',
    borderRadius: 10,
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  calculatorButtonEquals: {
    backgroundColor: '#f59e0b',
  },
  calculatorButtonSpecial: {
    backgroundColor: '#6b7280',
  },
  calculatorButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  calculatorButtonTextEquals: {
    color: '#000',
  },
  calculatorButtonTextSpecial: {
    color: '#fff',
  },
  calculatorInstructions: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 15,
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 10,
  },
  instructionText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 5,
  },
  tagsSelectorContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
  },
  tagsSelectorList: {
    maxHeight: 150,
  },
  tagSelectorItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  languageFlagButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    alignItems: 'center' as const,
    minWidth: 80,
    maxWidth: 100,
    flex: 1,
  },
  languageFlagButtonSelected: {
    backgroundColor: '#f59e0b',
  },
  languageFlagText: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 4,
  },
  languageFlagTextSelected: {
    color: '#000',
  },
  languageFlagLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center' as const,
  },
  languageFlagLabelSelected: {
    color: '#000',
    fontWeight: 'bold' as const,
  },
  tagSelectorText: {
    color: '#fff',
    fontSize: 16,
  },
  currentTagsContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  currentTagsLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  currentTagsList: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  currentTag: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 2,
  },
  currentTagText: {
    color: '#f59e0b',
    fontSize: 12,
  },
  noTagsText: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic' as const,
  },
  actionButtonsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginTop: 15,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  selectedLanguagesContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  selectedLanguagesLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  flagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginTop: 5,
  },
  flagEmoji: {
    fontSize: 24,
    marginRight: 8,
    marginBottom: 4,
    color: '#fff',
  },
  moreFlagsText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic' as const,
    alignSelf: 'center' as const,
  },
  tagsDropdownContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  enabledTagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginLeft: 10,
    flex: 1,
  },
  enabledTagIcon: {
    fontSize: 16,
    marginRight: 4,
    color: '#fff',
  },
  enabledTagItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#374151',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 2,
  },
  enabledTagDelete: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold' as const,
    marginLeft: 4,
  },
  enabledTagsLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginLeft: 10,
    marginRight: 8,
  },
  enabledTagsList: {
    marginTop: 10,
  },
  tagSelectorItemDisabled: {
    backgroundColor: '#2d3748',
    opacity: 0.6,
  },
  tagSelectorItemTextDisabled: {
    color: '#6b7280',
  },
  tagOptionDisabled: {
    backgroundColor: '#2d3748',
    opacity: 0.6,
  },
  tagOptionTextDisabled: {
    color: '#6b7280',
  },
  quickSelectLanguages: {
    marginTop: 15,
    marginBottom: 10,
  },
  quickSelectLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  quickSelectButtons: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  quickSelectLangButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    margin: 4,
  },
  quickSelectLangButtonSelected: {
    backgroundColor: '#000',
  },
  quickSelectLangText: {
    fontSize: 20,
    color: '#000',
  },
  quickSelectLangTextSelected: {
    color: '#f59e0b',
  },
  languageSelectionContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  languageOptionsList: {
    marginTop: 8,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-start' as const,
  },
  languageOptionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  checkboxText: {
    fontSize: 18,
    color: '#f59e0b',
    marginRight: 10,
  },
  languageOptionText: {
    color: '#9ca3af',
    fontSize: 16,
    marginLeft: 12,
  },
  languageOptionTextSelected: {
    color: '#f59e0b',
    fontWeight: 'bold' as const,
  },
  addLanguageRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addLanguageText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
};

// Use plain object for styles to avoid TypeScript issues
export const sharedStyles = stylesObject;