// Main application entry point
import './styles/main.css';
import { apiClient } from './lib/apiClient.js';
import { navBar } from './components/NavBar.js';
import { dashboard } from './components/Dashboard.js';
import { fundsList } from './components/FundsList.js';
import { fundForm } from './components/FundForm.js';

class ChitJarApp {
  constructor() {
    this.currentRoute = 'dashboard';
    this.state = {
      user: null,
      funds: [],
      loading: false,
      error: null,
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadInitialData();
    this.render();
  }

  setupEventListeners() {
    // Handle route changes from NavBar
    window.addEventListener('routeChange', e => {
      this.currentRoute = e.detail.route;
      this.render();
    });

    // Handle browser back/forward
    window.addEventListener('popstate', e => {
      this.currentRoute = e.state?.route || 'dashboard';
      this.render();
    });
    // Handle logout event from NavBar
    window.addEventListener('logout', () => {
      this.logout();
    });
  }

  async loadInitialData() {
    this.setState({ loading: true });

    try {
      // Check if user is authenticated
      if (apiClient.isAuthenticated()) {
        // Load user data and funds
        await this.loadUserData();
        await this.loadFunds();
      } else {
        // Check for token in localStorage and try to restore session
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            // Try to refresh the token
            await apiClient.refreshToken();
            // Load user data and funds
            await this.loadUserData();
            await this.loadFunds();
          } catch (error) {
            // Failed to restore session
            // Clear invalid token
            apiClient.clearToken();
            // Redirect to login for protected routes
            if (
              ['dashboard', 'funds', 'add', 'insights'].includes(
                this.currentRoute
              )
            ) {
              this.currentRoute = 'login';
            }
          }
        } else if (
          ['dashboard', 'funds', 'add', 'insights'].includes(this.currentRoute)
        ) {
          // Redirect to login for protected routes when not authenticated
          this.currentRoute = 'login';
        }
      }
    } catch (error) {
      // Failed to load initial data
      this.setState({ error: 'Failed to load data' });
    } finally {
      this.setState({ loading: false });
    }
  }

  async loadUserData() {
    const response = await apiClient.getProfile();
    this.setState({ user: response.data });
  }

  async loadFunds() {
    // TODO: Implement API call to load funds
  }

  navigate(route) {
    // Auth guard for protected routes
    const protectedRoutes = ['dashboard', 'funds', 'add', 'insights'];
    if (protectedRoutes.includes(route) && !apiClient.isAuthenticated()) {
      // Redirect to login
      this.currentRoute = 'login';
      this.render();
      return;
    }

    this.currentRoute = route;

    // Update URL
    const url = route === 'dashboard' ? '/' : `/${route}`;
    window.history.pushState({ route }, '', url);

    // Update active nav item through NavBar
    navBar.updateAuthState();

    this.render();
  }

  async logout() {
    try {
      await apiClient.logout();
      // Reset state
      this.setState({ user: null });
      // Navigate to login
      this.navigate('login');
    } catch (error) {
      // Even if logout fails, clear local state and navigate to login
      this.setState({ user: null });
      this.navigate('login');
    }
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  render() {
    const main = document.querySelector('.main');

    if (this.state.loading) {
      main.innerHTML = `
        <div class="loading">
          <div class="loading__spinner"></div>
          <p>Loading...</p>
        </div>
      `;
      return;
    }

    if (this.state.error) {
      main.innerHTML = `
        <div class="error">
          <p>${this.state.error}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
      return;
    }

    // Auth guard: redirect to login for protected routes when not authenticated
    const protectedRoutes = ['dashboard', 'funds', 'add', 'insights'];
    if (
      protectedRoutes.includes(this.currentRoute) &&
      !apiClient.isAuthenticated()
    ) {
      this.currentRoute = 'login';
    }

    // Render based on current route
    switch (this.currentRoute) {
      case 'dashboard':
        // Check authentication before rendering dashboard
        if (!apiClient.isAuthenticated()) {
          this.currentRoute = 'login';
          main.innerHTML = this.renderLogin();
        } else {
          main.innerHTML = this.renderDashboard();
          // Initialize dashboard component after rendering
          dashboard.loadData();
        }
        break;
      case 'funds':
        // Check authentication before rendering funds
        if (!apiClient.isAuthenticated()) {
          this.currentRoute = 'login';
          main.innerHTML = this.renderLogin();
        } else {
          main.innerHTML = this.renderFunds();
          // Initialize funds list component after rendering
          fundsList.loadData();
          // Add event listener for add fund button
          setTimeout(() => {
            const addFundButton = document.getElementById('add-first-fund');
            if (addFundButton) {
              addFundButton.addEventListener('click', () => {
                this.navigate('add');
              });
            }
          }, 0);
        }
        break;
      case 'add':
        // Check authentication before rendering add form
        if (!apiClient.isAuthenticated()) {
          this.currentRoute = 'login';
          main.innerHTML = this.renderLogin();
        } else {
          main.innerHTML = this.renderAdd();
          // Initialize fund form component after rendering
          fundForm.initCreate();
        }
        break;
      case 'insights':
        main.innerHTML = this.renderInsights();
        break;
      case 'login':
        main.innerHTML = this.renderLogin();
        break;
      default:
        // If not authenticated, show login, otherwise show dashboard
        if (apiClient.isAuthenticated()) {
          main.innerHTML = this.renderDashboard();
          // Initialize dashboard component after rendering
          dashboard.loadData();
        } else {
          main.innerHTML = this.renderLogin();
        }
    }
  }

  renderDashboard() {
    // Return the initial dashboard HTML structure
    return `
      <div class="dashboard">
        <div class="dashboard__header">
          <h2>Dashboard</h2>
        </div>
        
        <div class="dashboard__stats">
          <div class="stat-card">
            <h3>Total Profit</h3>
            <div class="loading__skeleton stat-value-skeleton"></div>
          </div>
        </div>
        
        <div class="dashboard__chart-container">
          <div class="chart-header">
            <h3>Fund vs Profit</h3>
          </div>
          <div class="chart-placeholder">
            <div class="loading__skeleton chart-skeleton"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderFunds() {
    // Return the initial funds list HTML structure
    return `
      <div class="funds">
        <div class="funds__header">
          <h2>My Funds</h2>
        </div>
        
        <div class="funds__grid">
          <div class="fund-card">
            <div class="loading__skeleton fund-card-skeleton"></div>
          </div>
          <div class="fund-card">
            <div class="loading__skeleton fund-card-skeleton"></div>
          </div>
          <div class="fund-card">
            <div class="loading__skeleton fund-card-skeleton"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderAdd() {
    // Return the initial fund form HTML structure
    return `
      <div class="add">
        <div class="fund-form-container">
          <div class="fund-form__header">
            <h2>Add New Fund</h2>
            <p class="fund-form__subtitle">Create a new chit fund to track</p>
          </div>
          
          <form class="fund-form">
            <div class="form-group">
              <div class="loading__skeleton form-skeleton"></div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <div class="loading__skeleton form-skeleton"></div>
              </div>
              
              <div class="form-group">
                <div class="loading__skeleton form-skeleton"></div>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <div class="loading__skeleton form-skeleton"></div>
              </div>
              
              <div class="form-group">
                <div class="loading__skeleton form-skeleton"></div>
              </div>
              
              <div class="form-group">
                <div class="loading__skeleton form-skeleton"></div>
              </div>
            </div>
            
            <div class="form-group">
              <div class="loading__skeleton form-skeleton-textarea"></div>
            </div>
            
            <div class="form-actions">
              <div class="loading__skeleton form-button-skeleton"></div>
              <div class="loading__skeleton form-button-skeleton"></div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderInsights() {
    return `
      <div class="insights">
        <h2>Insights</h2>
        <p>Strategic insights will be implemented here</p>
      </div>
    `;
  }

  renderLogin() {
    return `
      <div class="login">
        <h2>Login to ChitJar</h2>
        <form id="loginForm" class="login__form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="btn btn--primary">Login</button>
        </form>
        <p>Don't have an account? <a href="/signup.html">Sign up</a></p>
      </div>
    `;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new ChitJarApp();
  // Setup form submission handler for login
  document.addEventListener('submit', async e => {
    if (e.target.id === 'loginForm') {
      e.preventDefault();
      const formData = new FormData(e.target);
      const credentials = {
        email: formData.get('email'),
        password: formData.get('password'),
      };
      try {
        await apiClient.login(credentials);
        // Navigate to dashboard on successful login
        app.navigate('dashboard');
      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    }
  });
});
