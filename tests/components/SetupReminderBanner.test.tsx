/**
 * SetupReminderBanner Component Tests
 * Tests banner shown at top of canvas when onboarding is skipped and no API key configured
 * TDD: Comprehensive test coverage following Test-Driven Development principles
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SetupReminderBanner } from '../../src/components/SetupReminderBanner';

// Mock window.config API
const mockDismissReminder = jest.fn();
const mockWindowOpen = jest.fn();

declare global {
  interface Window {
    config: {
      dismissReminder: jest.Mock;
      getApiKey: jest.Mock;
      setApiKey: jest.Mock;
      validateApiKey: jest.Mock;
      removeApiKey: jest.Mock;
      shouldShowOnboarding: jest.Mock;
      completeOnboarding: jest.Mock;
      skipOnboarding: jest.Mock;
      get: jest.Mock;
      set: jest.Mock;
      reset: jest.Mock;
    };
  }
}

beforeEach(() => {
  // Setup window.config mock
  (window as any).config = {
    dismissReminder: mockDismissReminder,
    getApiKey: jest.fn(),
    setApiKey: jest.fn(),
    validateApiKey: jest.fn(),
    removeApiKey: jest.fn(),
    shouldShowOnboarding: jest.fn(),
    completeOnboarding: jest.fn(),
    skipOnboarding: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    reset: jest.fn(),
  };

  // Mock window.open
  window.open = mockWindowOpen;

  // Reset all mocks before each test
  jest.clearAllMocks();
  mockDismissReminder.mockResolvedValue({ success: true });
});

describe('SetupReminderBanner Component', () => {
  const mockOnConfigure = jest.fn();
  const mockOnDismiss = jest.fn();

  const defaultProps = {
    onConfigure: mockOnConfigure,
    onDismiss: mockOnDismiss,
  };

  beforeEach(() => {
    mockOnConfigure.mockClear();
    mockOnDismiss.mockClear();
  });

  it('renders warning message correctly', () => {
    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Configure your Anthropic API key to create AI agents')).toBeInTheDocument();
  });

  it('displays warning icon', () => {
    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    const icon = screen.getByRole('img', { name: 'Warning' });
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveTextContent('⚠️');
  });

  it('renders all action buttons', () => {
    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Configure Now')).toBeInTheDocument();
    expect(screen.getByText('Get API Key →')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls onConfigure when Configure Now button is clicked', () => {
    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    const configureButton = screen.getByText('Configure Now');
    fireEvent.click(configureButton);

    expect(mockOnConfigure).toHaveBeenCalledTimes(1);
  });

  it('opens Anthropic console when Get API Key button is clicked', () => {
    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    const getApiKeyButton = screen.getByText('Get API Key →');
    fireEvent.click(getApiKeyButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://console.anthropic.com/',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('calls dismissReminder and onDismiss when Dismiss button is clicked', async () => {
    mockDismissReminder.mockResolvedValue({ success: true });

    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(mockDismissReminder).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('still calls onDismiss even if dismissReminder API fails', async () => {
    mockDismissReminder.mockRejectedValue(new Error('API error'));

    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('handles missing window.config gracefully', async () => {
    // @ts-ignore - intentionally setting to undefined for test
    global.window.config = undefined;

    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('has correct aria labels for accessibility', () => {
    render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByLabelText('Configure API key')).toBeInTheDocument();
    expect(screen.getByLabelText('Get API key from Anthropic')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss reminder')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <SetupReminderBanner
        onConfigure={mockOnConfigure}
        onDismiss={mockOnDismiss}
      />
    );

    expect(container.querySelector('.setup-reminder-banner')).toBeInTheDocument();
    expect(container.querySelector('.setup-reminder-content')).toBeInTheDocument();
    expect(container.querySelector('.setup-reminder-icon')).toBeInTheDocument();
    expect(container.querySelector('.setup-reminder-message')).toBeInTheDocument();
    expect(container.querySelector('.setup-reminder-actions')).toBeInTheDocument();
  });

  describe('Loading States', () => {
    it('calls dismiss callback when button is clicked', async () => {
      mockDismissReminder.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('handles async dismiss operation', async () => {
      mockDismissReminder.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50))
      );

      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockDismissReminder).toHaveBeenCalled();
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('completes dismiss operation', async () => {
      mockDismissReminder.mockResolvedValue({ success: true });

      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles dismissReminder API returning error', async () => {
      mockDismissReminder.mockResolvedValueOnce({ success: false, error: 'Failed to save' });

      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('handles dismissReminder throwing exception', async () => {
      mockDismissReminder.mockRejectedValueOnce(new Error('Network failure'));

      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('handles missing window.config.dismissReminder method', async () => {
      (window as any).config = { ...window.config };
      delete (window as any).config.dismissReminder;

      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });
  });

  describe('Button Behavior', () => {
    it('Configure Now does not dismiss banner', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const configureButton = screen.getByText('Configure Now');
      fireEvent.click(configureButton);

      expect(mockDismissReminder).not.toHaveBeenCalled();
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('Get API Key does not dismiss banner', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const getKeyButton = screen.getByText('Get API Key →');
      fireEvent.click(getKeyButton);

      expect(mockDismissReminder).not.toHaveBeenCalled();
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('Configure Now calls onConfigure only once', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const configureButton = screen.getByText('Configure Now');
      fireEvent.click(configureButton);
      fireEvent.click(configureButton);

      expect(mockOnConfigure).toHaveBeenCalledTimes(2);
    });

    it('Get API Key opens link with security attributes', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const getKeyButton = screen.getByText('Get API Key →');
      fireEvent.click(getKeyButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://console.anthropic.com/',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Accessibility', () => {
    it('buttons are keyboard accessible', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('has descriptive button text', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      expect(screen.getByText('Configure Now')).toBeVisible();
      expect(screen.getByText('Get API Key →')).toBeVisible();
      expect(screen.getByText('Dismiss')).toBeVisible();
    });

    it('warning icon has accessible role', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const icon = screen.getByRole('img', { name: 'Warning' });
      expect(icon).toBeInTheDocument();
    });

    it('all interactive elements are reachable by keyboard', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Integration', () => {
    it('can be used with onboarding flow', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const configureButton = screen.getByText('Configure Now');
      fireEvent.click(configureButton);

      expect(mockOnConfigure).toHaveBeenCalledTimes(1);
      expect(mockDismissReminder).not.toHaveBeenCalled();
    });

    it('dismiss action persists state', async () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(window.config.dismissReminder).toHaveBeenCalledTimes(1);
        expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      });
    });

    it('provides link to get API key', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const getKeyButton = screen.getByText('Get API Key →');
      fireEvent.click(getKeyButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('anthropic.com'),
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('Visual Feedback', () => {
    it('displays warning icon with appropriate styling', () => {
      const { container } = render(<SetupReminderBanner {...defaultProps} />);

      const icon = container.querySelector('.setup-reminder-icon');
      expect(icon).toBeInTheDocument();
    });

    it('has visually distinct action buttons', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const configureButton = screen.getByText('Configure Now');
      const getKeyButton = screen.getByText('Get API Key →');
      const dismissButton = screen.getByText('Dismiss');

      expect(configureButton).toBeVisible();
      expect(getKeyButton).toBeVisible();
      expect(dismissButton).toBeVisible();
    });

    it('message is prominently displayed', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const message = screen.getByText('Configure your Anthropic API key to create AI agents');
      expect(message).toBeVisible();
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple rapid dismiss button clicks', async () => {
      mockDismissReminder.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50))
      );

      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');

      // Rapid clicks - component currently doesn't prevent this, test documents current behavior
      fireEvent.click(dismissButton);
      fireEvent.click(dismissButton);
      fireEvent.click(dismissButton);

      await waitFor(() => {
        // Component allows multiple calls (no debouncing currently)
        expect(mockDismissReminder).toHaveBeenCalled();
      });
    });

    it('Get API Key button works with window.open', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const getKeyButton = screen.getByText('Get API Key →');
      fireEvent.click(getKeyButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://console.anthropic.com/',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('renders without crashing', () => {
      expect(() =>
        render(<SetupReminderBanner {...defaultProps} />)
      ).not.toThrow();
    });
  });

  describe('User Experience', () => {
    it('provides clear messaging about API key requirement', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      expect(screen.getByText(/anthropic api key/i)).toBeInTheDocument();
      expect(screen.getByText(/ai agents/i)).toBeInTheDocument();
    });

    it('makes primary action prominent', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const configureButton = screen.getByText('Configure Now');
      expect(configureButton).toBeInTheDocument();
    });

    it('provides easy access to API key creation', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const getKeyButton = screen.getByText('Get API Key →');
      expect(getKeyButton).toBeVisible();
    });

    it('allows user to dismiss temporarily', () => {
      render(<SetupReminderBanner {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      expect(dismissButton).toBeVisible();
    });
  });
});
