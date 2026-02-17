/**
 * Cloud Service — uses @operator/identify SDK for storage
 * No manual token handling needed; SDK uses JWT from auth.
 */

import { ensureFolderPath, uploadToStorage, listEntries, downloadEntry, createFolder } from '@operator/identify';

export interface CloudFileEntry {
    id: number;
    name: string;
    type: string;
    mime?: string;
    hash?: string;
    url?: string;
}

export const cloudService = {
    /**
     * Find or create a nested folder path.
     * Returns the final folder's ID, or null on failure.
     */
    async ensureDirectory(path: string[]): Promise<number | null> {
        try {
            const id = await ensureFolderPath(path);
            return id;
        } catch (e) {
            console.error("Cloud ensureDirectory error:", e);
            return null;
        }
    },

    /**
     * Upload a file (Blob/File) to a specific folder.
     */
    async uploadFile(file: Blob, fileName: string, parentId: number | null = null): Promise<CloudFileEntry | null> {
        try {
            const fileObj = file instanceof File ? file : new File([file], fileName);
            const result = await uploadToStorage(fileObj, { parentId: parentId ?? undefined });
            return result?.fileEntry || result || null;
        } catch (e) {
            console.error("Cloud uploadFile error:", e);
            return null;
        }
    },

    /**
     * Create a folder under a parent.
     */
    async createFolder(name: string, parentId: number | null = null): Promise<CloudFileEntry | null> {
        try {
            const result = await createFolder(name, parentId ?? undefined);
            return result?.folder || result || null;
        } catch (e) {
            console.error("Cloud createFolder error:", e);
            return null;
        }
    },

    /**
     * Helper to convert Base64 Data URL to Blob
     */
    dataURLtoBlob(dataurl: string): Blob {
        const arr = dataurl.split(',');
        if (arr.length < 2) {
            console.warn("Invalid data URL passed to dataURLtoBlob", dataurl.substring(0, 50));
            return new Blob([]);
        }
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const cleanBase64 = arr[1].replace(/[\s\r\n]+/g, '');
        const bstr = atob(cleanBase64);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
};
