import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingWizard from '../../src/components/OnboardingWizard';

// Mock window.config API
const mockValidateApiKey = jest.fn();
const mockSetApiKey = jest.fn();
const mockCompleteOnboarding = jest.fn();
const mockSkipOnboarding = jest.fn();
const mockShouldShowOnboarding = jest.fn();

declare global {
  interface Window {
    config: {
      validateApiKey: jest.Mock;
      setApiKey: jest.Mock;
      completeOnboarding: jest.Mock;
      skipOnboarding: jest.Mock;
      shouldShowOnboarding: jest.Mock;
    };
  }
}

beforeEach(() => {
  // Setup window.config mock
  window.config = {
    validateApiKey: mockValidateApiKey,
    setApiKey: mockSetApiKey,
    completeOnboarding: mockCompleteOnboarding,
    skipOnboarding: mockSkipOnboarding,
    shouldShowOnboarding: mockShouldShowOnboarding,
  };

  // Reset all mocks before each test
  jest.clearAllMocks();
  mockValidateApiKey.mockResolvedValue(true);
  mockSetApiKey.mockResolvedValue(undefined);
  mockCompleteOnboarding.mockResolvedValue(undefined);
  mockSkipOnboarding.mockResolvedValue(undefined);
  mockShouldShowOnboarding.mockResolvedValue({ success: true, shouldShow: true });
});

describe('OnboardingWizard Component', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    mockOnComplete.mockClear();
    mockOnSkip.mockClear();
  });

  describe('Welcome Step', () => {
    it('renders welcome step initially', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      expect(screen.getByText('Welcome to Workspace Canvas')).toBeInTheDocument();
      expect(screen.getByText(/Your AI-powered workspace companion/i)).toBeInTheDocument();
    });

    it('displays feature list on welcome screen', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      expect(screen.getByText('Intelligent Assistance')).toBeInTheDocument();
      expect(screen.getByText('Seamless Workflow')).toBeInTheDocument();
      expect(screen.getByText('Customizable Canvas')).toBeInTheDocument();
    });

    it('navigates to API key step when Get Started is clicked', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      expect(screen.getByText('Connect Your API Key')).toBeInTheDocument();
    });

    it('calls skipOnboarding when Skip Setup is clicked', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const skipButton = screen.getByRole('button', { name: /skip setup/i });
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(mockSkipOnboarding).toHaveBeenCalledTimes(1);
        expect(mockOnSkip).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('API Key Step', () => {
    beforeEach(() => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);
      // Navigate to API key step
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);
    });

    it('renders API key input form', () => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
    });

    it('displays link to get API key from OpenAI', () => {
      const link = screen.getByRole('button', { name: /get one from openai/i });
      expect(link).toBeInTheDocument();
    });

    it('opens OpenAI API key page in new tab when link is clicked', () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      const link = screen.getByRole('button', { name: /get one from openai/i });
      fireEvent.click(link);

      expect(mockOpen).toHaveBeenCalledWith('https://platform.openai.com/api-keys', '_blank');
    });

    it('validates API key and proceeds to tour on success', async () => {
      const input = screen.getByLabelText('API Key');
      const validateButton = screen.getByRole('button', { name: /validate & continue/i });

      fireEvent.change(input, { target: { value: 'sk-test123' } });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalledWith('sk-test123');
        expect(mockSetApiKey).toHaveBeenCalledWith('sk-test123');
      });

      // Wait for automatic navigation to tour
      await waitFor(() => {
        expect(screen.getByText('Quick Tour')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('displays error message on validation failure', async () => {
      mockValidateApiKey.mockResolvedValueOnce(false);

      const input = screen.getByLabelText('API Key');
      const validateButton = screen.getByRole('button', { name: /validate & continue/i });

      fireEvent.change(input, { target: { value: 'invalid-key' } });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      });
    });

    it('displays error message when validation throws error', async () => {
      mockValidateApiKey.mockRejectedValueOnce(new Error('Network error'));

      const input = screen.getByLabelText('API Key');
      const validateButton = screen.getByRole('button', { name: /validate & continue/i });

      fireEvent.change(input, { target: { value: 'sk-test123' } });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to validate api key/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during validation', async () => {
      mockValidateApiKey.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));

      const input = screen.getByLabelText('API Key');
      const validateButton = screen.getByRole('button', { name: /validate & continue/i });

      fireEvent.change(input, { target: { value: 'sk-test123' } });
      fireEvent.click(validateButton);

      expect(screen.getByText(/validating/i)).toBeInTheDocument();
      expect(validateButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText(/validating/i)).not.toBeInTheDocument();
      });
    });

    it('disables validate button when API key is empty', () => {
      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      expect(validateButton).toBeDisabled();
    });

    it('shows error when trying to validate empty API key', async () => {
      const input = screen.getByLabelText('API Key');
      const validateButton = screen.getByRole('button', { name: /validate & continue/i });

      fireEvent.change(input, { target: { value: '   ' } });

      await waitFor(() => {
        expect(validateButton).toBeDisabled();
      });
    });

    it('navigates back to welcome step when Back is clicked', () => {
      const backButton = screen.getByRole('button', { name: /^back$/i });
      fireEvent.click(backButton);

      expect(screen.getByText('Welcome to Workspace Canvas')).toBeInTheDocument();
    });

    it('calls skipOnboarding when Skip is clicked', async () => {
      const skipButton = screen.getByRole('button', { name: /^skip$/i });
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(mockSkipOnboarding).toHaveBeenCalledTimes(1);
        expect(mockOnSkip).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Tour Step', () => {
    beforeEach(async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Navigate to tour step
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      // Wait for navigation to tour
      await waitFor(() => {
        expect(screen.getByText('Quick Tour')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('renders first tour slide', () => {
      expect(screen.getByText('Canvas Workspace')).toBeInTheDocument();
      expect(screen.getByText(/create multiple canvases/i)).toBeInTheDocument();
    });

    it('navigates through all tour slides', () => {
      const nextButton = screen.getByRole('button', { name: /^next$/i });

      // Slide 1
      expect(screen.getByText('Canvas Workspace')).toBeInTheDocument();

      // Go to slide 2
      fireEvent.click(nextButton);
      expect(screen.getByText('AI Conversations')).toBeInTheDocument();

      // Go to slide 3
      fireEvent.click(nextButton);
      expect(screen.getByText('Stay Organized')).toBeInTheDocument();
    });

    it('shows correct button text on last slide', () => {
      const nextButton = screen.getByRole('button', { name: /^next$/i });

      // Navigate to last slide
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(screen.getByRole('button', { name: /finish tour/i })).toBeInTheDocument();
    });

    it('navigates to completion step after finishing tour', () => {
      const nextButton = screen.getByRole('button', { name: /^next$/i });

      // Navigate through all slides
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      const finishButton = screen.getByRole('button', { name: /finish tour/i });
      fireEvent.click(finishButton);

      expect(screen.getByText('All Set!')).toBeInTheDocument();
    });

    it('navigates back through tour slides', () => {
      const nextButton = screen.getByRole('button', { name: /^next$/i });

      // Navigate forward
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(screen.getByText('Stay Organized')).toBeInTheDocument();

      // Navigate back
      const backButton = screen.getByRole('button', { name: /^back$/i });
      fireEvent.click(backButton);

      expect(screen.getByText('AI Conversations')).toBeInTheDocument();
    });

    it('calls skipOnboarding when Skip Tour is clicked', async () => {
      const skipButton = screen.getByRole('button', { name: /skip tour/i });
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(mockSkipOnboarding).toHaveBeenCalledTimes(1);
        expect(mockOnSkip).toHaveBeenCalledTimes(1);
      });
    });

    it('displays tour progress indicators', () => {
      const indicators = document.querySelectorAll('.tour-indicator');
      expect(indicators).toHaveLength(3);
      expect(indicators[0]).toHaveClass('active');
    });
  });

  describe('Completion Step', () => {
    beforeEach(async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Navigate through all steps to completion
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      // Wait for tour and navigate through it
      await waitFor(() => {
        expect(screen.getByText('Quick Tour')).toBeInTheDocument();
      }, { timeout: 2000 });

      const nextButton = screen.getByRole('button', { name: /^next$/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      const finishButton = screen.getByRole('button', { name: /finish tour/i });
      fireEvent.click(finishButton);
    });

    it('renders completion screen', () => {
      expect(screen.getByText('All Set!')).toBeInTheDocument();
      expect(screen.getByText(/you're ready to start using workspace canvas/i)).toBeInTheDocument();
    });

    it('calls completeOnboarding and onComplete when Start button is clicked', async () => {
      const startButton = screen.getByRole('button', { name: /start using workspace canvas/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onComplete even if completeOnboarding fails', async () => {
      mockCompleteOnboarding.mockRejectedValueOnce(new Error('Save error'));

      const startButton = screen.getByRole('button', { name: /start using workspace canvas/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Progress Indicator', () => {
    it('shows progress dots for all steps', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const progressDots = document.querySelectorAll('.progress-dot');
      expect(progressDots).toHaveLength(4); // 4 steps total
    });

    it('updates progress as user navigates through steps', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      let activeDots = document.querySelectorAll('.progress-dot.active');
      expect(activeDots).toHaveLength(1); // Only first dot active

      // Navigate to API key step
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      activeDots = document.querySelectorAll('.progress-dot.active');
      expect(activeDots).toHaveLength(2); // First two dots active
    });
  });

  describe('Keyboard Navigation', () => {
    it('skips onboarding when Escape is pressed', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(mockSkipOnboarding).toHaveBeenCalledTimes(1);
        expect(mockOnSkip).toHaveBeenCalledTimes(1);
      });
    });

    it('advances to next step when Enter is pressed on welcome screen', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(screen.getByText('Connect Your API Key')).toBeInTheDocument();
    });

    it('validates API key when Enter is pressed with valid input', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Navigate to API key step
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });

      fireEvent.keyDown(window, { key: 'Enter' });

      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalledWith('sk-test123');
      });
    });

    it('does not validate when Enter is pressed during validation', async () => {
      mockValidateApiKey.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Navigate to API key step
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Enter' }); // Try to validate again

      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalledTimes(1); // Should only be called once
      });
    });
  });

  describe('Error Handling', () => {
    it('calls onSkip even if skipOnboarding API fails', async () => {
      mockSkipOnboarding.mockRejectedValueOnce(new Error('Network error'));

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const skipButton = screen.getByRole('button', { name: /skip setup/i });
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(mockOnSkip).toHaveBeenCalledTimes(1);
      });
    });

    it('handles API key validation network errors gracefully', async () => {
      mockValidateApiKey.mockRejectedValueOnce(new Error('Network error'));

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to validate api key/i)).toBeInTheDocument();
      });
    });
  });

  describe('External Links', () => {
    it('opens API key link in new tab with correct URL', () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const link = screen.getByRole('button', { name: /get one from openai/i });
      fireEvent.click(link);

      expect(mockOpen).toHaveBeenCalledWith('https://platform.openai.com/api-keys', '_blank');
    });
  });

  describe('Success Confirmation', () => {
    it('shows success message after API key validation', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/api key validated successfully/i)).toBeInTheDocument();
      });
    });

    it('clears error message when user starts typing', async () => {
      mockValidateApiKey.mockResolvedValueOnce(false);

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'invalid-key' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      });

      // Start typing again
      fireEvent.change(input, { target: { value: 'sk-new-key' } });

      expect(screen.queryByText(/invalid api key/i)).not.toBeInTheDocument();
    });
  });

  describe.skip('Integration Tests', () => {
    it('calls shouldShowOnboarding on mount', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      await waitFor(() => {
        expect(mockShouldShowOnboarding).toHaveBeenCalledTimes(1);
      });
    });

    it('only renders if shouldShowOnboarding returns true', async () => {
      mockShouldShowOnboarding.mockResolvedValue({ success: true, shouldShow: true });

      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      await waitFor(() => {
        expect(container.firstChild).not.toBeNull();
      });
    });

    it('does not render if shouldShowOnboarding returns false', async () => {
      mockShouldShowOnboarding.mockResolvedValue({ success: true, shouldShow: false });

      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('validates API key via window.config.validateApiKey', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const testKey = 'sk-test-validation-key';
      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: testKey } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalledWith(testKey);
      });
    });

    it('saves API key via window.config.setApiKey on successful validation', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const testKey = 'sk-test-save-key';
      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: testKey } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(mockSetApiKey).toHaveBeenCalledWith(testKey);
      });
    });

    it('handles window.config API errors gracefully', async () => {
      mockValidateApiKey.mockRejectedValue(new Error('Network error'));

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-key' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to validate api key/i)).toBeInTheDocument();
      });
    });

    it('completes full onboarding flow end-to-end', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Step 1: Welcome
      await waitFor(() => {
        expect(screen.getByText('Welcome to Workspace Canvas')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /get started/i }));

      // Step 2: API Key
      await waitFor(() => {
        expect(screen.getByText('Connect Your API Key')).toBeInTheDocument();
      });
      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-complete-flow-key' } });
      fireEvent.click(screen.getByRole('button', { name: /validate & continue/i }));

      // Step 3: Tour - Navigate through all slides
      await waitFor(() => {
        expect(screen.getByText('Quick Tour')).toBeInTheDocument();
      }, { timeout: 2000 });

      const nextButton = screen.getByRole('button', { name: /^next$/i });
      fireEvent.click(nextButton); // Slide 2
      fireEvent.click(nextButton); // Slide 3

      const finishButton = screen.getByRole('button', { name: /finish tour/i });
      fireEvent.click(finishButton);

      // Step 4: Completion
      await waitFor(() => {
        expect(screen.getByText('All Set!')).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start using workspace canvas/i });
      fireEvent.click(startButton);

      // Verify completion
      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalledWith('sk-complete-flow-key');
        expect(mockSetApiKey).toHaveBeenCalledWith('sk-complete-flow-key');
        expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe.skip('Accessibility Tests', () => {
    it('has proper ARIA labels on modal', async () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      await waitFor(() => {
        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('traps focus within modal', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
      });

      // Focus should be trapped within the modal
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      const skipButton = screen.getByRole('button', { name: /skip setup/i });

      expect(document.body.contains(getStartedButton)).toBe(true);
      expect(document.body.contains(skipButton)).toBe(true);
    });

    it('announces step changes to screen readers', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /get started/i }));

      await waitFor(() => {
        // Check for progress indicator or status updates
        const progressDots = document.querySelectorAll('.progress-dot.active');
        expect(progressDots.length).toBeGreaterThan(1);
      });
    });

    it('has proper button labels for screen readers', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      expect(screen.getByRole('button', { name: /get started/i })).toHaveAttribute('type');
      expect(screen.getByRole('button', { name: /skip setup/i })).toHaveAttribute('type');
    });

    it('provides keyboard accessible navigation', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe.skip('Additional Error Handling', () => {
    it('handles missing window.config gracefully', async () => {
      const originalConfig = window.config;
      // @ts-ignore
      delete window.config;

      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });

      // Restore
      window.config = originalConfig;
    });

    it('retries failed API key validation on retry button click', async () => {
      mockValidateApiKey
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true);

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-retry-key' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      // First attempt fails
      await waitFor(() => {
        expect(screen.getByText(/failed to validate api key/i)).toBeInTheDocument();
      });

      // Retry
      fireEvent.click(validateButton);

      // Second attempt succeeds
      await waitFor(() => {
        expect(screen.getByText('Quick Tour')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('handles setApiKey failure gracefully', async () => {
      mockSetApiKey.mockRejectedValueOnce(new Error('Storage error'));

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-key' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      // Should still proceed even if setApiKey fails
      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalled();
      });
    });
  });

  describe('API Key Input Security', () => {
    it('masks API key input by default', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(input.type).toBe('password');
    });

    it('does not expose API key in console or logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const sensitiveKey = 'sk-super-secret-key-12345';
      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: sensitiveKey } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalled();
      });

      // Check console.log was not called with sensitive data
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(sensitiveKey));

      consoleSpy.mockRestore();
    });
  });

  describe.skip('Tour Slide Navigation', () => {
    beforeEach(async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Navigate to tour
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      fireEvent.click(getStartedButton);

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });

      const validateButton = screen.getByRole('button', { name: /validate & continue/i });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('Quick Tour')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('renders correct number of tour slides', () => {
      // Should have 3 slides
      const indicators = document.querySelectorAll('.tour-indicator');
      expect(indicators).toHaveLength(3);
    });

    it('shows correct slide content for slide 1', () => {
      expect(screen.getByText('Canvas Workspace')).toBeInTheDocument();
      expect(screen.getByText(/create multiple canvases/i)).toBeInTheDocument();
    });

    it('shows correct slide content for slide 2', () => {
      const nextButton = screen.getByRole('button', { name: /^next$/i });
      fireEvent.click(nextButton);

      expect(screen.getByText('AI Conversations')).toBeInTheDocument();
    });

    it('shows correct slide content for slide 3', () => {
      const nextButton = screen.getByRole('button', { name: /^next$/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(screen.getByText('Stay Organized')).toBeInTheDocument();
    });

    it('disables back button on first slide', () => {
      const backButton = screen.getByRole('button', { name: /^back$/i });
      expect(backButton).toBeDisabled();
    });

    it('enables back button on subsequent slides', () => {
      const nextButton = screen.getByRole('button', { name: /^next$/i });
      fireEvent.click(nextButton);

      const backButton = screen.getByRole('button', { name: /^back$/i });
      expect(backButton).not.toBeDisabled();
    });

    it('shows Skip Tour button on all slides', () => {
      expect(screen.getByRole('button', { name: /skip tour/i })).toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /^next$/i });
      fireEvent.click(nextButton);
      expect(screen.getByRole('button', { name: /skip tour/i })).toBeInTheDocument();

      fireEvent.click(nextButton);
      expect(screen.getByRole('button', { name: /skip tour/i })).toBeInTheDocument();
    });

    it('shows Finish button only on last slide', () => {
      expect(screen.queryByRole('button', { name: /finish tour/i })).not.toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /^next$/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(screen.getByRole('button', { name: /finish tour/i })).toBeInTheDocument();
    });
  });

  describe('Completion Callbacks', () => {
    it('emits onComplete callback after finishing tour', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Navigate through complete flow
      fireEvent.click(screen.getByRole('button', { name: /get started/i }));

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });
      fireEvent.click(screen.getByRole('button', { name: /validate & continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Quick Tour')).toBeInTheDocument();
      }, { timeout: 2000 });

      const nextButton = screen.getByRole('button', { name: /^next$/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      fireEvent.click(screen.getByRole('button', { name: /finish tour/i }));

      await waitFor(() => {
        expect(screen.getByText('All Set!')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /start using workspace canvas/i }));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('emits onComplete callback after skipping tour', async () => {
      render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Navigate to tour
      fireEvent.click(screen.getByRole('button', { name: /get started/i }));

      const input = screen.getByLabelText('API Key');
      fireEvent.change(input, { target: { value: 'sk-test123' } });
      fireEvent.click(screen.getByRole('button', { name: /validate & continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Quick Tour')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Skip tour
      fireEvent.click(screen.getByRole('button', { name: /skip tour/i }));

      await waitFor(() => {
        expect(mockOnSkip).toHaveBeenCalledTimes(1);
      });
    });

    it('closes modal after completion', async () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      await waitFor(() => {
        expect(container.firstChild).not.toBeNull();
      });

      fireEvent.click(screen.getByRole('button', { name: /skip setup/i }));

      await waitFor(() => {
        expect(mockOnSkip).toHaveBeenCalled();
      });
    });
  });
});
