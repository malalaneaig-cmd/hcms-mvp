import { useEffect, useState } from 'react';
import { Appointments } from '../services/api.js';

let cache = null;
let cachePromise = null;

async function fetchLimits() {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = Appointments.bookingLimits().then((data) => {
      cache = data;
      return data;
    });
  }
  return cachePromise;
}

/** Returns API booking window limits; `window` is patient or staff based on channel. */
export function useBookingLimits(channel = 'website') {
  const [limits, setLimits] = useState(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;
    fetchLimits()
      .then((data) => { if (!cancelled) setLimits(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isStaff = channel === 'reception' || channel === 'phone';
  const window = isStaff ? limits?.staff : limits?.patient;

  return {
    loading,
    limits,
    minDate: window?.min_date || '',
    maxDate: window?.max_date || '',
    maxDays: window?.max_days || (isStaff ? 90 : 30),
  };
}
