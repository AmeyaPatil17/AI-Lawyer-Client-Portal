import { createRouter, createWebHistory, type RouteLocationNormalized, type RouteRecordRaw } from 'vue-router';
import Home from '../views/Home.vue';
import Triage from '../views/Triage.vue';
import Dashboard from '../views/Dashboard.vue';
const WizardLayout = () => import('../views/WizardLayout.vue');
const PersonalProfile = () => import('../views/wizard/PersonalProfile.vue');
const Family = () => import('../views/wizard/Family.vue');
const Guardians = () => import('../views/wizard/Guardians.vue');
const Executors = () => import('../views/wizard/Executors.vue');
const Beneficiaries = () => import('../views/wizard/Beneficiaries.vue');
const Assets = () => import('../views/wizard/Assets.vue');
const PowerOfAttorney = () => import('../views/wizard/PowerOfAttorney.vue');
const Funeral = () => import('../views/wizard/Funeral.vue');
const PriorWills = () => import('../views/wizard/PriorWills.vue');
const Review = () => import('../views/wizard/Review.vue');
const LawyerDashboard = () => import('../views/LawyerDashboard.vue');
const MatterDetail = () => import('../views/MatterDetail.vue');
const Login = () => import('../views/Login.vue');
const Register = () => import('../views/Register.vue');
const ForgotPassword = () => import('../views/ForgotPassword.vue');
const ResetPassword = () => import('../views/ResetPassword.vue');
const VerifyEmail = () => import('../views/VerifyEmail.vue');
const AdminPanel = () => import('../views/AdminPanel.vue');

// Incorporation Views
const IncorpTriage = () => import('../views/IncorpTriage.vue');
const IncorpWizardLayout = () => import('../views/IncorpWizardLayout.vue');
const JurisdictionName = () => import('../views/incorporation/JurisdictionName.vue');
const StructureOwnership = () => import('../views/incorporation/StructureOwnership.vue');
const ArticlesOfIncorp = () => import('../views/incorporation/ArticlesOfIncorp.vue');
const PostIncorpOrg = () => import('../views/incorporation/PostIncorpOrg.vue');
const ShareIssuance = () => import('../views/incorporation/ShareIssuance.vue');
const CorporateRecords = () => import('../views/incorporation/CorporateRecords.vue');
const Registrations = () => import('../views/incorporation/Registrations.vue');
const BankingSetup = () => import('../views/incorporation/BankingSetup.vue');
const IncorpReview = () => import('../views/incorporation/IncorpReview.vue');

// Route metadata types
declare module 'vue-router' {
    interface RouteMeta {
        requiresAuth?: boolean;
        requiresRole?: Array<'client' | 'lawyer' | 'admin'>;
        isPublic?: boolean;
        breadcrumb?: string;
    }
}

const routes = [
    {
        path: '/',
        component: Home,
        meta: { isPublic: true, breadcrumb: 'Home' }
    },
    {
        path: '/triage',
        component: Triage,
        meta: { isPublic: true, breadcrumb: 'Estate Planning' }
    },
    {
        path: '/dashboard',
        component: Dashboard,
        meta: { requiresAuth: true, requiresRole: ['client'], breadcrumb: 'Dashboard' }
    },
    {
        path: '/wizard',
        component: WizardLayout,
        meta: { requiresAuth: true, requiresRole: ['client'], breadcrumb: 'Wizard' },
        children: [
            { path: 'profile', component: PersonalProfile, meta: { breadcrumb: 'Personal Profile' } },
            { path: 'family', component: Family, meta: { breadcrumb: 'Family Members' } },
            { path: 'guardians', component: Guardians, meta: { breadcrumb: 'Guardians' } },
            { path: 'executors', component: Executors, meta: { breadcrumb: 'Executors' } },
            { path: 'beneficiaries', component: Beneficiaries, meta: { breadcrumb: 'Beneficiaries' } },
            { path: 'assets', component: Assets, meta: { breadcrumb: 'Assets' } },
            { path: 'poa', component: PowerOfAttorney, meta: { breadcrumb: 'Power of Attorney' } },
            { path: 'funeral', component: Funeral, meta: { breadcrumb: 'Funeral Wishes' } },
            { path: 'prior-wills', component: PriorWills, meta: { breadcrumb: 'Prior Wills' } },
            { path: 'review', component: Review, meta: { breadcrumb: 'Review' } },
        ]
    },
    // Incorporation Wizard
    {
        path: '/incorp-triage',
        component: IncorpTriage,
        meta: { requiresAuth: true, requiresRole: ['client'], breadcrumb: 'Incorporation Setup' }
    },
    {
        path: '/incorporation',
        component: IncorpWizardLayout,
        meta: { requiresAuth: true, requiresRole: ['client'], breadcrumb: 'Incorporation' },
        children: [
            { path: 'jurisdiction-name', component: JurisdictionName, meta: { breadcrumb: 'Jurisdiction & Name' } },
            { path: 'structure-ownership', component: StructureOwnership, meta: { breadcrumb: 'Structure & Ownership' } },
            { path: 'articles', component: ArticlesOfIncorp, meta: { breadcrumb: 'Articles' } },
            { path: 'post-incorp', component: PostIncorpOrg, meta: { breadcrumb: 'Post-Incorporation' } },
            { path: 'share-issuance', component: ShareIssuance, meta: { breadcrumb: 'Share Issuance' } },
            { path: 'corporate-records', component: CorporateRecords, meta: { breadcrumb: 'Corporate Records' } },
            { path: 'registrations', component: Registrations, meta: { breadcrumb: 'Registrations' } },
            { path: 'banking-setup', component: BankingSetup, meta: { breadcrumb: 'Banking & Compliance' } },
            { path: 'review', component: IncorpReview, meta: { breadcrumb: 'Review' } },
        ]
    },
    {
        path: '/lawyer',
        component: LawyerDashboard,
        meta: { requiresAuth: true, requiresRole: ['lawyer', 'admin'], breadcrumb: 'Lawyer Portal' }
    },
    {
        path: '/lawyer/matter/:id',
        component: MatterDetail,
        meta: { requiresAuth: true, requiresRole: ['lawyer', 'admin'], breadcrumb: 'Matter Detail' }
    },
    {
        path: '/admin',
        component: AdminPanel,
        meta: { requiresAuth: true, requiresRole: ['admin'], breadcrumb: 'Admin Panel' }
    },
    {
        path: '/login',
        component: Login,
        meta: { isPublic: true, breadcrumb: 'Login' }
    },
    {
        path: '/register',
        component: Register,
        meta: { isPublic: true, breadcrumb: 'Register' }
    },
    {
        path: '/forgot-password',
        component: ForgotPassword,
        meta: { isPublic: true, breadcrumb: 'Forgot Password' }
    },
    {
        path: '/reset-password/:token',
        component: ResetPassword,
        meta: { isPublic: true, breadcrumb: 'Reset Password' }
    },
    {
        path: '/verify-email',
        component: VerifyEmail,
        meta: { isPublic: true, breadcrumb: 'Verify Email' }
    },
] as RouteRecordRaw[];


const router = createRouter({
    history: createWebHistory(),
    routes,
});

// ============================================
// Navigation Guards
// ============================================

/**
 * Get auth state from storage (Pinia store not initialized in router file).
 * Must mirror the hydrateFromStorage() logic in auth.ts:
 * sessionStorage first (session-only "Remember Me" unchecked), then localStorage.
 */
const getAuthState = () => {
    const token = sessionStorage.getItem('token') ?? localStorage.getItem('token');
    const userStr = sessionStorage.getItem('user') ?? localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { isAuthenticated: !!token, user };
};

/**
 * Global navigation guard (UX convenience layer)
 * 
 * DESIGN NOTE (Issue #8): This client-side guard is NOT a security boundary.
 * True authentication and authorization are enforced server-side by the
 * JWT middleware in `authMiddleware.ts`. This guard exists purely for UX:
 * - Redirects unauthenticated users to login (avoids confusing 401 errors)
 * - Redirects unauthorized users based on role
 * - Prevents authenticated users from accessing the login page
 */
router.beforeEach((to: RouteLocationNormalized, _from, next) => {
    const { isAuthenticated, user } = getAuthState();

    // Public routes - always accessible
    if (to.meta.isPublic) {
        // Redirect authenticated users away from login
        if (to.path === '/login' && isAuthenticated) {
            let redirectPath = '/dashboard';
            if (user?.role === 'admin') redirectPath = '/admin';
            else if (user?.role === 'lawyer') redirectPath = '/lawyer';
            return next(redirectPath);
        }
        return next();
    }

    // Protected routes - check authentication
    if (to.meta.requiresAuth) {
        if (!isAuthenticated) {
            // Store intended destination for post-login redirect
            localStorage.setItem('redirectAfterLogin', to.fullPath);
            return next('/login');
        }

        // Check role-based access
        const allowedRoles = to.meta.requiresRole || [];
        if (allowedRoles.length > 0 && user?.role) {
            if (!allowedRoles.includes(user.role)) {
                // Redirect to appropriate dashboard based on role
                let redirectPath = '/dashboard';
                if (user?.role === 'admin') redirectPath = '/admin';
                else if (user?.role === 'lawyer') redirectPath = '/lawyer';
                return next(redirectPath);
            }
        }
    }

    next();
});

// H7: Dynamic document.title updates per route
router.afterEach((to) => {
    const base = 'Valiant AI';
    document.title = to.meta.breadcrumb ? `${to.meta.breadcrumb} — ${base}` : base;
});

export default router;
