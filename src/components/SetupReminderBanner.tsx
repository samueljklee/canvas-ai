/**
 * Canvas AI - Setup Reminder Banner
 * Banner shown at top of canvas when API key is not configured
 */

import React from 'react';
import '../styles/SetupReminderBanner.css';

interface SetupReminderBannerProps {
  onConfigure: () => void;
  onDismiss: () => void;
}

export const SetupReminderBanner: React.FC<SetupReminderBannerProps> = ({
  onConfigure,
  onDismiss
}) => {
  const handleDismiss = async () => {
    try {
      if (window.config?.dismissReminder) {
        await window.config.dismissReminder();
      }
      onDismiss();
    } catch (error) {
      console.error('[SetupReminderBanner] Failed to dismiss reminder:', error);
      // Still call onDismiss even if API call fails
      onDismiss();
    }
  };

  const handleGetApiKey = () => {
    window.open('https://console.anthropic.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="setup-reminder-banner">
      <div className="setup-reminder-content">
        <span className="setup-reminder-icon" role="img" aria-label="Warning">
          ⚠️
        </span>
        <span className="setup-reminder-message">
          Configure your Anthropic API key to create AI agents
        </span>
        <div className="setup-reminder-actions">
          <button
            className="setup-reminder-button setup-reminder-button-primary"
            onClick={onConfigure}
            aria-label="Configure API key"
          >
            Configure Now
          </button>
          <button
            className="setup-reminder-button setup-reminder-button-link"
            onClick={handleGetApiKey}
            aria-label="Get API key from Anthropic"
          >
            Get API Key →
          </button>
          <button
            className="setup-reminder-button setup-reminder-button-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss reminder"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
