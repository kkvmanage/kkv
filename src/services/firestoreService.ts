import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FirestoreResponse<T = any> {
  success: boolean;
  data?: T;
  id?: string;
  message?: string;
  error?: any;
}

/**
 * Add a new document with an auto-generated ID
 */
export const addData = async <T extends DocumentData = DocumentData>(
  collectionName: string,
  data: T
): Promise<FirestoreResponse<T>> => {
  try {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return {
      success: true,
      id: docRef.id,
      data: { ...data, id: docRef.id } as unknown as T
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || `Failed to add document to ${collectionName}`,
      error
    };
  }
};

/**
 * Set or overwrite a document with a specific ID
 */
export const setData = async <T extends DocumentData = DocumentData>(
  collectionName: string,
  docId: string,
  data: T,
  merge: boolean = true
): Promise<FirestoreResponse<T>> => {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge });
    return {
      success: true,
      id: docId,
      data: { ...data, id: docId } as unknown as T
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || `Failed to set document in ${collectionName}/${docId}`,
      error
    };
  }
};

/**
 * Get a single document by ID
 */
export const getData = async <T = DocumentData>(
  collectionName: string,
  docId: string
): Promise<FirestoreResponse<T | null>> => {
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        success: true,
        id: snap.id,
        data: { id: snap.id, ...snap.data() } as T
      };
    }
    return {
      success: true,
      data: null,
      message: `Document ${docId} not found in ${collectionName}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || `Failed to fetch document ${docId} from ${collectionName}`,
      error
    };
  }
};

/**
 * Get all documents in a collection, optionally with query constraints
 */
export const getAllData = async <T = DocumentData>(
  collectionName: string,
  ...queryConstraints: QueryConstraint[]
): Promise<FirestoreResponse<T[]>> => {
  try {
    const colRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
    const snap = await getDocs(q);
    const results: T[] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    })) as T[];
    return {
      success: true,
      data: results
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || `Failed to fetch documents from ${collectionName}`,
      error
    };
  }
};

/**
 * Update an existing document by ID
 */
export const updateData = async (
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>
): Promise<FirestoreResponse<void>> => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return {
      success: true,
      id: docId
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || `Failed to update document ${docId} in ${collectionName}`,
      error
    };
  }
};

/**
 * Delete a document by ID
 */
export const deleteData = async (
  collectionName: string,
  docId: string
): Promise<FirestoreResponse<void>> => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return {
      success: true,
      id: docId
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || `Failed to delete document ${docId} from ${collectionName}`,
      error
    };
  }
};

/**
 * Real-time listener for a collection
 */
export const listenToCollection = <T = DocumentData>(
  collectionName: string,
  callback: (data: T[]) => void,
  ...queryConstraints: QueryConstraint[]
): Unsubscribe => {
  const colRef = collection(db, collectionName);
  const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    })) as T[];
    callback(items);
  }, (error) => {
    console.error(`Error listening to ${collectionName}:`, error);
  });
};

/**
 * Real-time listener for a single document
 */
export const listenToDoc = <T = DocumentData>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
): Unsubscribe => {
  const docRef = doc(db, collectionName, docId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as T);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error(`Error listening to ${collectionName}/${docId}:`, error);
  });
};

export const firestoreService = {
  addData,
  setData,
  getData,
  getAllData,
  updateData,
  deleteData,
  listenToCollection,
  listenToDoc
};

export default firestoreService;
