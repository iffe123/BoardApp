import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display the login page heading', async ({ page }) => {
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(
      page.getByText('Sign in to your GovernanceOS account')
    ).toBeVisible();
  });

  test('should display email and password input fields', async ({ page }) => {
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have correct placeholder text', async ({ page }) => {
    await expect(page.locator('#email')).toHaveAttribute(
      'placeholder',
      'you@company.com'
    );
    await expect(page.locator('#password')).toHaveAttribute(
      'placeholder',
      'Enter your password'
    );
  });

  test('should display the Sign In submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('should display Google sign-in button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
  });

  test('should display Forgot password link', async ({ page }) => {
    const forgotLink = page.getByText('Forgot password?');
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute('href', '/auth/reset-password');
  });

  test('should display Sign up link', async ({ page }) => {
    const signupLink = page.getByText('Sign up');
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute('href', '/auth/signup');
  });

  test('should navigate to signup page from login', async ({ page }) => {
    await page.getByText('Sign up').click();
    await expect(page).toHaveURL('/auth/signup');
  });

  test('should navigate to reset password page', async ({ page }) => {
    await page.getByText('Forgot password?').click();
    await expect(page).toHaveURL('/auth/reset-password');
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('#password');

    // Initially password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the toggle button (the eye icon button)
    await page.locator('#password').locator('..').getByRole('button').click();

    // Should now be text type
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.locator('#password').locator('..').getByRole('button').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should allow typing in email and password fields', async ({ page }) => {
    await page.locator('#email').fill('user@example.com');
    await page.locator('#password').fill('mypassword123');

    await expect(page.locator('#email')).toHaveValue('user@example.com');
    await expect(page.locator('#password')).toHaveValue('mypassword123');
  });

  test('should require email field', async ({ page }) => {
    // Try to submit without email
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // HTML5 validation should prevent submission
    const emailInput = page.locator('#email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should require password field', async ({ page }) => {
    await page.locator('#email').fill('user@example.com');
    await page.getByRole('button', { name: /sign in/i }).click();

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should display "Or continue with" divider text', async ({ page }) => {
    await expect(page.getByText('Or continue with')).toBeVisible();
  });
});

test.describe('Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  test('should display the signup page heading', async ({ page }) => {
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(
      page.getByText('Start your 14-day free trial of GovernanceOS')
    ).toBeVisible();
  });

  test('should display all form fields', async ({ page }) => {
    await expect(page.locator('#displayName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
  });

  test('should display correct labels', async ({ page }) => {
    await expect(page.getByText('Full Name')).toBeVisible();
    await expect(page.getByText('Work Email')).toBeVisible();
    // Password label appears twice (Password and Confirm Password)
    await expect(page.getByText('Password', { exact: true })).toBeVisible();
    await expect(page.getByText('Confirm Password')).toBeVisible();
  });

  test('should have correct placeholder text', async ({ page }) => {
    await expect(page.locator('#displayName')).toHaveAttribute(
      'placeholder',
      'John Andersson'
    );
    await expect(page.locator('#email')).toHaveAttribute(
      'placeholder',
      'you@company.com'
    );
    await expect(page.locator('#password')).toHaveAttribute(
      'placeholder',
      'At least 8 characters'
    );
    await expect(page.locator('#confirmPassword')).toHaveAttribute(
      'placeholder',
      'Confirm your password'
    );
  });

  test('should display Create Account button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create account/i })
    ).toBeVisible();
  });

  test('should display Google sign-up button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
  });

  test('should display Terms and Privacy links', async ({ page }) => {
    const termsLink = page.getByText('Terms of Service');
    const privacyLink = page.getByText('Privacy Policy');

    await expect(termsLink).toBeVisible();
    await expect(privacyLink).toBeVisible();
    await expect(termsLink).toHaveAttribute('href', '/terms');
    await expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  test('should display sign in link for existing users', async ({ page }) => {
    await expect(page.getByText('Already have an account?')).toBeVisible();
    const signInLink = page.getByText('Sign in');
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/auth/login');
  });

  test('should navigate to login page from signup', async ({ page }) => {
    await page.getByText('Sign in').click();
    await expect(page).toHaveURL('/auth/login');
  });

  test('should allow filling out the entire form', async ({ page }) => {
    await page.locator('#displayName').fill('Johan Andersson');
    await page.locator('#email').fill('johan@company.se');
    await page.locator('#password').fill('SecurePass123!');
    await page.locator('#confirmPassword').fill('SecurePass123!');

    await expect(page.locator('#displayName')).toHaveValue('Johan Andersson');
    await expect(page.locator('#email')).toHaveValue('johan@company.se');
    await expect(page.locator('#password')).toHaveValue('SecurePass123!');
    await expect(page.locator('#confirmPassword')).toHaveValue('SecurePass123!');
  });

  test('should toggle password visibility for both password fields', async ({ page }) => {
    // Both password fields should be password type initially
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#confirmPassword')).toHaveAttribute('type', 'password');

    // Click password toggle
    await page.locator('#password').locator('..').getByRole('button').click();

    // Both should change because they share the same showPassword state
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    await expect(page.locator('#confirmPassword')).toHaveAttribute('type', 'text');
  });

  test('should require all form fields', async ({ page }) => {
    await expect(page.locator('#displayName')).toHaveAttribute('required', '');
    await expect(page.locator('#email')).toHaveAttribute('required', '');
    await expect(page.locator('#password')).toHaveAttribute('required', '');
    await expect(page.locator('#confirmPassword')).toHaveAttribute('required', '');
  });

  test('should navigate to Terms of Service', async ({ page }) => {
    await page.getByText('Terms of Service').click();
    await expect(page).toHaveURL('/terms');
  });

  test('should navigate to Privacy Policy', async ({ page }) => {
    await page.getByText('Privacy Policy').click();
    await expect(page).toHaveURL('/privacy');
  });
});

test.describe('Reset Password Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/reset-password');
  });

  test('should display the reset password heading', async ({ page }) => {
    await expect(page.getByText('Reset your password')).toBeVisible();
    await expect(
      page.getByText("Enter your email address and we'll send you a link")
    ).toBeVisible();
  });

  test('should display email input field', async ({ page }) => {
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('placeholder', 'you@company.com');
  });

  test('should display Send Reset Link button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /send reset link/i })
    ).toBeVisible();
  });

  test('should display Back to sign in link', async ({ page }) => {
    const backLink = page.getByText('Back to sign in');
    await expect(backLink).toBeVisible();
  });

  test('should navigate back to login page', async ({ page }) => {
    await page.getByText('Back to sign in').click();
    await expect(page).toHaveURL('/auth/login');
  });

  test('should allow typing an email address', async ({ page }) => {
    await page.locator('#email').fill('user@example.com');
    await expect(page.locator('#email')).toHaveValue('user@example.com');
  });

  test('should require email field', async ({ page }) => {
    await expect(page.locator('#email')).toHaveAttribute('required', '');
  });
});

test.describe('Auth Navigation Flow', () => {
  test('should navigate between all auth pages', async ({ page }) => {
    // Start at login
    await page.goto('/auth/login');
    await expect(page.getByText('Welcome back')).toBeVisible();

    // Go to signup
    await page.getByText('Sign up').click();
    await expect(page).toHaveURL('/auth/signup');
    await expect(page.getByText('Create your account')).toBeVisible();

    // Go back to login
    await page.getByText('Sign in').click();
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByText('Welcome back')).toBeVisible();

    // Go to reset password
    await page.getByText('Forgot password?').click();
    await expect(page).toHaveURL('/auth/reset-password');
    await expect(page.getByText('Reset your password')).toBeVisible();

    // Go back to login
    await page.getByText('Back to sign in').click();
    await expect(page).toHaveURL('/auth/login');
  });
});
