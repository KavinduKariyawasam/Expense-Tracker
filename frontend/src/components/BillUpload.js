import React, { useState } from 'react';
import EditableBillTable from './EditableBillTable';
import './BillUpload.css';
import { saveBillExpenses } from '../services/expense';

export default function BillUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showEditTable, setShowEditTable] = useState(false);

  const handleFileSelect = (selectedFile) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (selectedFile && validTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid image (PNG, JPG, JPEG) or PDF file');
      setFile(null);
    }
  };

  const handleFileChange = (e) => {
    handleFileSelect(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const uploadBill = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    // Get authentication token
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Please log in to upload bills');
      setUploading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/upload-bill', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, let the browser set it
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setShowEditTable(true); // Show editable table immediately
      } else {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          // Optionally redirect to login
          // window.location.href = '/login';
        } else {
          setError(data.detail || 'Upload failed');
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExpenses = async (editedData) => {
    try {
      console.log('Saving expenses to database:', editedData);
      
      // Save to database
      const savedExpenses = await saveBillExpenses(editedData);
      console.log('Expenses saved successfully:', savedExpenses);
      
      if (onUploadSuccess) {
        onUploadSuccess(savedExpenses);
      }
      
      // Show success message with details
      const itemCount = editedData.items.length;
      alert(`Successfully saved ${itemCount} expense${itemCount !== 1 ? 's' : ''}!`);
      resetUpload();
    } catch (error) {
      console.error('Error saving expenses:', error);
      if (error.message.includes('401')) {
        alert("Session expired. Please log in again.");
      } else {
        alert("Failed to save expenses. Please try again.");
      }
    }
  };

  const handleCancelEdit = () => {
    // When cancel is clicked, reset everything and go back to upload interface
    setShowEditTable(false);
    setResult(null);
    setFile(null);
    setError('');
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setError('');
    setShowEditTable(false);
  };

  return (
    <div className="bill-upload-container">
      {showEditTable && result ? (
        <EditableBillTable 
          parsedData={result.parsed_data}
          onSave={handleSaveExpenses}
          onCancel={handleCancelEdit}
        />
      ) : (
        <>
          <div className="upload-header">
            <h3>📄 Upload Bill/Invoice</h3>
            <p>Upload an image or PDF of your bill to automatically extract expenses</p>
          </div>

          <div 
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-content">
              {file ? (
                <div className="file-selected">
                  <div className="file-icon">📎</div>
                  <div className="file-info">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={resetUpload} className="remove-file">✕</button>
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">📁</div>
                  <p>Drag and drop your bill here, or</p>
                  <label className="file-input-label">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".png,.jpg,.jpeg,.pdf"
                      className="file-input"
                    />
                    Choose File
                  </label>
                  <p className="file-types">Supports PNG, JPG, JPEG, PDF</p>
                </div>
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {file && (
            <button 
              onClick={uploadBill} 
              disabled={uploading}
              className="upload-button"
            >
              {uploading ? '🔄 Processing...' : '🚀 Upload & Parse'}
            </button>
          )}
        </>
      )}
    </div>
  );
}