# Cloud Storage Upload Guide

Complete guide for uploading and managing files on Cardsite Cloud Storage API.

## Quick Start 

### 1. Get Your Access Token

Access tokens can be obtained from:
- **Account Settings**: Visit [cloud.card.tools/account-settings](https://cloud.card.tools/account-settings)
- **API Login**: Use the `/auth/login` endpoint with email/password

### 2. Set Environment Variable

```bash
export CLOUD_STORAGE_TOKEN="your_token_here"
```

Or create a `.env` file:
```env
CLOUD_STORAGE_TOKEN=YOUR_TOKEN
CLOUD_STORAGE_API=https://cloud.card.tools/api/v1
```

### 3. Use the Script

```bash
# Make script executable
chmod +x cloud-storage.sh

# Upload a file
./cloud-storage.sh upload myfile.txt

# List files
./cloud-storage.sh list

# Create folder
./cloud-storage.sh folder "My Documents"
```

---

## API Reference

### Base URL
```
https://cloud.card.tools/api/v1
```

### Authentication

All requests require the `Authorization` header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## Common Operations

### 1. Upload File

**Endpoint:** `POST /uploads`

**Required Parameters:**
- `file` - The file to upload (multipart/form-data)
- `uploadType` - Must be set to `"bedrive"` (REQUIRED!)
- `parentId` - Folder ID or `null` for root

**Example:**
```bash
curl -X POST "https://cloud.card.tools/api/v1/uploads" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  -F "file=@/path/to/file.txt" \
  -F "parentId=null" \
  -F "uploadType=bedrive"
```

**Response:**
```json
{
  "status": "success",
  "fileEntry": {
    "id": 20,
    "name": "file.txt",
    "file_size": 1024,
    "mime": "text/plain",
    "path": "20",
    "hash": "MjB8cGFkZGluZw"
  }
}
```

---

### 2. List Files

**Endpoint:** `GET /drive/file-entries`

**Query Parameters:**
- `perPage` - Results per page (default: 50)
- `parentIds` - Filter by parent folder IDs (comma-separated)
- `query` - Search query
- `type` - Filter by type: `folder`, `image`, `text`, `audio`, `video`, `pdf`
- `starredOnly` - Only starred items
- `deletedOnly` - Only trashed items
- `recentOnly` - Only recent items

**Example:**
```bash
curl -X GET "https://cloud.card.tools/api/v1/drive/file-entries?parentIds=21" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "current_page": 1,
  "data": [
    {
      "id": 23,
      "name": "document.pdf",
      "file_size": 52480,
      "type": "pdf",
      "parent_id": 21
    }
  ],
  "per_page": 50
}
```

---

### 3. Create Folder

**Endpoint:** `POST /folders`

**Body Parameters:**
- `name` - Folder name (required)
- `parentId` - Parent folder ID or `null` for root

**Example:**
```bash
curl -X POST "https://cloud.card.tools/api/v1/folders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Folder","parentId":null}'
```

**Response:**
```json
{
  "status": "success",
  "folder": {
    "id": 21,
    "name": "My Folder",
    "type": "folder",
    "path": "21"
  }
}
```

---

### 4. Delete Files/Folders

**Endpoint:** `POST /file-entries/delete`

**Body Parameters:**
- `entryIds` - Array of entry IDs to delete
- `deleteForever` - `true` for permanent deletion, `false` to move to trash

**Example:**
```bash
curl -X POST "https://cloud.card.tools/api/v1/file-entries/delete" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"entryIds":["12","13"],"deleteForever":false}'
```

---

### 5. Move Files

**Endpoint:** `POST /file-entries/move`

**Body Parameters:**
- `entryIds` - Array of entry IDs to move
- `destinationId` - Destination folder ID or `null` for root

**Example:**
```bash
curl -X POST "https://cloud.card.tools/api/v1/file-entries/move" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"entryIds":["23"],"destinationId":21}'
```

---

### 6. Rename File/Folder

**Endpoint:** `PUT /file-entries/{entryId}`

**Body Parameters:**
- `name` - New name
- `description` - Optional description

**Example:**
```bash
curl -X PUT "https://cloud.card.tools/api/v1/file-entries/23" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"name":"renamed-file.txt"}'
```

---

### 7. Create Shareable Link

**Endpoint:** `POST /file-entries/{entryId}/shareable-link`

**Body Parameters (all optional):**
- `password` - Password protection
- `expires_at` - Expiration date (ISO 8601)
- `allow_edit` - Allow editing (boolean)
- `allow_download` - Allow downloading (boolean)

**Example:**
```bash
curl -X POST "https://cloud.card.tools/api/v1/file-entries/23/shareable-link" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"allow_download":true}'
```

---

### 8. Star/Unstar Files

**Star Endpoint:** `POST /file-entries/star`
**Unstar Endpoint:** `POST /file-entries/unstar`

**Body Parameters:**
- `entryIds` - Array of entry IDs

**Example:**
```bash
curl -X POST "https://cloud.card.tools/api/v1/file-entries/star" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"entryIds":[23,24,25]}'
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `401` | Unauthenticated - Invalid or missing token |
| `403` | Unauthorized - Insufficient permissions |
| `404` | Not Found |
| `422` | Validation Error - Invalid data |
| `500` | Server Error |

---

## Best Practices

### 1. Always Include `uploadType=bedrive`
File uploads **will fail** without this parameter.

### 2. Handle Large Files
For files > 10MB, consider:
- Chunked uploads
- Progress monitoring
- Retry logic for network failures

### 3. Use Folder IDs
When organizing files:
1. List folders first to get IDs
2. Use folder IDs for `parentId` parameter
3. Store folder IDs in config for reuse

### 4. Secure Token Storage
- Never commit tokens to git
- Use environment variables or `.env` files
- Add `.env` to `.gitignore`

### 5. Batch Operations
Use array parameters for bulk operations:
```json
{
  "entryIds": [23, 24, 25, 26, 27]
}
```

---

## Integration Examples

### Python
```python
import os
import requests

TOKEN = os.getenv("CLOUD_STORAGE_TOKEN")
API_BASE = "https://cloud.card.tools/api/v1"

def upload_file(file_path, parent_id=None):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {
            'parentId': parent_id,
            'uploadType': 'bedrive'
        }
        headers = {
            'Authorization': f'Bearer {TOKEN}',
            'Accept': 'application/json'
        }

        response = requests.post(
            f"{API_BASE}/uploads",
            files=files,
            data=data,
            headers=headers
        )
        return response.json()
```

### Node.js
```javascript
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const TOKEN = process.env.CLOUD_STORAGE_TOKEN;
const API_BASE = 'https://cloud.card.tools/api/v1';

async function uploadFile(filePath, parentId = null) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('parentId', parentId || 'null');
  form.append('uploadType', 'bedrive');

  const response = await axios.post(
    `${API_BASE}/uploads`,
    form,
    {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/json',
        ...form.getHeaders()
      }
    }
  );

  return response.data;
}
```

### Bash
```bash
#!/bin/bash
TOKEN="${CLOUD_STORAGE_TOKEN}"
API_BASE="https://cloud.card.tools/api/v1"

upload_file() {
  local file_path="$1"
  local parent_id="${2:-null}"

  curl -X POST "${API_BASE}/uploads" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json" \
    -F "file=@${file_path}" \
    -F "parentId=${parent_id}" \
    -F "uploadType=bedrive"
}
```

---

## LLM Assistant Usage

When working with AI assistants (Claude, ChatGPT, etc.), provide:

1. **This guide** for API reference
2. **Your access token** (via environment variable)
3. **Clear instructions** about what to upload/manage

Example prompt:
```
Upload all markdown files from the @AGENTS-REFERENCE folder to my
cloud storage in a new folder called "Agent Configs". Use the
CLOUD_STORAGE_TOKEN environment variable for authentication.
```

---

## Troubleshooting

### Upload Returns 500 Error
**Cause:** Missing `uploadType=bedrive` parameter
**Solution:** Always include `-F "uploadType=bedrive"`

### 401 Unauthorized
**Cause:** Invalid or expired token
**Solution:** Get new token from account settings

### 403 Forbidden
**Cause:** Insufficient permissions for operation
**Solution:** Check file ownership and permissions

### 422 Validation Error
**Cause:** Invalid data format
**Solution:** Check request body matches API specification

---

## Resources

- **API Documentation:** [cloud-storage-swagger.yaml](./cloud-storage-swagger.yaml)
- **Account Settings:** [cloud.card.tools/account-settings](https://cloud.card.tools/account-settings)
- **Support:** Contact support@card.tools

---

## Script Reference

See `cloud-storage.sh` for a complete, reusable script that handles:
- File uploads
- Folder creation
- File listing
- Deletion
- Moving/renaming
- Shareable links

The script is designed to be:
- **Portable** - Works in any repository
- **LLM-friendly** - Clear comments and structure
- **Interactive** - Prompts for missing information
- **Secure** - Uses environment variables for tokens

---

**Last Updated:** 2025-11-20
**API Version:** v1
