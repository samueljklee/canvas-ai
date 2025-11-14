/**
 * Canvas AI - Settings Modal
 * Configure application settings including API keys
 */

import React, { useState, useEffect } from 'react';
import '../styles/SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

type TabType = 'apikey' | 'general';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab }) => {
  const [activeTab, setActiveTab] = useState<TabType>('apikey');

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [keyPreview, setKeyPreview] = useState<string | null>(null);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadApiKeyStatus();
      // Set initial tab based on prop, or default to API key tab
      if (initialTab === 'api-keys') {
        setActiveTab('apikey');
      } else {
        setActiveTab('apikey'); // Default to API key tab
      }
    }
  }, [isOpen, initialTab]);

  // Clear message when user types
  useEffect(() => {
    if (message) {
      setMessage(null);
    }
  }, [apiKey]);

  const loadApiKeyStatus = async () => {
    setIsLoading(true);
    try {
      if (window.config?.getApiKey) {
        const result = await window.config.getApiKey();
        if (result.success) {
          setHasExistingKey(result.hasKey);
          setKeyPreview(result.keyPreview);
          setIsConnected(result.hasKey);

          // If we have a key, mark it as validated
          if (result.hasKey) {
            setLastValidated(new Date());
          }
        } else {
          console.error('[SettingsModal] Failed to get API key status:', result.error);
          setMessage({ type: 'error', text: result.error || 'Failed to load API key status' });
        }
      }
    } catch (error) {
      console.error('[SettingsModal] Failed to load API key:', error);
      setMessage({ type: 'error', text: 'Failed to load API key status' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setIsValidating(true);
    setMessage(null);

    try {
      if (window.config?.validateApiKey) {
        const result = await window.config.validateApiKey(apiKey);
        if (result.valid) {
          setMessage({ type: 'success', text: 'API key is valid!' });
          setLastValidated(new Date());
        } else {
          setMessage({ type: 'error', text: result.error || 'Invalid API key' });
        }
      }
    } catch (error) {
      console.error('[SettingsModal] Validation failed:', error);
      setMessage({ type: 'error', text: 'Failed to validate API key' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpdate = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      // Validate first
      if (window.config?.validateApiKey) {
        const validateResult = await window.config.validateApiKey(apiKey);
        if (!validateResult.valid) {
          setMessage({ type: 'error', text: validateResult.error || 'Invalid API key' });
          setIsUpdating(false);
          return;
        }
      }

      // Then save
      if (window.config?.setApiKey) {
        const result = await window.config.setApiKey(apiKey);
        if (result.success) {
          setMessage({ type: 'success', text: 'API key updated successfully!' });
          setLastValidated(new Date());

          // Refresh status
          await loadApiKeyStatus();

          // Clear input after successful save
          setApiKey('');
          setShowApiKey(false);

          // Auto-dismiss success message after 3 seconds
          setTimeout(() => setMessage(null), 3000);
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to save API key' });
        }
      }
    } catch (error) {
      console.error('[SettingsModal] Update failed:', error);
      setMessage({ type: 'error', text: 'Failed to update API key' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setMessage(null);

    try {
      if (window.config?.removeApiKey) {
        const result = await window.config.removeApiKey();
        if (result.success) {
          setMessage({ type: 'success', text: 'API key removed successfully' });
          setHasExistingKey(false);
          setKeyPreview(null);
          setIsConnected(false);
          setLastValidated(null);
          setApiKey('');
          setShowRemoveConfirm(false);

          // Auto-dismiss success message after 3 seconds
          setTimeout(() => setMessage(null), 3000);
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to remove API key' });
        }
      }
    } catch (error) {
      console.error('[SettingsModal] Remove failed:', error);
      setMessage({ type: 'error', text: 'Failed to remove API key' });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showRemoveConfirm) {
        setShowRemoveConfirm(false);
      } else {
        onClose();
      }
    }
  };

  const formatTimestamp = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="settings-modal-overlay" onClick={onClose} />
      <div className="settings-modal" onKeyDown={handleKeyDown}>
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'apikey' ? 'active' : ''}`}
            onClick={() => setActiveTab('apikey')}
          >
            API Key
          </button>
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
        </div>

        <div className="settings-modal-content">
          {/* API Key Tab */}
          {activeTab === 'apikey' && (
            <div className="settings-section">
              <h3>Anthropic API Key</h3>
              <p className="settings-description">
                Required for AI agent functionality.{' '}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="settings-external-link"
                >
                  Get Your API Key →
                </a>
              </p>

              {isLoading ? (
                <div className="settings-loading">
                  <div className="settings-spinner"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  {/* Status Display */}
                  <div className="api-status">
                    <div className="api-status-row">
                      <span className="api-status-label">Status:</span>
                      <span className={`api-status-value ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '✓ Connected' : '⚠️ Not Configured'}
                      </span>
                    </div>

                    {keyPreview && (
                      <div className="api-status-row">
                        <span className="api-status-label">Current Key:</span>
                        <span className="api-status-value api-key-preview">{keyPreview}</span>
                      </div>
                    )}

                    {lastValidated && (
                      <div className="api-status-row">
                        <span className="api-status-label">Last Validated:</span>
                        <span className="api-status-value">{formatTimestamp(lastValidated)}</span>
                      </div>
                    )}
                  </div>

                  {/* API Key Input */}
                  <div className="api-key-input-group">
                    <div className="api-key-input-wrapper">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        className="settings-input"
                        placeholder="sk-ant-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={isValidating || isUpdating || isRemoving}
                      />
                      <button
                        className="api-key-toggle"
                        onClick={() => setShowApiKey(!showApiKey)}
                        aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                        disabled={isValidating || isUpdating || isRemoving}
                      >
                        {showApiKey ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="settings-actions">
                    <button
                      className="settings-button settings-button-secondary"
                      onClick={handleValidate}
                      disabled={isValidating || isUpdating || isRemoving || !apiKey.trim()}
                    >
                      {isValidating ? (
                        <>
                          <span className="button-spinner"></span>
                          Validating...
                        </>
                      ) : (
                        'Validate Key'
                      )}
                    </button>

                    <button
                      className="settings-button settings-button-primary"
                      onClick={handleUpdate}
                      disabled={isValidating || isUpdating || isRemoving || !apiKey.trim()}
                    >
                      {isUpdating ? (
                        <>
                          <span className="button-spinner"></span>
                          Updating...
                        </>
                      ) : (
                        'Update Key'
                      )}
                    </button>

                    {hasExistingKey && !showRemoveConfirm && (
                      <button
                        className="settings-button settings-button-danger"
                        onClick={() => setShowRemoveConfirm(true)}
                        disabled={isValidating || isUpdating || isRemoving}
                      >
                        Remove Key
                      </button>
                    )}
                  </div>

                  {/* Remove Confirmation */}
                  {showRemoveConfirm && (
                    <div className="remove-confirm">
                      <p className="remove-confirm-text">
                        Are you sure you want to remove the API key? This action cannot be undone.
                      </p>
                      <div className="remove-confirm-actions">
                        <button
                          className="settings-button settings-button-secondary"
                          onClick={() => setShowRemoveConfirm(false)}
                          disabled={isRemoving}
                        >
                          Cancel
                        </button>
                        <button
                          className="settings-button settings-button-danger"
                          onClick={handleRemove}
                          disabled={isRemoving}
                        >
                          {isRemoving ? (
                            <>
                              <span className="button-spinner"></span>
                              Removing...
                            </>
                          ) : (
                            'Remove Key'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message Display */}
                  {message && (
                    <div className={`settings-message ${message.type}`}>
                      {message.text}
                    </div>
                  )}

                  <p className="settings-note">
                    💡 Your API key is stored securely and never shared.
                  </p>
                </>
              )}
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3>Theme</h3>
              <p className="settings-description">
                Choose your preferred color theme for the application.
              </p>

              <div className="settings-note" style={{ marginTop: '16px', padding: '12px', background: '#252525', borderRadius: '8px', border: '1px solid #3e3e3e' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
                  🎨 Light/Dark mode is coming soon! We're working on a full theme system that will allow you to customize the appearance of the application.
                </p>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h3>Feedback</h3>
                <p className="settings-description">
                  Have suggestions or found a bug? We'd love to hear from you!
                </p>
                <button
                  className="settings-button settings-button-secondary"
                  onClick={async () => {
                    await window.shell?.openExternal(`mailto:samule@microsoft.com?subject=${encodeURIComponent('Canvas AI Feedback')}&body=${encodeURIComponent('Hi Samuel,\n\nI wanted to share some feedback about Canvas AI:\n\n')}`);
                  }}
                  style={{ marginTop: '12px' }}
                >
                  📧 Send Feedback via Email
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-modal-footer">
          <p>
            Canvas AI · Press <kbd>Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
};
