import { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Plus, Tag, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import './ManageCategories.css';

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('material_categories')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const showToast = (message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMsg(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsAdding(true);
    try {
      const maxPriority = categories.length > 0
        ? Math.max(...categories.map(c => c.priority))
        : 0;

      const { error } = await supabase
        .from('material_categories')
        .insert({
          name: newCategoryName.trim(),
          priority: maxPriority + 1,
          is_active: true,
        });

      if (error) throw error;

      await fetchCategories();
      setNewCategoryName('');
      showToast('Category added successfully!');
    } catch (err) {
      alert('Error adding category: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (categoryId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('material_categories')
        .update({ is_active: !currentStatus })
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId ? { ...cat, is_active: !currentStatus } : cat
        )
      );
    } catch (err) {
      alert('Error updating category: ' + err.message);
    }
  };

  const moveUp = async (index) => {
    if (index === 0) return;
    const itemAbove = categories[index - 1];
    const currentItem = categories[index];

    try {
      await Promise.all([
        supabase.from('material_categories').update({ priority: itemAbove.priority }).eq('id', currentItem.id),
        supabase.from('material_categories').update({ priority: currentItem.priority }).eq('id', itemAbove.id),
      ]);

      await fetchCategories();
    } catch (err) {
      alert('Error reordering categories: ' + err.message);
    }
  };

  const moveDown = async (index) => {
    if (index === categories.length - 1) return;
    const itemBelow = categories[index + 1];
    const currentItem = categories[index];

    try {
      await Promise.all([
        supabase.from('material_categories').update({ priority: itemBelow.priority }).eq('id', currentItem.id),
        supabase.from('material_categories').update({ priority: currentItem.priority }).eq('id', itemBelow.id),
      ]);

      await fetchCategories();
    } catch (err) {
      alert('Error reordering categories: ' + err.message);
    }
  };

  return (
    <div className="manage-categories">
      <div className="manage-categories__header">
        <div>
          <p className="manage-categories__eyebrow">Category Management</p>
          <h3 className="section-title">Manage Categories</h3>
        </div>
      </div>

      <div className="manage-categories__add-section">
        <form onSubmit={handleAddCategory} className="mc-add-form">
          <input
            type="text"
            className="mc-input"
            placeholder="New Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={isAdding}
          />
          <button
            type="submit"
            className="mc-add-button"
            disabled={isAdding || !newCategoryName.trim()}
          >
            <Plus size={18} />
            Add Category
          </button>
        </form>
      </div>

      <div className="mc-list-section">
        {isLoading ? (
          <div className="mc-loading">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="mc-empty">
            <Tag size={48} />
            <strong>No categories found</strong>
            <span>Add your first category above to get started.</span>
          </div>
        ) : (
          <div className="mc-category-list">
            {categories.map((category, index) => (
              <div key={category.id} className="mc-category-item">
                <span className="mc-category-name">{category.name}</span>
                <div className="mc-category-actions">
                  <div className="mc-reorder-buttons">
                    <button
                      type="button"
                      className="mc-reorder-btn"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label="Move up"
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="mc-reorder-btn"
                      onClick={() => moveDown(index)}
                      disabled={index === categories.length - 1}
                      aria-label="Move down"
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`mc-toggle-btn ${category.is_active ? 'mc-toggle-btn--active' : ''}`}
                    onClick={() => handleToggleActive(category.id, category.is_active)}
                    aria-label={category.is_active ? 'Deactivate' : 'Activate'}
                    title={category.is_active ? 'Click to deactivate' : 'Click to activate'}
                  >
                    {category.is_active ? (
                      <>
                        <Eye size={16} />
                        Active
                      </>
                    ) : (
                      <>
                        <EyeOff size={16} />
                        Inactive
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="mc-toast">
          <span className="mc-toast__message">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}