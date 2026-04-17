import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, GripVertical, Copy, Check, Eraser } from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api';
import { socket } from '../socket';
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

function ContentEditableTask({ task, updateTaskText, handleTaskKeyDown }) {
  const divRef = React.useRef(null);
  const isFirstRender = React.useRef(true);
  
  React.useEffect(() => {
    if (divRef.current) {
      if (document.activeElement !== divRef.current || isFirstRender.current) {
        if (divRef.current.innerHTML !== task.text) {
          divRef.current.innerHTML = task.text;
        }
      }
      isFirstRender.current = false;
    }
  }, [task.text]);

  return (
    <div 
      ref={divRef}
      id={`task-input-${task.id}`}
      contentEditable={true}
      suppressContentEditableWarning={true}
      spellCheck={false}
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      onInput={(e) => {
        updateTaskText(task.id, e.currentTarget.innerHTML);
      }}
      onKeyDown={(e) => handleTaskKeyDown(e, task.id)}
      onPaste={(e) => {
        e.preventDefault();
        let text = e.clipboardData.getData('text/plain') || '';
        // Nettoyage: supprimer le mot "Tâche..." copié accidentellement via le CSS et forcer une seule ligne
        text = text.replace(/^Tâche\.\.\.\s*\n?/, '');
        text = text.replace(/[\r\n]+/g, ' ').trim();
        document.execCommand('insertText', false, text);
      }}
      className="task-inline-input content-editable-task"
      data-placeholder="Tâche..."
    />
  );
}

function EditableCategoryTitle({ category, categories, saveCategories, tasks, setTasks }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(category);

  const handleSave = async () => {
    const newName = editText.trim();
    if (newName && newName !== category && !categories.includes(newName)) {
      // Replace category in the categories array
      const newCats = categories.map(c => c === category ? newName : c);
      saveCategories(newCats);

      // Update local tasks
      setTasks(currentTasks => currentTasks.map(t => t.category === category ? { ...t, category: newName } : t));
      
      // Update tasks in backend
      const affectedTasks = tasks.filter(t => t.category === category);
      Promise.all(affectedTasks.map(t => api.updateTask(t.id, { ...t, category: newName }))).catch(console.error);
    } else {
      setEditText(category);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={editText}
        onChange={e => setEditText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
           if (e.key === 'Enter') handleSave();
           else if (e.key === 'Escape') { setEditText(category); setIsEditing(false); }
        }}
        style={{
          fontSize: '15px',
          fontWeight: '600',
          color: 'var(--text-main)',
          background: 'transparent',
          border: '1px solid var(--primary)',
          borderRadius: '4px',
          padding: '0 4px',
          outline: 'none',
          width: '150px'
        }}
      />
    );
  }

  return (
    <h3 
      onClick={() => setIsEditing(true)} 
      title="Cliquer pour renommer"
      style={{ cursor: 'pointer', margin: 0 }}
    >
      {category}
    </h3>
  );
}

function BasicTaskItem({ task, toggleTask, removeTask, updateTaskText, handleTaskKeyDown }) {
  const style = {
    paddingLeft: `${(task.indentLevel || 0) * 24}px`,
    position: 'relative'
  };

  return (
    <li style={style} className={`task-item done`}>
      <div className="task-checkbox-label">
        <input 
          type="checkbox" 
          checked={task.done} 
          onChange={() => toggleTask(task.id)}
        />
        <ContentEditableTask 
          task={task} 
          updateTaskText={updateTaskText} 
          handleTaskKeyDown={handleTaskKeyDown} 
        />
      </div>
      <button className="delete-task-btn" onClick={() => removeTask(task.id)} title="Supprimer la tâche">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function SortableTaskItem({ task, toggleTask, removeTask, updateTaskText, handleTaskKeyDown, addSubTask }) {
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
      <div className="task-checkbox-label">
        <input 
          type="checkbox" 
          checked={task.done} 
          onChange={() => toggleTask(task.id)}
        />
        <ContentEditableTask 
          task={task} 
          updateTaskText={updateTaskText} 
          handleTaskKeyDown={handleTaskKeyDown} 
        />
      </div>
      <div className="task-actions">
        <button className="add-task-btn" onClick={() => addSubTask(task.id)} title="Créer une sous-tâche">
          <Plus size={14} />
        </button>
        <button className="delete-task-btn" onClick={() => removeTask(task.id)} title="Supprimer la tâche">
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

export default function TodoSidebar() {
  const [categories, setCategories] = useState(defaultCategories);
  const [tasks, setTasks] = useState([]);
  const [newCategoryText, setNewCategoryText] = useState('');
  const [copiedCategory, setCopiedCategory] = useState(null);

  const fetchTasksAndCategories = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchTasksAndCategories();

    socket.on('server:tasks_updated', fetchTasksAndCategories);
    return () => socket.off('server:tasks_updated', fetchTasksAndCategories);
  }, [fetchTasksAndCategories]);

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
      
      const catTasks = tasks.filter(t => t.category === currentTask.category);
      const catIndex = catTasks.findIndex(t => t.id === id);
      const nextTask = catTasks[catIndex + 1];
      const newOrderIndex = nextTask 
        ? (currentTask.orderIndex + nextTask.orderIndex) / 2 
        : currentTask.orderIndex + 1;

      const newTaskData = {
        text: '',
        category: currentTask.category,
        done: false,
        indentLevel: currentTask.indentLevel || 0,
        orderIndex: newOrderIndex
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
      }, 100);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.task-inline-input'));
      const index = inputs.indexOf(e.currentTarget);
      if (index > 0) {
        const prevInput = inputs[index - 1];
        prevInput.focus();
        setTimeout(() => {
           const range = document.createRange();
           const sel = window.getSelection();
           range.selectNodeContents(prevInput);
           range.collapse(false);
           sel.removeAllRanges();
           sel.addRange(range);
        }, 0);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.task-inline-input'));
      const index = inputs.indexOf(e.currentTarget);
      if (index !== -1 && index < inputs.length - 1) {
        const nextInput = inputs[index + 1];
        nextInput.focus();
        setTimeout(() => {
           const range = document.createRange();
           const sel = window.getSelection();
           range.selectNodeContents(nextInput);
           range.collapse(false);
           sel.removeAllRanges();
           sel.addRange(range);
        }, 0);
      }
    }
  };

  const addSubTask = async (id) => {
    const currentTask = tasks.find(t => t.id === id);
    if (!currentTask) return;
    
    const catTasks = tasks.filter(t => t.category === currentTask.category);
    const catIndex = catTasks.findIndex(t => t.id === id);
    const nextTask = catTasks[catIndex + 1];
    const newOrderIndex = nextTask 
      ? (currentTask.orderIndex + nextTask.orderIndex) / 2 
      : currentTask.orderIndex + 1;

    const savedTask = await api.createTask({
      text: '',
      category: currentTask.category,
      done: false,
      indentLevel: Math.min(5, (currentTask.indentLevel || 0) + 1),
      orderIndex: newOrderIndex
    }).catch(console.error);

    if (savedTask) {
      setTasks(currentTasks => {
        const currentIndex = currentTasks.findIndex(t => t.id === id);
        const newTasks = [...currentTasks];
        newTasks.splice(currentIndex + 1, 0, savedTask);
        return newTasks;
      });
      setTimeout(() => {
        const input = document.getElementById(`task-input-${savedTask.id}`);
        if (input) input.focus();
      }, 100);
    }
  };

  const addEmptyTask = async (category) => {
    const catTasks = tasks.filter(t => t.category === category);
    const lastTask = catTasks[catTasks.length - 1];
    const newOrderIndex = lastTask ? lastTask.orderIndex + 1 : 0;

    const savedTask = await api.createTask({
      text: '',
      category: category,
      done: false,
      indentLevel: 0,
      orderIndex: newOrderIndex
    }).catch(console.error);

    if (savedTask) {
      setTasks(prev => [...prev, savedTask]);
      setTimeout(() => {
        const input = document.getElementById(`task-input-${savedTask.id}`);
        if (input) input.focus();
      }, 100);
    }
  };

  const addEmptyTaskTop = async (category) => {
    const catTasks = tasks.filter(t => t.category === category);
    const firstTask = catTasks[0];
    const newOrderIndex = firstTask ? firstTask.orderIndex - 1 : 0;

    const savedTask = await api.createTask({
      text: '',
      category: category,
      done: false,
      indentLevel: 0,
      orderIndex: newOrderIndex
    }).catch(console.error);

    if (savedTask) {
      setTasks(currentTasks => {
        const insertIndex = currentTasks.findIndex(t => t.category === category);
        const newTasks = [...currentTasks];
        if (insertIndex !== -1) {
          newTasks.splice(insertIndex, 0, savedTask);
        } else {
          newTasks.push(savedTask);
        }
        return newTasks;
      });
      setTimeout(() => {
        const input = document.getElementById(`task-input-${savedTask.id}`);
        if (input) input.focus();
      }, 100);
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
        const activeCat = activeTask.category;
        const overCat = overTask.category;

        let newTasks = [...prevTasks];
        const dropItem = { ...activeTask, category: overCat };
        
        // Mettre à jour l'objet avec sa nouvelle catégorie s'il traverse
        newTasks[activeIndex] = dropItem; 
        
        // arrayMove décale correctement les indices sans le bug du "je ne peux pas descendre"
        newTasks = arrayMove(newTasks, activeIndex, overIndex);

        const catOnlyTasks = newTasks.filter(t => t.category === overCat);
        const catItemIndex = catOnlyTasks.findIndex(t => t.id === dropItem.id);
        const prevTask = catOnlyTasks[catItemIndex - 1];
        const nextTask = catOnlyTasks[catItemIndex + 1];

        if (prevTask && nextTask) {
           dropItem.orderIndex = (prevTask.orderIndex + nextTask.orderIndex) / 2;
        } else if (prevTask) {
           dropItem.orderIndex = prevTask.orderIndex + 1;
        } else if (nextTask) {
           dropItem.orderIndex = nextTask.orderIndex - 1;
        } else {
           dropItem.orderIndex = 0;
        }

        const finalGlobalIndex = newTasks.findIndex(t => t.id === dropItem.id);
        newTasks[finalGlobalIndex] = dropItem;
        modifiedTask = dropItem;

        return newTasks;
      }

      return prevTasks;
    });

    if (modifiedTask) {
      await api.updateTask(modifiedTask.id, { ...modifiedTask }).catch(console.error);
    }
  };

  const completedTasks = tasks.filter(t => t.done);
  
  const clearCompletedTasks = async () => {
    if (window.confirm("Vous allez vider TOUTES vos tâches terminées. Confirmer ?")) {
      setTasks(tasks.filter(t => !t.done));
      await Promise.all(completedTasks.map(t => api.deleteTask(t.id))).catch(console.error);
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
            const catTasks = tasks.filter(t => t.category === category && !t.done);
            
            return (
              <div key={category} className="category-section">
                <div className="category-header">
                  <EditableCategoryTitle 
                    category={category}
                    categories={categories}
                    saveCategories={saveCategories}
                    tasks={tasks}
                    setTasks={setTasks}
                  />
                  <div className="category-actions">
                    <button 
                      className="add-top-category-btn" 
                      onClick={() => addEmptyTaskTop(category)} 
                      title="Créer une tâche en haut de la catégorie"
                    >
                      <Plus size={14} />
                    </button>
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
                        addSubTask={addSubTask}
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

        {completedTasks.length > 0 && (
          <div className="category-section" style={{ marginTop: '30px', borderTop: '2px solid var(--border-color)', paddingTop: '15px' }}>
            <div className="category-header">
              <h3 style={{ color: '#059669' }}>Tâches terminées</h3>
              <div className="category-actions">
                <button 
                  className="export-category-btn" 
                  onClick={() => exportCategory('Tâches terminées', completedTasks)} 
                  title="Copier toutes les tâches terminées"
                >
                  {copiedCategory === 'Tâches terminées' ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                </button>
                <button 
                  className="clear-category-btn" 
                  onClick={clearCompletedTasks} 
                  title="Vider les tâches terminées"
                >
                  <Eraser size={14} />
                </button>
              </div>
            </div>
            <ul className="task-list">
              {completedTasks.map(task => (
                <BasicTaskItem 
                  key={task.id} 
                  task={task} 
                  toggleTask={toggleTask} 
                  removeTask={removeTask}
                  updateTaskText={updateTaskText}
                  handleTaskKeyDown={handleTaskKeyDown}
                />
              ))}
            </ul>
          </div>
        )}
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
