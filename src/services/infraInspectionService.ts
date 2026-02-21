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
    itemId: string
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
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'X-Inspection-Id': inspectionId,
                'X-Item-Id': itemId,
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
