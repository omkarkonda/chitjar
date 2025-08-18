/**
 * Navigation Bar Component for ChitJar Frontend
 *
 * This component provides the main navigation interface with
 * authentication-aware links for both mobile (bottom) and desktop (sidebar) layouts.
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
    // Navigation event listeners for both mobile and desktop
    document
      .querySelectorAll('.nav-bottom__item, .nav-sidebar__item')
      .forEach(item => {
        item.addEventListener('click', e => {
          const route = e.currentTarget.dataset.route;
          if (route === 'logout') {
            this.handleLogout();
          } else if (route) {
            this.handleNavigation(route);
          }
        });

        // Add keyboard support
        item.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const route = e.currentTarget.dataset.route;
            if (route === 'logout') {
              this.handleLogout();
            } else if (route) {
              this.handleNavigation(route);
            }
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

    // Update active nav items for both mobile and desktop
    this.updateActiveState(route);

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

  updateActiveState(route) {
    // Update active nav items for both mobile and desktop
    document
      .querySelectorAll('.nav-bottom__item, .nav-sidebar__item')
      .forEach(item => {
        item.classList.toggle(
          'nav-bottom__item--active',
          item.classList.contains('nav-bottom__item') &&
            item.dataset.route === route
        );
        item.classList.toggle(
          'nav-sidebar__item--active',
          item.classList.contains('nav-sidebar__item') &&
            item.dataset.route === route
        );
      });
  }

  updateAuthState() {
    const isAuthenticated = apiClient.isAuthenticated();

    // Update navigation items based on auth state for both mobile and desktop
    const navItems = document.querySelectorAll(
      '.nav-bottom__item, .nav-sidebar__item'
    );
    navItems.forEach(item => {
      const route = item.dataset.route;
      // Hide/show protected routes based on auth state
      if (['dashboard', 'funds', 'add', 'insights'].includes(route)) {
        item.style.display = isAuthenticated ? 'flex' : 'none';
      }
    });

    // Show/hide auth-related items
    const loginItems = document.querySelectorAll('[data-route="login"]');
    const logoutItems = document.querySelectorAll('[data-route="logout"]');

    loginItems.forEach(item => {
      item.style.display = isAuthenticated ? 'none' : 'flex';
    });

    logoutItems.forEach(item => {
      item.style.display = isAuthenticated ? 'flex' : 'none';
    });
  }

  show() {
    const bottomNav = document.querySelector('.nav-bottom');
    const sidebarNav = document.querySelector('.nav-sidebar');

    if (bottomNav) {
      bottomNav.style.display = 'flex';
    }

    if (sidebarNav) {
      sidebarNav.style.display = 'block';
    }
  }

  hide() {
    const bottomNav = document.querySelector('.nav-bottom');
    const sidebarNav = document.querySelector('.nav-sidebar');

    if (bottomNav) {
      bottomNav.style.display = 'none';
    }

    if (sidebarNav) {
      sidebarNav.style.display = 'none';
    }
  }
}

// Export singleton instance
export const navBar = new NavBar();
