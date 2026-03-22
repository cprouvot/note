import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Copy, Check, Eraser } from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api';
import './TodoSidebar.css';

const defaultCategories = ['Akabia', 'Perso', 'En attente', 'Done'];

function DroppableEmptyCategory({ categoryId }) {
  const { setNodeRef, isOver } = useDroppable({ id: categoryId });
  return (
    <div ref={setNodeRef} className={`empty-category-dropzone ${isOver ? 'is-over' : ''}`}>
      Glisser une tâche ici
    </div>
  );
}

function SortableTaskItem({ task, toggleTask, removeTask, updateTaskText, handleTaskKeyDown }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { category: task.category } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: `${(task.indentLevel || 0) * 24}px`,
    position: 'relative',
    zIndex: isDragging ? 999 : 1
  };

  return (
    <li ref={setNodeRef} style={style} className={`task-item ${task.done ? 'done' : ''}`}>
      <div className="drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} color="#94a3b8" />
      </div>
      <label className="task-checkbox-label">
        <input 
          type="checkbox" 
          checked={task.done} 
          onChange={() => toggleTask(task.id)}
        />
        <input 
          id={`task-input-${task.id}`}
          type="text"
          value={task.text}
          onChange={(e) => updateTaskText(task.id, e.target.value)}
          onKeyDown={(e) => handleTaskKeyDown(e, task.id)}
          className="task-inline-input"
          placeholder="Tâche..."
        />
      </label>
      <button className="delete-task-btn" onClick={() => removeTask(task.id)} title="Supprimer la tâche">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

export default function TodoSidebar() {
  const [categories, setCategories] = useState(defaultCategories);
  const [tasks, setTasks] = useState([]);
  const [newCategoryText, setNewCategoryText] = useState('');
  const [copiedCategory, setCopiedCategory] = useState(null);

  useEffect(() => {
    const fetchTasksAndCategories = async () => {
      try {
        const [tasksData, catsData] = await Promise.all([
          api.getTasks(),
          api.getCategories()
        ]);
        setTasks(tasksData);
        if (catsData && catsData.length > 0) {
          setCategories(catsData);
        }
      } catch (err) {
        console.error("Failed to load tasks and categories", err);
      }
    };
    fetchTasksAndCategories();
  }, []);

  const saveCategories = async (newCats) => {
    setCategories(newCats);
    await api.updateCategories(newCats).catch(console.error);
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    const updatedStatus = !task.done;
    setTasks(tasks.map((t) => t.id === id ? { ...t, done: updatedStatus } : t));
    await api.updateTask(id, { ...task, done: updatedStatus }).catch(console.error);
  };

  const removeTask = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    await api.deleteTask(id).catch(console.error);
  };

  const updateTaskText = async (id, text) => {
    setTasks(tasks.map((t) => t.id === id ? { ...t, text } : t));
    const task = tasks.find(t => t.id === id);
    if (task) await api.updateTask(id, { ...task, text }).catch(console.error);
  };

  const handleTaskKeyDown = async (e, id) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      let updatedIndent = 0;
      setTasks(currentTasks => currentTasks.map(t => {
        if (t.id === id) {
          if (e.shiftKey) {
            updatedIndent = Math.max(0, (t.indentLevel || 0) - 1);
            return { ...t, indentLevel: updatedIndent };
          } else {
            updatedIndent = Math.min(5, (t.indentLevel || 0) + 1);
            return { ...t, indentLevel: updatedIndent };
          }
        }
        return t;
      }));

      const task = tasks.find(t => t.id === id);
      if (task) await api.updateTask(id, { ...task, indentLevel: updatedIndent }).catch(console.error);

    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentTask = tasks.find(t => t.id === id);
      if (!currentTask) return;
      
      const newTaskData = {
        text: '',
        category: currentTask.category,
        done: false,
        indentLevel: currentTask.indentLevel || 0,
        orderIndex: tasks.length
      };

      const savedTask = await api.createTask(newTaskData).catch(console.error);
      if(!savedTask) return;

      setTasks(currentTasks => {
        const currentIndex = currentTasks.findIndex(t => t.id === id);
        const newTasks = [...currentTasks];
        newTasks.splice(currentIndex + 1, 0, savedTask);
        return newTasks;
      });
      
      setTimeout(() => {
        const input = document.getElementById(`task-input-${savedTask.id}`);
        if (input) input.focus();
      }, 0);
    }
  };

  const addEmptyTask = async (category) => {
    const savedTask = await api.createTask({
      text: '',
      category: category,
      done: false,
      indentLevel: 0,
      orderIndex: tasks.length
    }).catch(console.error);

    if (savedTask) {
      setTasks(prev => [...prev, savedTask]);
      setTimeout(() => {
        const input = document.getElementById(`task-input-${savedTask.id}`);
        if (input) input.focus();
      }, 0);
    }
  };

  const addCategory = (e) => {
    e.preventDefault();
    const cleanCat = newCategoryText.trim();
    if (cleanCat && !categories.includes(cleanCat)) {
      saveCategories([...categories, cleanCat]);
    }
    setNewCategoryText('');
  };

  const removeCategory = async (catToRemove) => {
    if (window.confirm(`Ceci supprimera définitivement la catégorie "${catToRemove}" ET TOUTES LES TÂCHES qu'elle contient. Continuer ?`)) {
      saveCategories(categories.filter(c => c !== catToRemove));
      setTasks(tasks.filter(t => t.category !== catToRemove));
      await api.deleteTaskCategory(catToRemove).catch(console.error);
    }
  };

  const clearCategoryTasks = async (catToClear) => {
    if (window.confirm(`Vous allez vider TOUTES LES TÂCHES présentes dans "${catToClear}". Elles seront supprimées définitivement. Confirmer ?`)) {
      setTasks(tasks.filter(t => t.category !== catToClear));
      await api.deleteTaskCategory(catToClear).catch(console.error);
    }
  };

  const exportCategory = (category, catTasks) => {
    if (catTasks.length === 0) return;
    const textToCopy = catTasks.map(t => t.text).join(' ');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedCategory(category);
      setTimeout(() => setCopiedCategory(null), 2000);
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    let updatedTasks = [];
    let modifiedTask = null;

    setTasks((prevTasks) => {
      const activeIndex = prevTasks.findIndex(t => t.id === activeId);
      const activeTask = prevTasks[activeIndex];

      if (categories.includes(overId)) {
        if (activeTask.category !== overId) {
          const newTasks = [...prevTasks];
          newTasks[activeIndex] = { ...activeTask, category: overId };
          modifiedTask = newTasks[activeIndex];
          updatedTasks = newTasks;
          return newTasks;
        }
        return prevTasks;
      }

      const overIndex = prevTasks.findIndex(t => t.id === overId);
      if (overIndex !== -1) {
        const overTask = prevTasks[overIndex];
        let newTasks = [...prevTasks];
        
        if (activeTask.category !== overTask.category) {
          newTasks[activeIndex] = { ...activeTask, category: overTask.category };
        }
        
        const element = newTasks.splice(activeIndex, 1)[0];
        const newOverIndex = newTasks.findIndex(t => t.id === overId);
        newTasks.splice(newOverIndex, 0, element);
        
        modifiedTask = element;
        updatedTasks = newTasks;
        return newTasks;
      }

      return prevTasks;
    });

    if (modifiedTask) {
      await api.updateTask(modifiedTask.id, { ...modifiedTask }).catch(console.error);
    }
  };

  return (
    <div className="sidebar-container">
      <div className="sidebar-header">
        <h2>To do list</h2>
      </div>

      <div className="sidebar-content">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          {categories.map(category => {
            const catTasks = tasks.filter(t => t.category === category);
            
            return (
              <div key={category} className="category-section">
                <div className="category-header">
                  <h3>{category}</h3>
                  <div className="category-actions">
                    <button 
                      className="export-category-btn" 
                      onClick={() => exportCategory(category, catTasks)} 
                      title="Copier toutes les tâches (séparées par un espace)"
                    >
                      {copiedCategory === category ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                    </button>
                    <button 
                      className="clear-category-btn" 
                      onClick={() => clearCategoryTasks(category)} 
                      title="Vider la catégorie (Supprimer ses tâches)"
                    >
                      <Eraser size={14} />
                    </button>
                    <button 
                      className="delete-category-btn" 
                      onClick={() => removeCategory(category)} 
                      title="Supprimer complêtement la catégorie"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <SortableContext items={catTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <ul className="task-list">
                    {catTasks.map(task => (
                      <SortableTaskItem 
                        key={task.id} 
                        task={task} 
                        toggleTask={toggleTask} 
                        removeTask={removeTask}
                        updateTaskText={updateTaskText}
                        handleTaskKeyDown={handleTaskKeyDown}
                      />
                    ))}
                    {catTasks.length === 0 && (
                      <DroppableEmptyCategory categoryId={category} />
                    )}
                  </ul>
                </SortableContext>
                
                <button 
                  className="category-add-task-inline" 
                  onClick={() => addEmptyTask(category)}
                >
                  <Plus size={14} /> Ajouter une tâche
                </button>
              </div>
            );
          })}
        </DndContext>
      </div>

      <div className="add-category-wrapper">
        <form onSubmit={addCategory} className="add-category-form">
          <input 
            type="text" 
            placeholder="+ Nouvelle catégorie..." 
            value={newCategoryText}
            onChange={(e) => setNewCategoryText(e.target.value)}
            className="category-input"
          />
        </form>
      </div>
    </div>
  );
}
