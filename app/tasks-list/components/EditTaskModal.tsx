'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { updateDoc, doc, addDoc, deleteDoc, collection } from 'firebase/firestore'
import { db } from '../../utils/firebaseConfig'
import { useAuth } from '../../components/auth/AuthProvider'
import { Task } from '../../utils/interfaces'
import { ActionPlanning } from '../../types/actions'
import { AutomationRuleSet } from '../../types/automation'
import ActionPlanningControl from '../../components/actions/ActionPlanningControl'
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor'
import { OptionalField, TaskItem } from '../../types/optionalFields'
import { buildEventPayload } from '../../utils/eventPayload'
import CalendarEventCreator from '../../components/ui/CalendarEventCreator'
import useEventDate from '../../hooks/useEventDate'

interface EditTaskModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

export default function EditTaskModal({ task, isOpen, onClose, onUpdated }: EditTaskModalProps) {
  const { uid } = useAuth(); /** @const {uid | null} uid - O usuário do Firebase autenticado. */
  const [content, setContent] = useState(task.content || '')
  const [addingDate, setAddingDate] = useState(false)
  const [actionPlanning, setActionPlanning] = useState<ActionPlanning>(task.actionPlanning ?? {})
  const [automation, setAutomation] = useState<AutomationRuleSet>(task.automation ?? { match: 'all', rules: [] })
  const dateControl = useEventDate()
  const { allDay, startDate, endDate, startTime, endTime } = dateControl

  useEffect(() => {
    if (task) {
      setContent(task.content)
      setActionPlanning(task.actionPlanning ?? {})
      setAutomation(task.automation ?? { match: 'all', rules: [] })
    }
  }, [task])

  const handleUpdate = async () => {
    if (!content.trim()) {
      alert('Digite algo para a tarefa.');
      return;
    }

    if (!uid) return;

    if (addingDate) {
      if (!startDate || !endDate) {
        alert('Informe as datas de início e término');
        return;
      }

      if (!allDay && (!startTime || !endTime)) {
        alert('Informe os horários de início e término');
        return;
      }

      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      if (!allDay && start >= end) {
        alert('O horário de término deve ser após o horário de início');
        return;
      }

      const optionalFields: OptionalField[] = [];

      if (task.subtasks && task.subtasks.length > 0) {
        const confirm = window.confirm(
          "Esta tarefa possui subtarefas.\n\nDeseja que todas elas se incorporem ao novo evento?"
        );
        if (!confirm) return;
        optionalFields.push({
          id: crypto.randomUUID(),
          type: 'tasks',
          label: 'Lista de Tarefas',
          value: task.subtasks.map(sub => ({
            id: sub.id,
            text: sub.content,
            done: sub.status == 0 ? false : true,
          })),
        });
      }

      const newEvent = buildEventPayload({
        title: content.trim(),
        startDate,
        endDate,
        allDay,
        ...(!allDay ? { startTime, endTime } : {}),
        createdAt: new Date(),
        optionalFields,
        actionPlanning,
        automation,
      });

      try {
        await addDoc(collection(db, `users/${uid}/events-history`), newEvent);
        await deleteDoc(doc(db, `users/${uid}/tasks-list/${task.id}`));
        onUpdated();
        onClose();
      } catch (error) {
        console.error('Erro ao criar evento:', error);
      }
      return;
    }

    try {
      await updateDoc(doc(db, `users/${uid}/tasks-list/${task.id}`), {
        content: content.trim(),
        actionPlanning,
        automation,
      });
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  if (!isOpen || !uid) return null

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Editar Tarefa</h2>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleUpdate();
            }
          }}
          placeholder="Descrição da tarefa"
          className="border w-full p-2 rounded mb-4"
        />

        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={addingDate}
            onChange={() => setAddingDate(!addingDate)}
          />
          Criar evento a partir da tarefa
        </label>

        {addingDate && (
          <CalendarEventCreator {...dateControl} />
        )}

        <ActionPlanningControl
          planning={actionPlanning}
          onChange={setActionPlanning}
        />

        <AutomationRulesEditor
          uid={uid}
          value={automation}
          onChange={setAutomation}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-black">Cancelar</button>
          <button onClick={handleUpdate} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
            Atualizar
          </button>
        </div>
      </div>
    </motion.div >
  )
}
