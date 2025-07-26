import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getChatSuggestions } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Message Suggestions Component
 * Displays dynamic question suggestions based on authentication status
 */

const MessageSuggestions = ({ onSuggestionClick }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { canAccessFinancialData } = useAuth();
  const lastLoadTime = useRef(0);
  const hasLoaded = useRef(false);
  const currentAuthState = useRef(null);

  // Default suggestions for different states
  const defaultSuggestions = {
    notAuthenticated: [
      'Hello! How can you help me with my finances?',
      'What financial data can you access?',
      'How do I connect my Fi Money account?'
    ],
    authenticated: [
      'What is my current net worth?',
      'How are my mutual funds performing?',
      'Which investments are underperforming?',
      'What is my asset allocation?',
      'How much do I owe in loans and credit cards?',
      'Give me a portfolio analysis',
      'How has my net worth changed over time?',
      'Which fund has the best CAGR?'
    ]
  };

  // Load suggestions from backend with debouncing
  const loadSuggestions = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTime.current;
    
    // Prevent too frequent calls (minimum 10 seconds between calls)
    if (!force && timeSinceLastLoad < 10000) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await getChatSuggestions();
      setSuggestions(result.suggestions || []);
      lastLoadTime.current = now;
      hasLoaded.current = true;
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      
      // Don't show error for rate limiting, just use fallback
      if (!error.message.includes('Too many requests')) {
        setError('Failed to load suggestions');
      }
      
      // Fallback to default suggestions based on current auth state
      const currentSuggestions = currentAuthState.current 
        ? defaultSuggestions.authenticated 
        : defaultSuggestions.notAuthenticated;
      setSuggestions(currentSuggestions.slice(0, 6));
    } finally {
      setLoading(false);
    }
  }, []); // Remove canAccessFinancialData from dependencies

  // Load suggestions when component mounts or auth status changes
  useEffect(() => {
    // Update current auth state
    currentAuthState.current = canAccessFinancialData;
    
    // Only load once on mount or when auth status actually changes
    if (!hasLoaded.current || canAccessFinancialData !== undefined) {
      loadSuggestions(true);
    }
  }, [canAccessFinancialData]); // Remove loadSuggestions from dependencies

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  // Get current suggestions (backend or fallback)
  const currentSuggestions = suggestions.length > 0 
    ? suggestions 
    : (canAccessFinancialData 
        ? defaultSuggestions.authenticated 
        : defaultSuggestions.notAuthenticated
      ).slice(0, 6);

  if (loading && !hasLoaded.current) {
    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          <span className="text-sm text-gray-600">Loading suggestions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          💡 Suggested Questions
        </h4>
        <button
          onClick={() => loadSuggestions(true)}
          className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {currentSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion)}
            className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-sm text-gray-700 hover:text-indigo-800"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {currentSuggestions.length === 0 && !loading && (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">
            No suggestions available. Try asking a question!
          </p>
        </div>
      )}
    </div>
  );
};

export default MessageSuggestions; 