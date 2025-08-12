/**
 * Navigation Bar Component for ChitJar Frontend
 *
 * This component provides the main navigation interface with
 * authentication-aware links.
 */

import { apiClient } from '../lib/apiClient.js';

class NavBar {
  constructor() {
    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Navigation event listeners
    document.querySelectorAll('.nav__item').forEach(item => {
      item.addEventListener('click', e => {
        const route = e.currentTarget.dataset.route;
        if (route === 'logout') {
          this.handleLogout();
        } else if (route) {
          this.handleNavigation(route);
        }
      });
    });
  }

  handleNavigation(route) {
    // Check authentication for protected routes
    const protectedRoutes = ['dashboard', 'funds', 'add', 'insights'];
    if (protectedRoutes.includes(route) && !apiClient.isAuthenticated()) {
      // Redirect to login
      window.location.href = '/login.html';
      return;
    }

    // Update URL
    const url = route === 'dashboard' ? '/' : `/${route}`;
    window.history.pushState({ route }, '', url);

    // Update active nav item
    document.querySelectorAll('.nav__item').forEach(item => {
      item.classList.toggle('nav__item--active', item.dataset.route === route);
    });

    // Dispatch custom event for app to handle route change
    window.dispatchEvent(new CustomEvent('routeChange', { detail: { route } }));
  }

  async handleLogout() {
    // Dispatch custom event for app to handle logout
    window.dispatchEvent(new CustomEvent('logout'));
  }

  render() {
    // This component doesn't need to render itself as the HTML is in index.html
    // But we can update the navigation based on auth state
    this.updateAuthState();
  }

  updateAuthState() {
    const isAuthenticated = apiClient.isAuthenticated();
    // Update navigation items based on auth state
    const navItems = document.querySelectorAll('.nav__item');
    navItems.forEach(item => {
      const route = item.dataset.route;
      // Hide/show protected routes based on auth state
      if (['dashboard', 'funds', 'add', 'insights'].includes(route)) {
        item.style.display = isAuthenticated ? 'flex' : 'none';
      }
    });
    // Show/hide auth-related items
    const loginItem = document.querySelector('[data-route="login"]');
    const logoutItem = document.querySelector('[data-route="logout"]');

    if (loginItem) {
      loginItem.style.display = isAuthenticated ? 'none' : 'flex';
    }

    if (logoutItem) {
      logoutItem.style.display = isAuthenticated ? 'flex' : 'none';
    }
  }

  show() {
    const nav = document.querySelector('.nav');
    if (nav) {
      nav.style.display = 'flex';
    }
  }

  hide() {
    const nav = document.querySelector('.nav');
    if (nav) {
      nav.style.display = 'none';
    }
  }
}

// Export singleton instance
export const navBar = new NavBar();
