import React, { useState, useEffect } from 'react';
import { Download, Plus, Search, Edit2, Trash2, Package, AlertCircle, Maximize2, X } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { createClient } from '@supabase/supabase-js';
import { Image, Upload } from 'lucide-react';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const InventoryManagement = () => {
  const [items, setItems] = useState([
    // Example initial data
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    qtyTotal: 0,
    status: 'Available',
    source: '',
    from: '',
    to: '',
    locationUsed: '',
    qtyUsed: 0,
    qtyExcess: 0,
    conditions: [
      { type: 'refurbished', qty: 0, status: '' },
      { type: 'brandNew', qty: 0, status: '' },
      { type: 'scrap', qty: 0, status: '' },
      { type: 'defective', qty: 0, status: '' }
    ],
    qtyUsedBreakdown: [],
    imageUrl: '',
  });
  const [viewImage, setViewImage] = useState({ show: false, url: '' });

  const statusColors = {
    'Available': 'bg-green-500',
    'Reserved': 'bg-yellow-500',
    'Used': 'bg-red-500',
    'Excess': 'bg-blue-500',
    'New': 'bg-orange-500'
  };

  const statuses = ['Available', 'Reserved', 'Used', 'Excess', 'New'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('condition_qty_')) {
      const index = parseInt(name.split('_')[2]);
      const newConditions = [...formData.conditions];
      newConditions[index].qty = parseInt(value) || 0;
      setFormData(prev => ({ ...prev, conditions: newConditions }));
    } else if (name.startsWith('condition_status_')) {
      const index = parseInt(name.split('_')[2]);
      const newConditions = [...formData.conditions];
      newConditions[index].status = value;
      setFormData(prev => ({ ...prev, conditions: newConditions }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name.includes('qty') || name.includes('Qty') ? parseInt(value) || 0 : value
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        // Update existing document
        const itemRef = doc(db, 'inventory', editingId);
        await updateDoc(itemRef, {
          ...formData,
          updatedAt: new Date()
        });
        
        setItems(items.map(item => 
          item.id === editingId ? { ...formData, id: editingId } : item
        ));
      } else {
        // Add new document
        const docRef = await addDoc(collection(db, 'inventory'), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        setItems([...items, { ...formData, id: docRef.id }]);
      }

      // Reset form
      setFormData({
        type: '',
        description: '',
        qtyTotal: 0,
        status: 'Available',
        source: '',
        from: '',
        to: '',
        locationUsed: '',
        qtyUsed: 0,
        qtyExcess: 0,
        conditions: [
          { type: 'refurbished', qty: 0, status: '' },
          { type: 'brandNew', qty: 0, status: '' },
          { type: 'scrap', qty: 0, status: '' },
          { type: 'defective', qty: 0, status: '' }
        ],
        qtyUsedBreakdown: [],
        imageUrl: '',
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
        setItems(items.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      type: '',
      description: '',
      qtyTotal: 0,
      status: 'Available',
      source: '',
      from: '',
      to: '',
      locationUsed: '',
      qtyUsed: 0,
      qtyExcess: 0,
      conditions: [
        { type: 'refurbished', qty: 0, status: '' },
        { type: 'brandNew', qty: 0, status: '' },
        { type: 'scrap', qty: 0, status: '' },
        { type: 'defective', qty: 0, status: '' }
      ],
      qtyUsedBreakdown: [],
      imageUrl: '',
    });
  };

  const addUsedBreakdown = () => {
    setFormData(prev => ({
      ...prev,
      qtyUsedBreakdown: [...prev.qtyUsedBreakdown, { condition: '', qty: 0 }]
    }));
  };

  const updateUsedBreakdown = (index, field, value) => {
    const newBreakdown = [...formData.qtyUsedBreakdown];
    newBreakdown[index][field] = field === 'qty' ? (parseInt(value) || 0) : value;
    setFormData(prev => ({ ...prev, qtyUsedBreakdown: newBreakdown }));
  };

  const removeUsedBreakdown = (index) => {
    setFormData(prev => ({
      ...prev,
      qtyUsedBreakdown: prev.qtyUsedBreakdown.filter((_, i) => i !== index)
    }));
  };

  const exportToCSV = () => {
    const headers = ['Type', 'Description', 'QTY Total', 'Status', 'Source', 'From', 'To', 'Location Used', 'QTY Used', 'QTY Excess'];
    const csvData = items.map(item => [
      item.type,
      item.description,
      item.qtyTotal,
      item.status,
      item.source,
      item.from,
      item.to,
      item.locationUsed,
      item.qtyUsed,
      item.qtyExcess
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_management.csv';
    a.click();
  };

  const filteredItems = items.filter(item =>
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = items.reduce((sum, item) => sum + item.qtyTotal, 0);
  const usedItems = items.reduce((sum, item) => sum + item.qtyUsed, 0);
  const excessItems = items.reduce((sum, item) => sum + item.qtyExcess, 0);

  const loadInventoryItems = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const loadedItems = [];
      querySnapshot.forEach((doc) => {
        loadedItems.push({ id: doc.id, ...doc.data() });
      });
      setItems(loadedItems);
    } catch (error) {
      console.error('Error loading inventory:', error);
      alert('Error loading inventory items. Please refresh the page.');
    }
  };

  // Add this to your useEffect hook
  useEffect(() => {
    loadInventoryItems();
  }, []);

  const handleImageUpload = async (e, itemId) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file type
      const fileType = file.type;
      if (fileType !== 'image/jpeg' && fileType !== 'image/png' && fileType !== 'image/jpg') {
        alert('Please upload only JPG or PNG images');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Create unique filename
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const fileExt = file.name.split('.').pop();
      const fullPath = `${fileName}.${fileExt}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('inventory-images')
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: fileType
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('inventory-images')
        .getPublicUrl(fullPath);

      if (!publicUrl) throw new Error('Failed to get public URL');

      // Update form data or item
      if (itemId) {
        // Update existing item
        const itemRef = doc(db, 'inventory', itemId);
        await updateDoc(itemRef, { imageUrl: publicUrl });
        setItems(items.map(item => 
          item.id === itemId ? { ...item, imageUrl: publicUrl } : item
        ));
      } else {
        // Update form data for new item
        setFormData(prev => ({
          ...prev,
          imageUrl: publicUrl
        }));
      }

      console.log('Image uploaded successfully:', publicUrl);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Error uploading image: ${error.message}`);
    }
  };

  const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-full mx-2">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-800">Inventory Management System</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Quantity</div>
              <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Used Quantity</div>
              <div className="text-2xl font-bold text-red-600">{usedItems}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Excess Quantity</div>
              <div className="text-2xl font-bold text-green-600">{excessItems}</div>
            </div>
          </div>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Quantity</label>
                <input
                  type="number"
                  name="qtyTotal"
                  value={formData.qtyTotal}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="text"
                  name="from"
                  value={formData.from}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="text"
                  name="to"
                  value={formData.to}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Used</label>
                <input
                  type="text"
                  name="locationUsed"
                  value={formData.locationUsed}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Used Quantity</label>
                <input
                  type="number"
                  name="qtyUsed"
                  value={formData.qtyUsed}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excess Quantity</label>
                <input
                  type="number"
                  name="qtyExcess"
                  value={formData.qtyExcess}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <div className="flex items-center gap-4">
                  {formData.imageUrl ? (
                    <div className="relative w-40 h-40 group">
                      <img
                        src={formData.imageUrl}
                        alt="Product"
                        className="w-40 h-40 object-cover rounded-lg"
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = placeholderImage;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="text-white p-2 hover:bg-red-500 rounded-full"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                      <Upload className="w-10 h-10 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload</span>
                      <span className="text-xs text-gray-400">JPG or PNG only</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition Breakdown</label>
                <div className="grid grid-cols-2 gap-4">
                  {formData.conditions.map((cond, index) => (
                    <div key={index} className="border border-gray-200 p-3 rounded-lg">
                      <div className="font-medium text-sm text-gray-700 mb-2 capitalize">{cond.type}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                          <input
                            type="number"
                            name={`condition_qty_${index}`}
                            value={cond.qty}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Status</label>
                          <select
                            name={`condition_status_${index}`}
                            value={cond.status}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">None</option>
                            <option value="used">Used</option>
                            <option value="reserved">Reserved</option>
                            <option value="excess">Excess</option>
                            <option value="available">Available</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">QTY Used Breakdown</label>
                  <button
                    type="button"
                    onClick={addUsedBreakdown}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Breakdown
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.qtyUsedBreakdown.map((breakdown, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Condition (e.g., Brand New)"
                        value={breakdown.condition}
                        onChange={(e) => updateUsedBreakdown(index, 'condition', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={breakdown.qty}
                        onChange={(e) => updateUsedBreakdown(index, 'qty', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeUsedBreakdown(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.qtyUsedBreakdown.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No breakdown added yet</p>
                  )}
                </div>
              </div>
              <div className="col-span-2 flex gap-2 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingId ? 'Update' : 'Add'} Item
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by type, description, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[250px]">Image</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[150px]">Type</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[200px]">Description</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[100px]">QTY Total</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[120px]">Status</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[150px]">Source</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[200px]">From</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[200px]">To</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[200px]">Location Used</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[100px]">QTY Used</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[150px]">Used Breakdown</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[100px]">QTY Excess</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[200px]">Condition</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-2 py-3 text-sm text-gray-900 min-w-[200px]">
                      {item.imageUrl ? (
                        <div className="relative group">
                          <img 
                            src={item.imageUrl} 
                            alt={item.description} 
                            className="w-48 h-48 object-cover rounded-lg hover:scale-150 hover:z-50 transition-transform duration-200"
                            style={{ objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = placeholderImage;
                            }}
                          />
                          <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              onClick={() => setViewImage({ show: true, url: item.imageUrl })}
                              className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <label className="p-2 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={(e) => handleImageUpload(e, item.id)}
                                className="hidden"
                              />
                              <Upload className="w-4 h-4 text-white" />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={(e) => handleImageUpload(e, item.id)}
                            className="hidden"
                          />
                          <Upload className="w-8 h-8 text-gray-400" />
                        </label>
                      )}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal">{item.type}</td>
                    <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal">{item.description}</td>
                    <td className="px-2 py-3 text-sm text-gray-900">{item.qtyTotal}</td>
                    <td className="px-2 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${statusColors[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal">{item.source}</td>
                    <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal">{item.from}</td>
                    <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal">{item.to}</td>
                    <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal">{item.locationUsed}</td>
                    <td className="px-2 py-3 text-sm text-gray-900">{item.qtyUsed}</td>
                    <td className="px-2 py-3 text-xs text-gray-700 whitespace-normal">
                      {item.qtyUsedBreakdown && item.qtyUsedBreakdown.length > 0 ? (
                        <div className="space-y-1">
                          {item.qtyUsedBreakdown.map((breakdown, idx) => (
                            <div key={idx} className="bg-gray-50 px-2 py-1 rounded">
                              {breakdown.condition}: {breakdown.qty}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No breakdown</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900">{item.qtyExcess}</td>
                    <td className="px-2 py-3 text-xs text-gray-700 whitespace-normal">
                      <div className="space-y-1">
                        {item.conditions.map((cond, idx) => (
                          <div key={idx} className="bg-gray-50 px-2 py-1 rounded">
                            <span className="font-medium capitalize">{cond.type}:</span> {cond.qty}
                            {cond.status && <span className="text-blue-600 ml-1">({cond.status})</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No items found matching your search.</p>
          </div>
        )}

        {viewImage.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setViewImage({ show: false, url: '' })}>
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden">
              <img 
                src={viewImage.url} 
                alt="Full size" 
                className="rounded-lg object-contain max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              />
              <button 
                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                onClick={() => setViewImage({ show: false, url: '' })}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;