/**
 * Onboarding Page Component Tests
 *
 * Tests the multi-step onboarding flow including:
 * - Step navigation
 * - Organization creation form validation
 * - Firestore batch operations
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

// Mock Firebase
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn();

jest.mock('@/lib/firebase', () => ({
  collections: {
    tenant: jest.fn((tenantId: string) => ({ path: `tenants/${tenantId}` })),
    member: jest.fn((tenantId: string, memberId: string) => ({
      path: `tenants/${tenantId}/members/${memberId}`,
    })),
  },
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date('2024-01-15T10:00:00Z'),
      seconds: 1705312800,
      nanoseconds: 0,
    })),
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    })),
  },
  writeBatch: () => ({
    set: mockBatchSet,
    commit: mockBatchCommit,
  }),
  db: {},
}));

// Mock Auth Context
const mockAuthContext = {
  user: { uid: 'test-user-id', email: 'test@example.com' },
  isAuthenticated: true,
  isLoading: false,
  currentTenantId: null,
  tenantClaims: {},
  error: null,
  clearError: jest.fn(),
};

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext,
}));

// Import component after mocks
import OnboardingPage from '@/app/onboarding/page';

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
    localStorage.clear();

    // Reset auth context to authenticated state
    mockAuthContext.user = { uid: 'test-user-id', email: 'test@example.com' };
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.isLoading = false;
    mockAuthContext.currentTenantId = null;
    mockAuthContext.tenantClaims = {};
  });

  describe('Initial Render', () => {
    it('should render welcome message', () => {
      render(<OnboardingPage />);

      expect(screen.getByText('Welcome to GovernanceOS')).toBeInTheDocument();
      expect(
        screen.getByText("Let's set up your organization to get started")
      ).toBeInTheDocument();
    });

    it('should render step 1 options', () => {
      render(<OnboardingPage />);

      expect(screen.getByText('Create a new organization')).toBeInTheDocument();
      expect(screen.getByText('Join an existing organization')).toBeInTheDocument();
    });

    it('should have the join option disabled', () => {
      render(<OnboardingPage />);

      const joinButton = screen.getByText('Join an existing organization').closest('button');
      expect(joinButton).toBeDisabled();
    });

    it('should show loading spinner when auth is loading', () => {
      mockAuthContext.isLoading = true;
      render(<OnboardingPage />);

      // Should not show welcome message when loading
      expect(screen.queryByText('Welcome to GovernanceOS')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Redirect', () => {
    it('should redirect to login if not authenticated', async () => {
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = null;

      render(<OnboardingPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login');
      });
    });

    it('should redirect to dashboard if user has existing tenants', async () => {
      mockAuthContext.tenantClaims = { 'existing-tenant-id': 'owner' };
      mockAuthContext.currentTenantId = 'existing-tenant-id';

      render(<OnboardingPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/existing-tenant-id');
      });
    });

    it('should not redirect if user has no tenants', () => {
      mockAuthContext.tenantClaims = {};
      mockAuthContext.currentTenantId = null;

      render(<OnboardingPage />);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to step 2 when "Create a new organization" is clicked', async () => {
      render(<OnboardingPage />);

      const createButton = screen.getByText('Create a new organization').closest('button');
      expect(createButton).not.toBeNull();

      fireEvent.click(createButton!);

      await waitFor(() => {
        expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
      });
    });

    it('should navigate back to step 1 when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Go to step 2
      const createButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createButton!);

      // Click back button
      const backButton = screen.getByText('Back');
      await user.click(backButton);

      // Should be back on step 1
      expect(screen.getByText('What would you like to do?')).toBeInTheDocument();
    });
  });

  describe('Organization Creation Form', () => {
    beforeEach(async () => {
      render(<OnboardingPage />);

      // Navigate to step 2
      const createButton = screen.getByText('Create a new organization').closest('button');
      fireEvent.click(createButton!);
    });

    it('should render organization name input', async () => {
      await waitFor(() => {
        expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
      });
    });

    it('should render organization number input as optional', async () => {
      await waitFor(() => {
        expect(screen.getByText(/Organization Number/)).toBeInTheDocument();
        expect(screen.getByText('(optional)')).toBeInTheDocument();
      });
    });

    it('should show error when submitting without organization name', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Create')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create').closest('button');
      await user.click(createButton!);

      await waitFor(() => {
        expect(screen.getByText('Please enter an organization name')).toBeInTheDocument();
      });
    });

    it('should update organization name input value', async () => {
      const user = userEvent.setup();

      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      expect(nameInput).toHaveValue('Test Organization');
    });

    it('should update organization number input value', async () => {
      const user = userEvent.setup();

      const numberInput = await screen.findByPlaceholderText('556123-4567');
      await user.type(numberInput, '556789-1234');

      expect(numberInput).toHaveValue('556789-1234');
    });
  });

  describe('Organization Creation', () => {
    it('should create organization and member when form is submitted', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      // Fill in organization name
      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      // Fill in organization number
      const numberInput = screen.getByPlaceholderText('556123-4567');
      await user.type(numberInput, '556123-4567');

      // Submit form
      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        // Verify batch operations were called
        expect(mockBatchSet).toHaveBeenCalledTimes(2); // tenant + member
        expect(mockBatchCommit).toHaveBeenCalled();
      });
    });

    it('should store tenant ID in localStorage after creation', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      // Fill in organization name
      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      // Submit form
      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        expect(localStorage.getItem('governanceos_current_tenant')).toBeTruthy();
        expect(localStorage.getItem('governanceos_pending_tenant')).toBeTruthy();
      });
    });

    it('should redirect to dashboard after successful creation', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      // Fill in organization name
      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      // Submit form
      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/dashboard\/tenant_/));
      });
    });

    it('should show error message when creation fails', async () => {
      mockBatchCommit.mockRejectedValueOnce(new Error('Firestore error'));

      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      // Fill in organization name
      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      // Submit form
      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        expect(screen.getByText('Failed to create organization. Please try again.')).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      // Make commit take time
      mockBatchCommit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      // Fill in organization name
      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      // Submit form
      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      // Button should be disabled while submitting
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should trim whitespace from organization name', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      // Fill in organization name with whitespace
      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, '  Test Organization  ');

      // Submit form
      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        expect(mockBatchSet).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            name: 'Test Organization', // trimmed
          })
        );
      });
    });
  });

  describe('Subscription Settings', () => {
    it('should create tenant with starter subscription tier', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2 and submit
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        expect(mockBatchSet).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            subscription: expect.objectContaining({
              tier: 'starter',
              status: 'trialing',
            }),
          })
        );
      });
    });

    it('should set default settings for new organization', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2 and submit
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        expect(mockBatchSet).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            settings: expect.objectContaining({
              defaultLanguage: 'sv',
              fiscalYearStart: 1,
              requireBankIdSigning: true,
              allowGuestObservers: false,
              autoGenerateMinutes: true,
              meetingReminderDays: 7,
            }),
          })
        );
      });
    });
  });

  describe('Member Creation', () => {
    it('should create user as owner with full permissions', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 2 and submit
      const createOrgButton = screen.getByText('Create a new organization').closest('button');
      await user.click(createOrgButton!);

      const nameInput = await screen.findByPlaceholderText('Acme AB');
      await user.type(nameInput, 'Test Organization');

      const submitButton = screen.getByText('Create').closest('button');
      await user.click(submitButton!);

      await waitFor(() => {
        // Find the member creation call
        const memberCall = mockBatchSet.mock.calls.find(
          (call) => call[1].role === 'owner'
        );
        expect(memberCall).toBeDefined();
        expect(memberCall[1]).toMatchObject({
          role: 'owner',
          permissions: {
            canCreateMeetings: true,
            canManageMembers: true,
            canAccessFinancials: true,
            canSignDocuments: true,
            canManageDocuments: true,
          },
          isActive: true,
        });
      });
    });
  });
});
