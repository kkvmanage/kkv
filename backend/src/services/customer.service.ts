import { googleDriveRepository } from '../repositories/googleDrive.repository.js';
import { Customer } from '../types/index.js';

const FILE_NAME = 'customers.json';

const initialCustomers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'thayba',
    phone: '9876543210',
    gender: 'Female',
    age: 28,
    occupation: 'Business',
    email: 'thayba@example.com',
    currentAddress: '123 Market Street, Main Town',
    permanentAddress: '123 Market Street, Main Town',
    idProof: 'Aadhaar Card',
    idNumber: '1234-5678-9012',
    activeLoansCount: 1,
    totalBorrowed: 100000,
    status: 'VERIFIED',
    joinedDate: '25/08/2026'
  },
  {
    id: 'CUST-002',
    name: 'Thayba Begum',
    phone: '9123456789',
    gender: 'Female',
    age: 32,
    occupation: 'Housewife',
    email: 'thaybabegum@example.com',
    currentAddress: '45 Lake View Road',
    permanentAddress: '45 Lake View Road',
    idProof: 'PAN Card',
    idNumber: 'ABCDE1234F',
    activeLoansCount: 0,
    totalBorrowed: 0,
    status: 'VERIFIED',
    joinedDate: '25/08/2026'
  }
];

export class CustomerService {
  public getAll(): Customer[] {
    return googleDriveRepository.readJson<Customer[]>(FILE_NAME, initialCustomers);
  }

  public getById(id: string): Customer | null {
    const customers = this.getAll();
    return customers.find((c) => c.id === id || c.name.toLowerCase() === id.toLowerCase()) || null;
  }

  public search(query: string): Customer[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return this.getAll().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.idNumber.toLowerCase().includes(q)
    );
  }

  public create(data: Omit<Customer, 'id' | 'activeLoansCount' | 'totalBorrowed' | 'joinedDate'>): Customer {
    const customers = this.getAll();
    const id = `CUST-${Date.now().toString().slice(-4)}`;
    const newCustomer: Customer = {
      ...data,
      id,
      activeLoansCount: 0,
      totalBorrowed: 0,
      status: 'VERIFIED',
      joinedDate: new Date().toLocaleDateString('en-GB')
    };
    customers.unshift(newCustomer);
    googleDriveRepository.writeJson(FILE_NAME, customers);
    return newCustomer;
  }

  public update(id: string, data: Partial<Customer>): Customer | null {
    const customers = this.getAll();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) return null;
    customers[index] = { ...customers[index], ...data };
    googleDriveRepository.writeJson(FILE_NAME, customers);
    return customers[index];
  }

  public delete(id: string): boolean {
    const customers = this.getAll();
    const filtered = customers.filter((c) => c.id !== id);
    if (filtered.length === customers.length) return false;
    return googleDriveRepository.writeJson(FILE_NAME, filtered);
  }
}

export const customerService = new CustomerService();
