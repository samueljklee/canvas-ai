import React, { useState, useEffect, useCallback } from 'react';
import '../styles/OnboardingWizard.css';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 'welcome' | 'api-key' | 'tour' | 'complete';

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [tourSlide, setTourSlide] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [validationSuccess, setValidationSuccess] = useState(false);

  const totalSteps = 4;
  const stepIndex = {
    welcome: 0,
    'api-key': 1,
    tour: 2,
    complete: 3,
  };

  const handleSkip = useCallback(async () => {
    try {
      await window.config.skipOnboarding();
      onSkip();
    } catch (err) {
      console.error('Error skipping onboarding:', err);
      onSkip();
    }
  }, [onSkip]);

  const handleNext = useCallback(() => {
    if (currentStep === 'welcome') {
      setCurrentStep('api-key');
    } else if (currentStep === 'api-key') {
      // API key step requires validation before proceeding
      return;
    } else if (currentStep === 'tour') {
      if (tourSlide < 2) {
        setTourSlide(tourSlide + 1);
      } else {
        setCurrentStep('complete');
      }
    } else if (currentStep === 'complete') {
      handleComplete();
    }
  }, [currentStep, tourSlide]);

  const handleBack = useCallback(() => {
    if (currentStep === 'tour' && tourSlide > 0) {
      setTourSlide(tourSlide - 1);
    } else if (currentStep === 'api-key') {
      setCurrentStep('welcome');
    } else if (currentStep === 'tour' && tourSlide === 0) {
      setCurrentStep('api-key');
      setValidationSuccess(false);
    }
  }, [currentStep, tourSlide]);

  const handleValidateApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const isValid = await window.config.validateApiKey(apiKey);

      if (isValid) {
        await window.config.setApiKey(apiKey);
        setValidationSuccess(true);
        setError('');

        // Automatically move to tour after brief success message
        setTimeout(() => {
          setCurrentStep('tour');
          setValidationSuccess(false);
        }, 1500);
      } else {
        setError('Invalid API key. Please check and try again.');
      }
    } catch (err) {
      setError('Failed to validate API key. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleComplete = async () => {
    try {
      await window.config.completeOnboarding();
      onComplete();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      onComplete();
    }
  };

  const handleGetApiKey = () => {
    window.open('https://console.anthropic.com/settings/keys', '_blank');
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'Enter' && currentStep !== 'api-key') {
        handleNext();
      } else if (e.key === 'Enter' && currentStep === 'api-key' && !isValidating) {
        handleValidateApiKey();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, handleSkip, handleNext, isValidating, apiKey]);

  const renderProgressIndicator = () => (
    <div className="onboarding-progress">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`progress-dot ${index <= stepIndex[currentStep] ? 'active' : ''}`}
        />
      ))}
    </div>
  );

  const renderWelcome = () => (
    <div className="onboarding-step welcome-step">
      <h1>Welcome to Canvas AI</h1>
      <p className="subtitle">Your AI-powered workspace companion</p>

      <div className="feature-list">
        <div className="feature-item">
          <div className="feature-icon">🚀</div>
          <div className="feature-content">
            <h3>Intelligent Assistance</h3>
            <p>Get help with coding, writing, and problem-solving</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon">📝</div>
          <div className="feature-content">
            <h3>Seamless Workflow</h3>
            <p>Integrate AI into your daily tasks effortlessly</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon">🎨</div>
          <div className="feature-content">
            <h3>Customizable Canvas</h3>
            <p>Create and organize your workspace your way</p>
          </div>
        </div>
      </div>

      <div className="button-group">
        <button className="btn-secondary" onClick={handleSkip}>
          Skip Setup
        </button>
        <button className="btn-primary" onClick={handleNext}>
          Get Started
        </button>
      </div>
    </div>
  );

  const renderApiKeyStep = () => (
    <div className="onboarding-step api-key-step">
      <h2>Connect Your API Key</h2>
      <p className="subtitle">To use Canvas AI, you'll need an Anthropic API key</p>

      <div className="api-key-form">
        <div className="input-group">
          <label htmlFor="api-key-input">Anthropic API Key</label>
          <input
            id="api-key-input"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError('');
            }}
            placeholder="sk-ant-..."
            disabled={isValidating}
            className={error ? 'error' : ''}
          />
          {error && <div className="error-message">{error}</div>}
          {validationSuccess && (
            <div className="success-message">API key validated successfully!</div>
          )}
        </div>

        <div className="help-text">
          <p>Don't have an API key?</p>
          <button className="btn-link" onClick={handleGetApiKey}>
            Get one from Anthropic
          </button>
        </div>
      </div>

      <div className="button-group">
        <button className="btn-secondary" onClick={handleBack}>
          Back
        </button>
        <button className="btn-secondary" onClick={handleSkip}>
          Skip
        </button>
        <button
          className="btn-primary"
          onClick={handleValidateApiKey}
          disabled={isValidating || !apiKey.trim()}
        >
          {isValidating ? (
            <>
              <span className="spinner"></span>
              Validating...
            </>
          ) : (
            'Validate & Continue'
          )}
        </button>
      </div>
    </div>
  );

  const tourContent = [
    {
      title: 'Canvas Workspace',
      description: 'Create multiple canvases to organize your projects and ideas. Each canvas is a separate workspace where you can chat with AI.',
      icon: '🎨',
      examples: ['⌘+N to create new agent', '⌘+T to create new workspace', '⌘+K for command palette'],
    },
    {
      title: 'AI Conversations',
      description: 'Chat with AI to get help with coding, writing, brainstorming, and more. Your conversations are saved within each canvas.',
      icon: '💬',
      examples: ['"Write a Python function"', '"Explain this code"', '"Help me debug"', '"Create a React component"'],
    },
    {
      title: 'Stay Organized',
      description: 'Switch between canvases, rename them, and manage your workspace efficiently. Everything is saved automatically.',
      icon: '📂',
      examples: ['⌘+A to auto-arrange', '⌘+S to save', '⌘+, to open settings', 'Drag to pan canvas'],
    },
  ];

  const renderTour = () => {
    const slide = tourContent[tourSlide];

    return (
      <div className="onboarding-step tour-step">
        <h2>Quick Tour</h2>

        <div className="tour-content">
          <div className="tour-icon">{slide.icon}</div>
          <h3>{slide.title}</h3>
          <p>{slide.description}</p>

          {slide.examples && (
            <div className="tour-examples">
              <p className="tour-examples-label">Try these:</p>
              <ul className="tour-examples-list">
                {slide.examples.map((example, idx) => (
                  <li key={idx} className="tour-example-item">{example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="tour-indicators">
          {tourContent.map((_, index) => (
            <div
              key={index}
              className={`tour-indicator ${index === tourSlide ? 'active' : ''}`}
            />
          ))}
        </div>

        <div className="button-group">
          {tourSlide > 0 && (
            <button className="btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <button className="btn-secondary" onClick={handleSkip}>
            Skip Tour
          </button>
          <button className="btn-primary" onClick={handleNext}>
            {tourSlide < 2 ? 'Next' : 'Finish Tour'}
          </button>
        </div>
      </div>
    );
  };

  const renderComplete = () => (
    <div className="onboarding-step complete-step">
      <div className="success-icon">✓</div>
      <h2>All Set!</h2>
      <p className="subtitle">You're ready to start using Canvas AI</p>

      <div className="completion-message">
        <p>
          Your workspace is configured and ready to go. Start creating canvases
          and chatting with AI to boost your productivity.
        </p>
      </div>

      <div className="button-group">
        <button className="btn-primary" onClick={handleComplete}>
          Start Using Canvas AI
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'api-key':
        return renderApiKeyStep();
      case 'tour':
        return renderTour();
      case 'complete':
        return renderComplete();
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {renderProgressIndicator()}
        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default OnboardingWizard;
