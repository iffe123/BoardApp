/**
 * Signup Page Component Tests
 *
 * Tests the user registration flow including:
 * - Form validation (password requirements, display name)
 * - Email/password signup
 * - Google OAuth signup
 * - Invitation acceptance flow
 * - Redirect behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock Auth Context
const mockSignUpWithEmail = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockClearError = jest.fn();

const defaultAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  signUpWithEmail: mockSignUpWithEmail,
  signInWithGoogle: mockSignInWithGoogle,
  clearError: mockClearError,
};

let mockAuthContext = { ...defaultAuthContext };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext,
}));

// Import component after mocks
import SignupPage from '@/app/auth/signup/page';

describe('SignupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUpWithEmail.mockResolvedValue(undefined);
    mockSignInWithGoogle.mockResolvedValue(undefined);
    mockAuthContext = { ...defaultAuthContext };
  });

  describe('Initial Render', () => {
    it('should render the signup form', () => {
      render(<SignupPage />);

      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByText('Start your 14-day free trial of GovernanceOS')).toBeInTheDocument();
    });

    it('should render all form inputs', () => {
      render(<SignupPage />);

      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Work Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('should render create account button', () => {
      render(<SignupPage />);

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render Google sign-in option', () => {
      render(<SignupPage />);

      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('should render login link', () => {
      render(<SignupPage />);

      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('should render terms and privacy links', () => {
      render(<SignupPage />);

      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when password is too short', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      // Fill in name and email
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');

      // Enter short password
      await user.type(screen.getByLabelText('Password'), 'short');
      await user.type(screen.getByLabelText('Confirm Password'), 'short');

      // Submit
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
      });
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'different123');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('should show error when display name is too short', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      await user.type(screen.getByLabelText('Full Name'), 'J');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter your full name')).toBeInTheDocument();
      });
    });

    it('should accept valid form input', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalled();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when eye icon is clicked', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find and click the toggle button (it's the button inside the password field container)
      const toggleButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg')
      );
      expect(toggleButton).toBeDefined();

      await user.click(toggleButton!);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('should show password by default as hidden', () => {
      render(<SignupPage />);

      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Email/Password Signup', () => {
    it('should call signUpWithEmail with correct parameters', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalledWith(
          'john@example.com',
          'password123',
          'John Doe'
        );
      });
    });

    it('should trim display name before submission', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      await user.type(screen.getByLabelText('Full Name'), '  John Doe  ');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalledWith(
          'john@example.com',
          'password123',
          'John Doe'
        );
      });
    });

    it('should redirect to onboarding after successful signup', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should show error when signup fails', async () => {
      mockSignUpWithEmail.mockRejectedValueOnce(new Error('Email already in use'));

      const user = userEvent.setup();
      render(<SignupPage />);

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      mockSignUpWithEmail.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const user = userEvent.setup();
      render(<SignupPage />);

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Work Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Google OAuth Signup', () => {
    it('should call signInWithGoogle when Google button is clicked', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      await user.click(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('should redirect to onboarding after successful Google signup', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      await user.click(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should show error when Google signup fails', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce(new Error('Google auth failed'));

      const user = userEvent.setup();
      render(<SignupPage />);

      await user.click(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(screen.getByText('Google auth failed')).toBeInTheDocument();
      });
    });

    it('should disable Google button while signing up', async () => {
      mockSignInWithGoogle.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const user = userEvent.setup();
      render(<SignupPage />);

      const googleButton = screen.getByText('Continue with Google').closest('button');
      await user.click(googleButton!);

      await waitFor(() => {
        expect(googleButton).toBeDisabled();
      });
    });
  });

  describe('Authentication Redirect', () => {
    it('should redirect to onboarding if already authenticated', async () => {
      mockAuthContext = {
        ...defaultAuthContext,
        isAuthenticated: true,
        user: { uid: 'test-user' },
      };

      render(<SignupPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should not redirect when loading', () => {
      mockAuthContext = {
        ...defaultAuthContext,
        isLoading: true,
      };

      render(<SignupPage />);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    it('should display context error if present', () => {
      mockAuthContext = {
        ...defaultAuthContext,
        error: 'Context level error',
      };

      render(<SignupPage />);

      expect(screen.getByText('Context level error')).toBeInTheDocument();
    });

    it('should call clearError on unmount', () => {
      const { unmount } = render(<SignupPage />);

      unmount();

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Form Input Handling', () => {
    it('should update display name input value', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.type(nameInput, 'John Andersson');

      expect(nameInput).toHaveValue('John Andersson');
    });

    it('should update email input value', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      const emailInput = screen.getByLabelText('Work Email');
      await user.type(emailInput, 'john@company.com');

      expect(emailInput).toHaveValue('john@company.com');
    });

    it('should update password input value', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'secretpass123');

      expect(passwordInput).toHaveValue('secretpass123');
    });

    it('should update confirm password input value', async () => {
      const user = userEvent.setup();
      render(<SignupPage />);

      const confirmInput = screen.getByLabelText('Confirm Password');
      await user.type(confirmInput, 'secretpass123');

      expect(confirmInput).toHaveValue('secretpass123');
    });
  });

  describe('Accessibility', () => {
    it('should have proper input labels', () => {
      render(<SignupPage />);

      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Work Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('should have autocomplete attributes', () => {
      render(<SignupPage />);

      expect(screen.getByLabelText('Full Name')).toHaveAttribute('autocomplete', 'name');
      expect(screen.getByLabelText('Work Email')).toHaveAttribute('autocomplete', 'email');
      expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
      expect(screen.getByLabelText('Confirm Password')).toHaveAttribute('autocomplete', 'new-password');
    });

    it('should have required attributes on inputs', () => {
      render(<SignupPage />);

      expect(screen.getByLabelText('Full Name')).toBeRequired();
      expect(screen.getByLabelText('Work Email')).toBeRequired();
      expect(screen.getByLabelText('Password')).toBeRequired();
      expect(screen.getByLabelText('Confirm Password')).toBeRequired();
    });
  });
});
