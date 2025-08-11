/**
 * Example Routes demonstrating Zod validation middleware
 * 
 * This file shows how to use the validation middleware with Zod schemas
 * for request validation in Express routes.
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  fundCreationSchema,
  fundUpdateSchema,
  userRegistrationSchema,
  paginationSchema,
  uuidSchema
} from '../lib/validation';
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  uuidParamSchema
} from '../lib/validation-utils';
import { sendSuccess } from '../lib/api-conventions';

const router = Router();

// ============================================================================
// Example Routes with Validation
// ============================================================================

/**
 * Example: User registration with body validation
 */
router.post('/users/register', 
  validateBody(userRegistrationSchema),
  (req, res) => {
    // At this point, req.body is validated and typed
    const { email, name } = req.body;
    
    // Simulate user creation (password would be hashed in real implementation)
    const user = {
      id: 'uuid-here',
      email,
      name,
      created_at: new Date().toISOString()
    };
    
    sendSuccess(res, user, 201);
  }
);

/**
 * Example: Fund creation with body validation
 */
router.post('/funds',
  validateBody(fundCreationSchema),
  (req, res) => {
    // req.body is validated against fundCreationSchema
    const fundData = req.body;
    
    // Simulate fund creation
    const fund = {
      id: 'fund-uuid-here',
      user_id: 'user-uuid-here',
      ...fundData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    sendSuccess(res, fund, 201);
  }
);

/**
 * Example: Fund update with params and body validation
 */
router.put('/funds/:id',
  validate({
    params: uuidParamSchema,
    body: fundUpdateSchema
  }),
  (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    // Simulate fund update
    const updatedFund = {
      id,
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    sendSuccess(res, updatedFund);
  }
);

/**
 * Example: Fund list with query parameter validation
 */
router.get('/funds',
  validateQuery(paginationSchema.extend({
    is_active: z.coerce.boolean().optional(),
    search: z.string().max(255).optional()
  })),
  (req, res) => {
    const { page, limit, is_active, search } = req.query as any;
    
    // Simulate fund list retrieval
    const funds = [
      {
        id: 'fund-1',
        name: 'Sample Fund 1',
        chit_value: 100000,
        is_active: true
      },
      {
        id: 'fund-2', 
        name: 'Sample Fund 2',
        chit_value: 200000,
        is_active: false
      }
    ];
    
    // Apply filters (simulation)
    let filteredFunds = funds;
    if (typeof is_active === 'boolean') {
      filteredFunds = funds.filter(f => f.is_active === is_active);
    }
    if (search && typeof search === 'string') {
      filteredFunds = filteredFunds.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    const limitNum = typeof limit === 'number' ? limit : 20;
    
    sendSuccess(res, {
      funds: filteredFunds,
      pagination: {
        page,
        limit: limitNum,
        total: filteredFunds.length,
        totalPages: Math.ceil(filteredFunds.length / limitNum)
      }
    });
  }
);

/**
 * Example: Get single fund with UUID parameter validation
 */
router.get('/funds/:id',
  validateParams(uuidParamSchema),
  (req, res) => {
    const { id } = req.params;
    
    // Simulate fund retrieval
    const fund = {
      id,
      name: 'Sample Fund',
      chit_value: 100000,
      installment_amount: 5000,
      total_months: 20,
      start_month: '2024-01',
      end_month: '2025-08',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    sendSuccess(res, fund);
  }
);

/**
 * Example: Complex validation with multiple schemas
 */
router.post('/funds/:fundId/entries',
  validate({
    params: z.object({
      fundId: uuidSchema
    }),
    body: z.object({
      month_key: z.string().regex(/^\d{4}-\d{2}$/),
      dividend_amount: z.number().nonnegative().default(0),
      prize_money: z.number().nonnegative().default(0),
      is_paid: z.boolean().default(false),
      notes: z.string().max(1000).optional()
    })
  }),
  (req, res) => {
    const { fundId } = req.params;
    const entryData = req.body;
    
    // Simulate entry creation
    const entry = {
      id: 'entry-uuid-here',
      fund_id: fundId,
      ...entryData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    sendSuccess(res, entry, 201);
  }
);

export default router;