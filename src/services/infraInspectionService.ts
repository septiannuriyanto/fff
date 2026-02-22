import { supabase } from "../db/SupabaseClient";

export interface UploadResult {
    status: string;
    key: string;
    url: string;
}

/**
 * Service to handle infrastructure inspection photo uploads via Cloudflare Worker
 */
export const uploadInfraPhoto = async (
    file: File,
    inspectionId: string,
    itemId: string,
    fileName?: string
): Promise<UploadResult | null> => {
    try {
        // 1. Get Session for JWT
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            throw new Error('Authentication failed. Please log in again.');
        }

        // 2. Upload to Worker
        const workerUrl = import.meta.env.VITE_WORKER_URL;
        if (!workerUrl) {
            throw new Error('VITE_WORKER_URL is not configured');
        }

        const uploadUrl = `${workerUrl}/upload/infra-inspection`;
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Inspection-Id': inspectionId,
            'X-Item-Id': itemId,
            'Content-Type': file.type || 'image/jpeg',
        };

        if (fileName) {
            headers['X-File-Name'] = fileName;
        }

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers,
            body: file,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        const result = await response.json();
        return result as UploadResult;
    } catch (err) {
        console.error('Error in uploadInfraPhoto:', err);
        throw err;
    }
};

/**
 * Service to handle backlog photo uploads via Cloudflare Worker
 */
export const uploadBacklogPhoto = async (
    file: File,
    backlogId: string
): Promise<UploadResult | null> => {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            throw new Error('Authentication failed. Please log in again.');
        }

        const workerUrl = import.meta.env.VITE_WORKER_URL;
        if (!workerUrl) {
            throw new Error('VITE_WORKER_URL is not configured');
        }

        const uploadUrl = `${workerUrl}/upload/infra-backlog`;
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'X-Backlog-Id': backlogId,
                'Content-Type': file.type || 'image/jpeg',
            },
            body: file,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        const result = await response.json();
        return result as UploadResult;
    } catch (err) {
        console.error('Error in uploadBacklogPhoto:', err);
        throw err;
    }
};

/**
 * Service to delete infrastructure inspection photos from Cloudflare R2
 */
export const deleteInfraPhoto = async (photoUrl: string): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Authentication failed');

        // Extract key from URL
        // URL format: .../images/infra-inspection/KEY or full R2 domain/KEY
        const urlParts = photoUrl.split('/');
        const key = urlParts.slice(urlParts.indexOf('infra-inspection') + 1).join('/');

        const workerUrl = import.meta.env.VITE_WORKER_URL;
        const deleteUrl = `${workerUrl}/upload/infra-inspection?key=${encodeURIComponent(key)}`;

        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
            }
        });

        return response.ok;
    } catch (err) {
        console.error('Error in deleteInfraPhoto:', err);
        return false;
    }
};

/**
 * Service to delete backlog photos from Cloudflare R2
 */
export const deleteBacklogPhoto = async (photoUrl: string): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Authentication failed');

        // Extract key from URL
        const urlParts = photoUrl.split('/');
        const key = urlParts.slice(urlParts.indexOf('infra-backlog') + 1).join('/');

        const workerUrl = import.meta.env.VITE_WORKER_URL;
        const deleteUrl = `${workerUrl}/upload/infra-backlog?key=${encodeURIComponent(key)}`;

        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
            }
        });

        return response.ok;
    } catch (err) {
        console.error('Error in deleteBacklogPhoto:', err);
        return false;
    }
};
