'use client';

import { useId, useState, KeyboardEvent } from 'react';
import { TaskItem } from '../../../types/optionalFields';
import styles from '../OptionalFields.module.css';

interface TaskListFieldProps {
  label: string;
  value: TaskItem[];
  onChange: (newValue: TaskItem[]) => void;
  onLabelChange: (newValue: string) => void;
}

export default function TaskListField({
  label,
  value = [],
  onChange,
  onLabelChange
}: TaskListFieldProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const fieldId = useId();

  const toggleDone = (id: string) => {
    const updated = value.map(task =>
      task.id === id ? { ...task, done: !task.done } : task
    );
    onChange(updated);
  };

  const updateTaskText = (id: string, text: string) => {
    const updated = value.map(task =>
      task.id === id ? { ...task, text } : task
    );
    onChange(updated);
  };

  const deleteTask = (id: string) => {
    onChange(value.filter(task => task.id !== id));
  };

  const addEmptyTask = () => {
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      text: '',
      done: false
    };
    onChange([...value, newTask]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, taskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingTaskId(null);
    }
  };

  return (
    <div className={styles.tasks}>
      <input
        id={`${fieldId}-label`}
        type="text"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        className={styles.labelInput}
        aria-label="Nome do campo de tarefas"
        placeholder="Lista de Tarefas"
      />

      <ul className={styles.taskList}>
        {value.map((task, index) => (
          <li key={task.id} className={styles.taskRow}>
            <input
              id={`${fieldId}-${task.id}-done`}
              type="checkbox"
              checked={task.done}
              onChange={() => toggleDone(task.id)}
              className={styles.checkbox}
              aria-label={`Marcar tarefa ${index + 1} como concluída`}
            />

            <input
              id={`${fieldId}-${task.id}-text`}
              type="text"
              value={task.text}
              onChange={e => updateTaskText(task.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, task.id)}
              className={styles.taskInput}
              aria-label={`Tarefa ${index + 1}`}
              placeholder="Descrição da tarefa"
              autoFocus={editingTaskId === task.id}
            />

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                deleteTask(task.id)
              }}
              className={`${styles.removeAction} ${styles.taskDelete}`}
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          addEmptyTask();
        }}
        className={`${styles.action} ${styles.addAction}`}
      >
        + Nova tarefa
      </button>
    </div>
  );
}
