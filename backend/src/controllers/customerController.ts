import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CustomerModel, ICustomer, IKYCDocument } from '../models/Customer.js';
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  getKycDocFolder,
  isCloudinaryConfigured
} from '../config/cloudinary.js';
import { generateCustomerId } from '../utils/customerIdGenerator.js';

export interface CreateCustomerRequest {
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  phoneNumber: string;
  email?: string;
  occupation?: string;
  age?: number;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  currentAddress?: string;
  permanentAddress?: string;
  idProofType?: string;
  idProofNumber?: string;
  extraPan?: string;
  docName?: string;
  customerPhoto?: string;
  status?: 'VERIFIED' | 'PENDING' | 'BLOCKED';
}

export interface CloudinaryAssetRef {
  publicId: string;
  resourceType: 'image' | 'raw' | 'video';
}

/**
 * Validates Indian 10-digit mobile number
 */
function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}

/**
 * Normalizes phone number to 10 digits
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Automatically calculates age from date of birth (YYYY-MM-DD or DD/MM/YYYY)
 */
function calculateAge(dobStr: string): number | undefined {
  if (!dobStr) return undefined;
  try {
    let birthDate: Date;
    if (dobStr.includes('/')) {
      const [d, m, y] = dobStr.split('/').map(Number);
      birthDate = new Date(y, m - 1, d);
    } else {
      birthDate = new Date(dobStr);
    }
    if (isNaN(birthDate.getTime())) return undefined;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Helper to convert a base64 data URI to a Buffer
 */
function dataUriToBuffer(dataUri: string): { buffer: Buffer; mimeType: string } | null {
  try {
    const match = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!match) return null;
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2], 'base64')
    };
  } catch {
    return null;
  }
}

/**
 * Helper to rollback/clean up uploaded Cloudinary assets when an error occurs
 */
async function rollbackCloudinaryAssets(assets: CloudinaryAssetRef[]) {
  if (!assets || assets.length === 0) return;
  console.log(`[Cloudinary Rollback] Cleaning up ${assets.length} uploaded assets...`);
  for (const asset of assets) {
    try {
      await deleteFromCloudinary(asset.publicId, asset.resourceType);
    } catch (err) {
      console.warn(`[Cloudinary Rollback] Failed to delete ${asset.publicId}:`, err);
    }
  }
}

/**
 * POST /api/customers
 * Permanent MongoDB creation with Cloudinary uploads for photo and KYC documents.
 * Full transaction rollback on failure to prevent orphaned Cloudinary assets.
 */
export const createCustomer = async (req: Request, res: Response) => {
  const uploadedAssets: CloudinaryAssetRef[] = [];

  try {
    // Ensure MongoDB connection is ready
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is currently unavailable. Permanent MongoDB connection is required.',
        error: { code: 'DATABASE_DISCONNECTED' }
      });
    }

    const body = req.body || {};
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};

    // 1. Extract and normalize fields
    const fullName = (body.fullName || body.name || '').trim();
    const rawPhoneNumber = (body.phoneNumber || body.phone || '').trim();
    const gender = body.gender || 'Male';
    const email = (body.email || '').trim().toLowerCase();
    const occupation = (body.occupation || 'Self Employed').trim();
    const dateOfBirth = (body.dateOfBirth || body.dob || '').trim();
    let age = body.age ? parseInt(body.age, 10) : undefined;

    if (dateOfBirth && !age) {
      age = calculateAge(dateOfBirth);
    }

    const address = (body.address || body.currentAddress || '').trim();
    const city = (body.city || '').trim();
    const district = (body.district || '').trim();
    const state = (body.state || 'Tamil Nadu').trim();
    const pincode = (body.pincode || '').trim();
    const currentAddress = (body.currentAddress || address).trim();
    const permanentAddress = (body.permanentAddress || currentAddress).trim();

    const idProofType = body.idProofType || body.idProof || 'Aadhaar';
    const idProofNumber = (body.idProofNumber || body.idNumber || '').trim();
    const extraPan = (body.extraPan || '').trim();
    const docName = (body.docName || '').trim();

    // 2. Validation
    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'Full Name is required.'
      });
    }

    if (!rawPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone Number is required.'
      });
    }

    const phoneNumber = normalizePhone(rawPhoneNumber);
    if (!isValidIndianPhone(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).'
      });
    }

    // Check duplicate phone number in MongoDB
    const existingInDb = await CustomerModel.findOne({
      isDeleted: { $ne: true },
      $or: [{ phoneNumber }, { phoneNormalized: phoneNumber }]
    });

    if (existingInDb) {
      return res.status(409).json({
        success: false,
        message: `This mobile number is already registered to ${existingInDb.fullName} (${existingInDb.customerId}).`,
        error: 'DUPLICATE_PHONE_NUMBER'
      });
    }

    // 3. Generate unique sequential Customer ID (KKV-2026-000001)
    const { customerId, sequenceNumber } = await generateCustomerId('KKV-2026');

    // 4. Upload Customer Photo to Cloudinary
    let customerPhotoData = { url: '', publicId: '' };
    const photoFile = files['customerPhoto']?.[0];

    if (photoFile) {
      try {
        const uploadResult = await uploadBufferToCloudinary(photoFile.buffer, {
          folder: 'kkv-gold-finance/customers/photos',
          publicId: `${customerId}-photo`,
          resourceType: 'image'
        });

        customerPhotoData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        };
        uploadedAssets.push({ publicId: uploadResult.public_id, resourceType: 'image' });
      } catch (uploadErr: any) {
        console.error('[Cloudinary] Customer photo upload failed:', uploadErr);
        await rollbackCloudinaryAssets(uploadedAssets);
        return res.status(500).json({
          success: false,
          message: `Customer photo upload to Cloudinary failed: ${uploadErr.message || 'Upload error'}`
        });
      }
    } else if (body.customerPhoto && typeof body.customerPhoto === 'string' && body.customerPhoto.startsWith('data:image')) {
      const parsed = dataUriToBuffer(body.customerPhoto);
      if (parsed) {
        try {
          const uploadResult = await uploadBufferToCloudinary(parsed.buffer, {
            folder: 'kkv-gold-finance/customers/photos',
            publicId: `${customerId}-photo`,
            resourceType: 'image'
          });

          customerPhotoData = {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
          };
          uploadedAssets.push({ publicId: uploadResult.public_id, resourceType: 'image' });
        } catch (uploadErr: any) {
          console.error('[Cloudinary] Webcam photo upload failed:', uploadErr);
          await rollbackCloudinaryAssets(uploadedAssets);
          return res.status(500).json({
            success: false,
            message: `Webcam photo upload to Cloudinary failed: ${uploadErr.message || 'Upload error'}`
          });
        }
      }
    }

    // 5. Upload KYC Documents to Cloudinary
    const kycDocuments: IKYCDocument[] = [];
    const kycFiles = [
      ...(files['kycDocuments'] || []),
      ...(files['aadhaarDoc'] || []),
      ...(files['panDoc'] || []),
      ...(files['otherDoc'] || [])
    ];

    for (let i = 0; i < kycFiles.length; i++) {
      const file = kycFiles[i];
      const docType =
        file.fieldname === 'aadhaarDoc' ? 'Aadhaar' :
        file.fieldname === 'panDoc' ? 'PAN' :
        file.fieldname === 'otherDoc' ? (docName || 'Other') : idProofType;

      const folder = getKycDocFolder(docType);
      const isPdf = file.mimetype === 'application/pdf';
      const resourceType = isPdf ? 'raw' : 'image';

      try {
        const uploadResult = await uploadBufferToCloudinary(file.buffer, {
          folder,
          publicId: `${customerId}-kyc-${docType.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i + 1}`,
          resourceType
        });

        uploadedAssets.push({ publicId: uploadResult.public_id, resourceType });

        kycDocuments.push({
          documentType: docType,
          documentNumber: idProofNumber || '',
          documentName: file.originalname || `${docType} Document`,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          resourceType: uploadResult.resource_type || resourceType
        });
      } catch (docErr: any) {
        console.error(`[Cloudinary] Failed to upload KYC document ${file.originalname}:`, docErr);
        // Rollback all already uploaded files
        await rollbackCloudinaryAssets(uploadedAssets);
        return res.status(500).json({
          success: false,
          message: `Failed to upload KYC document "${file.originalname}" to Cloudinary: ${docErr.message || 'Upload failed'}`
        });
      }
    }

    // 6. Construct and Save MongoDB Document
    const customerPayload = {
      customerId,
      numericId: sequenceNumber,
      fullName,
      name: fullName,
      gender,
      phoneNumber,
      phone: phoneNumber,
      phoneNormalized: phoneNumber,
      email,
      occupation,
      age: age || 30,
      dateOfBirth,
      customerPhoto: customerPhotoData,
      photoSource: body.photoSource || (photoFile ? 'upload' : null),
      address,
      city,
      district,
      state,
      pincode,
      currentAddress,
      permanentAddress,
      currentAddressDetails: {
        houseNumber: body.currentAddressDetails?.houseNumber || '',
        street: body.currentAddressDetails?.street || address,
        locality: body.currentAddressDetails?.locality || '',
        city: city || body.currentAddressDetails?.city || '',
        district: district || body.currentAddressDetails?.district || '',
        state: state || 'Tamil Nadu',
        country: 'India',
        pincode: pincode || body.currentAddressDetails?.pincode || ''
      },
      permanentAddressDetails: {
        houseNumber: body.permanentAddressDetails?.houseNumber || '',
        street: body.permanentAddressDetails?.street || permanentAddress,
        locality: body.permanentAddressDetails?.locality || '',
        city: city || body.permanentAddressDetails?.city || '',
        district: district || body.permanentAddressDetails?.district || '',
        state: state || 'Tamil Nadu',
        country: 'India',
        pincode: pincode || body.permanentAddressDetails?.pincode || ''
      },
      currentLocation: body.currentLocation ? (typeof body.currentLocation === 'string' ? JSON.parse(body.currentLocation) : body.currentLocation) : null,
      permanentLocation: body.permanentLocation ? (typeof body.permanentLocation === 'string' ? JSON.parse(body.permanentLocation) : body.permanentLocation) : null,
      idProofType,
      idProof: idProofType,
      idProofNumber,
      idNumber: idProofNumber,
      extraPan,
      docName,
      kycDocuments,
      status: body.status || 'VERIFIED',
      joinedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      activeLoansCount: 0,
      totalBorrowed: 0,
      isDeleted: false
    };

    try {
      const savedCustomer = await CustomerModel.create(customerPayload);

      return res.status(201).json({
        success: true,
        message: 'Customer created successfully and saved permanently in MongoDB.',
        data: savedCustomer
      });
    } catch (saveErr: any) {
      console.error('[CustomerController] MongoDB create failed:', saveErr);
      // Rollback Cloudinary files if DB save fails
      await rollbackCloudinaryAssets(uploadedAssets);
      return res.status(500).json({
        success: false,
        message: `Database save error: ${saveErr.message || 'Failed to save customer in MongoDB.'}`
      });
    }
  } catch (error: any) {
    console.error('[CustomerController] createCustomer unexpected error:', error);
    await rollbackCloudinaryAssets(uploadedAssets);
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred while creating customer.'
    });
  }
};

/**
 * GET /api/customers
 * Retrieves all non-deleted customers from MongoDB.
 */
export const getCustomers = async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is disconnected.',
        error: { code: 'DATABASE_DISCONNECTED' }
      });
    }

    const includeDeleted = req.query.includeDeleted === 'true';
    const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };

    const customers = await CustomerModel.find(filter).sort({ createdAt: -1 }).lean();

    const mapped = customers.map((c: any) => ({
      ...c,
      id: c.customerId || c._id?.toString(),
      name: c.fullName,
      phone: c.phoneNumber,
      idProof: c.idProofType,
      idNumber: c.idProofNumber,
      customerPhoto: c.customerPhoto?.url || null,
      customerPhotoData: c.customerPhoto
    }));

    return res.json({
      success: true,
      message: 'Customers retrieved successfully from MongoDB.',
      data: mapped,
      count: mapped.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CustomerController] getCustomers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve customers from MongoDB.'
    });
  }
};

/**
 * GET /api/customers/:id
 * Retrieves a single customer from MongoDB.
 */
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is disconnected.',
        error: { code: 'DATABASE_DISCONNECTED' }
      });
    }

    const targetId = req.params.id;
    const isObjectId = mongoose.isValidObjectId(targetId);

    const customer = await CustomerModel.findOne({
      $or: [
        { customerId: targetId },
        ...(isObjectId ? [{ _id: targetId }] : [])
      ]
    }).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID "${targetId}" not found in MongoDB.`,
        error: { code: 'CUSTOMER_NOT_FOUND' }
      });
    }

    return res.json({
      success: true,
      message: 'Customer retrieved successfully.',
      data: {
        ...customer,
        id: customer.customerId || customer._id?.toString(),
        name: customer.fullName,
        phone: customer.phoneNumber,
        idProof: customer.idProofType,
        idNumber: customer.idProofNumber,
        customerPhoto: customer.customerPhoto?.url || null,
        customerPhotoData: customer.customerPhoto
      }
    });
  } catch (error: any) {
    console.error('[CustomerController] getCustomerById error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve customer.'
    });
  }
};

/**
 * GET /api/customers/search?query=
 * Searches customers in MongoDB by fullName, phoneNumber, customerId, or ID proof number.
 */
export const searchCustomers = async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is disconnected.',
        error: { code: 'DATABASE_DISCONNECTED' }
      });
    }

    const query = ((req.query.query || req.query.q) as string || '').trim();
    if (!query) {
      return getCustomers(req, res);
    }

    const normPhone = normalizePhone(query);
    const regex = new RegExp(query, 'i');

    const results = await CustomerModel.find({
      isDeleted: { $ne: true },
      $or: [
        { fullName: regex },
        { customerId: regex },
        { phoneNumber: regex },
        ...(normPhone ? [{ phoneNormalized: new RegExp(normPhone) }] : []),
        { idProofNumber: regex },
        { address: regex }
      ]
    }).lean();

    const mapped = results.map((c: any) => ({
      ...c,
      id: c.customerId || c._id?.toString(),
      name: c.fullName,
      phone: c.phoneNumber,
      idProof: c.idProofType,
      idNumber: c.idProofNumber,
      customerPhoto: c.customerPhoto?.url || null,
      customerPhotoData: c.customerPhoto
    }));

    return res.json({
      success: true,
      data: mapped,
      count: mapped.length
    });
  } catch (error: any) {
    console.error('[CustomerController] searchCustomers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Customer search failed.'
    });
  }
};

/**
 * PUT /api/customers/:id
 * Updates customer information in MongoDB.
 * If customer photo is replaced:
 *   1. Upload new image to Cloudinary.
 *   2. Update MongoDB.
 *   3. Delete old Cloudinary file after successful DB update.
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is disconnected.',
        error: { code: 'DATABASE_DISCONNECTED' }
      });
    }

    const targetId = req.params.id;
    const isObjectId = mongoose.isValidObjectId(targetId);
    const body = req.body || {};
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};

    const existing = await CustomerModel.findOne({
      $or: [
        { customerId: targetId },
        ...(isObjectId ? [{ _id: targetId }] : [])
      ]
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID "${targetId}" not found.`,
        error: { code: 'CUSTOMER_NOT_FOUND' }
      });
    }

    const updateFields: any = { ...body, updatedAt: new Date() };
    const oldPhotoPublicId = existing.customerPhoto?.publicId;

    // Normalize field names
    if (body.fullName || body.name) {
      updateFields.fullName = (body.fullName || body.name).trim();
      updateFields.name = updateFields.fullName;
    }
    if (body.phoneNumber || body.phone) {
      const rawPhone = (body.phoneNumber || body.phone).trim();
      const norm = normalizePhone(rawPhone);
      if (!isValidIndianPhone(norm)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit Indian mobile number.'
        });
      }
      updateFields.phoneNumber = norm;
      updateFields.phone = norm;
      updateFields.phoneNormalized = norm;
    }
    if (body.idProofType || body.idProof) {
      updateFields.idProofType = body.idProofType || body.idProof;
      updateFields.idProof = updateFields.idProofType;
    }
    if (body.idProofNumber || body.idNumber) {
      updateFields.idProofNumber = (body.idProofNumber || body.idNumber).trim();
      updateFields.idNumber = updateFields.idProofNumber;
    }

    // 1. Handle new customer photo upload
    const photoFile = files['customerPhoto']?.[0];
    let newPhotoUploaded = false;
    if (photoFile) {
      try {
        const custId = existing.customerId;
        const uploadResult = await uploadBufferToCloudinary(photoFile.buffer, {
          folder: 'kkv-gold-finance/customers/photos',
          publicId: `${custId}-photo-${Date.now()}`,
          resourceType: 'image'
        });

        updateFields.customerPhoto = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        };
        newPhotoUploaded = true;
      } catch (photoErr: any) {
        console.error('[Cloudinary] Update photo upload failed:', photoErr);
        return res.status(500).json({
          success: false,
          message: `Photo update failed: ${photoErr.message}`
        });
      }
    }

    // 2. Handle additional KYC documents
    const kycFiles = [
      ...(files['kycDocuments'] || []),
      ...(files['aadhaarDoc'] || []),
      ...(files['panDoc'] || []),
      ...(files['otherDoc'] || [])
    ];

    if (kycFiles.length > 0) {
      const newKycDocs: IKYCDocument[] = [];
      const custId = existing.customerId;

      for (let i = 0; i < kycFiles.length; i++) {
        const file = kycFiles[i];
        const docType = updateFields.idProofType || existing.idProofType || 'KYC';
        const folder = getKycDocFolder(docType);
        const isPdf = file.mimetype === 'application/pdf';
        const resourceType = isPdf ? 'raw' : 'image';

        const uploadResult = await uploadBufferToCloudinary(file.buffer, {
          folder,
          publicId: `${custId}-kyc-${Date.now()}-${i + 1}`,
          resourceType
        });

        newKycDocs.push({
          documentType: docType,
          documentNumber: updateFields.idProofNumber || existing.idProofNumber || '',
          documentName: file.originalname,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          resourceType: uploadResult.resource_type || resourceType
        });
      }

      existing.kycDocuments.push(...newKycDocs);
    }

    // 3. Save updates to MongoDB
    Object.assign(existing, updateFields);
    const updatedDoc = await existing.save();

    // 4. Delete old Cloudinary photo after successful DB update
    if (newPhotoUploaded && oldPhotoPublicId) {
      deleteFromCloudinary(oldPhotoPublicId, 'image').catch((err) => {
        console.warn('[Cloudinary] Cleanup old photo notice:', err);
      });
    }

    return res.json({
      success: true,
      message: 'Customer updated successfully in MongoDB.',
      data: updatedDoc
    });
  } catch (error: any) {
    console.error('[CustomerController] updateCustomer error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update customer.'
    });
  }
};

/**
 * DELETE /api/customers/:id
 * Deletion flow:
 *   1. Find customer in MongoDB.
 *   2. Get customerPhoto.publicId.
 *   3. Get every KYC document publicId.
 *   4. Delete corresponding Cloudinary resources.
 *   5. Delete customer MongoDB document.
 */
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is disconnected.',
        error: { code: 'DATABASE_DISCONNECTED' }
      });
    }

    const targetId = req.params.id;
    const isObjectId = mongoose.isValidObjectId(targetId);

    const customer = await CustomerModel.findOne({
      $or: [
        { customerId: targetId },
        ...(isObjectId ? [{ _id: targetId }] : [])
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID "${targetId}" not found.`,
        error: { code: 'CUSTOMER_NOT_FOUND' }
      });
    }

    // 1. Delete Customer Photo from Cloudinary
    if (customer.customerPhoto?.publicId) {
      try {
        console.log(`[Cloudinary] Deleting customer photo: ${customer.customerPhoto.publicId}`);
        await deleteFromCloudinary(customer.customerPhoto.publicId, 'image');
      } catch (delErr) {
        console.warn('[Cloudinary] Failed to delete customer photo:', delErr);
      }
    }

    // 2. Delete all KYC Documents from Cloudinary
    if (customer.kycDocuments && Array.isArray(customer.kycDocuments)) {
      for (const doc of customer.kycDocuments) {
        if (doc.publicId) {
          try {
            console.log(`[Cloudinary] Deleting KYC doc: ${doc.publicId}`);
            await deleteFromCloudinary(doc.publicId, doc.resourceType === 'raw' ? 'raw' : 'image');
          } catch (delErr) {
            console.warn(`[Cloudinary] Failed to delete KYC doc ${doc.publicId}:`, delErr);
          }
        }
      }
    }

    // 3. Delete from MongoDB
    await CustomerModel.deleteOne({ _id: customer._id });

    return res.json({
      success: true,
      message: 'Customer and all associated Cloudinary assets permanently deleted successfully.'
    });
  } catch (error: any) {
    console.error('[CustomerController] deleteCustomer error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete customer.'
    });
  }
};

export const restoreCustomer = async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id;
    const isObjectId = mongoose.isValidObjectId(targetId);

    const customer = await CustomerModel.findOneAndUpdate(
      {
        $or: [
          { customerId: targetId },
          ...(isObjectId ? [{ _id: targetId }] : [])
        ]
      },
      { isDeleted: false, deletedAt: null, deletedBy: null },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    return res.json({ success: true, message: 'Customer restored successfully.', data: customer });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Restore failed' });
  }
};

export const deletePermanentlyCustomer = deleteCustomer;
