// hooks/useEventDate.ts
import { useEffect, useState } from 'react'
import {
    getTodayISO,
    getNowTimeRounded,
    getLocalDateTime,
    getLocalDateTimeAfter,
    getNextCivilDate,
} from '../utils/dateHelpers'

export default function useEventDate(initial?: {
    allDay?: boolean
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
}) {
    const today = getTodayISO()
    const now = getNowTimeRounded()
    const timeZone = 'America/Sao_Paulo'
    const initialStartDate = initial?.startDate ?? today
    const initialStartTime = initial?.startTime ?? now
    const initialEnd = getLocalDateTimeAfter(initialStartDate, initialStartTime, 60)

    const [allDay, setAllDay] = useState(initial?.allDay ?? false)
    const [startDate, setStartDate] = useState(initialStartDate)
    const [endDate, setEndDate] = useState(initial?.endDate ?? initialEnd.date)
    const [startTime, setStartTime] = useState(initialStartTime)
    const [endTime, setEndTime] = useState(initial?.endTime ?? initialEnd.time)
    const [error, setError] = useState('')

    // 🔥 Efeito que garante consistência ao alternar allDay
    useEffect(() => {
        if (!allDay) {
            if (!startTime) {
                const now = getNowTimeRounded();
                const next = getLocalDateTimeAfter(startDate, now, 60)
                setStartTime(now);
                setEndDate(next.date)
                setEndTime(next.time);
            }
        }
    }, [allDay, startDate, startTime]);

    useEffect(() => {
        correctEnd()
    }, [startDate, endDate, startTime, endTime, allDay])

    function correctEnd() {
        if (allDay) {
            if (endDate < startDate) {
                setEndDate(startDate);
            }
            setStartTime('');
            setEndTime('');
            setError('');
        } else {
            if (!startTime || !endTime) {
                setError('');
                return;
            }

            const start = getLocalDateTime(startDate, startTime);
            const end = getLocalDateTime(endDate, endTime);

            // Se end é anterior ao start no mesmo dia, OU se a data de término é antes da de início, ajusta.
            if (endDate < startDate || (startDate === endDate && start >= end)) {
                const newEnd = getLocalDateTimeAfter(startDate, startTime, 30)
                setEndDate(newEnd.date);
                setEndTime(newEnd.time);
            }
            setError('');
        }
    }

    function handleStartTimeChange(value: string) {
        setStartTime(value)

        if (!value) return

        const start = getLocalDateTime(startDate, value)
        const currentEnd = endTime ? getLocalDateTime(endDate, endTime) : null

        if (!currentEnd || start > currentEnd) {
            const newEnd = getLocalDateTimeAfter(startDate, value, 30)
            setEndDate(newEnd.date)
            setEndTime(newEnd.time)
        }
    }

    function getNextDay(dateStr: string): string {
        return getNextCivilDate(dateStr)
    }

    function getGoogleCalendarFormat() {
        const tzOffset = '-03:00'
        const pad = (t: string) => t.padStart(5, '0')

        if (allDay) {
            return {
                start: { date: startDate },
                end: { date: getNextDay(endDate) }, // Google Calendar usa endDate como "não incluso"
            }
        }

        return {
            start: {
                dateTime: `${startDate}T${pad(startTime)}${tzOffset}`,
                timeZone: timeZone
            },
            end: {
                dateTime: `${endDate}T${pad(endTime)}${tzOffset}`,
                timeZone: timeZone
            },
        }
    }

    return {
        allDay, setAllDay,
        startDate, setStartDate,
        endDate, setEndDate,
        startTime, setStartTime,
        endTime, setEndTime,
        timeZone,
        error, setError,
        handleStartTimeChange,
        correctEnd,
        getNextDay,
        getGoogleCalendarFormat,
    }
}
