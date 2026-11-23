import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { api, clearSession, getSession, saveSession } from './services/api'
import './App.css'

const AuthContext = createContext(null)
const useAuth = () => useContext(AuthContext)

const roleHome = {
  employee: '/employee',
  manager: '/manager',
  admin: '/admin',
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession)
  const auth = useMemo(() => ({
    user,
    login(session) {
      saveSession(session)
      setUser(session)
    },
    logout() {
      clearSession()
      setUser(null)
    },
  }), [user])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

function AppRoutes() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    function onExpired() {
      logout()
      navigate('/login', { replace: true, state: { expired: true } })
    }

    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [logout, navigate])

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={roleHome[user.role] || '/login'} replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to={roleHome[user.role] || '/login'} replace /> : <RegisterPage />}
      />
      <Route
        path="/employee"
        element={<ProtectedRoute role="employee"><DashboardShell><EmployeeDashboard /></DashboardShell></ProtectedRoute>}
      />
      <Route
        path="/manager"
        element={<ProtectedRoute role="manager"><DashboardShell><ManagerDashboard /></DashboardShell></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<ProtectedRoute role="admin"><DashboardShell><AdminDashboard /></DashboardShell></ProtectedRoute>}
      />
      <Route
        path="*"
        element={<Navigate to={user ? roleHome[user.role] || '/login' : '/login'} replace state={{ from: location }} />}
      />
    </Routes>
  )
}

function ProtectedRoute({ role, children }) {
  const { user } = useAuth()
  if (!user?.token) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={roleHome[user.role] || '/login'} replace />
  return children
}

function Brand({ compact = false }) {
  return (
    <NavLink className={`brand${compact ? ' brand-compact' : ''}`} to="/" aria-label="Daywell home">
      <span className="brand-mark" aria-hidden="true">d</span>
      <span>daywell<span className="brand-period">.</span></span>
    </NavLink>
  )
}

function AuthLayout({ children, eyebrow, title, description, variant }) {
  return (
    <main className="auth-page">
      <section className="auth-aside">
        <div className="auth-aside-content">
          <Brand />
          <div className="aside-copy">
            <span className="eyebrow eyebrow-light">A little more balance.</span>
            <h1>Time away,<br />well managed.</h1>
            <p>Make room for life outside of work. Your time off starts with a simple request.</p>
            <div className="aside-stat">
              <span className="stat-icon" aria-hidden="true">✳</span>
              <span><strong>Better balance begins here</strong><small>One calm place to plan time away.</small></span>
            </div>
          </div>
          <span className="aside-footnote">A brighter workday, by daywell.</span>
        </div>
        <div className="sun-shape" aria-hidden="true" />
      </section>
      <section className={`auth-main ${variant || ''}`}>
        <div className="auth-mobile-brand"><Brand /></div>
        <div className="auth-card">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="auth-description">{description}</p>
          {children}
        </div>
        <p className="auth-legal">© {new Date().getFullYear()} Daywell · Made for a healthier work-life balance</p>
      </section>
    </main>
  )
}

function Notice({ tone = 'error', children, ...props }) {
  if (!children) return null
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'} {...props}>{children}</div>
}

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password to continue.')
      return
    }
    setLoading(true)
    try {
      const result = await api.login({ email: form.email.trim(), password: form.password })
      if (!result?.token || !roleHome[result.role?.toLowerCase()]) {
        throw new Error('Your account could not be verified. Please check with your administrator.')
      }
      const session = { token: result.token, role: result.role.toLowerCase() }
      login(session)
      navigate(roleHome[session.role], { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      title="Sign in to Daywell"
      description="Your time-off plans are just a moment away."
    >
      {location.state?.expired && <Notice>Your session has expired. Please sign in again.</Notice>}
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <Field label="Work email" id="login-email">
          <input id="login-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" required />
        </Field>
        <Field label="Password" id="login-password">
          <input id="login-password" type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" required />
        </Field>
        <Notice>{error}</Notice>
        <button className="button button-primary button-full" type="submit" disabled={loading}>
          {loading ? <><span className="spinner" aria-hidden="true" /> Signing in…</> : 'Sign in'}
        </button>
      </form>
      <p className="auth-switch">New to Daywell? <NavLink to="/register">Create an employee account</NavLink></p>
      <p className="privacy-note"><span aria-hidden="true">▣</span> Your account details stay private and secure.</p>
    </AuthLayout>
  )
}

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Complete each field to create your account.')
      return
    }
    if (form.password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setSuccess('Your employee account is ready. Sign in to continue.')
      setForm({ name: '', email: '', password: '' })
      window.setTimeout(() => navigate('/login', { replace: true }), 1400)
    } catch (requestError) {
      setError(requestError.message || 'Unable to create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="A FRESH START"
      title="Create your account"
      description="Join your team and make your next day off count."
      variant="auth-register"
    >
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <Field label="Full name" id="register-name">
          <input id="register-name" type="text" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" required />
        </Field>
        <Field label="Work email" id="register-email">
          <input id="register-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" required />
        </Field>
        <Field label="Password" id="register-password" hint="At least 8 characters">
          <input id="register-password" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Create a password" minLength={8} required />
        </Field>
        <Notice>{error}</Notice>
        <Notice tone="success">{success}</Notice>
        <button className="button button-primary button-full" type="submit" disabled={loading}>
          {loading ? <><span className="spinner" aria-hidden="true" /> Creating account…</> : 'Create employee account'}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <NavLink to="/login">Sign in</NavLink></p>
      <p className="privacy-note"><span aria-hidden="true">▣</span> Public sign-up is for employees. Ask your administrator for other access.</p>
    </AuthLayout>
  )
}

function Field({ label, id, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

function DashboardShell({ children }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const info = {
    employee: { name: 'My time off', icon: '◷' },
    manager: { name: 'Team requests', icon: '▤' },
    admin: { name: 'Leave report', icon: '▥' },
  }[user.role]

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <Brand compact />
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <span className="side-link side-link-active"><span aria-hidden="true">{info.icon}</span>{info.name}</span>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon" aria-hidden="true">✳</span>
            <strong>Need a hand?</strong>
            <span>Reach out to your team administrator.</span>
          </div>
          <div className="profile">
            <div className="avatar" aria-hidden="true">{user.role.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy"><strong>{user.role[0].toUpperCase() + user.role.slice(1)}</strong><span>{user.role} account</span></div>
            <button type="button" className="logout-button" onClick={handleLogout} aria-label="Log out" title="Log out">↗</button>
          </div>
        </div>
      </aside>
      {menuOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <button type="button" className="mobile-menu" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{info.name}</strong></div>
          <div className="topbar-right"><span className="online-indicator" /> All systems normal <div className="topbar-avatar" aria-hidden="true">{user.role.slice(0, 1).toUpperCase()}</div></div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}

function PageHeading({ kicker, title, description, children }) {
  return (
    <div className="page-heading">
      <div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>
      {children}
    </div>
  )
}

function EmployeeDashboard() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshError, setRefreshError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' })

  async function loadLeaves() {
    setLoading(true)
    setRefreshError('')
    try {
      const data = await api.getMyLeaves()
      setLeaves(Array.isArray(data) ? data : data?.leaves || [])
    } catch (error) {
      setRefreshError(error.message || 'Could not load your leave requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    api.getMyLeaves()
      .then((data) => {
        if (active) setLeaves(Array.isArray(data) ? data : data?.leaves || [])
      })
      .catch((error) => {
        if (active) setRefreshError(error.message || 'Could not load your leave requests.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function handleApply(event) {
    event.preventDefault()
    setSubmitError('')
    setSuccess('')
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setSubmitError('Add a start date, end date, and reason before submitting.')
      return
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(`${form.startDate}T00:00:00`)
    const end = new Date(`${form.endDate}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start < today || end < start) {
      setSubmitError('Choose valid dates. The end date must be on or after the start date, and leave cannot start in the past.')
      return
    }
    setSubmitting(true)
    try {
      await api.applyForLeave({ ...form, reason: form.reason.trim() })
      setForm({ startDate: '', endDate: '', reason: '' })
      setSuccess('Your leave request has been submitted.')
      await loadLeaves()
    } catch (error) {
      setSubmitError(error.message || 'Could not submit your leave request.')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = leaves.filter((leave) => getStatus(leave) === 'pending').length
  const nextTimeOff = leaves
    .filter((leave) => getStatus(leave) === 'approved' && leave.startDate)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0]

  return (
    <>
      <PageHeading kicker="EMPLOYEE SPACE" title="Your time, your way." description="Plan a little time to recharge. We’ll take care of the details." />
      <div className="welcome-strip">
        <div className="welcome-icon" aria-hidden="true">☀</div>
        <div><strong>Make space for what matters.</strong><p>A good break starts with a plan. Submit your request whenever you’re ready.</p></div>
        <span className="welcome-decoration" aria-hidden="true">✳</span>
      </div>
      <div className="summary-grid">
        <SummaryCard label="Requests this year" value={leaves.length} icon="◷" tone="blue" />
        <SummaryCard label="Awaiting a decision" value={pendingCount} icon="◌" tone="yellow" />
        <SummaryCard label="Next approved time off" value={nextTimeOff ? formatDate(nextTimeOff.startDate) : 'Not planned'} icon="✳" tone="green" />
      </div>
      <div className="content-grid">
        <section className="panel apply-panel">
          <PanelHeading icon="＋" title="Request time off" subtitle="Tell us when you’ll be away." />
          <form className="form-stack dashboard-form" onSubmit={handleApply} noValidate>
            <div className="date-fields">
              <Field label="First day away" id="leave-start">
                <input id="leave-start" type="date" min={todayString()} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
              </Field>
              <Field label="Last day away" id="leave-end">
                <input id="leave-end" type="date" min={form.startDate || todayString()} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
              </Field>
            </div>
            <Field label="A short note" id="leave-reason" hint="Share a little context with your manager.">
              <textarea id="leave-reason" rows="3" maxLength="500" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="What are you taking time for?" required />
            </Field>
            <Notice>{submitError}</Notice>
            <Notice tone="success">{success}</Notice>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? <><span className="spinner" aria-hidden="true" /> Sending request…</> : 'Send request'}
            </button>
          </form>
        </section>
        <section className="panel history-panel">
          <PanelHeading icon="◷" title="Request history" subtitle="Your leave plans, all in one place." />
          {refreshError && <Notice>{refreshError}</Notice>}
          {loading ? <LoadingState label="Loading your requests…" /> : leaves.length === 0 ? (
            <EmptyState icon="◷" title="Nothing on the calendar yet" description="Your leave requests will show up here once you submit one." />
          ) : (
            <div className="request-list">
              {leaves.map((leave) => <LeaveRow key={leave._id || leave.id || `${leave.startDate}-${leave.endDate}`} leave={leave} />)}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function ManagerDashboard() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updating, setUpdating] = useState('')

  useEffect(() => {
    let active = true
    api.getPendingLeaves()
      .then((data) => {
        if (active) setRequests(Array.isArray(data) ? data : data?.leaves || [])
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load pending requests.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function decide(id, decision) {
    if (!id) {
      setError('This request is missing its ID and cannot be updated.')
      return
    }
    setUpdating(id)
    setError('')
    setMessage('')
    try {
      await api.decideLeave(id, decision)
      setRequests((current) => current.filter((request) => (request._id || request.id) !== id))
      setMessage(`Request ${decision === 'approve' ? 'approved' : 'rejected'}.`)
    } catch (requestError) {
      setError(requestError.message || 'Could not update this request.')
    } finally {
      setUpdating('')
    }
  }

  return (
    <>
      <PageHeading kicker="MANAGER SPACE" title="A thoughtful team starts with a good break." description="Review upcoming time away and help your team plan with confidence." />
      <div className="manager-banner"><span className="manager-banner-icon" aria-hidden="true">✳</span><span><strong>Every request is a chance to support balance.</strong><small>Review the details, then approve or decline with care.</small></span><span className="banner-sun" aria-hidden="true">☼</span></div>
      <section className="panel review-panel">
        <div className="review-heading"><PanelHeading icon="▤" title="Needs your review" subtitle="Pending employee leave requests." /><span className="count-pill">{requests.length} pending</span></div>
        <Notice>{error}</Notice>
        <Notice tone="success">{message}</Notice>
        {loading ? <LoadingState label="Loading pending requests…" /> : requests.length === 0 ? (
          <EmptyState icon="✓" title="You’re all caught up" description="New team requests will appear here when they’re submitted." />
        ) : (
          <div className="manager-list">
            {requests.map((request) => {
              const id = request._id || request.id
              const employee = request.employee || request.user || {}
              const employeeName = typeof employee === 'string' ? employee : employee.name || request.employeeName || 'Team member'
              return (
                <article className="manager-request" key={id || `${request.startDate}-${employeeName}`}>
                  <div className="employee-avatar" aria-hidden="true">{employeeName.slice(0, 1).toUpperCase()}</div>
                  <div className="manager-request-main">
                    <div className="manager-request-title"><strong>{employeeName}</strong><span className="status status-pending">Pending</span></div>
                    <span className="employee-email">{typeof employee === 'object' ? employee.email || '' : ''}</span>
                    <div className="manager-dates"><span>◷</span> {formatDateRange(request.startDate, request.endDate)}</div>
                    <p className="request-reason">{request.reason || 'No note provided.'}</p>
                  </div>
                  <div className="request-actions">
                    <button className="button button-outline" type="button" disabled={!id || updating === id} onClick={() => decide(id, 'reject')}>Decline</button>
                    <button className="button button-success" type="button" disabled={!id || updating === id} onClick={() => decide(id, 'approve')}>{updating === id ? 'Saving…' : 'Approve'}</button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

function AdminDashboard() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.getReport()
      .then((data) => { if (active) setReport(data) })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load the leave report.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <>
      <PageHeading kicker="ADMIN SPACE" title="A clearer view of time away." description="A high-level look at how your organisation is taking time to recharge." />
      <div className="report-intro"><span className="report-icon" aria-hidden="true">▥</span><div><strong>Leave overview</strong><p>All requests across your organisation.</p></div><span className="report-period">ALL TIME</span></div>
      <Notice>{error}</Notice>
      {loading ? <section className="panel report-loading"><LoadingState label="Preparing your report…" /></section> : report ? (
        <div className="report-grid">
          <SummaryCard label="Total requests" value={report.totalLeaves ?? 0} icon="◷" tone="blue" detail="All leave requests" />
          <SummaryCard label="Approved" value={report.approvedLeaves ?? 0} icon="✓" tone="green" detail="Ready to take time away" />
          <SummaryCard label="Pending review" value={report.pendingLeaves ?? 0} icon="◌" tone="yellow" detail="Waiting for a decision" />
          <SummaryCard label="Declined" value={report.rejectedLeaves ?? 0} icon="×" tone="coral" detail="Requests not approved" />
          <section className="panel report-note">
            <span className="note-sparkle" aria-hidden="true">✳</span><div><strong>Rest helps teams thrive.</strong><p>Thanks for making time away visible and easier to manage.</p></div>
          </section>
        </div>
      ) : <section className="panel"><EmptyState icon="▥" title="No report to show" description="The report could not be loaded. Please try again later." /></section>}
    </>
  )
}

function PanelHeading({ icon, title, subtitle }) {
  return <div className="panel-heading"><span className="panel-icon" aria-hidden="true">{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>
}

function SummaryCard({ label, value, icon, tone, detail }) {
  return (
    <article className="summary-card">
      <div className="summary-top"><span>{label}</span><span className={`summary-icon summary-${tone}`} aria-hidden="true">{icon}</span></div>
      <strong className="summary-value">{value}</strong>
      {detail && <span className="summary-detail">{detail}</span>}
    </article>
  )
}

function EmptyState({ icon, title, description }) {
  return <div className="empty-state"><span className="empty-icon" aria-hidden="true">{icon}</span><strong>{title}</strong><p>{description}</p></div>
}

function LoadingState({ label }) {
  return <div className="loading-state" role="status"><span className="spinner spinner-dark" aria-hidden="true" />{label}</div>
}

function LeaveRow({ leave }) {
  const status = getStatus(leave)
  return (
    <article className="leave-row">
      <span className="leave-date-icon" aria-hidden="true">◷</span>
      <div className="leave-row-copy"><strong>{formatDateRange(leave.startDate, leave.endDate)}</strong><span>{leave.reason || 'Time off request'}</span></div>
      <span className={`status status-${status}`}>{capitalize(status)}</span>
    </article>
  )
}

function getStatus(leave) {
  return String(leave.status || 'pending').toLowerCase()
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(value) {
  if (!value) return 'Date not set'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? 'Date not set' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function formatDateRange(start, end) {
  if (!start && !end) return 'Dates not set'
  if (!end || start === end) return formatDate(start || end)
  const startDate = new Date(`${String(start).slice(0, 10)}T00:00:00`)
  const endDate = new Date(`${String(end).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Dates not set'
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()
  if (sameMonth) {
    return `${new Intl.DateTimeFormat(undefined, { month: 'short' }).format(startDate)} ${startDate.getDate()} – ${endDate.getDate()}, ${endDate.getFullYear()}`
  }
  return `${formatDate(start)} – ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(endDate)}`
}

function todayString() {
  const today = new Date()
  const offset = today.getTimezoneOffset()
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}
