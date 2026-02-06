

const API_BASE = "https://cloud.card.tools/api/v1";

export interface CloudFileEntry {
    id: number;
    name: string;
    type: string;
    mime?: string;
    hash?: string;
    url?: string;
}

export class CloudService {
    private token: string;
    private rootFolderName = "Wise Agentic Studio";

    constructor() {
        // Prioritize localStorage to allow runtime configuration, fallback to env
        this.token = localStorage.getItem('CLOUD_STORAGE_TOKEN') || process.env.CLOUD_STORAGE_TOKEN || "";
    }

    private get headers() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json'
        };
    }

    get isConfigured(): boolean {
        return !!this.token;
    }

    /**
     * Set the API token at runtime and persist it
     */
    setToken(token: string) {
        this.token = token;
        localStorage.setItem('CLOUD_STORAGE_TOKEN', token);
    }

    /**
     * Find a folder by name within a parent (or root if parentId is null)
     */
    async findFolder(name: string, parentId: number | null = null): Promise<CloudFileEntry | null> {
        if (!this.isConfigured) return null;

        try {
            const params = new URLSearchParams();
            if (parentId) params.append('parentIds', parentId.toString());
            params.append('type', 'folder');
            params.append('query', name);

            const res = await fetch(`${API_BASE}/drive/file-entries?${params.toString()}`, {
                method: 'GET',
                headers: this.headers
            });

            if (!res.ok) return null;
            const data = await res.json();
            
            // Strict match on name to avoid partial matches from search
            return data.data.find((f: any) => f.name === name && f.type === 'folder') || null;
        } catch (e) {
            console.error("Cloud findFolder error:", e);
            return null;
        }
    }

    /**
     * Create a new folder
     */
    async createFolder(name: string, parentId: number | null = null): Promise<CloudFileEntry | null> {
        if (!this.isConfigured) return null;

        try {
            const res = await fetch(`${API_BASE}/folders`, {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, parentId })
            });

            if (!res.ok) return null;
            const data = await res.json();
            return data.folder;
        } catch (e) {
            console.error("Cloud createFolder error:", e);
            return null;
        }
    }

    /**
     * Find or create the app root folder and subfolders
     */
    async ensureDirectory(path: string[]): Promise<number | null> {
        if (!this.isConfigured) return null;

        let currentParentId: number | null = null;

        for (const folderName of path) {
            let folder = await this.findFolder(folderName, currentParentId);
            if (!folder) {
                folder = await this.createFolder(folderName, currentParentId);
            }
            if (!folder) return null; // Failed to find or create
            currentParentId = folder.id;
        }

        return currentParentId;
    }

    /**
     * Upload a file (Blob/File) to a specific folder
     */
    async uploadFile(file: Blob, fileName: string, parentId: number | null = null): Promise<CloudFileEntry | null> {
        if (!this.isConfigured) return null;

        try {
            const formData = new FormData();
            formData.append('file', file, fileName);
            formData.append('uploadType', 'bedrive'); // Required by API
            if (parentId) formData.append('parentId', parentId.toString());

            const res = await fetch(`${API_BASE}/uploads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json'
                    // Content-Type is set automatically by fetch for FormData
                },
                body: formData
            });

            if (!res.ok) {
                const err = await res.text();
                console.error("Upload failed", err);
                return null;
            }

            const data = await res.json();
            return data.fileEntry;
        } catch (e) {
            console.error("Cloud uploadFile error:", e);
            return null;
        }
    }

    /**
     * Generate a shareable link (if needed for public access)
     */
    async createShareableLink(entryId: number): Promise<string | null> {
        if (!this.isConfigured) return null;

        try {
            const res = await fetch(`${API_BASE}/file-entries/${entryId}/shareable-link`, {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ allow_download: true })
            });

            if (!res.ok) return null;
            const data = await res.json();
            // The API guide implies successful creation allows access. 
            // We usually construct the URL from the hash or use the returned link object if available.
            // Assuming standard Bedrive structure for preview based on hash.
            if (data.link && data.link.hash) {
                // Constructing a standard view URL. 
                // Note: The API guide doesn't explicitly give the view URL format, 
                // but usually it is /drive/s/{hash} or /api/v1/file-entries/download/{hash}
                return `${API_BASE}/file-entries/${data.link.hash}/download?preview=1`;
            }
            return null;
        } catch (e) {
            console.error("Link creation error:", e);
            return null;
        }
    }

    /**
     * Helper to convert Base64 Data URL to Blob
     */
    dataURLtoBlob(dataurl: string): Blob {
        const arr = dataurl.split(',');
        
        // Safety check for malformed URLs or unexpected formats (e.g. blob: urls passed by mistake)
        if (arr.length < 2) {
             console.warn("Invalid data URL passed to dataURLtoBlob", dataurl.substring(0, 50));
             return new Blob([]); // Return empty blob to prevent crash
        }

        const mime = arr[0].match(/:(.*?);/)?.[1];
        // Sanitize base64 string to remove whitespace
        const cleanBase64 = arr[1].replace(/[\s\r\n]+/g, '');
        const bstr = atob(cleanBase64);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
}

export const cloudService = new CloudService();
