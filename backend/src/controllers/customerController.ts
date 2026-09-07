import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CustomerModel, ICustomer, IKYCDocument, ICustomerPhoto } from '../models/Customer.js';
import { googleDriveService } from '../services/googleDriveService.js';
import { generateCustomerId } from '../utils/customerIdGenerator.js';
import { ensureMongoConnected, isMongoConnected } from '../config/database.js';


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
 * Helper to rollback/clean up uploaded Google Drive files when an error occurs
 */
async function rollbackDriveFiles(fileIds: string[]) {
  if (!fileIds || fileIds.length === 0) return;
  console.log(`[GoogleDrive Rollback] Cleaning up ${fileIds.length} uploaded files...`);
  for (const fileId of fileIds) {
    try {
      await googleDriveService.deleteFile(fileId);
    } catch (err) {
      console.warn(`[GoogleDrive Rollback] Failed to delete file ${fileId}:`, err);
    }
  }
}

/**
 * POST /api/customers
 * Permanent MongoDB creation with Google Drive file uploads for photo and KYC documents.
 * Full transaction rollback on failure to prevent orphaned Google Drive files.
 */
export const createCustomer = async (req: Request, res: Response) => {
  const uploadedDriveFileIds: string[] = [];

  try {
    // 1. Ensure MongoDB connection is ready
    if (!isMongoConnected()) {
      await ensureMongoConnected();
      if (!isMongoConnected()) {
        return res.status(503).json({
          success: false,
          message: 'Database is currently unavailable. Permanent MongoDB connection is required.',
          error: { code: 'DATABASE_DISCONNECTED' }
        });
      }
    }

    // 2. Ensure Google Drive is connected
    if (!googleDriveService.isConnected()) {
      googleDriveService.initGoogleDrive(true);
      if (!googleDriveService.isConnected()) {
        return res.status(503).json({
          success: false,
          message: 'Google Drive storage is unavailable. Please connect Google Drive and try again.',
          error: { code: 'GOOGLE_DRIVE_NOT_CONNECTED' }
        });
      }
    }

    const body = req.body || {};
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};

    // 3. Extract and normalize fields
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

    // 4. Validation
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

    // 5. Generate unique sequential Customer ID (KKV-2026-000001)
    const { customerId, sequenceNumber } = await generateCustomerId('KKV-2026');

    // 6. Upload Customer Photo to Google Drive (Photos folder)
    let customerPhotoData: ICustomerPhoto = {
      fileId: '',
      fileName: 'customer-photo.jpg',
      url: '',
      mimeType: 'image/jpeg',
      fileSize: 0,
      uploadedAt: new Date(),
      publicId: ''
    };

    const photoFile = files['customerPhoto']?.[0];

    if (photoFile) {
      try {
        const uploadResult = await googleDriveService.uploadCustomerPhoto(
          customerId,
          photoFile.buffer,
          photoFile.originalname || `customer-photo-${customerId}.jpg`,
          photoFile.mimetype || 'image/jpeg'
        );

        uploadedDriveFileIds.push(uploadResult.fileId);
        customerPhotoData = {
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          url: uploadResult.url,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          uploadedAt: uploadResult.uploadedAt,
          publicId: uploadResult.fileId
        };
      } catch (uploadErr: any) {
        console.error('[GoogleDrive] Customer photo upload failed:', uploadErr);
        await rollbackDriveFiles(uploadedDriveFileIds);
        return res.status(500).json({
          success: false,
          message: `Customer photo upload to Google Drive failed: ${uploadErr.message || 'Upload error'}`
        });
      }
    } else if (body.customerPhoto && typeof body.customerPhoto === 'string' && body.customerPhoto.startsWith('data:image')) {
      const parsed = dataUriToBuffer(body.customerPhoto);
      if (parsed) {
        try {
          const uploadResult = await googleDriveService.uploadCustomerPhoto(
            customerId,
            parsed.buffer,
            `customer-webcam-${customerId}.jpg`,
            parsed.mimeType || 'image/jpeg'
          );

          uploadedDriveFileIds.push(uploadResult.fileId);
          customerPhotoData = {
            fileId: uploadResult.fileId,
            fileName: uploadResult.fileName,
            url: uploadResult.url,
            mimeType: uploadResult.mimeType,
            fileSize: uploadResult.fileSize,
            uploadedAt: uploadResult.uploadedAt,
            publicId: uploadResult.fileId
          };
        } catch (uploadErr: any) {
          console.error('[GoogleDrive] Webcam photo upload failed:', uploadErr);
          await rollbackDriveFiles(uploadedDriveFileIds);
          return res.status(500).json({
            success: false,
            message: `Webcam photo upload to Google Drive failed: ${uploadErr.message || 'Upload error'}`
          });
        }
      }
    }

    // 7. Upload KYC Documents to Google Drive (KYC/<DocumentType> folder)
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

      const isPdf = file.mimetype === 'application/pdf';
      const resourceType = isPdf ? 'raw' : 'image';

      try {
        const uploadResult = await googleDriveService.uploadKycDocument(
          customerId,
          docType,
          file.buffer,
          file.originalname || `${docType.toLowerCase()}_${i + 1}.jpg`,
          file.mimetype || 'image/jpeg'
        );

        uploadedDriveFileIds.push(uploadResult.fileId);

        kycDocuments.push({
          documentType: docType,
          documentNumber: idProofNumber || '',
          documentName: file.originalname || `${docType} Document`,
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          url: uploadResult.url,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          uploadedAt: uploadResult.uploadedAt,
          publicId: uploadResult.fileId,
          resourceType
        });
      } catch (docErr: any) {
        console.error(`[GoogleDrive] Failed to upload KYC document ${file.originalname}:`, docErr);
        await rollbackDriveFiles(uploadedDriveFileIds);
        return res.status(500).json({
          success: false,
          message: `Failed to upload KYC document "${file.originalname}" to Google Drive: ${docErr.message || 'Upload failed'}`
        });
      }
    }

    // 8. Construct and Save MongoDB Document (storing Google Drive metadata and links)
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
        message: 'Customer created successfully and saved permanently in MongoDB with Google Drive file storage.',
        data: savedCustomer
      });
    } catch (saveErr: any) {
      console.error('[CustomerController] MongoDB create failed:', saveErr);
      await rollbackDriveFiles(uploadedDriveFileIds);
      return res.status(500).json({
        success: false,
        message: `Database save error: ${saveErr.message || 'Failed to save customer in MongoDB.'}`
      });
    }
  } catch (error: any) {
    console.error('[CustomerController] createCustomer unexpected error:', error);
    await rollbackDriveFiles(uploadedDriveFileIds);
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
    if (!isMongoConnected()) {
      await ensureMongoConnected();
      if (!isMongoConnected()) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB is disconnected.',
          error: { code: 'DATABASE_DISCONNECTED' }
        });
      }
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
    if (!isMongoConnected()) {
      await ensureMongoConnected();
      if (!isMongoConnected()) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB is disconnected.',
          error: { code: 'DATABASE_DISCONNECTED' }
        });
      }
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
    if (!isMongoConnected()) {
      await ensureMongoConnected();
      if (!isMongoConnected()) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB is disconnected.',
          error: { code: 'DATABASE_DISCONNECTED' }
        });
      }
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
 *   1. Upload new image to Google Drive.
 *   2. Update MongoDB.
 *   3. Delete old Google Drive file.
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    if (!isMongoConnected()) {
      await ensureMongoConnected();
      if (!isMongoConnected()) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB is disconnected.',
          error: { code: 'DATABASE_DISCONNECTED' }
        });
      }
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
    const oldPhotoFileId = existing.customerPhoto?.fileId;

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

    // 1. Handle new customer photo upload to Google Drive
    const photoFile = files['customerPhoto']?.[0];
    let newPhotoUploaded = false;
    if (photoFile) {
      try {
        const custId = existing.customerId;
        const uploadResult = await googleDriveService.uploadCustomerPhoto(
          custId,
          photoFile.buffer,
          photoFile.originalname || `customer-photo-${custId}-${Date.now()}.jpg`,
          photoFile.mimetype || 'image/jpeg'
        );

        updateFields.customerPhoto = {
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          url: uploadResult.url,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          uploadedAt: uploadResult.uploadedAt,
          publicId: uploadResult.fileId
        };
        newPhotoUploaded = true;
      } catch (photoErr: any) {
        console.error('[GoogleDrive] Update photo upload failed:', photoErr);
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
        const isPdf = file.mimetype === 'application/pdf';
        const resourceType = isPdf ? 'raw' : 'image';

        const uploadResult = await googleDriveService.uploadKycDocument(
          custId,
          docType,
          file.buffer,
          file.originalname || `${docType.toLowerCase()}_${Date.now()}_${i + 1}.jpg`,
          file.mimetype || 'image/jpeg'
        );

        newKycDocs.push({
          documentType: docType,
          documentNumber: updateFields.idProofNumber || existing.idProofNumber || '',
          documentName: file.originalname,
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          url: uploadResult.url,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          uploadedAt: uploadResult.uploadedAt,
          publicId: uploadResult.fileId,
          resourceType
        });
      }

      existing.kycDocuments.push(...newKycDocs);
    }

    // 3. Save updates to MongoDB
    Object.assign(existing, updateFields);
    const updatedDoc = await existing.save();

    // 4. Delete old Google Drive photo after successful DB update
    if (newPhotoUploaded && oldPhotoFileId) {
      googleDriveService.deleteFile(oldPhotoFileId).catch((err) => {
        console.warn('[GoogleDrive] Cleanup old photo notice:', err);
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
 *   2. Delete customer photo and KYC files from Google Drive.
 *   3. Delete customer folder from Google Drive.
 *   4. Delete customer MongoDB document.
 */
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    if (!isMongoConnected()) {
      await ensureMongoConnected();
      if (!isMongoConnected()) {
        return res.status(503).json({
          success: false,
          message: 'MongoDB is disconnected.',
          error: { code: 'DATABASE_DISCONNECTED' }
        });
      }
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

    // 1. Delete Customer Photo from Google Drive
    if (customer.customerPhoto?.fileId) {
      try {
        await googleDriveService.deleteFile(customer.customerPhoto.fileId);
      } catch (delErr) {
        console.warn('[GoogleDrive] Failed to delete customer photo:', delErr);
      }
    }

    // 2. Delete all KYC Documents from Google Drive
    if (customer.kycDocuments && Array.isArray(customer.kycDocuments)) {
      for (const doc of customer.kycDocuments) {
        if (doc.fileId) {
          try {
            await googleDriveService.deleteFile(doc.fileId);
          } catch (delErr) {
            console.warn(`[GoogleDrive] Failed to delete KYC doc ${doc.fileId}:`, delErr);
          }
        }
      }
    }

    // 3. Delete customer folder hierarchy from Google Drive
    if (customer.customerId) {
      try {
        await googleDriveService.deleteCustomerFolder(customer.customerId);
      } catch (folderDelErr) {
        console.warn(`[GoogleDrive] Failed to delete customer folder:`, folderDelErr);
      }
    }

    // 4. Delete from MongoDB
    await CustomerModel.deleteOne({ _id: customer._id });

    return res.json({
      success: true,
      message: 'Customer and all associated Google Drive files permanently deleted successfully.'
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

export default {
  createCustomer,
  getCustomers,
  getCustomerById,
  searchCustomers,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  deletePermanentlyCustomer
};

