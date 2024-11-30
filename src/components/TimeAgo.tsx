'use client'

import { formatRelative,formatISO } from "date-fns"
import { UTCDate } from "@date-fns/utc"
import { useEffect, useState } from "react"

type TimeAgoProps = {
    ts: Date,
    className?: string
}

export default function TimeAgo({ts, className} : TimeAgoProps) {
    const [time, setTime] = useState(formatISO(new UTCDate(ts)))
    useEffect(() => {
        const now = Date.now()
        setTime(formatRelative(ts, now))
    }, [setTime])
    return <span className={className}>{time}</span>
}