/**
 * FileUploadZone - Drag & drop file upload component with validation
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { validateFile, getValidationSummary } from '@/lib/file-processing/file-validator';

interface FileUploadZoneProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxTotalSize?: number; // in bytes
}

interface FileWithValidation extends File {
  id: string;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedFileName?: string;
  };
}

export function FileUploadZone({
  onFilesChange,
  maxFiles = 10,
  maxTotalSize = 50 * 1024 * 1024, // 50MB
}: FileUploadZoneProps) {
  const [files, setFiles] = useState<FileWithValidation[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    // Add unique IDs and validate files
    const filesWithIds = acceptedFiles.map(file => {
      const fileWithId = file as FileWithValidation;
      fileWithId.id = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return fileWithId;
    });

    // Validate each file
    for (let i = 0; i < filesWithIds.length; i++) {
      const file = filesWithIds[i];
      file.validation = validateFile(file);
      setUploadProgress(((i + 1) / filesWithIds.length) * 100);

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update files state
    const newFiles = [...files, ...filesWithIds].slice(0, maxFiles);
    setFiles(newFiles);

    // Only pass valid files to parent
    const validFiles = newFiles.filter(f => f.validation?.isValid);
    onFilesChange(validFiles);

    setUploading(false);
  }, [files, maxFiles, onFilesChange]);

  const removeFile = (fileId: string) => {
    const newFiles = files.filter(f => f.id !== fileId);
    setFiles(newFiles);

    const validFiles = newFiles.filter(f => f.validation?.isValid);
    onFilesChange(validFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'text/html': ['.html', '.htm'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    maxFiles: maxFiles - files.length,
    maxSize: maxTotalSize,
    multiple: true,
  });

  // Calculate file statistics
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const validFiles = files.filter(f => f.validation?.isValid);
  const invalidFiles = files.filter(f => !f.validation?.isValid);
  const validationSummary = getValidationSummary(
    files.map(f => f.validation!).filter(Boolean)
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Business Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${files.length >= maxFiles ? 'cursor-not-allowed opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} disabled={files.length >= maxFiles} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />

            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop business documents here, or{' '}
                  <span className="text-blue-600 font-medium">browse</span>
                </p>
                <p className="text-sm text-gray-400">
                  Supports PDF, DOCX, DOC, TXT, RTF, HTML, CSV, JSON
                </p>
                <p className="text-sm text-gray-400">
                  Max {maxFiles} files, {formatFileSize(maxTotalSize)} total
                </p>
              </div>
            )}
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Validating files...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Statistics */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Total Files</div>
                <div className="font-medium">{files.length}</div>
              </div>
              <div>
                <div className="text-gray-500">Valid Files</div>
                <div className="font-medium text-green-600">{validFiles.length}</div>
              </div>
              <div>
                <div className="text-gray-500">Invalid Files</div>
                <div className="font-medium text-red-600">{invalidFiles.length}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Size</div>
                <div className="font-medium">{formatFileSize(totalSize)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {validationSummary.totalErrors > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {validationSummary.totalErrors} validation error(s) found.
            Please fix the issues below or remove invalid files.
          </AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border
                    ${file.validation?.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
                  `}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <File className={`
                      h-8 w-8 flex-shrink-0
                      ${file.validation?.isValid ? 'text-green-600' : 'text-red-600'}
                    `} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate">
                          {file.validation?.sanitizedFileName || file.name}
                        </p>
                        {file.validation?.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {file.type || 'Unknown type'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </span>
                      </div>

                      {/* Validation Messages */}
                      {file.validation && (
                        <div className="mt-2 space-y-1">
                          {file.validation.errors.map((error, index) => (
                            <p key={index} className="text-xs text-red-600">
                              ❌ {error}
                            </p>
                          ))}
                          {file.validation.warnings.map((warning, index) => (
                            <p key={index} className="text-xs text-yellow-600">
                              ⚠️ {warning}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="text-sm text-gray-500">
        <p className="mb-2">
          <strong>Supported documents:</strong> Pitch decks, business plans, financial reports,
          product specifications, marketing materials, competitive analyses, and strategy documents.
        </p>
        <p>
          <strong>Best results:</strong> Upload multiple document types for comprehensive business context understanding.
        </p>
      </div>
    </div>
  );
}