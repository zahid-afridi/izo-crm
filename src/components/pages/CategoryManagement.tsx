"use client";

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryManagementProps {
  type: 'product' | 'service';
}

export function CategoryManagement({ type }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState<{ id: string; name: string; categoryId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryNameError, setCategoryNameError] = useState('');
  const [subNameError, setSubNameError] = useState('');

  const apiBase = `/api/categories/${type}-categories`;
  const apiSubBase = `/api/categories/${type}-subcategories`;

  // Fetch categories with subcategories
  const fetchCategories = async () => {
    try {
      const response = await fetch(apiBase, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [type]);

  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  // Create or update category
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      setCategoryNameError('Category name is required');
      return;
    }

    setCategoryNameError('');
    setIsSaving(true);
    try {
      const url = editingCategory ? `${apiBase}/${editingCategory.id}` : apiBase;
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: categoryName }),
      });

      if (response.ok) {
        toast.success(editingCategory ? 'Category updated' : 'Category created');
        setIsCategoryDialogOpen(false);
        setCategoryName('');
        setEditingCategory(null);
        setCategoryNameError('');
        fetchCategories();
      } else {
        const error = await response.json();
        if (error.error === 'Category name already exists') {
          setCategoryNameError('Category name already exists');
        } else {
          setCategoryNameError(error.error || 'Failed to save category');
        }
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setCategoryNameError('Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category and all its subcategories?')) return;

    try {
      const response = await fetch(`${apiBase}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Category deleted');
        fetchCategories();
      } else {
        toast.error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  // Add subcategory inline
  const handleAddSubcategory = async (categoryId: string) => {
    if (!newSubName.trim()) {
      setSubNameError('Subcategory name is required');
      return;
    }

    setSubNameError('');
    setIsSaving(true);
    try {
      const response = await fetch(apiSubBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newSubName,
          categoryId,
        }),
      });

      if (response.ok) {
        toast.success('Subcategory added');
        setNewSubName('');
        setAddingSubTo(null);
        setSubNameError('');
        fetchCategories();
      } else {
        const error = await response.json();
        if (error.error === 'Subcategory name already exists in this category') {
          setSubNameError('Subcategory name already exists in this category');
        } else {
          setSubNameError(error.error || 'Failed to add subcategory');
        }
      }
    } catch (error) {
      console.error('Error adding subcategory:', error);
      setSubNameError('Failed to add subcategory');
    } finally {
      setIsSaving(false);
    }
  };

  // Update subcategory inline
  const handleUpdateSubcategory = async () => {
    if (!editingSubcategory || !editingSubcategory.name.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${apiSubBase}/${editingSubcategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editingSubcategory.name,
          categoryId: editingSubcategory.categoryId,
        }),
      });

      if (response.ok) {
        toast.success('Subcategory updated');
        setEditingSubcategory(null);
        fetchCategories();
      } else {
        toast.error('Failed to update subcategory');
      }
    } catch (error) {
      console.error('Error updating subcategory:', error);
      toast.error('Failed to update subcategory');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete subcategory
  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm('Delete this subcategory?')) return;

    try {
      const response = await fetch(`${apiSubBase}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Subcategory deleted');
        fetchCategories();
      } else {
        toast.error('Failed to delete subcategory');
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Failed to delete subcategory');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-gray-900 capitalize">{type} Categories</h3>
          <p className="text-sm text-gray-500 mt-1">Click on a category to add subcategories</p>
        </div>
        <Button onClick={() => {
          setEditingCategory(null);
          setCategoryName('');
          setIsCategoryDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
          <p className="text-lg mb-2">No categories yet</p>
          <p className="text-sm">Click "Add Category" to create your first category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="border rounded-lg">
              {/* Category Header */}
              <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    {expandedCategories.has(category.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{category.name}</p>
                    <p className="text-xs text-gray-500">
                      {category.subcategories?.length || 0} subcategories
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryName(category.name);
                      setIsCategoryDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {/* Subcategories (Expanded) */}
              {expandedCategories.has(category.id) && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="space-y-2">
                    {category.subcategories && category.subcategories.length > 0 ? (
                      category.subcategories.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-white rounded border">
                          {editingSubcategory?.id === sub.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editingSubcategory.name}
                                onChange={(e) => setEditingSubcategory({ ...editingSubcategory, name: e.target.value })}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={handleUpdateSubcategory}
                                disabled={isSaving}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSubcategory(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-gray-700">{sub.name}</span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingSubcategory({ id: sub.id, name: sub.name, categoryId: sub.categoryId })}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteSubcategory(sub.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">No subcategories yet</p>
                    )}

                    {/* Add Subcategory Inline */}
                    {addingSubTo === category.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-white rounded border border-brand-300">
                          <Input
                            value={newSubName}
                            onChange={(e) => {
                              setNewSubName(e.target.value);
                              if (e.target.value.trim()) {
                                setSubNameError('');
                              }
                            }}
                            placeholder="Subcategory name"
                            className={`flex-1 ${subNameError ? 'border-red-500' : ''}`}
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddSubcategory(category.id);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddSubcategory(category.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAddingSubTo(null);
                              setNewSubName('');
                              setSubNameError('');
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        {subNameError && (
                          <p className="text-sm text-red-500 px-3">{subNameError}</p>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setAddingSubTo(category.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Subcategory
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog 
        open={isCategoryDialogOpen} 
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open);
          if (!open) {
            setCategoryName('');
            setEditingCategory(null);
            setCategoryNameError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (e.target.value.trim()) {
                  setCategoryNameError('');
                }
              }}
              placeholder="Enter category name"
              autoFocus
              className={categoryNameError ? 'border-red-500' : ''}
            />
            {categoryNameError && (
              <p className="text-sm text-red-500">{categoryNameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCategoryDialogOpen(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingCategory ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
