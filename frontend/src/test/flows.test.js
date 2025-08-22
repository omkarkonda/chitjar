import { apiClient } from '../lib/apiClient.js';
import { fundsList } from '../components/FundsList.js';
import { fundForm } from '../components/FundForm.js';
import { fundDetail } from '../components/FundDetail.js';
import { monthlyEntryForm } from '../components/MonthlyEntryForm.js';
import { dashboard } from '../components/Dashboard.js';

// Mock DOM APIs
document.createRange = () => ({
  setStart: () => {},
  setEnd: () => {},
  commonAncestorContainer: {
    nodeName: 'BODY',
    ownerDocument: document,
  },
});

describe('Frontend Flows', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    
    // Mock DOM
    document.body.innerHTML = `
      <div class="main"></div>
      <div class="nav-bar"></div>
    `;
  });

  describe('Create Fund Flow', () => {
    test('should successfully create a new fund', async () => {
      // Mock API client
      apiClient.isAuthenticated = jest.fn().mockReturnValue(true);
      apiClient.post = jest.fn().mockResolvedValue({
        data: {
          id: 'test-fund-id',
          name: 'Test Fund',
          chit_value: 100000,
          installment_amount: 10000,
          total_months: 12,
          start_month: '2024-01',
          end_month: '2024-12',
        }
      });
      
      // Mock window dispatchEvent
      window.dispatchEvent = jest.fn();
      
      // Initialize fund form for creation
      fundForm.initCreate();
      
      // Simulate filling form data
      fundForm.fundData = {
        name: 'Test Fund',
        chit_value: '1,00,000',
        installment_amount: '10,000',
        total_months: '12',
        start_month: '2024-01',
        end_month: '2024-12',
        notes: 'Test fund notes',
      };
      
      // Mock form validation to pass
      fundForm.validateForm = jest.fn().mockReturnValue(true);
      
      // Mock render function
      fundForm.render = jest.fn();
      
      // Submit the form
      await fundForm.handleSubmit();
      
      // Verify API call was made
      expect(apiClient.post).toHaveBeenCalledWith('/funds', {
        name: 'Test Fund',
        chit_value: 100000,
        installment_amount: 10000,
        total_months: 12,
        start_month: '2024-01',
        end_month: '2024-12',
        notes: 'Test fund notes',
      });
      
      // Verify navigation to funds list
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'routeChange',
          detail: { route: 'funds' }
        })
      );
    });

    test('should show validation errors for invalid fund data', async () => {
      // Initialize fund form for creation
      fundForm.initCreate();
      
      // Simulate invalid form data
      fundForm.fundData = {
        name: '', // Required field
        chit_value: '0', // Should be positive
        installment_amount: '10,000',
        total_months: '12',
        start_month: '2024-01',
        end_month: '2024-12',
        notes: '',
      };
      
      // Mock form validation to fail
      fundForm.validateForm = jest.fn().mockReturnValue(false);
      
      // Mock render function
      fundForm.render = jest.fn();
      
      // Submit the form
      await fundForm.handleSubmit();
      
      // Verify form was re-rendered with errors
      expect(fundForm.render).toHaveBeenCalled();
    });
  });

  describe('Add Entry Flow', () => {
    test('should successfully add a new monthly entry', async () => {
      // Mock API client
      apiClient.isAuthenticated = jest.fn().mockReturnValue(true);
      apiClient.get = jest.fn()
        .mockResolvedValueOnce({
          data: {
            id: 'test-fund-id',
            name: 'Test Fund',
            chit_value: 100000,
            installment_amount: 10000,
            total_months: 12,
          }
        }) // For fund details
        .mockResolvedValueOnce({
          data: {
            id: 'test-entry-id',
            fund_id: 'test-fund-id',
            month_key: '2024-01',
            dividend_amount: 5000,
            is_paid: true,
          }
        }); // For entry creation
      
      // Mock window dispatchEvent
      window.dispatchEvent = jest.fn();
      
      // Initialize monthly entry form for new entry
      fundForm.fundId = 'test-fund-id';
      monthlyEntryForm.initNew(
        'test-fund-id',
        '2024-01',
        jest.fn(), // onSuccess
        jest.fn()  // onCancel
      );
      
      // Simulate filling entry data
      monthlyEntryForm.entry = {
        month_key: '2024-01',
        dividend_amount: '5,000',
        is_paid: true,
        notes: 'January dividend',
      };
      
      // Mock fund data for validation
      monthlyEntryForm.fund = {
        id: 'test-fund-id',
        chit_value: 100000,
        installment_amount: 10000,
        total_months: 12,
      };
      
      // Mock validation to pass
      monthlyEntryForm.validateField = jest.fn();
      
      // Mock render function
      monthlyEntryForm.render = jest.fn();
      
      // Submit the form
      const mockEvent = { preventDefault: jest.fn() };
      await monthlyEntryForm.handleSubmit(mockEvent);
      
      // Verify API call was made
      expect(apiClient.post).toHaveBeenCalledWith('/entries', {
        fund_id: 'test-fund-id',
        month_key: '2024-01',
        dividend_amount: 5000,
        is_paid: true,
        notes: 'January dividend',
      });
    });
  });

  describe('View Analytics Flow', () => {
    test('should successfully load and display dashboard analytics', async () => {
      // Mock API client
      apiClient.isAuthenticated = jest.fn().mockReturnValue(true);
      apiClient.get = jest.fn()
        .mockResolvedValueOnce({
          data: {
            funds: [
              {
                fund_id: 'fund-1',
                fund_name: 'Fund A',
                total_profit: 10000,
                xirr: 12.5,
                cash_flow_count: 6
              },
              {
                fund_id: 'fund-2',
                fund_name: 'Fund B',
                total_profit: 5000,
                xirr: 8.2,
                cash_flow_count: 4
              }
            ],
            fund_count: 2
          }
        }); // For dashboard analytics
      
      // Mock DOM for chart
      document.body.innerHTML = `
        <div class="main">
          <div class="dashboard">
            <div class="dashboard__chart-container">
              <canvas id="fund-profit-chart"></canvas>
            </div>
          </div>
        </div>
      `;
      
      // Mock chart creation
      global.Chart = {
        register: jest.fn(),
        unregister: jest.fn(),
      };
      
      // Load dashboard data
      await dashboard.loadData();
      
      // Verify API call was made
      expect(apiClient.get).toHaveBeenCalledWith('/analytics/dashboard');
      
      // Verify data was loaded
      expect(dashboard.funds).toHaveLength(2);
    });

    test('should successfully load and display fund detail analytics', async () => {
      // Mock API client
      apiClient.isAuthenticated = jest.fn().mockReturnValue(true);
      apiClient.get = jest.fn()
        .mockResolvedValueOnce({
          data: {
            id: 'test-fund-id',
            name: 'Test Fund',
            chit_value: 100000,
            installment_amount: 10000,
            total_months: 12,
            is_active: true,
          }
        }) // For fund details
        .mockResolvedValueOnce({
          data: {
            entries: [
              {
                month_key: '2024-01',
                dividend_amount: 5000,
                is_paid: true,
              },
              {
                month_key: '2024-02',
                dividend_amount: 6000,
                is_paid: true,
              }
            ]
          }
        }) // For fund entries
        .mockResolvedValueOnce({
          data: {
            fund_id: 'test-fund-id',
            cash_flow_series: [
              { date: '2024-01-01', amount: -10000 },
              { date: '2024-01-01', amount: 5000 },
              { date: '2024-02-01', amount: -10000 },
              { date: '2024-02-01', amount: 6000 },
            ],
            net_cash_flow_series: [
              { date: '2024-01-01', amount: -5000 },
              { date: '2024-02-01', amount: -4000 },
            ],
            xirr: 15.2,
            projections: {
              projected_cash_flows: [],
              average_monthly_cash_flow: 5500,
              projected_months: 12
            }
          }
        }); // For fund analytics
      
      // Mock DOM
      document.body.innerHTML = `
        <div class="main">
          <div class="fund-detail"></div>
        </div>
      `;
      
      // Load fund detail data
      await fundDetail.loadData('test-fund-id');
      
      // Verify API calls were made
      expect(apiClient.get).toHaveBeenNthCalledWith(1, '/funds/test-fund-id');
      expect(apiClient.get).toHaveBeenNthCalledWith(2, '/funds/test-fund-id/entries');
      expect(apiClient.get).toHaveBeenNthCalledWith(3, '/analytics/funds/test-fund-id');
      
      // Verify data was loaded
      expect(fundDetail.fund).toBeDefined();
      expect(fundDetail.entries).toHaveLength(2);
      expect(fundDetail.analytics).toBeDefined();
      expect(fundDetail.analytics.xirr).toBe(15.2);
    });
  });
});