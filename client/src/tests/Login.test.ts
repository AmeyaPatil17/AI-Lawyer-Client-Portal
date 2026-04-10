import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import Login from '../views/Login.vue';

// --- Mocks ---

// vi.mock factories are hoisted to top of file — use vi.hoisted() for refs used inside them
const { mockPush, mockReplace, mockUseRoute } = vi.hoisted(() => ({
  mockPush:     vi.fn(),
  mockReplace:  vi.fn(),
  mockUseRoute: vi.fn(() => ({ query: {}, params: {}, path: '/login' })),
}));

vi.mock('vue-router', async (importActual) => {
  const actual = await importActual<typeof import('vue-router')>();
  return {
    ...actual,
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    useRoute:  mockUseRoute,
  };
});

const mockLogin = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    isLawyer: false,
    user: null,
  }),
}));

const showToast = vi.fn();
vi.mock('../composables/useToast', () => ({
  useToast: () => ({ showToast }),
}));

// --- Router (minimal, needed for RouterLink) ---
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/triage', component: { template: '<div />' } },
    { path: '/dashboard', component: { template: '<div />' } },
  ],
});

// --- Helper ---

const mountLogin = () =>
  mount(Login, {
    global: {
      plugins: [createPinia(), router],
      stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } },
    },
  });

// --- Tests ---

describe('Login.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Branding and structure
  // -------------------------------------------------------------------------
  it('renders Valiant Law branding and subtitle', () => {
    const wrapper = mountLogin();
    expect(wrapper.text()).toContain('Valiant Law');
    expect(wrapper.text()).toContain('Welcome Back');
    expect(wrapper.text()).toContain('Sign in to your Valiant Law account');
  });

  // -------------------------------------------------------------------------
  // 2. Form fields render with correct accessible attributes (L6)
  // -------------------------------------------------------------------------
  it('renders email and password inputs with id and autocomplete', () => {
    const wrapper = mountLogin();
    const emailInput = wrapper.find('#login-email');
    const passwordInput = wrapper.find('#login-password');
    expect(emailInput.exists()).toBe(true);
    expect(emailInput.attributes('autocomplete')).toBe('email');
    expect(passwordInput.exists()).toBe(true);
    expect(passwordInput.attributes('autocomplete')).toBe('current-password');
  });

  // -------------------------------------------------------------------------
  // 3. Loading state — spinner + disabled button (L5)
  // -------------------------------------------------------------------------
  it('disables submit button and shows spinner while loading', async () => {
    let resolve: (v: any) => void;
    mockLogin.mockReturnValue(new Promise(r => { resolve = r; }));

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('a@b.com');
    await wrapper.find('#login-password').setValue('secret');
    await wrapper.find('form').trigger('submit');

    const btn = wrapper.find('button[type="submit"]');
    expect(btn.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Signing in');

    resolve!(undefined);
    await flushPromises();
  });

  // -------------------------------------------------------------------------
  // 4. Password visibility toggle (L4)
  // -------------------------------------------------------------------------
  it('toggles password field type when eye button is clicked', async () => {
    const wrapper = mountLogin();
    const passwordInput = wrapper.find('#login-password');
    expect(passwordInput.attributes('type')).toBe('password');

    // Click the eye/toggle button (type="button" inside the password div)
    const toggleBtn = wrapper.find('button[aria-label]');
    await toggleBtn.trigger('click');
    expect(passwordInput.attributes('type')).toBe('text');

    await toggleBtn.trigger('click');
    expect(passwordInput.attributes('type')).toBe('password');
  });

  // -------------------------------------------------------------------------
  // 5. Email format validation prevents submit (L7)
  // -------------------------------------------------------------------------
  it('shows email validation error and blocks submit if email is invalid', async () => {
    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('not-an-email');
    await wrapper.find('#login-password').setValue('secret123');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('valid email');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. Client redirects to /dashboard on success (L1)
  // -------------------------------------------------------------------------
  it('redirects client user to /dashboard after successful login', async () => {
    mockLogin.mockResolvedValue(true);

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('client@example.com');
    await wrapper.find('#login-password').setValue('password123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // isLawyer is false in the mock, so should redirect to /dashboard
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  // -------------------------------------------------------------------------
  // 7. Inline error shown for auth failures (L3)
  // -------------------------------------------------------------------------
  it('shows inline error message on 401 auth failure', async () => {
    const authError = { response: { status: 401, data: { message: 'Invalid email or password.' } } };
    mockLogin.mockRejectedValue(authError);

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('wrong@example.com');
    await wrapper.find('#login-password').setValue('badpass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Invalid email or password');
    expect(showToast).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 8. Toast for network/server errors (L3)
  // -------------------------------------------------------------------------
  it('shows toast for network/server errors (no response object)', async () => {
    mockLogin.mockRejectedValue(new Error('Network Error'));

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('user@example.com');
    await wrapper.find('#login-password').setValue('password123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Unable to connect'),
      'error'
    );
  });

  // -------------------------------------------------------------------------
  // 9. "Get Started" link navigates to /register
  // -------------------------------------------------------------------------
  it('renders Get Started link pointing to /register', () => {
    const wrapper = mountLogin();
    expect(wrapper.text()).toContain('Get Started');
    const link = wrapper.find('a[href="/register"]');
    expect(link.exists()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 10. Role-mismatch toast — lawyer tab but client account
  // -------------------------------------------------------------------------
  it('shows info toast when Lawyer tab selected but account is a client', async () => {
    mockLogin.mockResolvedValue(true);
    // isLawyer = false in mock (client account)

    const wrapper = mountLogin();

    // Switch to Lawyer tab
    const tabs = wrapper.findAll('button[role="tab"]');
    await tabs[1].trigger('click'); // Lawyer tab

    await wrapper.find('#login-email').setValue('client@example.com');
    await wrapper.find('#login-password').setValue('password123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('signed in as a client'),
      'info'
    );
  });

  // -------------------------------------------------------------------------
  // 11. Lawyer tab changes subtitle and footer text
  // -------------------------------------------------------------------------
  it('switches subtitle and footer when Lawyer tab is clicked', async () => {
    const wrapper = mountLogin();

    // Initial state — client tab
    expect(wrapper.text()).toContain('Sign in to your Valiant Law account');
    expect(wrapper.text()).toContain('Get Started');

    // Click Lawyer tab
    const tabs = wrapper.findAll('button[role="tab"]');
    await tabs[1].trigger('click');

    expect(wrapper.text()).toContain('Sign in to the Valiant Law lawyer console');
    expect(wrapper.text()).toContain('Contact your Valiant Law administrator');
  });

  // -------------------------------------------------------------------------
  // 12. redirectAfterLogin is consumed and used for navigation
  // -------------------------------------------------------------------------
  it('redirects to stored intendedPath after successful login', async () => {
    mockLogin.mockResolvedValue(true);
    localStorage.setItem('redirectAfterLogin', '/wizard/profile');

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('a@b.com');
    await wrapper.find('#login-password').setValue('pass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith('/wizard/profile');
    expect(localStorage.getItem('redirectAfterLogin')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 13. Server 500 error → toast (not inline)
  // -------------------------------------------------------------------------
  it('shows toast (not inline error) for HTTP 500 server errors', async () => {
    const serverError = { response: { status: 500, data: { message: 'Server error' } } };
    mockLogin.mockRejectedValue(serverError);

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('a@b.com');
    await wrapper.find('#login-password').setValue('pass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Unable to connect'), 'error');
    // Inline error should NOT appear for server errors
    expect(wrapper.text()).not.toContain('Invalid email or password');
  });

  // -------------------------------------------------------------------------
  // 14. 429 rate-limit → lockout banner shown, submit disabled
  // -------------------------------------------------------------------------
  it('shows rate-limit lockout banner and disables submit on 429 response', async () => {
    const rateLimitError = { response: { status: 429, headers: {}, data: {} } };
    mockLogin.mockRejectedValue(rateLimitError);

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('a@b.com');
    await wrapper.find('#login-password').setValue('pass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Lockout banner should appear
    expect(wrapper.text()).toContain('Too many attempts');
    // Submit button should be disabled
    const btn = wrapper.find('button[type="submit"]');
    expect(btn.attributes('disabled')).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 15. Session-expired banner renders when ?expired=1 in route query
  // -------------------------------------------------------------------------
  it('shows session-expired banner when route has ?expired=1 query param', async () => {
    // Temporarily override useRoute to return expired=1 query
    mockUseRoute.mockReturnValueOnce({ query: { expired: '1' }, params: {}, path: '/login' });

    const wrapper = mount(Login, {
      global: {
        plugins: [createPinia(), router],
        stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } },
      },
    });

    await flushPromises();
    expect(wrapper.text()).toContain('session has expired');
  });

  // ── Bug Regression Tests ──────────────────────────────────────────────────

  it('Bug 7: shows error and blocks submit when email is empty', async () => {
    const wrapper = mountLogin();
    // Leave email empty, just set password
    await wrapper.find('#login-password').setValue('password123');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Email address is required');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('Bug 6: trims and lowercases email before sending to auth store', async () => {
    mockLogin.mockResolvedValue(true);

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('  Test@Example.COM  ');
    await wrapper.find('#login-password').setValue('password123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockLogin).toHaveBeenCalledWith(
      { email: 'test@example.com', password: 'password123' },
      false // rememberMe default is unchecked
    );
  });

  it('Bug 2: rejects protocol-relative redirectAfterLogin values', async () => {
    mockLogin.mockResolvedValue(true);
    localStorage.setItem('redirectAfterLogin', '//evil.com/phish');

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('a@b.com');
    await wrapper.find('#login-password').setValue('pass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Should NOT navigate to the malicious path
    expect(mockPush).not.toHaveBeenCalledWith('//evil.com/phish');
    // Should fall through to default redirect
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    // Should clean up the key
    expect(localStorage.getItem('redirectAfterLogin')).toBeNull();
  });

  it('Bug 2: valid internal redirectAfterLogin still works', async () => {
    mockLogin.mockResolvedValue(true);
    localStorage.setItem('redirectAfterLogin', '/wizard/assets');

    const wrapper = mountLogin();
    await wrapper.find('#login-email').setValue('a@b.com');
    await wrapper.find('#login-password').setValue('pass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith('/wizard/assets');
    expect(localStorage.getItem('redirectAfterLogin')).toBeNull();
  });
});


