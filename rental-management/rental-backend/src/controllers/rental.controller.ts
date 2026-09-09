import { Request, Response } from 'express';
import { rentalService } from '../services/rental.service.js';
import { rentalRepository } from '../repositories/rental.repository.js';
import { PaymentMode, ExpenseCategory, RentalStatus } from '../types/rental.types.js';

export class RentalController {
  // Complexes
  async getAllComplexes(_req: Request, res: Response): Promise<void> {
    try {
      const complexes = rentalService.getComplexes();
      res.status(200).json({ success: true, data: complexes });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getComplexById(req: Request, res: Response): Promise<void> {
    try {
      const complex = rentalService.getComplexById(req.params.id);
      if (!complex) {
        res.status(404).json({ success: false, message: 'Complex not found' });
        return;
      }
      res.status(200).json({ success: true, data: complex });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createComplex(req: Request, res: Response): Promise<void> {
    try {
      const { complexName, location, status } = req.body;
      const complex = rentalService.createComplex(
        { complexName, location, status: status as RentalStatus },
        req.user?.username || 'system'
      );
      res.status(201).json({ success: true, data: complex, message: 'Complex created successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateComplex(req: Request, res: Response): Promise<void> {
    try {
      const complex = rentalService.updateComplex(
        req.params.id,
        req.body,
        req.user?.username || 'system'
      );
      if (!complex) {
        res.status(404).json({ success: false, message: 'Complex not found' });
        return;
      }
      res.status(200).json({ success: true, data: complex, message: 'Complex updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // Shops
  async getAllShops(req: Request, res: Response): Promise<void> {
    try {
      const complexId = req.query.complexId as string | undefined;
      const status = req.query.status as RentalStatus | undefined;
      const shops = rentalService.getShops(complexId, status);
      res.status(200).json({ success: true, data: shops });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getShopById(req: Request, res: Response): Promise<void> {
    try {
      const shop = rentalService.getShopById(req.params.id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }
      res.status(200).json({ success: true, data: shop });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getShopMonthlyStatus(req: Request, res: Response): Promise<void> {
    try {
      const shopId = req.params.id;
      const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
      const status = rentalService.getShopMonthlyStatus(shopId, month);
      if (!status) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }
      res.status(200).json({ success: true, data: status });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createShop(req: Request, res: Response): Promise<void> {
    try {
      const shop = rentalService.createShop(req.body, req.user?.username || 'system');
      res.status(201).json({ success: true, data: shop, message: 'Shop created successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateShop(req: Request, res: Response): Promise<void> {
    try {
      const shop = rentalService.updateShop(req.params.id, req.body, req.user?.username || 'system');
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }
      res.status(200).json({ success: true, data: shop, message: 'Shop updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // Payments
  async getAllPayments(req: Request, res: Response): Promise<void> {
    try {
      const complexId = req.query.complexId as string | undefined;
      const shopId = req.query.shopId as string | undefined;
      const month = req.query.month as string | undefined;
      const paymentMode = req.query.paymentMode as PaymentMode | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const payments = rentalService.getPayments({
        complexId,
        shopId,
        month,
        paymentMode,
        startDate,
        endDate,
      });
      res.status(200).json({ success: true, data: payments });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const payment = rentalService.createPayment(req.body, req.user?.username || 'system');
      res.status(201).json({ success: true, data: payment, message: 'Rent payment recorded successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // Expenses
  async getAllExpenses(req: Request, res: Response): Promise<void> {
    try {
      const complexId = req.query.complexId as string | undefined;
      const shopId = req.query.shopId as string | undefined;
      const category = req.query.category as ExpenseCategory | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const expenses = rentalService.getExpenses({
        complexId,
        shopId,
        category,
        startDate,
        endDate,
      });
      res.status(200).json({ success: true, data: expenses });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createExpense(req: Request, res: Response): Promise<void> {
    try {
      const expense = rentalService.createExpense(req.body, req.user?.username || 'system');
      res.status(201).json({ success: true, data: expense, message: 'Expense recorded successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateExpense(req: Request, res: Response): Promise<void> {
    try {
      const expense = rentalService.updateExpense(req.params.id, req.body, req.user?.username || 'system');
      if (!expense) {
        res.status(404).json({ success: false, message: 'Expense not found' });
        return;
      }
      res.status(200).json({ success: true, data: expense, message: 'Expense updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteExpense(req: Request, res: Response): Promise<void> {
    try {
      const success = rentalService.deleteExpense(req.params.id, req.user?.username || 'system');
      if (!success) {
        res.status(404).json({ success: false, message: 'Expense not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Expense deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // Dashboard & Analytics
  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const month = req.query.month as string | undefined;
      const metrics = rentalService.getDashboardData(month);
      res.status(200).json({ success: true, data: metrics });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getMonthlyRentReport(req: Request, res: Response): Promise<void> {
    try {
      const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
      const report = rentalService.getMonthlyRentReport(month);
      res.status(200).json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getPaymentModeReport(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const report = rentalService.getPaymentModeReport(startDate, endDate);
      res.status(200).json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getAdminSummary(_req: Request, res: Response): Promise<void> {
    try {
      const summary = rentalService.getAdminSummary();
      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getAuditLogs(_req: Request, res: Response): Promise<void> {
    try {
      const logs = rentalRepository.getAuditLogs();
      res.status(200).json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const rentalController = new RentalController();
