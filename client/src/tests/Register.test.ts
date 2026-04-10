import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import Register from '../views/Register.vue';

// --- Mocks ---

// vi.hoisted ensures these vars exist BEFORE the hoisted vi.mock() factories run
const { mockPush, mockLogin, showToast, mockPost } = vi.hoisted(() => ({
  mockPush:  vi.fn(),
  mockLogin: vi.fn(),
  showToast: vi.fn(),
  mockPost:  vi.fn(),
}));

vi.mock('vue-router', async (importActual) => {
  const actual = await importActual<typeof import('vue-router')>();
  return {
    ...actual,
    useRouter: () => ({ push: mockPush }),
  };
});

vi.mock('../stores/auth', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    isLawyer: false,
    user: null,
  }),
}));

vi.mock('../composables/useToast', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../api', () => ({
  default: { post: mockPost },
}));

// --- Router (minimal, needed for RouterLink) ---
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/login', component: { template: '<div />' } },
  ],
});

// --- Helper ---

const mountRegister = () =>
  mount(Register, {
    global: {
      plugins: [createPinia(), router],
      stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } },
    },
  });

// --- Tests ---

describe('Register.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ── Branding & Structure ──────────────────────────────────────────────────

  it('renders Valiant Law branding and heading', () => {
    const wrapper = mountRegister();
    expect(wrapper.text()).toContain('Valiant Law');
    expect(wrapper.text()).toContain('Create an Account');
    expect(wrapper.text()).toContain('Set up your secure client portal account');
  });

  it('renders email, password, and confirm password fields', () => {
    const wrapper = mountRegister();
    expect(wrapper.find('#register-email').exists()).toBe(true);
    expect(wrapper.find('#register-password').exists()).toBe(true);
    expect(wrapper.find('#register-confirm-password').exists()).toBe(true);
  });

  it('renders a Sign In link', () => {
    const wrapper = mountRegister();
    expect(wrapper.text()).toContain('Already have an account?');
    expect(wrapper.text()).toContain('Sign in');
  });

  // ── Email Validation ──────────────────────────────────────────────────────

  it('shows error for empty email on submit', async () => {
    const wrapper = mountRegister();
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('StrongPass1!');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Email address is required');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format', async () => {
    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('not-an-email');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('valid email');
    expect(mockPost).not.toHaveBeenCalled();
  });

  // ── Password Strength Policy Gate ─────────────────────────────────────────

  it('blocks submit when password does not meet policy', async () => {
    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('test@example.com');
    await wrapper.find('#register-password').setValue('weak');
    await wrapper.find('#register-confirm-password').setValue('weak');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('must be at least 8 characters');
    expect(mockPost).not.toHaveBeenCalled();
  });

  // ── Confirm Password Mismatch (Bug 3) ─────────────────────────────────────

  it('shows error when passwords do not match', async () => {
    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('test@example.com');
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('DifferentPass1!');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('do not match');
    expect(mockPost).not.toHaveBeenCalled();
  });

  // ── Successful Registration ───────────────────────────────────────────────

  it('registers, auto-logs in, and redirects to / on success', async () => {
    mockPost.mockResolvedValue({ data: { message: 'User registered successfully' } });
    mockLogin.mockResolvedValue(true);

    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('new@example.com');
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('StrongPass1!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Should call register API with trimmed+lowercased email
    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      email: 'new@example.com',
      password: 'StrongPass1!',
    });
    // Should auto-login
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'StrongPass1!',
    });
    // Should redirect to home
    expect(mockPush).toHaveBeenCalledWith('/');
    // Should show success toast
    expect(showToast).toHaveBeenCalledWith('Account created successfully.', 'success');
  });

  it('trims and lowercases email before sending', async () => {
    mockPost.mockResolvedValue({ data: {} });
    mockLogin.mockResolvedValue(true);

    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('  Test@Example.COM  ');
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('StrongPass1!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      email: 'test@example.com',
      password: 'StrongPass1!',
    });
  });

  // ── Loading State ─────────────────────────────────────────────────────────

  it('disables submit button and shows spinner while loading', async () => {
    let resolve: (v: any) => void;
    mockPost.mockReturnValue(new Promise(r => { resolve = r; }));

    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('a@b.com');
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('StrongPass1!');
    await wrapper.find('form').trigger('submit');

    const btn = wrapper.find('button[type="submit"]');
    expect(btn.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Creating Account');

    resolve!({ data: {} });
    await flushPromises();
  });

  // ── Error Handling ────────────────────────────────────────────────────────

  it('shows inline error for "User already exists" (400)', async () => {
    mockPost.mockRejectedValue({
      response: { status: 400, data: { message: 'User already exists' } },
    });

    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('exists@example.com');
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('StrongPass1!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('User already exists');
  });

  it('shows toast for network error (no response)', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('a@b.com');
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('StrongPass1!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Unable to connect'),
      'error'
    );
  });

  // ── Rate Limit (Bug 4) ────────────────────────────────────────────────────

  it('shows rate-limit lockout banner on 429 response', async () => {
    mockPost.mockRejectedValue({
      response: { status: 429, headers: {}, data: {} },
    });

    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('a@b.com');
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('StrongPass1!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Too many attempts');
    const btn = wrapper.find('button[type="submit"]');
    expect(btn.attributes('disabled')).toBeDefined();
  });

  // ── Password Toggle ───────────────────────────────────────────────────────

  it('toggles password and confirm field visibility', async () => {
    const wrapper = mountRegister();
    const passInput    = wrapper.find('#register-password');
    const confirmInput = wrapper.find('#register-confirm-password');

    expect(passInput.attributes('type')).toBe('password');
    expect(confirmInput.attributes('type')).toBe('password');

    // Click the toggle button
    const toggleBtn = wrapper.find('button[aria-label="Show password"]');
    await toggleBtn.trigger('click');

    expect(passInput.attributes('type')).toBe('text');
    expect(confirmInput.attributes('type')).toBe('text');
  });

  // ── Double-Click Protection (Bug 8) ──────────────────────────────────────

  it('Bug 8: double-submit only fires a single API call', async () => {
    // Keep the first call pending so isLoading stays true when the second submit arrives
    let resolveFirst: (v: any) => void;
    mockPost.mockReturnValue(new Promise(r => { resolveFirst = r; }));

    const wrapper = mountRegister();
    await wrapper.find('#register-email').setValue('a@b.com');
    await wrapper.find('#register-password').setValue('StrongPass1!');
    await wrapper.find('#register-confirm-password').setValue('StrongPass1!');

    // Fire submit twice in the same tick (before isLoading guard can re-render)
    await wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');

    // Only one API call should have been made
    expect(mockPost).toHaveBeenCalledTimes(1);

    resolveFirst!({ data: {} });
    await flushPromises();
  });
});
