'use client';

import { useEffect, useState } from 'react'
import { db } from '../utils/firebaseConfig'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { Routine } from '../utils/interfaces'
import { useAuth } from '../components/AuthProvider'
import MainMenu from '../components/MainMenu';

export default function TimeManagement() {
    const { uid } = useAuth()
    const [routines, setRoutines] = useState<Routine[]>([])

    const fetchRoutines = async () => {
        if (!uid) return
        const snapshot = await getDocs(collection(db, `users/${uid}/routines`))
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Routine, 'id'>)
        }))
        setRoutines(data)
    }

    const createRoutine = async (routine: Omit<Routine, 'id'>) => {
        if (!uid) return
        
        await addDoc(collection(db, `users/${uid}/routines`), routine)
        fetchRoutines()
    }

    const updateRoutine = async (routineId: string, data: Partial<Routine>) => {
        if (!uid) return
        await updateDoc(doc(db, `users/${uid}/routines/${routineId}`), data)
        fetchRoutines()
    }

    const deleteRoutine = async (routineId: string) => {
        if (!uid) return
        await deleteDoc(doc(db, `users/${uid}/routines/${routineId}`))
        fetchRoutines()
    }

    useEffect(() => {
        fetchRoutines()
    }, [uid])


    return (
        <main className="main-container-body main-container-bg">

            {/* Renderiza o menu principal da aplicação. */}
            <MainMenu />
            <h1 className="title-1">Gestão de Tempo</h1>

            <ul className="mt-4 space-y-3">
                {routines.map(routine => (
                    <li key={routine.id} className="p-4 bg-gray-100 rounded">
                        <h3 className="text-lg font-medium">{routine.title}</h3>
                        <ul className="list-disc pl-5 text-sm text-gray-600 mt-2">
                            {routine.steps.map(step => (
                                <li key={step.id} className={step.done ? 'line-through' : ''}>
                                    {step.description}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => deleteRoutine(routine.id)}
                            className="mt-2 text-red-500 text-sm"
                        >
                            Remover
                        </button>
                    </li>
                ))}
            </ul>
        </main>

    )
}
