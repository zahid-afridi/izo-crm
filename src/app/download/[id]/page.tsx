'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function DownloadPage() {
  const params = useParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const downloadFile = async () => {
      try {
        const id = params.id as string;
        
        // Fetch the file from our server
        const response = await fetch(`/api/download/${id}`);
        
        if (!response.ok) {
          throw new Error('File not found or expired');
        }
        
        // Get the blob
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        
        // Extract filename from content-disposition header
        let filename = 'document.pdf';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setStatus('success');
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          window.close();
        }, 3000);
        
      } catch (err) {
        console.error('Download error:', err);
        setError(err instanceof Error ? err.message : 'Download failed');
        setStatus('error');
      }
    };

    downloadFile();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <img 
            src="/logo.svg" 
            alt="IZOGRUP" 
            className="h-12 mx-auto mb-4"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">IZOGRUP</h1>
          <p className="text-gray-600">Construction - Engineering - Consulting</p>
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="text-lg font-semibold text-gray-900">Preparing your download...</h2>
            <p className="text-gray-600">Please wait while we fetch your document.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-lg font-semibold text-gray-900">Download Started!</h2>
            <p className="text-gray-600">Your PDF document should start downloading automatically.</p>
            <p className="text-sm text-gray-500">This window will close in a few seconds.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-red-600 text-5xl mb-4">✗</div>
            <h2 className="text-lg font-semibold text-gray-900">Download Failed</h2>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => window.close()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Close Window
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Secure document delivery by IZOGRUP CRM System
          </p>
        </div>
      </div>
    </div>
  );
}