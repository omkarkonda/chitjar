// Main application entry point
import './styles/main.css';

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
    // Navigation event listeners
    document.querySelectorAll('.nav__item').forEach(item => {
      item.addEventListener('click', (e) => {
        const route = e.currentTarget.dataset.route;
        this.navigate(route);
      });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      this.currentRoute = e.state?.route || 'dashboard';
      this.render();
    });
  }

  async loadInitialData() {
    this.setState({ loading: true });
    
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('authToken');
      if (token) {
        // Load user data and funds
        await this.loadUserData();
        await this.loadFunds();
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.setState({ error: 'Failed to load data' });
    } finally {
      this.setState({ loading: false });
    }
  }

  async loadUserData() {
    // TODO: Implement API call to load user data
    console.log('Loading user data...');
  }

  async loadFunds() {
    // TODO: Implement API call to load funds
    console.log('Loading funds...');
  }

  navigate(route) {
    this.currentRoute = route;
    
    // Update URL
    const url = route === 'dashboard' ? '/' : `/${route}`;
    window.history.pushState({ route }, '', url);
    
    // Update active nav item
    document.querySelectorAll('.nav__item').forEach(item => {
      item.classList.toggle('nav__item--active', item.dataset.route === route);
    });
    
    this.render();
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

    // Render based on current route
    switch (this.currentRoute) {
      case 'dashboard':
        main.innerHTML = this.renderDashboard();
        break;
      case 'funds':
        main.innerHTML = this.renderFunds();
        break;
      case 'add':
        main.innerHTML = this.renderAdd();
        break;
      case 'insights':
        main.innerHTML = this.renderInsights();
        break;
      default:
        main.innerHTML = this.renderDashboard();
    }
  }

  renderDashboard() {
    return `
      <div class="dashboard">
        <h2>Dashboard</h2>
        <div class="dashboard__stats">
          <div class="stat-card">
            <h3>Total Profit</h3>
            <p class="stat-value">₹0</p>
          </div>
        </div>
        <div class="dashboard__chart">
          <p>Chart will be implemented here</p>
        </div>
      </div>
    `;
  }

  renderFunds() {
    return `
      <div class="funds">
        <h2>My Funds</h2>
        <div class="funds__list">
          <p>No funds yet. Add your first fund!</p>
        </div>
      </div>
    `;
  }

  renderAdd() {
    return `
      <div class="add">
        <h2>Add Fund</h2>
        <p>Fund creation form will be implemented here</p>
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChitJarApp();
});
